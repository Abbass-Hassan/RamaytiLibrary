// backend/src/pdfJsService.js

const axios = require('axios');
const pdfjsLib = require('pdfjs-dist'); // Use the default export for Node

// In Node, PDF.js automatically disables web workers, so no need to set workerSrc.

async function extractTextFromPdfUrlWithPdfJs(pdfUrl) {
  try {
    // Download the PDF as an ArrayBuffer
    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const data = new Uint8Array(response.data);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Loop through pages to extract text
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
