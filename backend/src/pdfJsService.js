const axios = require("axios");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf");

// Disable workers for Node.js environment
pdfjsLib.GlobalWorkerOptions.disableWorker = true;

// Create a minimal NodeCanvasFactory implementation
class NodeCanvasFactory {
  create(width, height) {
    return { width, height, canvas: { style: {} } };
  }
  reset() {}
  destroy() {}
}

// =================== ARABIC TEXT ANALYSIS TOOLKIT ===================

// Common Arabic word patterns and prefixes/suffixes for validation
const COMMON_PREFIXES = [
  "ال",
  "و",
  "ف",
  "ب",
  "ل",
  "لل",
  "وال",
  "فال",
  "بال",
  "كال",
  "وب",
  "فب",
  "وس",
  "فس",
  "ست",
  "سي",
  "لي",
];
const COMMON_SUFFIXES = [
  "ة",
  "ه",
  "ها",
  "هم",
  "هن",
  "ك",
  "كم",
  "كن",
  "نا",
  "ي",
  "ني",
  "ون",
  "ين",
  "ات",
  "ان",
  "تي",
  "تم",
  "تن",
  "وا",
];

// Character clusters for more advanced analysis
const CLUSTERS = {
  ALEF_FAMILY: ["ا", "أ", "إ", "آ", "ى", "ء"],
  WAW_FAMILY: ["و", "ؤ"],
  YEH_FAMILY: ["ي", "ئ", "ى"],
  CONNECTOR_END: [
    "ب",
    "ت",
    "ث",
    "ج",
    "ح",
    "خ",
    "س",
    "ش",
    "ص",
    "ض",
    "ط",
    "ظ",
    "ع",
    "غ",
    "ف",
    "ق",
    "ك",
    "ل",
    "م",
    "ن",
    "ه",
    "ي",
  ],
  NON_CONNECTOR_END: ["ا", "د", "ذ", "ر", "ز", "و", "ة", "ى", "ء", "ئ", "ؤ"],
  DIACRITICS: ["َ", "ُ", "ِ", "ّ", "ْ", "ً", "ٌ", "ٍ", "ـ"],
};

// Character encoding maps for normalization
const CHAR_NORMALIZATION_MAP = {
  // Normalize different forms of Alef
  أ: "ا",
  إ: "ا",
  آ: "ا",
  ٱ: "ا",
  // Normalize different forms of Yeh
  ى: "ي",
  ئ: "ي",
  // Normalize different forms of Waw
  ؤ: "و",
  // Normalize different forms of Heh
  ة: "ه",
};

/**
 * Advanced detection of Arabic content
 */
