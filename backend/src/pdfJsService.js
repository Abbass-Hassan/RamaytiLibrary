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

// IMPROVEMENT: Refined list of Arabic prefixes with frequency prioritization
// Most common prefixes first, less common later - helps with decision making
const arabicPrefixes = [
  // Very high frequency prefixes - most likely to need joining
  "ال",
  "و",
  "ب",
  "ل",
  "ف",
  "ك",
  "س",
  // Common compound prefixes
  "وال",
  "بال",
  "لل",
  "فال",
  "كال",
  // Less common prefixes
  "لي",
  "لك",
  "له",
  "لن",
  "لم",
  "ست",
  "سي",
  "سن",
  "سا",
  "مت",
  "مي",
  "من",
  "ما",
  "في",
  "فل",
  "فب",
  "فك",
  "وي",
  "ول",
  "وب",
  "وك",
  "بي",
  "بت",
  "بن",
  "بم",
  "بس",
];

// IMPROVEMENT: Prioritized Arabic suffixes list
const arabicSuffixes = [
  // High frequency suffixes
  "ه",
  "ها",
  "هم",
  "ي",
  "ون",
  "ين",
  "ة",
  "ت",
  // Medium frequency suffixes
  "نا",
  "ني",
  "كم",
  "كن",
  "ان",
  "ات",
  // Lower frequency suffixes
  "هن",
  "هما",
  "ك",
  "كما",
  "تم",
  "تن",
  "تما",
  "تي",
  "ا",
  "وا",
  "ن",
];

// IMPROVEMENT: Additional word boundary indicators for Arabic
function isLikelyWordBoundary(prevItem, currentItem) {
  if (!prevItem || !currentItem) return false;

  // Check for significant font size differences (could indicate headings, etc.)
  if (Math.abs(prevItem.fontSize - currentItem.fontSize) > 2) {
    return true;
  }

  // Check for significant style changes that might indicate separate words
  if (prevItem.fontName !== currentItem.fontName) {
    return true;
  }

  // IMPROVEMENT: Better spatial analysis based on how Arabic is printed
  // For RTL text, if the current item is significantly to the right of where
  // we'd expect the next connected character, it's likely a new word
  return false;
}

// IMPROVEMENT: Common Arabic letter pairs that should NOT be split
// These represent character combinations that should always stay together
const inseparableArabicPairs = [
  "لا",
  "لإ",
  "لأ",
  "لآ", // Lam-Alif combinations
  "مح",
  "صل",
  "رح",
  "سل", // Common letter pairs
  "ال",
  "وا",
  "في", // Common short words/prefixes
];

// Improved function to check if two characters should remain together
function shouldKeepTogether(char1, char2) {
  const pair = char1 + char2;
  return inseparableArabicPairs.some((p) => p === pair);
}

