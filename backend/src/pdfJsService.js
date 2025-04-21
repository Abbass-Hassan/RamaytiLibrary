/**
 * Updated PDF Arabic Text Extraction Module
 *
 * This module downloads a PDF via Axios, uses pdfjs-dist (with worker disabled)
 * and then extracts text with enhanced Arabic processing.
 */

const axios = require("axios");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf");
const fs = require("fs");

// Disable workers for Node.js environment
pdfjsLib.GlobalWorkerOptions.disableWorker = true;

// Minimal NodeCanvasFactory implementation for Node.js
class NodeCanvasFactory {
  create(width, height) {
    return {
      width: width,
      height: height,
      canvas: { width, height, style: {} },
    };
  }
  reset(canvas, width, height) {
    canvas.width = width;
    canvas.height = height;
  }
  destroy(canvas) {
    canvas.width = 0;
    canvas.height = 0;
    canvas.canvas = null;
  }
}

// -----------------------------------------------------------------------------
// Helper functions for Arabic text handling
// -----------------------------------------------------------------------------

// Check if the string contains any Arabic characters
function containsArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

// Check if a character is an Arabic letter
function isArabicLetter(char) {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x0600 && code <= 0x06ff) || // Primary Arabic
    (code >= 0x0750 && code <= 0x077f) || // Arabic Supplement
    (code >= 0xfb50 && code <= 0xfdff) || // Arabic Presentation Forms-A
    (code >= 0xfe70 && code <= 0xfeff) // Arabic Presentation Forms-B
  );
}

// Determines if a character does not connect to the following letter
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

// Enhanced punctuation and space detection
function isPunctuationOrSpace(char) {
  return (
    /[\s\.\,،;\?؟!\(\):\[\]\{\}"'«»\-\u2000-\u200F\u2028-\u202F]/.test(char) ||
    char === "\u00A0" || // Non-breaking space
    char === "\u2003" || // Em space
    char === "\u200C" // Zero-width non-joiner
  );
}

// Check for kashida (tatweel)
function isKashida(char) {
  return char === "ـ" || char.charCodeAt(0) === 0x0640;
}

// Determines if a character should connect to the next one in Arabic
function shouldConnectToNext(char) {
  return isArabicLetter(char) && !isNonConnectingLetter(char);
}

// -----------------------------------------------------------------------------
// Definitions for Arabic prefixes, suffixes, and inseparable pairs
// -----------------------------------------------------------------------------

const arabicPrefixes = [
  "ال",
  "وال",
  "بال",
  "كال",
  "فال",
  "لل", // Common prefixes
  "و",
  "ف",
  "ب",
  "ل",
  "ك",
  "س", // Single letter prefixes
];

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
  "ة", // Noun/Adjective suffixes
];

const inseparablePairs = [
  "لا",
  "لإ",
  "لأ", // Ligature variations that must remain together
];

// -----------------------------------------------------------------------------
// Core function to process Arabic content from PDF.js text extraction
// -----------------------------------------------------------------------------