function containsArabic(text) {
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Comprehensive check for Arabic letter (including all positional forms)
 */
function isArabicLetter(char) {
  const code = char.charCodeAt(0);
  return (
    ((code >= 0x0600 && code <= 0x06ff) || // Arabic
      (code >= 0x0750 && code <= 0x077f) || // Arabic Supplement
      (code >= 0xfb50 && code <= 0xfdff) || // Arabic Presentation Forms-A
      (code >= 0xfe70 && code <= 0xfeff)) && // Arabic Presentation Forms-B
    !isPunctuationOrSpace(char) &&
    !isDiacritic(char)
  );
}

/**
 * Detect Arabic diacritics (harakat)
 */
function isDiacritic(char) {
  return (
    CLUSTERS.DIACRITICS.includes(char) ||
    (char.charCodeAt(0) >= 0x064b && char.charCodeAt(0) <= 0x0652)
  );
}

/**
 * Advanced punctuation detection including Arabic-specific punctuation
 */
function isPunctuationOrSpace(char) {
  // Comprehensive list of punctuation and space characters
  return (
    /[\s\.\,،؛;\?؟!\(\):\[\]\{\}"'«»\-–—…\u2000-\u200F\u2028-\u202F]/.test(
      char
    ) ||
    ["\u00A0", "\u2003", "\u200C", "\u200D", "\u200E", "\u200F"].includes(char)
  );
}

/**
 * Check if a character is kashida (tatweel)
 */
function isKashida(char) {
  return char === "ـ" || char.charCodeAt(0) === 0x0640;
}

/**
 * Advanced: Determine if a character should end a word in Arabic
 * This is more comprehensive than the previous implementation
 */
function isWordEndingChar(char) {
  return (
    CLUSTERS.NON_CONNECTOR_END.includes(char) ||
    isPunctuationOrSpace(char) ||
    isKashida(char)
  );
}

/**
 * Normalize Arabic text for processing
 * - Removes kashidas
 * - Normalizes character variants
 * - Removes diacritics
 * - Handles common encoding issues
 */
function normalizeArabicText(text) {
  if (!text) return "";

  return (
    text
      // Remove kashidas
      .replace(/ـ/g, "")
      // Remove diacritics
      .replace(/[\u064B-\u0652]/g, "")
      // Normalize character variants
      .split("")
      .map((char) => CHAR_NORMALIZATION_MAP[char] || char)
      .join("")
      // Fix common encoding issues
      .replace(/\u200C/g, "") // Remove zero-width non-joiners
      .replace(/\s+/g, " ") // Normalize spaces
      .trim()
  );
}

/**
 * Context-aware check if two Arabic characters would form a ligature
 */
function wouldFormLigature(char1, char2) {
  if (!char1 || !char2) return false;

  // Characters that don't connect to the next character
  if (CLUSTERS.NON_CONNECTOR_END.includes(char1)) return false;

  // If both are Arabic letters and not in non-connector categories
  return isArabicLetter(char1) && isArabicLetter(char2);
}

/**
 * Get Arabic word score based on linguistic patterns
 * Higher score = more likely to be a valid Arabic word
 */
function getArabicWordScore(word) {
  if (!word || word.length === 0) return 0;

  const normalized = normalizeArabicText(word);
  let score = 0;

  // Long enough to be a word but not unreasonably long
  if (normalized.length >= 2 && normalized.length <= 15) score += 2;

  // Check for common prefixes
  for (const prefix of COMMON_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      score += 2;
      break;
    }
  }

  // Check for common suffixes
  for (const suffix of COMMON_SUFFIXES) {
    if (normalized.endsWith(suffix)) {
      score += 2;
      break;
    }
  }

  // Arabic words typically don't have repeated characters more than twice
  const hasExcessiveRepetition = /(.)\1{2,}/.test(normalized);
  if (hasExcessiveRepetition) score -= 3;

  // Proper letter sequence score - most Arabic words have alternating connectors
  let properSequenceCount = 0;
  for (let i = 0; i < normalized.length - 1; i++) {
    if (wouldFormLigature(normalized[i], normalized[i + 1])) {
      properSequenceCount++;
    }
  }

  score += Math.min(properSequenceCount, 5); // Cap at 5 points

  return score;
}

/**
 * Advanced spatial analysis to determine if two text items should be connected
 */
function shouldConnect(item1, item2, fontSize) {
  if (!item1 || !item2) return false;

  // Size of the gap relative to the font size
  const lastChar = item1.cleanText[item1.cleanText.length - 1];
  const firstChar = item2.cleanText[0];

  // Check if last character of first item is non-connector
  if (CLUSTERS.NON_CONNECTOR_END.includes(lastChar)) return false;

  // Calculate spatial gap (in RTL Arabic, item2 would be to the right of item1)
  const gap = Math.abs(item1.x - (item2.x + item2.estimatedWidth));
  const relativeFontSize = fontSize || 10;
  const adaptiveThreshold = relativeFontSize * 0.4; // 40% of font size

  return gap <= adaptiveThreshold && wouldFormLigature(lastChar, firstChar);
}

// =================== ADVANCED PDF PROCESSING ===================

/**
 * Function to intelligently detect and extract Arabic text from PDF content
 * with advanced linguistic and spatial analysis
 */