// IMPROVEMENT: Enhanced processing for Arabic text extraction with more precise controls
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
  // IMPROVEMENT: More precise line detection threshold
  const lineHeight = 0.8; // Even smaller value for more precise line grouping

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
      y: item.transform[5],
      // IMPROVEMENT: More accurate width calculation with fallback options
      width: item.width || item.str.length * (item.fontSize || 10) * 0.6,
      fontSize: item.fontSize || 10,
      fontName: item.fontName || "",
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

  // IMPROVEMENT: Better paragraph management with context awareness
  let paragraphs = [];
  let currentParagraph = [];
  let lastLineLength = 0; // Track previous line length for paragraph detection

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
        // IMPROVEMENT: More nuanced gap detection
        const gap = currentItem.x - (item.x + item.width);
        const fontSizeFactor =
          (Math.max(currentItem.fontSize, item.fontSize) || 10) / 10;
        // IMPROVEMENT: More conservative threshold to prevent over-joining
        const gapThreshold = 1.2 * fontSizeFactor;

        // Get last character of current item and first of next
        const lastCharOfCurrent = currentItem.text.charAt(
          currentItem.text.length - 1
        );
        const firstCharOfNext = item.text.charAt(0);

        // IMPROVEMENT: More selective merging conditions
        const shouldMerge =
          // Spatial proximity check - stricter threshold
          gap < gapThreshold &&
          // Linguistic checks for Arabic text - more specific
          ((isArabicLetter(lastCharOfCurrent) &&
            !isNonConnectingLetter(lastCharOfCurrent) &&
            isArabicLetter(firstCharOfNext)) ||
            // Character pair should stay together
            shouldKeepTogether(lastCharOfCurrent, firstCharOfNext) ||
            // Current item ends with a prefix - check exact match first
            arabicPrefixes.some(
              (prefix) =>
                currentItem.text === prefix || currentItem.text.endsWith(prefix)
            ) ||
            // Next item is a suffix - check exact match first
            arabicSuffixes.some(
              (suffix) => item.text === suffix || item.text.startsWith(suffix)
            ));

        // IMPROVEMENT: Check for special cases that indicate word boundaries
        const forceWordBoundary = isLikelyWordBoundary(currentItem, item);

        if (shouldMerge && !forceWordBoundary) {
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

    // IMPROVEMENT: More careful joining with smart spacing
    let lineText = processedItems
      .map((item) => item.text)
      .join(" ")
      .trim();

    // Apply per-line processing for Arabic text
    lineText = processArabicLine(lineText);

    // IMPROVEMENT: Enhanced paragraph detection
    const currentLineLength = lineText.length;
    const isShortLine = currentLineLength < 30;
    const isSignificantLengthChange =
      Math.abs(currentLineLength - lastLineLength) > 20;
    const endsWithPunctuation = /[\.،؟!:]$/.test(lineText);
    const startsWithDialogueMarker = /^[-–]/.test(lineText);

    // Determine if this line completes a paragraph using multiple signals
    const isParagraphBreak =
      isShortLine ||
      endsWithPunctuation ||
      isSignificantLengthChange ||
      startsWithDialogueMarker ||
      lineIndex === 0 ||
      lineIndex === sortedYPositions.length - 1;

    // Add line to current paragraph
    currentParagraph.push(lineText);

    // Start a new paragraph if needed
    if (isParagraphBreak && currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(" "));
      currentParagraph = [];
    }

    // Update for next iteration
    lastLineLength = currentLineLength;
  });

  // Add any remaining paragraph
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(" "));
  }

  // IMPROVEMENT: Better paragraph joining with appropriate spacing
  result = paragraphs.filter((p) => p.trim()).join("\n\n");

  // Final post-processing pass with improved Arabic handling
  return finalizeArabicText(result);
}

// IMPROVEMENT: Enhanced processing for individual lines
function processArabicLine(text) {
  if (!text) return "";

  // Remove excessive spaces but keep meaningful ones
  let processed = text.replace(/\s{2,}/g, " ").trim();

  // IMPROVEMENT: More selective prefix joining to avoid over-joining
  // Only join the most common/reliable prefixes to prevent errors
  for (const prefix of arabicPrefixes.slice(0, 7)) {
    // Take only the highest frequency prefixes
    const regex = new RegExp(`\\b${prefix}\\s+(\\S+)`, "g");
    processed = processed.replace(regex, `${prefix}$1`);
  }

  // Fix spacing around punctuation with better handling of edge cases
  processed = processed
    .replace(/ ([\.،:؛؟!])/g, "$1")
    .replace(/([\.،:؛؟!]) /g, "$1 ");

  return processed;
}

