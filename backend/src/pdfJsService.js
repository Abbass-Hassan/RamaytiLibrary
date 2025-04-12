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

// Enhanced: Comprehensive check for non-connecting letters in Arabic
function isNonConnectingLetter(char) {
  // These characters don't connect to the following character
  const nonConnecting = [
    "ا",
    "أ",
    "إ",
    "آ", // Alif forms
    "د",
    "ذ", // Dal forms
    "ر",
    "ز", // Ra forms
    "و",
    "ؤ", // Waw forms
    "ة",
    "ء", // Ta marbuta and Hamza
    "ى", // Alif maqsura
  ];
  return nonConnecting.includes(char);
}

// Enhanced: Better detection of punctuation and spaces in multilingual text
function isPunctuationOrSpace(char) {
  // Include common Arabic/Latin punctuation and various space types
  return (
    /[\s\.\,،;\?؟!\(\):\[\]\{\}"'«»\-–—\u2000-\u200F\u2028-\u202F]/.test(
      char
    ) ||
    char === String.fromCharCode(0x00a0) || // Non-breaking space
    char === String.fromCharCode(0x2003) || // Em space
    char === String.fromCharCode(0x200c) || // Zero-width non-joiner
    char === String.fromCharCode(0x200d) || // Zero-width joiner
    char === String.fromCharCode(0x200e) || // LTR mark
    char === String.fromCharCode(0x200f) // RTL mark
  );
}

// Check for kashida (tatweel) - Arabic text justification character
function isKashida(char) {
  return char === "ـ" || char.charCodeAt(0) === 0x0640;
}

// Arabic prefixes that should be connected to following words
const arabicPrefixes = [
  "ال",
  "وال",
  "بال",
  "لل",
  "فال",
  "كال", // Articles with connections
  "و",
  "ف",
  "ب",
  "ل",
  "ك",
  "س", // Single letter prefixes
  "لل",
  "لي",
  "لك",
  "له",
  "لن",
  "لم", // Lam prefixes
  "ست",
  "سي",
  "سن",
  "سا", // Sin prefixes
  "مت",
  "مي",
  "من",
  "ما", // Mim prefixes
  "فس",
  "في",
  "فل",
  "فب",
  "فك", // Compound prefixes
  "وس",
  "وي",
  "ول",
  "وب",
  "وك", // Compound prefixes
  "بي",
  "بت",
  "بن",
  "بم",
  "بس", // Compound prefixes
];

// Arabic suffixes that should be connected to preceding words
const arabicSuffixes = [
  "ه",
  "ها",
  "هم",
  "هن",
  "هما", // Pronouns
  "ك",
  "كم",
  "كن",
  "كما", // Pronouns
  "نا",
  "ني", // Pronouns
  "تم",
  "تن",
  "تما", // Verb endings
  "ون",
  "ين",
  "ان",
  "ات",
  "ة",
  "ت", // Noun/adjective endings
  "ي",
  "تي",
  "ا",
  "وا",
  "ن", // Various endings
];

// Common Arabic words for post-processing verification
const commonArabicWords = [
  "في",
  "من",
  "إلى",
  "على",
  "عن",
  "مع",
  "هذا",
  "هذه",
  "ذلك",
  "تلك",
  "كان",
  "كانت",
  "يكون",
  "أن",
  "لا",
  "ما",
  "هل",
  "قد",
  "حتى",
  "إذا",
  "كل",
  "بعض",
  "أي",
  "واحد",
  "اثنين",
  "ثلاثة",
  "الذي",
  "التي",
  "الذين",
  "يوم",
  "ليلة",
  "صباح",
  "مساء",
  "الله",
  "الناس",
  "الرجل",
  "المرأة",
  "شيء",
  "وقت",
  "مكان",
  "قبل",
  "بعد",
  "بين",
  "عند",
  "حول",
  "نحو",
  "عام",
  "أول",
  "آخر",
  "جديد",
  "قديم",
  "كبير",
  "صغير",
  "طويل",
  "قصير",
  "كثير",
  "قليل",
];

