// backend/src/pdfJsService.js

const axios = require('axios');
// IMPORTANT: Use the legacy CommonJS build:
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function extractTextFromPdfUrlWithPdfJs(pdfUrl) {
  try {
    // 1. Download the PDF as an ArrayBuffer
    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const data = new Uint8Array(response.data);

    // 2. Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;

    let fullText = '';

    // 3. Loop through pages to extract text
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      // Join text items with a space; separate pages with a form feed
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\f';
    }

    return fullText;
  } catch (error) {
    console.error('Error extracting PDF text with PDF.js:', error);
    throw error;
  }
}

module.exports = { extractTextFromPdfUrlWithPdfJs };