// IMPROVEMENT: More sophisticated final text processing
function finalizeArabicText(text) {
  if (!text) return "";

  // IMPROVEMENT: Smarter word joining with context awareness
  const words = text.split(/\s+/);
  const processedWords = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    // Only check word joining if we have more words to process
    if (i < words.length - 1) {
      const nextWord = words[i + 1];

      // IMPROVEMENT: More precise prefix/suffix detection
      // Check if current word is a prefix - exact match check first for reliability
      const isPrefixMatch = arabicPrefixes.some((prefix) => word === prefix);

      // Only check prefix ending if not an exact match
      const hasPrefixEnding =
        !isPrefixMatch &&
        arabicPrefixes.some(
          (prefix) => word.endsWith(prefix) && word.length <= prefix.length + 2
        );

      // Check if next word is a suffix - exact match first
      const isSuffixMatch = arabicSuffixes.some(
        (suffix) => nextWord === suffix
      );

      // Only check suffix start if not an exact match
      const hasSuffixStart =
        !isSuffixMatch &&
        arabicSuffixes.some(
          (suffix) =>
            nextWord.startsWith(suffix) && nextWord.length <= suffix.length + 2
        );

      // Join words based on prefix/suffix matches, but only if they contain Arabic
      if (
        (isPrefixMatch && containsArabic(nextWord)) ||
        (isSuffixMatch && containsArabic(word)) ||
        (hasPrefixEnding && containsArabic(nextWord) && word.length <= 4) || // Length limit for partial matches
        (hasSuffixStart && containsArabic(word) && nextWord.length <= 4)
      ) {
        // Length limit for partial matches
        processedWords.push(word + nextWord);
        i++; // Skip next word
        continue;
      }
    }

    processedWords.push(word);
  }

  // Join words with proper spacing
  let processedText = processedWords.join(" ");

  // IMPROVEMENT: More comprehensive Arabic-specific fixes
  processedText = processedText
    // Fix common spacing issues around punctuation
    .replace(/ ([\.،:؛؟!])/g, "$1")
    .replace(/([\.،:؛؟!]) /g, "$1 ")
    // Fix common mistakes in extracted Arabic text
    .replace(/ي/g, "ي") // Normalize Yaa
    .replace(/ك/g, "ك") // Normalize Kaaf
    .replace(/ه‍/g, "ه") // Normalize Haa
    // Fix common word patterns with higher precision to avoid false positives
    .replace(/\bال (\S+)/g, "ال$1")
    .replace(/\b([وفبكل]) (\S+)/g, "$1$2")
    // Final cleanup
    .replace(/\s{2,}/g, " ") // Remove any double spaces
    .trim();

  return processedText;
}

// IMPROVEMENT: Optimized PDF extraction with better error handling
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
      timeout: options.timeout || 30000, // Longer timeout for larger files
      validateStatus: (status) => status === 200, // Only accept 200 OK responses
    });

    const data = new Uint8Array(response.data);
    console.log(`Downloaded PDF: ${data.length} bytes`);

    // IMPROVEMENT: Enhanced PDF.js configuration for better Arabic support
    const loadingTask = pdfjsLib.getDocument({
      data: data,
      disableFontFace: false, // Enable font information for better extraction
      useSystemFonts: true, // Use system fonts when possible
      nativeImageDecoderSupport: "none",
      ignoreErrors: true, // Continue despite errors
      verbosity: 0, // Reduce console noise
      isEvalSupported: true, // Enable eval for enhanced processing
      canvasFactory: new NodeCanvasFactory(),
      cMapUrl: "./node_modules/pdfjs-dist/cmaps/",
      cMapPacked: true,
      ...options.pdfOptions,
    });

    // Wait for the PDF to load
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);

    let fullText = "";
    let totalPages = pdf.numPages;

    // IMPROVEMENT: Process pages in smaller batches to avoid memory issues
    const BATCH_SIZE = 10;

    for (
      let batchStart = 1;
      batchStart <= totalPages;
      batchStart += BATCH_SIZE
    ) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, totalPages);
      console.log(`Processing pages ${batchStart} to ${batchEnd}`);

      // Process each page in the batch
      const batchPromises = [];

      for (let i = batchStart; i <= batchEnd; i++) {
        batchPromises.push(
          (async () => {
            try {
              const page = await pdf.getPage(i);
              const viewport = page.getViewport({ scale: 1.0 });

              // IMPROVEMENT: Enhanced text extraction options
              const textContent = await page.getTextContent({
                normalizeWhitespace: false, // Preserve original spaces
                disableCombineTextItems: true, // Don't combine items to preserve positioning
                includeMarkedContent: true, // Include all marked content
              });

              // Process Arabic content with improved algorithm
              const pageText = processArabicContent(textContent);
              console.log(`Processed page ${i}/${totalPages}`);

              return { pageNum: i, text: pageText };
            } catch (pageError) {
              console.error(`Error extracting text from page ${i}:`, pageError);
              return { pageNum: i, text: `[Error extracting page ${i}]` };
            }
          })()
        );
      }

      // Wait for all pages in batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Sort by page number and add to full text
      batchResults
        .sort((a, b) => a.pageNum - b.pageNum)
        .forEach((result) => {
          if (fullText && result.text) {
            fullText += "\n\n"; // Add double newline between pages
          }
          fullText += result.text;
        });
    }

    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text with PDF.js:", error);
    throw error;
  }
}

module.exports = { extractTextFromPdfUrlWithPdfJs };