function processArabicContent(textContent, options = {}) {
  if (!textContent || !textContent.items || textContent.items.length === 0) {
    return "";
  }

  const debugMode = options.debug || false;
  if (debugMode) {
    console.log(`Processing ${textContent.items.length} text items`);
  }

  // Sample text to detect if document is Arabic
  const sampleText = textContent.items
    .slice(0, Math.min(50, textContent.items.length))
    .map((item) => item.str)
    .join("");

  const isArabicDocument = containsArabic(sampleText);

  if (!isArabicDocument) {
    // For non-Arabic documents, use the original approach
    return textContent.items.map((item) => item.str).join(" ");
  }

  // Group items by their vertical position with enhanced precision
  const lines = {};
  // Use adaptive line height based on font size detection
  const fontSizes = textContent.items
    .filter((item) => item.transform && item.transform.length >= 6)
    .map((item) => item.transform[3]); // Height in transform matrix

  // Use median font size for more robust line height estimation
  const sortedFontSizes = [...fontSizes].sort((a, b) => a - b);
  const medianFontSize =
    sortedFontSizes[Math.floor(sortedFontSizes.length / 2)] || 10;
  const lineHeight = Math.max(1, Math.round(medianFontSize * 0.2)); // 20% of font size

  if (debugMode) {
    console.log(
      `Using line height: ${lineHeight} (based on median font size: ${medianFontSize})`
    );
  }

  // First pass: collect all items by line with enhanced attributes
  textContent.items.forEach((item, index) => {
    if (!item.transform || item.transform.length < 6) return;

    // Get y position with more precise normalization
    const yPos = Math.round(item.transform[5] / lineHeight) * lineHeight;
    const fontSize = item.transform[3] || medianFontSize;

    if (!lines[yPos]) {
      lines[yPos] = [];
    }

    // Store the item with enhanced metadata
    lines[yPos].push({
      ...item,
      index,
      x: item.transform[4],
      y: item.transform[5],
      fontSize,
      // More accurate width estimation using font metrics
      width: item.width || item.str.length * fontSize * 0.6,
      estimatedWidth: item.width || item.str.length * fontSize * 0.6,
      // Clean and normalize the text for processing
      originalText: item.str,
      cleanText: item.str.trim().replace(/ـ/g, ""), // Remove kashidas
      hasRTL: containsArabic(item.str),
      score: 0, // Will be calculated later
    });
  });

  // Process each line with advanced linguistic and spatial analysis
  let result = "";
  const lineKeys = Object.keys(lines).sort(
    (a, b) => parseFloat(a) - parseFloat(b)
  );

  lineKeys.forEach((y) => {
    const lineItems = lines[y];
    if (lineItems.length === 0) return;

    // For RTL text (Arabic), sort right to left (higher x-coordinate first)
    lineItems.sort((a, b) => b.x - a.x);

    // Phase 1: Enhanced text preprocessing and linguistic analysis
    lineItems.forEach((item) => {
      // Calculate linguistic score for each item
      item.score = getArabicWordScore(item.cleanText);

      // Flag items with punctuation or special characters
      item.hasPunctuation = item.cleanText
        .split("")
        .some((ch) => isPunctuationOrSpace(ch));

      // Detect potential word fragments
      const lastChar = item.cleanText[item.cleanText.length - 1];
      item.endsWithConnector =
        isArabicLetter(lastChar) && !isWordEndingChar(lastChar);

      // Mark logical groups based on positioning
      if (lineItems.indexOf(item) > 0) {
        const prevItem = lineItems[lineItems.indexOf(item) - 1];
        item.gapToPrev = Math.abs(prevItem.x - (item.x + item.estimatedWidth));
      }
    });

    // Phase 2: Advanced word boundary detection using context windows
    const words = [];
    let currentWord = "";
    let currentWordItems = [];
    let previousItem = null;

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const nextItem = i < lineItems.length - 1 ? lineItems[i + 1] : null;

      // Skip empty items
      if (!item.cleanText) continue;

      // Handle items with punctuation specially
      if (item.hasPunctuation) {
        // Extract text without punctuation
        const cleanChars = [];
        const punctChars = [];

        for (const char of item.cleanText) {
          if (isPunctuationOrSpace(char)) {
            punctChars.push(char);
          } else {
            cleanChars.push(char);
          }
        }

        const textWithoutPunct = cleanChars.join("");
        const punctuation = punctChars.join("");

        // Add clean text to current word if it exists
        if (textWithoutPunct) {
          currentWord += textWithoutPunct;
          currentWordItems.push(item);
        }

        // Punctuation forces a word boundary
        if (currentWord) {
          words.push(currentWord);
          currentWord = "";
          currentWordItems = [];
        }

        // Add punctuation as its own "word" if it exists
        if (punctuation.trim()) {
          words.push(punctuation);
        }
      } else {
        // Use advanced analysis to determine if this should connect to previous text
        let isNewWord = true;

        if (previousItem) {
          // Check both spatial and linguistic properties
          const shouldJoin = shouldConnect(previousItem, item, medianFontSize);
          const lastCharPrev =
            previousItem.cleanText[previousItem.cleanText.length - 1];
          const gapIsSmall = item.gapToPrev < medianFontSize * 0.3;

          // Advanced multi-factor decision
          if (
            (!isWordEndingChar(lastCharPrev) && shouldJoin) ||
            (previousItem.endsWithConnector && gapIsSmall)
          ) {
            isNewWord = false;
          }

          // Context-aware corrections
          if (currentWordItems.length > 0) {
            // If we have a long sequence that looks like a valid word, don't break it
            const combinedScore = getArabicWordScore(
              currentWord + item.cleanText
            );
            if (combinedScore > 5 && gapIsSmall) {
              isNewWord = false;
            }
          }
        }

        // Start a new word if needed
        if (isNewWord && currentWord) {
          words.push(currentWord);
          currentWord = "";
          currentWordItems = [];
        }

        // Add this item to the current word
        currentWord += item.cleanText;
        currentWordItems.push(item);
      }

      previousItem = item;

      // Handle the end of the line
      if (!nextItem && currentWord) {
        words.push(currentWord);
        currentWord = "";
        currentWordItems = [];
      }
    }

    // Phase 3: Post-processing and refinement
    // Apply additional linguistic validation and correction
    const refinedWords = words
      .map((word) => {
        // Skip punctuation and very short words
        if (
          word.length <= 1 ||
          word.split("").every((ch) => isPunctuationOrSpace(ch))
        ) {
          return word;
        }

        // Remove any trailing non-word characters
        return word.replace(/[\s\.\,،;\?؟!\(\):\[\]\{\}"'«»\-–—…]+$/g, "");
      })
      .filter((word) => word.length > 0);

    // Join the words with spaces, preserving original punctuation spacing
    const lineText = refinedWords.join(" ");

    // Add to result with proper line spacing
    if (result) {
      result += "\n\n"; // Double newline for paragraph separation
    }
    result += lineText;
  });

  return result;
}

/**
 * Main extraction function with comprehensive options
 */
async function extractTextFromPdfUrlWithPdfJs(pdfUrl, options = {}) {
  try {
    if (!pdfUrl) {
      throw new Error("PDF URL is undefined or null");
    }

    console.log(`Starting advanced Arabic text extraction from: ${pdfUrl}`);

    // Download the PDF
    const response = await axios.get(pdfUrl, {
      responseType: "arraybuffer",
      timeout: options.timeout || 30000,
      validateStatus: (status) => status === 200,
    });

    const data = new Uint8Array(response.data);
    console.log(`Downloaded PDF: ${data.length} bytes`);

    // Configure PDF.js with enhanced options for Arabic support
    const loadingTask = pdfjsLib.getDocument({
      data,
      disableFontFace: false, // Enable font face for better character recognition
      nativeImageDecoderSupport: "none",
      ignoreErrors: true,
      canvasFactory: new NodeCanvasFactory(),
      cMapUrl: "./node_modules/pdfjs-dist/cmaps/",
      cMapPacked: true,
      useSystemFonts: true, // Use system fonts for better character recognition
      ...options.pdfOptions,
    });

    const pdf = await loadingTask.promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);

    let fullText = "";

    // Process each page with advanced options
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);

        // Get page metadata for better analysis
        const viewport = page.getViewport({ scale: 1.0 });
        const pageSize = { width: viewport.width, height: viewport.height };

        // Enhanced text extraction options
        const textContent = await page.getTextContent({
          normalizeWhitespace: false, // We'll handle whitespace in our processing
          disableCombineTextItems: false,
          includeMarkedContent: true,
        });

        // Process Arabic content with our advanced algorithm
        const pageText = processArabicContent(textContent, {
          debug: options.debug,
          pageSize,
          pageNumber: i,
        });

        fullText += pageText + "\f"; // Form feed as page separator
        console.log(`Processed page ${i}/${pdf.numPages}`);
      } catch (pageError) {
        console.error(`Error extracting text from page ${i}:`, pageError);
        fullText += `[Error extracting page ${i}]\f`;
      }
    }

    // Final post-processing stage
    return (
      fullText
        // Fix common extraction artifacts
        .replace(/\s{2,}/g, " ")
        // Fix common Arabic punctuation spacing issues
        .replace(/\s([،؛؟])/g, "$1")
        // Normalize full stops and question marks
        .replace(/\s([\.!])/g, "$1")
    );
  } catch (error) {
    console.error("Error extracting PDF text with PDF.js:", error);
    throw error;
  }
}

// Export the module functions
module.exports = {
  extractTextFromPdfUrlWithPdfJs,
  processArabicContent,
  normalizeArabicText,
};
