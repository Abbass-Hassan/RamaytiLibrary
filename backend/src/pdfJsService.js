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

// A selective list of common Arabic prefixes that should connect
const arabicPrefixes = ["ال", "و", "ب", "ل", "ف", "ك"];

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
  const lineHeight = 1.5; // Reduced for more accurate line grouping

  // First pass: collect items by line
  textContent.items.forEach((item) => {
    if (!item.transform) return;

    // Get y position and normalize to group items into lines
    const yPos = Math.round(item.transform[5] / lineHeight) * lineHeight;

    if (!lines[yPos]) {
      lines[yPos] = [];
    }

    // Store item with additional metadata for better processing
    lines[yPos].push({
      ...item,
      x: item.transform[4],
      // Better width calculation using font metrics when available
      width: item.width || item.str.length * (item.fontSize || 10) * 0.6,
      fontSize: item.fontSize || 10,
    });
  });

  // Process each line
  let result = "";

  // Sort lines from top to bottom (reverse y-coordinate since PDF coords are bottom-up)
  const sortedYPositions = Object.keys(lines).sort((a, b) => b - a);

  sortedYPositions.forEach((y) => {
    const lineItems = lines[y];

    // Skip empty lines
    if (lineItems.length === 0) return;

    // Sort right to left for Arabic (higher x-coordinate first)
    lineItems.sort((a, b) => b.x - a.x);

    // ===== ENHANCED WORD BOUNDARY DETECTION =====

    // Step 1: Clean and analyze each item first
    const processedItems = lineItems.map((item) => {
      // Clean the text by removing whitespace and kashidas
      let cleanText = item.str.trim().replace(/ـ/g, "");

      // Analyze character types in the item
      let hasArabic = false;
      let hasPunctuation = false;

      for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        if (isArabicLetter(char)) {
          hasArabic = true;
        }
        if (isPunctuationOrSpace(char)) {
          hasPunctuation = true;
        }
      }

      return {
        ...item,
        cleanText,
        hasArabic,
        hasPunctuation,
        // Improved width estimation for better spacing detection
        estimatedWidth:
          item.width || cleanText.length * (item.fontSize || 10) * 0.6,
      };
    });

    // Step 2: Process items into words with much improved boundary detection
    const words = [];
    let currentWord = "";
    let prevItem = null;

    for (let i = 0; i < processedItems.length; i++) {
      const item = processedItems[i];
      const nextItem =
        i < processedItems.length - 1 ? processedItems[i + 1] : null;

      // Skip empty items
      if (!item.cleanText) continue;

      // Definite word boundary cases
      let isWordBoundary = false;

      // Case 1: Current item contains punctuation
      if (item.hasPunctuation) {
        // Extract text without punctuation
        const textWithoutPunct = item.cleanText
          .split("")
          .filter((ch) => !isPunctuationOrSpace(ch))
          .join("");

        if (textWithoutPunct) {
          currentWord += textWithoutPunct;
        }
        isWordBoundary = true;
      }
      // Case 2: Spatial positioning indicates word boundary
      else if (prevItem && item.hasArabic && prevItem.hasArabic) {
        // Calculate horizontal gap (adjusted for RTL)
        const gap = prevItem.x - (item.x + item.estimatedWidth);

        // Dynamic threshold based on font size for better gap detection
        const fontSizeFactor = (item.fontSize || 10) / 10;
        const gapThreshold = 2 * fontSizeFactor;

        if (gap > gapThreshold) {
          isWordBoundary = true;
        }

        // Case 3: Linguistic rules - previous word ends with non-connecting letter
        if (currentWord.length > 0) {
          const lastChar = currentWord[currentWord.length - 1];
          if (isNonConnectingLetter(lastChar)) {
            isWordBoundary = true;
          }
        }

        // Add current text to word
        currentWord += item.cleanText;
      }
      // Case 4: Different script transitions (e.g., Arabic to non-Arabic)
      else if (prevItem && item.hasArabic !== prevItem.hasArabic) {
        if (currentWord) {
          words.push(currentWord);
          currentWord = "";
        }
        currentWord += item.cleanText;
      }
      // Default case: just add to current word
      else {
        currentWord += item.cleanText;
      }

      // If we've identified a word boundary and have text collected
      if (isWordBoundary && currentWord) {
        words.push(currentWord);
        currentWord = "";
      }

      // Handle end of line or transition to punctuation
      if (!nextItem || (nextItem && nextItem.hasPunctuation)) {
        if (currentWord) {
          words.push(currentWord);
          currentWord = "";
        }
      }

      prevItem = item;
    }

    // Add any remaining word
    if (currentWord) {
      words.push(currentWord);
    }

    // Join the words with spaces and add to result
    const lineText = words.join(" ");

    // Add to result with proper paragraph spacing
    if (result) {
      result += "\n\n"; // Double newline for paragraph separation
    }
    result += lineText;
  });

  // Final light post-processing - fix common Arabic prefix spacing issues
  return improveArabicText(result);
}

// Light post-processing for Arabic text to fix common issues
function improveArabicText(text) {
  if (!text) return "";

  // Fix common prefix spacing issues only - keep changes minimal
  let processed = text;

  // Only fix the most common Arabic prefixes
  for (const prefix of arabicPrefixes) {
    const regex = new RegExp(`\\b${prefix} `, "g");
    processed = processed.replace(regex, `${prefix}`);
  }

  // Remove kashidas if any remain
  processed = processed.replace(/ـ/g, "");

  // Normalize spaces but keep paragraph breaks
  processed = processed.replace(/[ \t]+/g, " ");
  processed = processed.replace(/\n +/g, "\n");

  return processed;
}

// Improved PDF extraction function with enhanced error handling
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
