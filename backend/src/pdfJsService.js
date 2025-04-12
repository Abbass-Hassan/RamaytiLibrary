const axios = require("axios");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf");

// Disable workers for Node.js environment
pdfjsLib.GlobalWorkerOptions.disableWorker = true;

// Create a minimal NodeCanvasFactory implementation
class NodeCanvasFactory {
  create(width, height) {
    return {
      width,
      height,
      canvas: { style: {} },
    };
  }
  reset() {}
  destroy() {}
}

// Helper to check if string contains Arabic characters
function containsArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

// Check if a character is an Arabic letter
function isArabicLetter(char) {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x0600 && code <= 0x06ff) || // Arabic
    (code >= 0x0750 && code <= 0x077f) || // Arabic Supplement
    (code >= 0xfb50 && code <= 0xfdff) || // Arabic Presentation Forms-A
    (code >= 0xfe70 && code <= 0xfeff) // Arabic Presentation Forms-B
  );
}

// Further expanded list of non-connecting letters in Arabic
function isNonConnectingLetter(char) {
  return [
    "ا",
    "أ",
    "إ",
    "آ",
    "د",
    "ذ",
    "ر",
    "ز",
    "و",
    "ؤ",
    "ة",
    "ء",
    "ى",
  ].includes(char);
}

