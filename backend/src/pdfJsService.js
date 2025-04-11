const axios = require("axios");
// Use the legacy CommonJS build with explicit path
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

// Improved: Check if this character is usually at the end of a word or non-connecting
function isEndOfWordChar(char) {
  // These characters typically end words or don't connect to the next character
  // Expanded list to include more characters that don't connect to the following character
  const endChars = [
    "ا",
    "إ",
    "أ",
    "آ",
    "د",
    "ذ",
    "ر",
    "ز",
    "و",
    "ؤ",
    "ء",
    "ة",
    // Adding more non-connecting characters
    "ى",
    "ئ",
    "ظ",
    "ط",
  ];
  return endChars.includes(char);
}

// Improved: More comprehensive check for punctuation or space
function isPunctuationOrSpace(char) {
  // Added more Arabic-specific punctuation and improved space detection
  return (
    /[\s\.\,،;\?؟!\(\):\[\]\{\}"'«»\-\u2000-\u200F\u2028-\u202F]/.test(char) ||
    char === String.fromCharCode(0x00a0) || // Non-breaking space
    char === String.fromCharCode(0x2003) || // Em space
    char === String.fromCharCode(0x200c)
  ); // Zero-width non-joiner
}

// Improved: Check for kashida (tatweel) - Arabic text justification character
function isKashida(char) {
  return char === "ـ" || char.charCodeAt(0) === 0x0640;
}

// Improved: Advanced processing for Arabic text content with better word boundary detection
function processArabicContent(textContent) {
  if (!textContent || !textContent.items || textContent.items.length === 0) {
    return "";
  }

  // Log basic information about the textContent for debugging
  console.log(`Processing ${textContent.items.length} text items`);

  // Sample text to detect if document is Arabic
  const sampleText = textContent.items
    .slice(0, 20)
    .map((item) => item.str)
    .join("");
  const isArabicDocument = containsArabic(sampleText);

  if (!isArabicDocument) {
    // For non-Arabic documents, use the original approach
    return textContent.items.map((item) => item.str).join(" ");
  }

  // Group items by their vertical position (approximate lines)
  const lines = {};
  // Use smaller tolerance for better line detection
  const lineHeight = 2; // Reduced from 3 to 2 for more precise line detection

  // First pass: collect all items by line
  textContent.items.forEach((item) => {
    if (!item.transform) return;

    // Get y position and normalize
    const yPos = Math.round(item.transform[5] / lineHeight) * lineHeight;

    if (!lines[yPos]) {
      lines[yPos] = [];
    }

    // Store the item with its x position and improved width estimation
    lines[yPos].push({
      ...item,
      x: item.transform[4],
      // Improved width estimation for better gap detection
      width: item.width || item.str.length * (item.fontSize || 10) * 0.5,
      fontSize: item.fontSize || 10,
    });
  });

  // Process each line
  let result = "";

  // Sort lines from top to bottom (reverse y-coordinate since PDF coordinates are bottom-up)
  Object.keys(lines)
    .sort((a, b) => a - b)
    .forEach((y) => {
      const lineItems = lines[y];

      // Skip empty lines
      if (lineItems.length === 0) return;

      // Sort right to left for Arabic (higher x-coordinate first)
      lineItems.sort((a, b) => b.x - a.x);

      // Step 1: Pre-process each item's text
      const cleanedItems = lineItems.map((item) => {
        // Remove internal whitespace but preserve important punctuation
        let cleanText = item.str.trim();

        // New: Remove kashidas (tatweel) that might be causing incorrect connections
        cleanText = cleanText.replace(/ـ/g, "");

        return {
          ...item,
          cleanText,
          // Flag if this item contains punctuation that signals a word boundary
          hasPunctuation: cleanText
            .split("")
            .some((ch) => isPunctuationOrSpace(ch)),
          // Improved width estimation is important for word boundary detection
          estimatedWidth:
            item.width || cleanText.length * (item.fontSize || 10) * 0.5,
        };
      });

      // Step 2: Process items to form words with improved boundary detection
      const words = [];
      let currentWord = "";
      let lastItem = null;

      for (let i = 0; i < cleanedItems.length; i++) {
        const item = cleanedItems[i];
        const nextItem =
          i < cleanedItems.length - 1 ? cleanedItems[i + 1] : null;

        // Skip empty items
        if (!item.cleanText) continue;

        // Check for word boundaries
        let isWordBoundary = false;

        // Check if current item has punctuation (definite word boundary)
        if (item.hasPunctuation) {
          // Extract actual text without punctuation
          const textWithoutPunctuation = item.cleanText
            .split("")
            .filter((ch) => !isPunctuationOrSpace(ch))
            .join("");
          if (textWithoutPunctuation) {
            currentWord += textWithoutPunctuation;
          }
          isWordBoundary = true;
        } else {
          // Check position-based word boundary (if we have a previous item)
          if (lastItem) {
            // Calculate horizontal gap (in RTL Arabic, current X is less than last X)
            const gap = lastItem.x - (item.x + item.estimatedWidth);

            // Dynamic gap threshold based on font size
            const fontSizeFactor = (item.fontSize || 10) / 10;
            const gapThreshold = 3 * fontSizeFactor; // Adjusted threshold

            // More sensitive gap detection
            if (gap > gapThreshold) {
              isWordBoundary = true;
            }
          }

          // Check linguistic rules - if last char of previous word is a non-connecting letter
          if (lastItem && currentWord.length > 0) {
            const lastChar = currentWord[currentWord.length - 1];
            if (isEndOfWordChar(lastChar)) {
              isWordBoundary = true;
            }
          }

          // Add current text to word
          currentWord += item.cleanText;
        }

        // If we've identified a word boundary and have text collected
        if (isWordBoundary && currentWord) {
          words.push(currentWord);
          currentWord = "";
        }

        lastItem = item;

        // Handle the last item or if the next item is punctuation
        if (!nextItem || (nextItem && nextItem.hasPunctuation)) {
          if (currentWord) {
            words.push(currentWord);
            currentWord = "";
          }
        }
      }

      // Add any remaining word
      if (currentWord) {
        words.push(currentWord);
      }

      // Join the words with spaces
      const lineText = words.join(" ");

      // Add to result with proper line spacing
      if (result) {
        result += "\n\n"; // Double newline for paragraph separation
      }
      result += lineText;
    });

  return result;
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
      disableFontFace: true,
      nativeImageDecoderSupport: "none",
      ignoreErrors: true,
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
          normalizeWhitespace: true,
          disableCombineTextItems: false,
          includeMarkedContent: true,
        });

        // Process Arabic content with improved algorithm
        const pageText = processArabicContent(textContent);

        fullText += pageText + "\f"; // Add form feed as page separator

        console.log(`Processed page ${i}/${pdf.numPages}`);
      } catch (pageError) {
        console.error(`Error extracting text from page ${i}:`, pageError);
        fullText += `[Error extracting page ${i}]\f`;
      }
    }

    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text with PDF.js:", error);
    throw error;
  }
}

module.exports = { extractTextFromPdfUrlWithPdfJs };
