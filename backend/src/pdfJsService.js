const axios = require("axios");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf");
const pdfjsWorker = require("pdfjs-dist/legacy/build/pdf.worker");

// This simple configuration works in Node.js environments
pdfjsLib.GlobalWorkerOptions.workerPort = pdfjsWorker;

async function extractTextFromPdfUrlWithPdfJs(pdfUrl) {
  try {
    console.log(`Starting to extract text from: ${pdfUrl}`);

    // 1. Download the PDF as an ArrayBuffer
    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    const data = new Uint8Array(response.data);
    console.log(`Downloaded PDF: ${data.length} bytes`);

    // 2. Load the PDF document with simplified configuration
    const loadingTask = pdfjsLib.getDocument({
      data,
      disableFontFace: true,
      ignoreErrors: true,
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