// Completely revised: Improved processing for Arabic text extraction
function processArabicContent(textContent) {
  if (!textContent || !textContent.items || textContent.items.length === 0) {
    return "";
  }

  // Log basic information for debugging
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
  const lineHeight = 1; // Very small value for precise line grouping

  // First pass: collect items by line
  textContent.items.forEach((item) => {
    if (!item.transform) return;

    // Get y position and normalize to group items into lines
    const yPos = Math.round(item.transform[5] / lineHeight) * lineHeight;

    if (!lines[yPos]) {
      lines[yPos] = [];
    }

    // Clean item text (remove kashidas, etc.)
    const cleanText = item.str
      .replace(/ـ/g, "") // Remove kashidas
      .replace(/[\u200B-\u200F]/g, ""); // Remove zero-width spaces and direction marks

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

  // Sort lines from top to bottom (reverse y-coordinate since PDF coords are bottom-up)
  const sortedYPositions = Object.keys(lines)
    .map(Number)
    .sort((a, b) => b - a);

  // Track paragraphs for better formatting
  let paragraphs = [];
  let currentParagraph = [];

  sortedYPositions.forEach((y, lineIndex) => {
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

    // ===== ENHANCED WORD BOUNDARY DETECTION =====

    // Process the line items to form coherent words
    const processedItems = [];
    let currentItem = null;

    for (const item of lineItems) {
      if (!currentItem) {
        // First item in a sequence
        currentItem = { ...item };
      } else {
        // Calculate horizontal gap between items
        const gap = currentItem.x - (item.x + item.width);
        const fontSizeFactor =
          (Math.max(currentItem.fontSize, item.fontSize) || 10) / 10;
        const gapThreshold = 1.5 * fontSizeFactor;

        // Get last character of current item and first of next
        const lastCharOfCurrent = currentItem.text.charAt(
          currentItem.text.length - 1
        );
        const firstCharOfNext = item.text.charAt(0);

        // Check if items should be merged based on multiple factors
        const shouldMerge =
          // Spatial proximity check
          gap < gapThreshold ||
          // Linguistic checks for Arabic text
          (isArabicLetter(lastCharOfCurrent) &&
            !isNonConnectingLetter(lastCharOfCurrent) &&
            isArabicLetter(firstCharOfNext)) ||
          // Current item ends with a prefix
          arabicPrefixes.some(
            (prefix) =>
              currentItem.text === prefix || currentItem.text.endsWith(prefix)
          ) ||
          // Next item is a suffix
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
    lineText = processArabicLine(lineText);

    // Determine if this line completes a paragraph
    const isShortLine = lineText.length < 30;
    const endsWithPunctuation = /[\.،؟!:]$/.test(lineText);
    const isParagraphBreak =
      isShortLine ||
      endsWithPunctuation ||
      lineIndex === 0 ||
      lineIndex === sortedYPositions.length - 1;

    // Add line to current paragraph
    currentParagraph.push(lineText);

    // Start a new paragraph if needed
    if (isParagraphBreak) {
      paragraphs.push(currentParagraph.join(" "));
      currentParagraph = [];
    }
  });

  // Add any remaining paragraph
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(" "));
  }

  // Join paragraphs with double newlines
  result = paragraphs.filter((p) => p.trim()).join("\n\n");

  // Final post-processing pass
  return finalizeArabicText(result);
}

// Process a single line of Arabic text
function processArabicLine(text) {
  if (!text) return "";

  // Remove excessive spaces
  let processed = text.replace(/\s+/g, " ").trim();

  // Join common Arabic prefixes with the following word
  for (const prefix of arabicPrefixes) {
    const regex = new RegExp(`\\b${prefix}\\s+(\\S+)`, "g");
    processed = processed.replace(regex, `${prefix}$1`);
  }

  // Fix spacing around punctuation
  processed = processed
    .replace(/ ([\.،:؛؟!])/g, "$1")
    .replace(/([\.،:؛؟!]) /g, "$1 ");

  return processed;
}

// Final post-processing steps for Arabic text
function finalizeArabicText(text) {
  if (!text) return "";

  // Split text into words for processing
  const words = text.split(/\s+/);
  const processedWords = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    // Check if this word should be joined with the next word
    if (i < words.length - 1) {
      const nextWord = words[i + 1];

      // Check if current word is a prefix that should connect to the next word
      const hasPrefixEnding = arabicPrefixes.some(
        (prefix) =>
          word === prefix ||
          (word.length <= prefix.length + 2 && word.endsWith(prefix))
      );

      // Check if next word is a suffix that should connect to this word
      const hasSuffixStart = arabicSuffixes.some(
        (suffix) =>
          nextWord === suffix ||
          (nextWord.length <= suffix.length + 2 && nextWord.startsWith(suffix))
      );

      if (
        (hasPrefixEnding && containsArabic(nextWord)) ||
        (hasSuffixStart && containsArabic(word))
      ) {
        processedWords.push(word + nextWord);
        i++; // Skip next word
        continue;
      }
    }

    processedWords.push(word);
  }

  // Join words with proper spacing
  let processedText = processedWords.join(" ");

  // Additional Arabic-specific fixes
  processedText = processedText
    // Fix common spacing issues around punctuation
    .replace(/ ([\.،:؛؟!])/g, "$1")
    .replace(/([\.،:؛؟!]) /g, "$1 ")
    // Fix common mistakes in extracted Arabic text
    .replace(/ي/g, "ي") // Normalize Yaa
    .replace(/ك/g, "ك") // Normalize Kaaf
    .replace(/ه‍/g, "ه") // Normalize Haa
    // Fix common word patterns
    .replace(/ال (\S+)/g, "ال$1")
    .replace(/([وفبكل]) (\S+)/g, "$1$2");

  return processedText;
}

// Improved PDF extraction function with enhanced error handling and options
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

        if (fullText && pageText) {
          fullText += "\n\n"; // Add double newline between pages
        }
        fullText += pageText;

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
