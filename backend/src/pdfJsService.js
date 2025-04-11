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

// Helper to detect if text is in Arabic script
function isArabicText(text) {
  // Check if text contains Arabic characters
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    text
  );
}

// Process text content based on script type
function processTextItems(textItems) {
  if (!textItems || !textItems.length) return "";

  // Group items by line (using y-coordinate)
  const lines = {};
  const lineHeight = 3; // Tolerance for considering items on the same line

  textItems.forEach((item) => {
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
    .sort((a, b) => a - b)
    .forEach((y) => {
      const lineItems = lines[y];

      // Sort items based on x-coordinate (left to right for non-Arabic, right to left for Arabic)
      let isArabicLine = lineItems.some((item) => isArabicText(item.str));

      if (isArabicLine) {
        // Sort right to left for Arabic
        lineItems.sort((a, b) => b.transform[4] - a.transform[4]);

        // For Arabic, join without spaces for consecutive Arabic characters
        let lineText = "";
        for (let i = 0; i < lineItems.length; i++) {
          const item = lineItems[i];
          // Remove any spaces inside Arabic text segments
          const cleanedText = item.str.replace(/\s+/g, "");
          lineText += cleanedText;

          // Add space only if needed between words or at the end of sentence
          if (i < lineItems.length - 1) {
            const nextItem = lineItems[i + 1];
            // If there's a significant gap, add a space
            const gap =
              Math.abs(item.transform[4] - nextItem.transform[4]) -
              (item.width + nextItem.width);
            if (gap > 5) {
              lineText += " ";
            }
          }
        }
        result += lineText;
      } else {
        // Sort left to right for non-Arabic
        lineItems.sort((a, b) => a.transform[4] - b.transform[4]);

        // Join with spaces for Latin and other scripts
        const lineText = lineItems.map((item) => item.str).join(" ");
        result += lineText;
      }

      result += "\n";
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

    // Configure PDF.js with options
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

        // Process text content with special handling for Arabic text
        const pageText = processTextItems(textContent.items);
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
