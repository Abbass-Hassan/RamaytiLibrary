// backend/src/pdfParseService.js

const axios = require("axios");
const pdfParse = require("pdf-parse");

async function extractTextFromPdfUrl(pdfUrl) {
  try {
    // 1. Download the PDF as a buffer
    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    const dataBuffer = response.data;

    // 2. Use pdf-parse with a custom pagerender function
    const options = {
      pagerender: async (pageData) => {
        const textContent = await pageData.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        return pageText + "\f";
      },
    };

    const data = await pdfParse(dataBuffer, options);
    return data.text;
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    throw error;
  }
}

module.exports = { extractTextFromPdfUrl };