function processArabicContent(textContent) {
  if (!textContent || !textContent.items || textContent.items.length === 0) {
    return "";
  }

  console.log(`Processing ${textContent.items.length} text items`);

  // Use a sample from the first 20 items to decide if the document is Arabic
  const sampleText = textContent.items
    .slice(0, Math.min(20, textContent.items.length))
    .map((item) => item.str)
    .join("");
  const isArabicDocument = containsArabic(sampleText);
  console.log(`Document appears to be in Arabic: ${isArabicDocument}`);

  if (!isArabicDocument) {
    // For non-Arabic documents, simply join the item strings.
    return textContent.items.map((item) => item.str).join(" ");
  }

  // Group items by their approximate vertical (y) position.
  // A tolerance is used to account for minor shifts.
  const lines = {};
  const lineTolerance = 5; // Adjust this tolerance as needed

  textContent.items.forEach((item) => {
    if (!item.transform) return;
    // Normalize the y position using the tolerance
    const yPos = Math.round(item.transform[5] / lineTolerance) * lineTolerance;
    if (!lines[yPos]) {
      lines[yPos] = [];
    }
    // Remove kashida and zero-width spaces
    const cleanText = item.str
      .replace(/ـ/g, "")
      .replace(/[\u200B-\u200F]/g, "");
    if (!cleanText.trim()) return;
    lines[yPos].push({
      text: cleanText,
      originalText: item.str,
      x: item.transform[4],
      width: item.width || cleanText.length * (item.fontSize || 10) * 0.6,
      fontSize: item.fontSize || 10,
      hasArabic: containsArabic(cleanText),
      chars: cleanText.split(""),
    });
  });

  let result = "";
  let previousY = null;
  const sortedYPositions = Object.keys(lines)
    .map(Number)
    .sort((a, b) => b - a); // Descending order (from top to bottom)
  const gapThresholdVertical = 10; // Threshold to decide paragraph breaks

  sortedYPositions.forEach((y) => {
    const lineItems = lines[y];
    if (!lineItems || lineItems.length === 0) return;

    // Determine if this line is Arabic by checking its items
    const isArabicLine = lineItems.some((item) => item.hasArabic);
    if (isArabicLine) {
      // For RTL text, sort by x descending (right-to-left)
      lineItems.sort((a, b) => b.x - a.x);
    } else {
      // For LTR text, sort by x ascending
      lineItems.sort((a, b) => a.x - b.x);
    }

    // Process items in the line to merge them when appropriate
    const processedItems = [];
    let currentItem = null;
    for (const item of lineItems) {
      if (!currentItem) {
        currentItem = { ...item };
      } else {
        // Calculate horizontal gap between the merged item and the new item
        const gap = currentItem.x - (item.x + item.width);
        const fontSizeFactor =
          Math.max(currentItem.fontSize, item.fontSize) / 10;
        const gapThreshold = 1.5 * fontSizeFactor;
        const lastCharPrev = currentItem.text.slice(-1);
        const firstCharCurr = item.text.charAt(0);
        const formsInseparablePair = inseparablePairs.some(
          (pair) => lastCharPrev + firstCharCurr === pair
        );
        const mergeBySpatial = gap < gapThreshold;
        const mergeByConnectivity =
          (shouldConnectToNext(lastCharPrev) &&
            containsArabic(firstCharCurr)) ||
          (!isNonConnectingLetter(firstCharCurr) &&
            containsArabic(lastCharPrev));
        const mergeByPrefix = arabicPrefixes.some(
          (prefix) =>
            currentItem.text === prefix || currentItem.text.endsWith(prefix)
        );
        const mergeBySuffix = arabicSuffixes.some(
          (suffix) => item.text === suffix || item.text.startsWith(suffix)
        );
        const shouldMerge =
          mergeBySpatial ||
          formsInseparablePair ||
          mergeByConnectivity ||
          mergeByPrefix ||
          mergeBySuffix;

        if (shouldMerge) {
          // Merge items: append text, add width, and update x position if needed
          currentItem.text += item.text;
          currentItem.width += item.width;
          currentItem.x = Math.max(currentItem.x, item.x);
        } else {
          processedItems.push(currentItem);
          currentItem = { ...item };
        }
      }
    }
    if (currentItem) {
      processedItems.push(currentItem);
    }

    // Join processed items to create a single line of text
    let lineText = processedItems
      .map((item) => item.text)
      .join(" ")
      .trim();
    lineText = postProcessArabicLine(lineText);

    // Insert a newline based on vertical gap
    if (previousY !== null) {
      const gap = previousY - y;
      if (gap > gapThresholdVertical) {
        result += "\n\n"; // Paragraph break
      } else {
        result += "\n"; // Single newline
      }
    }
    result += lineText;
    previousY = y;
  });

  // Final pass: remove any newline(s) immediately preceding punctuation
  result = result.replace(/\n+([\.،:؛؟!])/g, "$1");

  return postProcessArabicText(result);
}

// Process a single line of Arabic text
function postProcessArabicLine(text) {
  if (!text) return "";
  // Collapse multiple spaces and trim
  let processedText = text.replace(/\s+/g, " ").trim();
  // Join specific prefix and word combinations (e.g., "ال" + word => "الكلمة")
  for (const prefix of arabicPrefixes) {
    const regex = new RegExp(`\\b${prefix}\\s+(\\S+)`, "g");
    processedText = processedText.replace(regex, `${prefix}$1`);
  }
  // Fix spacing around punctuation
  processedText = processedText
    .replace(/ ([\.،:؛؟!])/g, "$1")
    .replace(/([\.،:؛؟!]) /g, "$1 ");
  return processedText;
}

