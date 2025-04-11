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
    (code >= 0xfe70 && code <= 0xfeff)
  ); // Arabic Presentation Forms-B
}

// Check if this character is usually at the end of a word
function isEndOfWordChar(char) {
  // These characters typically end words or don't connect to the next character
  const endChars = ["ا", "إ", "أ", "آ", "د", "ذ", "ر", "ز", "و", "ؤ", "ء", "ة"];
  return endChars.includes(char);
}

// Check if character is punctuation or space
function isPunctuationOrSpace(char) {
  return /[\s\.,،;\?؟!\(\):\[\]\{\}"'«»]/.test(char);
}

// Advanced processing for Arabic text content with improved word boundary detection
function processArabicContent(textContent) {
  if (!textContent || !textContent.items || textContent.items.length === 0) {
    return "";
  }

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
  const lineHeight = 3;

  // First pass: collect all items by line
  textContent.items.forEach((item) => {
    if (!item.transform) return;

    // Get y position and normalize
    const yPos = Math.round(item.transform[5] / lineHeight) * lineHeight;

    if (!lines[yPos]) {
      lines[yPos] = [];
    }

    // Store the item with its x position
    lines[yPos].push({
      ...item,
      x: item.transform[4],
      width: item.width || item.str.length * 5,
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
        const cleanText = item.str.trim().replace(/\s+/g, "");
        return {
          ...item,
          cleanText,
          // Flag if this item contains punctuation that signals a word boundary
          hasPunctuation: isPunctuationOrSpace(cleanText),
          // Width estimation is important for word boundary detection
          estimatedWidth: item.width || cleanText.length * 5,
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

        // Check if punctuation or space (definite word boundary)
        if (item.hasPunctuation) {
          isWordBoundary = true;
        }

        // Check position-based word boundary (if we have a previous item)
        if (lastItem) {
          // Calculate horizontal gap (in RTL Arabic, current X is less than last X)
          const gap = lastItem.x - (item.x + item.estimatedWidth);

          // More sensitive gap detection (5 pixels can be a word boundary in some fonts)
          if (gap > 5) {
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

        // If we've identified a word boundary and have text collected
        if (isWordBoundary && currentWord) {
          words.push(currentWord);
          currentWord = "";
        }

        // Add current text to word
        currentWord += item.cleanText;
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

async function extractTextFromPdfUrlWithPdfJs(pdfUrl) {
  try {
    // Validate URL first
    if (!pdfUrl) {
      throw new Error("PDF URL is undefined or null");
    }

    console.log(`Starting text extraction from: ${pdfUrl}`);

    // Download the PDF
    const response = await axios.get(pdfUrl, {
      responseType: "arraybuffer",
      timeout: 15000, // 15 second timeout
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
    });

    // Wait for the PDF to load
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);

    let fullText = "";

    // Process each page
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

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
