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

// Process text content for Arabic documents
function processArabicContent(textContent) {
  if (!textContent || !textContent.items || textContent.items.length === 0) {
    return "";
  }

  // Check if this is primarily an Arabic document
  const sampleText = textContent.items
    .slice(0, 20)
    .map((item) => item.str)
    .join("");
  const isArabicDocument = containsArabic(sampleText);

  if (!isArabicDocument) {
    // For non-Arabic documents, use the original approach
    return textContent.items.map((item) => item.str).join(" ");
  }

  // For Arabic documents, implement a more sophisticated approach

  // Group items by their vertical position (approximate lines)
  const lines = {};
  const lineHeight = 5; // Tolerance for considering items on the same line

  textContent.items.forEach((item) => {
    if (!item.transform) return;

    // Round the y-coordinate to group nearby items
    const yPos = Math.round(item.transform[5] / lineHeight) * lineHeight;

    if (!lines[yPos]) {
      lines[yPos] = [];
    }

    lines[yPos].push(item);
  });

  // Process each line
  let result = "";

  Object.keys(lines)
    .sort((a, b) => b - a)
    .forEach((y) => {
      // Sort top to bottom
      const lineItems = lines[y];

      // Sort by x position from right to left (for Arabic)
      lineItems.sort((a, b) => {
        if (!a.transform || !b.transform) return 0;
        return b.transform[4] - a.transform[4];
      });

      // Special handling for Arabic text - join without spaces initially
      let lineText = "";
      let currentWord = "";

      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];

        // Skip items without text
        if (!item.str) continue;

        // Clean the string by removing extra spaces in Arabic text
        const cleanedStr = item.str.trim();

        // Add to current word
        currentWord += cleanedStr;

        // Check if we need to add a space (word boundary)
        if (i < lineItems.length - 1) {
          const nextItem = lineItems[i + 1];
          if (!nextItem.transform) continue;

          // Calculate gap between this item and the next
          const currentEndX = item.transform[4] - (item.width || 0);
          const nextStartX = nextItem.transform[4];
          const gap = Math.abs(currentEndX - nextStartX);

          // If gap is significant, it's likely a word boundary
          if (gap > 10) {
            // Add current word to line
            lineText += currentWord + " ";
            currentWord = "";
          }
        }
      }

      // Add the last word
      lineText += currentWord;

      // Add this line to result
      result += lineText + "\n";
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
      timeout: 10000, // 10 second timeout
      validateStatus: (status) => status === 200, // Only accept 200 OK responses
    });

    const data = new Uint8Array(response.data);
    console.log(`Downloaded PDF: ${data.length} bytes`);

    // Configure PDF.js with minimal options to avoid worker issues
    const loadingTask = pdfjsLib.getDocument({
      data: data,
      disableFontFace: true,
      nativeImageDecoderSupport: "none",
      ignoreErrors: true,
      canvasFactory: new NodeCanvasFactory(),
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

        // Process Arabic content specifically
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