// Enhanced punctuation detection
function isPunctuationOrSpace(char) {
  return (
    /[\s\.\,،;\?؟!\(\):\[\]\{\}"'«»\-\u2000-\u200F\u2028-\u202F]/.test(char) ||
    char === String.fromCharCode(0x00a0) || // Non-breaking space
    char === String.fromCharCode(0x2003) || // Em space
    char === String.fromCharCode(0x200c)
  ); // Zero-width non-joiner
}

// Check for kashida (tatweel)
function isKashida(char) {
  return char === "ـ" || char.charCodeAt(0) === 0x0640;
}

// Check if a character should connect to the next character in Arabic
function shouldConnectToNext(char) {
  return isArabicLetter(char) && !isNonConnectingLetter(char);
}

// Arabic prefixes that should be connected to following words
const arabicPrefixes = [
  "ال",
  "وال",
  "بال",
  "كال",
  "فال",
  "لل", // Common definite article forms
  "و",
  "ف",
  "ب",
  "ل",
  "ك",
  "س", // Single letter prepositions/prefixes
];

// Arabic suffixes that should be connected to preceding words
const arabicSuffixes = [
  "ها",
  "هم",
  "هن",
  "ك",
  "كم",
  "كن",
  "نا", // Possessive pronouns
  "ت",
  "تم",
  "تما",
  "تن", // Verb suffixes
  "ون",
  "ين",
  "ان",
  "ات",
  "ة", // Noun suffixes
];

// Completely redesigned Arabic text processing function
function processArabicContent(textContent) {
  if (!textContent || !textContent.items || textContent.items.length === 0) {
    return "";
  }

  console.log(`Processing ${textContent.items.length} text items`);

  // Sample text to detect if document is primarily Arabic
  const sampleText = textContent.items
    .slice(0, Math.min(20, textContent.items.length))
    .map((item) => item.str)
    .join("");

  const isArabicDocument = containsArabic(sampleText);
  console.log(`Document appears to be in Arabic: ${isArabicDocument}`);

  if (!isArabicDocument) {
    // For non-Arabic documents, use standard approach
    return textContent.items.map((item) => item.str).join(" ");
  }

  // Group items by their vertical position (approximate lines)
  const lines = {};
  // Use smaller tolerance for more precise line detection
  const lineHeight = 1; // Smaller value for better precision

  // First pass: collect items by line
  textContent.items.forEach((item) => {
    if (!item.transform) return;

    // Get y position and normalize to group items into lines
    const yPos = Math.round(item.transform[5] / lineHeight) * lineHeight;

    if (!lines[yPos]) {
      lines[yPos] = [];
    }

    // Clean item text - remove kashidas and normalize
    const cleanText = item.str
      .replace(/ـ/g, "") // Remove kashidas
      .replace(/[\u200B-\u200F]/g, ""); // Remove zero-width spaces and directional marks

    // Skip empty items
    if (!cleanText.trim()) return;

    // Store item with additional metadata for better processing
    lines[yPos].push({
      text: cleanText,
      originalText: item.str,
      x: item.transform[4],
      // Better width calculation
      width: item.width || cleanText.length * (item.fontSize || 10) * 0.6,
      fontSize: item.fontSize || 10,
      hasArabic: containsArabic(cleanText),
      // Split into individual characters for detailed analysis
      chars: cleanText.split(""),
    });
  });

  // Process each line
  let result = "";

  // Sort lines from top to bottom
  const sortedYPositions = Object.keys(lines)
    .map(Number)
    .sort((a, b) => b - a); // Sort in descending order (top to bottom)

  sortedYPositions.forEach((y) => {
    const lineItems = lines[y];

    // Skip empty lines
    if (lineItems.length === 0) return;

    // For Arabic text, sort from right to left
    const isArabicLine = lineItems.some((item) => item.hasArabic);
    if (isArabicLine) {
      // Sort by x-coordinate in descending order (right to left)
      lineItems.sort((a, b) => b.x - a.x);
    } else {
      // For non-Arabic, sort left to right
      lineItems.sort((a, b) => a.x - b.x);
    }

    // Process the line items to form coherent words
    const processedItems = [];
    let currentItem = null;

    for (const item of lineItems) {
      if (!currentItem) {
        // First item in a sequence
        currentItem = { ...item };
      } else {
        // Check if current item should be merged with previous
        const lastCharOfPrev = currentItem.text.charAt(
          currentItem.text.length - 1
        );
        const firstCharOfCurrent = item.text.charAt(0);

        // Calculate horizontal gap between items
        const gap = currentItem.x - (item.x + item.width);
        const fontSizeFactor =
          Math.max(currentItem.fontSize, item.fontSize) / 10;
        const gapThreshold = 1.5 * fontSizeFactor;

        // Determine if items should be merged based on multiple factors
        const shouldMerge =
          // Spatial proximity
          gap < gapThreshold ||
          // Last char of previous should connect to next
          (shouldConnectToNext(lastCharOfPrev) &&
            containsArabic(firstCharOfCurrent)) ||
          // Current item begins with a character that typically connects to previous
          (!isNonConnectingLetter(firstCharOfCurrent) &&
            containsArabic(lastCharOfPrev)) ||
          // Previous item is a prefix
          arabicPrefixes.some(
            (prefix) =>
              currentItem.text === prefix || currentItem.text.endsWith(prefix)
          ) ||
          // Current item is a suffix
          arabicSuffixes.some(
            (suffix) => item.text === suffix || item.text.startsWith(suffix)
          );

        if (shouldMerge) {
          // Merge with current item
          currentItem.text += item.text;
          currentItem.width += item.width;
          // Keep rightmost x position for RTL text
          currentItem.x = Math.max(currentItem.x, item.x);
        } else {
          // Finish current item and start a new one
          processedItems.push(currentItem);
          currentItem = { ...item };
        }
      }
    }

    // Add the last item
    if (currentItem) {
      processedItems.push(currentItem);
    }

    // Create the line text by joining processed items
    let lineText = processedItems
      .map((item) => item.text)
      .join(" ")
      .trim();

    // Apply additional processing for Arabic text
    lineText = postProcessArabicLine(lineText);

    // Add to result with proper line spacing
    if (result) {
      result += "\n\n"; // Double newline for paragraph separation
    }
    result += lineText;
  });

  // Final post-processing pass for the entire text
  return postProcessArabicText(result);
}

// Process a single line of Arabic text
function postProcessArabicLine(text) {
  if (!text) return "";

  // Remove excessive spaces
  let processedText = text.replace(/\s+/g, " ").trim();

  // Join specific prefix-word combinations
  for (const prefix of arabicPrefixes) {
    const regex = new RegExp(`\\b${prefix}\\s+(\\S+)`, "g");
    processedText = processedText.replace(regex, `${prefix}$1`);
  }

  return processedText;
}

// Post-process the entire Arabic text for better readability
function postProcessArabicText(text) {
  if (!text) return "";

  // Split into paragraphs
  const paragraphs = text.split(/\n+/);
  const processedParagraphs = paragraphs.map((paragraph) => {
    if (!paragraph.trim()) return "";

    // Fix common issues in Arabic text
    let processedPara = paragraph
      // Remove excessive spaces
      .replace(/\s+/g, " ")
      // Remove kashidas
      .replace(/ـ/g, "")
      // Fix unnecessary spaces before/after punctuation
      .replace(/ ([\.،:؛؟!])/g, "$1")
      .replace(/([\.،:؛؟!]) /g, "$1 ")
      .trim();

    // Split into words
    const words = processedPara.split(/\s+/);
    const processedWords = [];

    // Apply word-level fixes
    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // Skip empty words
      if (!word) continue;

      // Check if current word should be connected to the next word
      if (i < words.length - 1) {
        // If current word is a prefix
        if (
          arabicPrefixes.includes(word) ||
          arabicPrefixes.some(
            (prefix) =>
              word.endsWith(prefix) && word.length <= prefix.length + 2
          )
        ) {
          if (containsArabic(words[i + 1])) {
            processedWords.push(word + words[i + 1]);
            i++; // Skip next word
            continue;
          }
        }

        // If next word is a suffix
        if (
          arabicSuffixes.includes(words[i + 1]) ||
          arabicSuffixes.some(
            (suffix) =>
              words[i + 1].startsWith(suffix) &&
              words[i + 1].length <= suffix.length + 2
          )
        ) {
          if (containsArabic(word)) {
            processedWords.push(word + words[i + 1]);
            i++; // Skip next word
            continue;
          }
        }
      }

      processedWords.push(word);
    }

    return processedWords.join(" ");
  });

  return paragraphs.join("\n\n");
}

