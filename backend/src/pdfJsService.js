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

// Enhanced list of non-connecting letters in Arabic
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

// Punctuation detection
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

// Completely revised Arabic text processing function
function processArabicContent(textContent) {
  if (!textContent || !textContent.items || textContent.items.length === 0) {
    return "";
  }

  // Group items by vertical position (lines)
  const lines = {};
  const lineHeight = 1.5; // Smaller for better precision

  // First pass: group by lines
  textContent.items.forEach((item) => {
    if (!item.transform) return;

    const yPos = Math.round(item.transform[5] / lineHeight) * lineHeight;
    if (!lines[yPos]) {
      lines[yPos] = [];
    }

    // Store each item with additional metadata
    lines[yPos].push({
      text: item.str,
      x: item.transform[4],
      width: item.width || item.str.length * (item.fontSize || 10) * 0.6,
      fontSize: item.fontSize || 10,
      hasArabic: /[\u0600-\u06FF]/.test(item.str),
      // Extract individual characters for analysis
      chars: item.str.split(""),
    });
  });

  let result = "";

  // Process each line, sorting from top to bottom
  Object.keys(lines)
    .sort((a, b) => b - a)
    .forEach((y) => {
      const lineItems = lines[y];
      if (lineItems.length === 0) return;

      // For Arabic lines, sort right to left
      const isArabicLine = lineItems.some((item) => item.hasArabic);
      if (isArabicLine) {
        lineItems.sort((a, b) => b.x - a.x);
      } else {
        lineItems.sort((a, b) => a.x - b.x);
      }

      // Process items in the line to form words
      const words = [];
      let currentWord = "";
      let prevItem = null;

      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        if (!item.text) continue;

        // Clean the text (remove kashidas and trim)
        const cleanText = item.text.replace(/ـ/g, "").trim();
        if (!cleanText) continue;

        // Check for word boundaries
        let isWordBoundary = false;

        // 1. Check for punctuation/space boundaries
        if (cleanText.split("").some((ch) => isPunctuationOrSpace(ch))) {
          // Extract only non-punctuation characters
          const textWithoutPunct = cleanText
            .split("")
            .filter((ch) => !isPunctuationOrSpace(ch))
            .join("");

          if (textWithoutPunct) {
            currentWord += textWithoutPunct;
          }
          isWordBoundary = true;
        }
        // 2. Check for spatial/positioning boundaries
        else if (prevItem) {
          // Calculate gap between text elements
          const gap = prevItem.x - (item.x + item.width);
          const fontSizeFactor = (item.fontSize || 10) / 10;
          const gapThreshold = 1.8 * fontSizeFactor;

          if (gap > gapThreshold) {
            isWordBoundary = true;
          }

          // 3. Check linguistic boundaries (non-connecting letters)
          if (currentWord.length > 0) {
            const lastChar = currentWord[currentWord.length - 1];
            if (isNonConnectingLetter(lastChar)) {
              isWordBoundary = true;
            }
          }

          currentWord += cleanText;
        }
        // First item in line
        else {
          currentWord = cleanText;
        }

        // If we found a word boundary and have text, save the word
        if (isWordBoundary && currentWord) {
          words.push(currentWord);
          currentWord = "";
        }

        prevItem = item;
      }

      // Add any remaining word at the end of line
      if (currentWord) {
        words.push(currentWord);
      }

      // Join words with spaces and add to result
      if (words.length > 0) {
        if (result) result += "\n\n";
        result += words.join(" ");
      }
    });

  // Apply additional Arabic-specific text improvements
  return improveArabicText(result);
}

// Additional processing for Arabic text
function improveArabicText(text) {
  if (!text) return "";

  // Common Arabic prefixes that should be connected to the following word
  const prefixes = ["ال", "بال", "كال", "فال", "لل", "و", "ف", "ب", "ل", "ك"];

  // Split into words and process each
  const words = text.split(/\s+/);
  const processedWords = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Check if current word is a prefix that should connect to the next word
    if (
      i < words.length - 1 &&
      prefixes.includes(word) &&
      /[\u0600-\u06FF]/.test(words[i + 1])
    ) {
      processedWords.push(word + words[i + 1]);
      i++; // Skip the next word
    } else {
      processedWords.push(word);
    }
  }

  return processedWords.join(" ");
}

// Main function to extract text from PDF
async function extractTextFromPdfUrlWithPdfJs(pdfUrl, options = {}) {
  try {
    if (!pdfUrl) {
      throw new Error("PDF URL is undefined or null");
    }

    console.log(`Starting text extraction from: ${pdfUrl}`);

    // Download the PDF
    const response = await axios.get(pdfUrl, {
      responseType: "arraybuffer",
      timeout: options.timeout || 15000,
      validateStatus: (status) => status === 200,
    });

    const data = new Uint8Array(response.data);
    console.log(`Downloaded PDF: ${data.length} bytes`);

    // Configure PDF.js with options for better Arabic support
    const loadingTask = pdfjsLib.getDocument({
      data: data,
      disableFontFace: false, // Better for Arabic fonts
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
        const viewport = page.getViewport({ scale: 1.0 });

        // Enhanced options for text extraction
        const textContent = await page.getTextContent({
          normalizeWhitespace: false, // Important for Arabic
          disableCombineTextItems: false,
          includeMarkedContent: true,
        });

        // Process Arabic content with improved algorithm
        const pageText = processArabicContent(textContent);
        fullText += pageText + "\n\n";

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
