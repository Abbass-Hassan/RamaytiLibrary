const axios = require("axios");
// IMPORTANT: Use the legacy CommonJS build:
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const path = require("path");

// Properly configure PDF.js for Node.js environment
// The key change is to explicitly set the worker source as a string
pdfjsLib.GlobalWorkerOptions.workerSrc = ""; // Empty string to use fake worker

// Disable font face to improve performance
pdfjsLib.GlobalWorkerOptions.disableFontFace = true;

// Configure the standard font data URL
const STANDARD_FONT_DATA_URL = path.join(
  __dirname,
  "../node_modules/pdfjs-dist/standard_fonts/"
);

async function extractTextFromPdfUrlWithPdfJs(pdfUrl) {
  try {
    console.log(`Starting to extract text from: ${pdfUrl}`);

    // 1. Download the PDF as an ArrayBuffer
    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    const data = new Uint8Array(response.data);
    console.log(`Downloaded PDF: ${data.length} bytes`);

    // 2. Load the PDF document with proper worker configuration
    const loadingTask = pdfjsLib.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
      nativeImageDecoderSupport: "none",
      ignoreErrors: true,
      // Use a string for the worker ID
      rangeChunkSize: 65536,
      cMapUrl: path.join(__dirname, "../node_modules/pdfjs-dist/cmaps/"),
      cMapPacked: true,
    });

    console.log("PDF loading task created");
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);

    let fullText = "";

    // 3. Loop through pages to extract text
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        console.log(`Processing page ${i}`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Join text items with a space; separate pages with a form feed
        const pageText = textContent.items.map((item) => item.str).join(" ");
        fullText += pageText + "\f";

        if (i % 10 === 0) {
          console.log(`Processed ${i} pages of ${pdf.numPages}`);
        }
      } catch (pageError) {
        console.error(`Error extracting text from page ${i}:`, pageError);
        fullText += `[Error extracting page ${i}]\f`;
      }
    }

    console.log("Text extraction complete");
    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text with PDF.js:", error);
    throw error;
  }
}

module.exports = { extractTextFromPdfUrlWithPdfJs };
