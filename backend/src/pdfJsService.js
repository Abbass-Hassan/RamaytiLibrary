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

// Simple function to detect Arabic text
function containsArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

// Process text items more intelligently for Arabic
function processItems(items) {
  let result = "";
  let isArabicContent = false;

  // Check if content is primarily Arabic
  if (items.length > 0) {
    const sampleText = items
      .slice(0, 10)
      .map((item) => item.str)
      .join("");
    isArabicContent = containsArabic(sampleText);
  }

  if (isArabicContent) {
    // For Arabic, just concatenate without spaces
    for (let i = 0; i < items.length; i++) {
      result += items[i].str;

      // Add space only between obvious word boundaries
      if (i < items.length - 1) {
        // If there's a significant horizontal gap, add a space
        const currentItem = items[i];
        const nextItem = items[i + 1];

        if (currentItem.transform && nextItem.transform) {
          const gap = Math.abs(
            currentItem.transform[4] - nextItem.transform[4]
          );
          if (gap > 5) {
            result += " ";
          }
        }
      }
    }
  } else {
    // For non-Arabic, join with spaces as before
    result = items.map((item) => item.str).join(" ");
  }

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

        // Process text with better Arabic handling
        const pageText = processItems(textContent.items);

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
