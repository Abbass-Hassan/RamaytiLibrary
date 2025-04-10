const axios = require("axios");
// Use the legacy CommonJS build with explicit path
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf");

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

async function extractTextFromPdfUrlWithPdfJs(pdfUrl) {
  try {
    console.log(`Starting text extraction from: ${pdfUrl}`);

    // Download the PDF
    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    const data = new Uint8Array(response.data);
    console.log(`Downloaded PDF: ${data.length} bytes`);

    // Configure PDF.js with minimal options to avoid worker issues
    const loadingTask = pdfjsLib.getDocument({
      data: data,
      disableFontFace: true,
      nativeImageDecoderSupport: "none",
      ignoreErrors: true,
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

        // Extract text from page
        const pageText = textContent.items.map((item) => item.str).join(" ");

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
