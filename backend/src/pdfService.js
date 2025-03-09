const axios = require('axios');
const pdfParse = require('pdf-parse');

const extractTextFromPdfUrl = async (pdfUrl) => {
  try {
    // Download the PDF as a buffer
    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const dataBuffer = response.data;
    // Use pdf-parse to extract text from the buffer
    const data = await pdfParse(dataBuffer);
    return data.text; // returns the extracted text
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw error;
  }
};

module.exports = { extractTextFromPdfUrl };