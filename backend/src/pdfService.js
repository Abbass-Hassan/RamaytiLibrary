const axios = require('axios');
const pdfParse = require('pdf-parse');

const extractTextFromPdfUrl = async (pdfUrl) => {
  try {
    // Download the PDF as a buffer
    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const dataBuffer = response.data;

    // Pass a custom pagerender function to pdf-parse
    const options = {
      pagerender: async (pageData) => {
        const textContent = await pageData.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        return pageText + '\f';
      },
    };

    // Use pdf-parse with our custom options
    const data = await pdfParse(dataBuffer, options);
    return data.text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw error;
  }
};

module.exports = { extractTextFromPdfUrl };