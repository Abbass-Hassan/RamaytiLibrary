const axios = require("axios");
// IMPORTANT: Use the legacy CommonJS build:
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const path = require("path");

// Set the worker source path
const pdfjsWorker = require("pdfjs-dist/legacy/build/pdf.worker.js");
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Configure the font paths
pdfjsLib.GlobalWorkerOptions.disableFontFace = true;

// Set the standardFontDataUrl parameter (this is the critical fix)
const STANDARD_FONT_DATA_URL = path.join(
  __dirname,
  "../node_modules/pdfjs-dist/standard_fonts/"
);
pdfjsLib.GlobalWorkerOptions.standardFontDataUrl = STANDARD_FONT_DATA_URL;

async function extractTextFromPdfUrlWithPdfJs(pdfUrl) {
  try {
    // 1. Download the PDF as an ArrayBuffer
    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    const data = new Uint8Array(response.data);

    // 2. Load the PDF document with font configuration
    const loadingTask = pdfjsLib.getDocument({
      data,
      standardFontDataUrl: STANDARD_FONT_DATA_URL,
      disableFontFace: true,
      cMapUrl: path.join(__dirname, "../node_modules/pdfjs-dist/cmaps/"),
      cMapPacked: true,
    });

    const pdf = await loadingTask.promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);

    let fullText = "";

    // 3. Loop through pages to extract text
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
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

    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text with PDF.js:", error);
    throw error;
  }
}

module.exports = { extractTextFromPdfUrlWithPdfJs };