// Post-process the complete Arabic text for overall cleanup
function postProcessArabicText(text) {
  if (!text) return "";
  // Split into paragraphs and process each
  const paragraphs = text.split(/\n+/);
  const processedParagraphs = paragraphs.map((paragraph) => {
    if (!paragraph.trim()) return "";
    let processedPara = paragraph
      .replace(/\s+/g, " ")
      .replace(/ـ/g, "")
      .replace(/ ([\.،:؛؟!])/g, "$1")
      .replace(/([\.،:؛؟!]) /g, "$1 ")
      .trim();
    // Merge words if a prefix or suffix should connect across a space
    const words = processedPara.split(/\s+/);
    const processedWords = [];
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;
      if (i < words.length - 1) {
        if (
          (arabicPrefixes.includes(word) ||
            arabicPrefixes.some(
              (prefix) =>
                word.endsWith(prefix) && word.length <= prefix.length + 2
            )) &&
          containsArabic(words[i + 1])
        ) {
          processedWords.push(word + words[i + 1]);
          i++;
          continue;
        }
        if (
          (arabicSuffixes.includes(words[i + 1]) ||
            arabicSuffixes.some(
              (suffix) =>
                words[i + 1].startsWith(suffix) &&
                words[i + 1].length <= suffix.length + 2
            )) &&
          containsArabic(word)
        ) {
          processedWords.push(word + words[i + 1]);
          i++;
          continue;
        }
      }
      processedWords.push(word);
    }
    return processedWords.join(" ");
  });
  return processedParagraphs.join("\n\n");
}

// -----------------------------------------------------------------------------
// PDF Text Extraction Function with Robust Error Handling
// -----------------------------------------------------------------------------

async function extractTextFromPdfUrlWithPdfJs(pdfUrl, options = {}) {
  try {
    if (!pdfUrl) {
      throw new Error("PDF URL is undefined or null");
    }

    let data;

    // Handle file:// protocol for direct file access
    if (pdfUrl.startsWith("file://")) {
      const filePath = pdfUrl.replace("file://", "");
      console.log(`Reading PDF directly from file system: ${filePath}`);

      try {
        data = new Uint8Array(fs.readFileSync(filePath));
        console.log(`Read PDF: ${data.length} bytes`);
      } catch (fileError) {
        console.error("Error reading local PDF file:", fileError);
        throw new Error(`Failed to read PDF file: ${fileError.message}`);
      }
    } else {
      // Ensure the URL is absolute and properly formatted
      if (pdfUrl.startsWith("/files/")) {
        const serverUrl =
          process.env.SERVER_URL ||
          "http://ramaytilibrary-production.up.railway.app";
        pdfUrl = `${serverUrl}${pdfUrl}`;
        console.log("Using absolute URL for local file in extraction:", pdfUrl);
      }

      // Replace any localhost references with the actual server URL
      if (pdfUrl.includes("localhost") || pdfUrl.includes("::1")) {
        pdfUrl = pdfUrl.replace(
          /https?:\/\/(localhost|::1)(:\d+)?/,
          "http://ramaytilibrary-production.up.railway.app"
        );
        console.log("Replaced localhost with production URL:", pdfUrl);
      }

      console.log(`Starting text extraction from: ${pdfUrl}`);

      try {
        const response = await axios.get(pdfUrl, {
          responseType: "arraybuffer",
          timeout: options.timeout || 30000, // Default timeout 30 sec.
          validateStatus: (status) => status === 200,
          ...options.axiosOptions,
        });
        data = new Uint8Array(response.data);
        console.log(`Downloaded PDF: ${data.length} bytes`);
      } catch (httpError) {
        console.error("Error downloading PDF:", httpError);
        throw new Error(`Request failed: ${httpError.message}`);
      }
    }

    const loadingTask = pdfjsLib.getDocument({
      data: data,
      disableFontFace: false, // Enable font info for extraction
      useSystemFonts: true,
      nativeImageDecoderSupport: "none",
      ignoreErrors: true,
      canvasFactory: new NodeCanvasFactory(),
      cMapUrl: "./node_modules/pdfjs-dist/cmaps/",
      cMapPacked: true,
      ...options.pdfOptions,
    });
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    let fullText = "";
    let errorCount = 0;
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        console.log(`Page ${i} size: ${viewport.width}x${viewport.height}`);
        const textContent = await page.getTextContent({
          normalizeWhitespace: false,
          disableCombineTextItems: true,
          includeMarkedContent: true,
        });
        const pageText = processArabicContent(textContent);

        // Add form feed character (\f) after each page except the last one
        // This is the key change to preserve page breaks properly
        if (i < pdf.numPages) {
          fullText += pageText + "\f";
        } else {
          fullText += pageText;
        }

        console.log(`Processed page ${i}/${pdf.numPages}`);
      } catch (pageError) {
        errorCount++;
        console.error(`Error extracting text from page ${i}:`, pageError);

        // Also add form feed after error messages for proper page handling
        if (i < pdf.numPages) {
          fullText += `[Error extracting page ${i}]\f`;
        } else {
          fullText += `[Error extracting page ${i}]`;
        }

        if (errorCount > 5) {
          console.error("Too many extraction errors, aborting further pages.");
          break;
        }
      }
    }
    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text with PDF.js:", error);
    throw error;
  }
}

module.exports = { extractTextFromPdfUrlWithPdfJs };
