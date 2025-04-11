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
// (not typically connected to the next character)
function isEndOfWordChar(char) {
  // These characters typically end words or don't connect to the next character
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
    "،",
    "؛",
    "؟",
    ".",
    " ",
    ":",
    "!",
    "،",
  ];
  return endChars.includes(char);
}

// Is this a character that should create a word boundary?
function isPunctuationOrSpace(char) {
  return /[\s\.,،;\?؟!\(\):\[\]\{\}]/.test(char);
}

// Advanced processing for Arabic text content
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
  const lineHeight = 5; // Tolerance for considering items on the same line

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
      // Add approximate width if not available
      width: item.width || item.str.length * 5,
    });
  });

  // Process each line
  let result = "";

  Object.keys(lines)
    .sort((a, b) => b - a)
    .forEach((y) => {
      // Sort top to bottom
      const lineItems = lines[y];

      // Skip empty lines
      if (lineItems.length === 0) return;

      // Sort right to left for Arabic
      lineItems.sort((a, b) => b.x - a.x);

      // Step 1: Clean each item's text and prepare for joining
      const cleanedItems = lineItems.map((item) => {
        return {
          ...item,
          cleanText: item.str.trim().replace(/\s+/g, ""), // Remove internal spaces
        };
      });

      // Step 2: Detect word boundaries using positions and linguistic rules
      let lineText = "";
      let currentWord = "";
      let lastX = null;

      for (let i = 0; i < cleanedItems.length; i++) {
        const item = cleanedItems[i];

        // Skip items without text
        if (!item.cleanText) continue;

        // Calculate position-based word boundary
        let isWordBoundary = false;

        if (lastX !== null) {
          // Calculate distance between this item and the previous one
          // In RTL text, the current X should be LESS than lastX
          const distance = lastX - (item.x + (item.width || 0));

          // If the distance is significant, it's likely a word boundary
          if (distance > 10) {
            isWordBoundary = true;
          }
        }

        // Also check linguistic rules for word boundaries
        const lastChar =
          currentWord.length > 0 ? currentWord[currentWord.length - 1] : "";
        const firstChar = item.cleanText.length > 0 ? item.cleanText[0] : "";

        // If the last character is one that typically ends words, also mark as boundary
        if (lastChar && isEndOfWordChar(lastChar)) {
          isWordBoundary = true;
        }

        // Check if the current item starts with punctuation
        if (firstChar && isPunctuationOrSpace(firstChar)) {
          isWordBoundary = true;
        }

        // If we determined this is a word boundary and we have a word collected
        if (isWordBoundary && currentWord) {
          lineText += currentWord + " ";
          currentWord = "";
        }

        // Add the current item's text to the current word
        currentWord += item.cleanText;

        // Update lastX for the next iteration
        lastX = item.x;

        // Handle the last item
        if (i === cleanedItems.length - 1 && currentWord) {
          lineText += currentWord;
        }
      }

      // Trim any extra spaces and add to the result
      lineText = lineText.trim();

      // We often need double spacing between lines for readability
      if (result && lineText) {
        result += "\n\n";
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