// Improved PDF extraction function
async function extractTextFromPdfUrlWithPdfJs(pdfUrl, options = {}) {
  try {
    // Validate URL first
    if (!pdfUrl) {
      throw new Error("PDF URL is undefined or null");
    }

    console.log(`Starting text extraction from: ${pdfUrl}`);

    // Download the PDF
    const response = await axios.get(pdfUrl, {
      responseType: "arraybuffer",
      timeout: options.timeout || 15000, // 15 second timeout by default
      validateStatus: (status) => status === 200, // Only accept 200 OK responses
    });

    const data = new Uint8Array(response.data);
    console.log(`Downloaded PDF: ${data.length} bytes`);

    // Configure PDF.js with options for better Arabic support
    const loadingTask = pdfjsLib.getDocument({
      data: data,
      disableFontFace: false, // Enable font information for better extraction
      useSystemFonts: true, // Use system fonts when possible
      nativeImageDecoderSupport: "none",
      ignoreErrors: true, // Continue despite errors
      canvasFactory: new NodeCanvasFactory(),
      cMapUrl: "./node_modules/pdfjs-dist/cmaps/",
      cMapPacked: true,
      ...options.pdfOptions,
    });

    // Wait for the PDF to load
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);

    let fullText = "";

    // Process each page
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);

        // Get additional information about the page
        const viewport = page.getViewport({ scale: 1.0 });
        console.log(`Page ${i} size: ${viewport.width}x${viewport.height}`);

        // Enhanced options for text extraction
        const textContent = await page.getTextContent({
          normalizeWhitespace: false, // Preserve original spaces
          disableCombineTextItems: true, // Don't combine items to preserve positioning
          includeMarkedContent: true, // Include all marked content
        });

        // Process Arabic content with improved algorithm
        const pageText = processArabicContent(textContent);

        fullText += pageText + "\n\n"; // Add form feed as page separator

        console.log(`Processed page ${i}/${pdf.numPages}`);
      } catch (pageError) {
        console.error(`Error extracting text from page ${i}:`, pageError);
        fullText += `[Error extracting page ${i}]\n\n`;
      }
    }

    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text with PDF.js:", error);
    throw error;
  }
}

module.exports = { extractTextFromPdfUrlWithPdfJs };
