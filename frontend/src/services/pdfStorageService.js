// services/pdfStorageService.js
import RNFS from "react-native-fs";
import { Alert } from "react-native";

// Cache for storing PDF paths
const pdfPathCache = {};

// Base directory for storing PDFs
const PDF_BASE_DIR = RNFS.DocumentDirectoryPath + "/pdfs/";

// Server base URL
const SERVER_BASE_URL = "http://ramaytilibrary-production.up.railway.app";

// Ensure the PDF directory exists
const ensurePdfDirectory = async () => {
  try {
    const exists = await RNFS.exists(PDF_BASE_DIR);
    if (!exists) {
      await RNFS.mkdir(PDF_BASE_DIR);
    }
    return true;
  } catch (error) {
    console.error("Error creating PDF directory:", error);
    return false;
  }
};

// Initialize the PDF directory when the app starts
ensurePdfDirectory();

// Get path for a PDF file
export const getPdfPath = async (bookId) => {
  try {
    // Check cache first
    if (pdfPathCache[bookId]) {
      const exists = await RNFS.exists(pdfPathCache[bookId]);
      if (exists) {
        return pdfPathCache[bookId];
      }
    }

    // Define local path
    const localPath = `${PDF_BASE_DIR}book_${bookId}.pdf`;

    // Check if file exists locally
    const exists = await RNFS.exists(localPath);
    if (exists) {
      pdfPathCache[bookId] = localPath;
      return localPath;
    }

    // If file doesn't exist locally, return null
    // (Will need to be handled by copying from assets or downloading)
    return null;
  } catch (error) {
    console.error("Error getting PDF path:", error);
    return null;
  }
};

// Copy a PDF from assets to local storage
export const copyPdfFromAssets = async (bookId, assetPath) => {
  try {
    await ensurePdfDirectory();
    const destPath = `${PDF_BASE_DIR}book_${bookId}.pdf`;

    // Check if file already exists
    const exists = await RNFS.exists(destPath);
    if (exists) {
      pdfPathCache[bookId] = destPath;
      return destPath;
    }

    // Copy from assets
    await RNFS.copyFileAssets(assetPath, destPath);
    pdfPathCache[bookId] = destPath;
    return destPath;
  } catch (error) {
    console.error(`Error copying PDF from assets: ${error}`);
    return null;
  }
};

// Helper function to format URLs properly
export const formatUrl = (url) => {
  if (!url) return null;

  let formattedUrl = url.trim();

  // Handle /files/ paths (local server files)
  if (formattedUrl.startsWith("/files/")) {
    return `${SERVER_BASE_URL}${formattedUrl}`;
  }

  // Handle GitHub URLs
  if (formattedUrl.includes("github.com") && formattedUrl.includes("/blob/")) {
    formattedUrl = formattedUrl
      .replace("github.com", "raw.githubusercontent.com")
      .replace("/blob/", "/");
  }

  // Handle GitHub Pages URLs
  if (formattedUrl.includes("abbass-hassan.github.io")) {
    const baseUrl = "https://abbass-hassan.github.io/pdf-hosting/";
    const filename = formattedUrl.split("/").pop();
    formattedUrl = `${baseUrl}${encodeURIComponent(
      decodeURIComponent(filename)
    )}`;
  }

  return formattedUrl;
};

// For development: copy a PDF from a web URL to local storage
export const downloadPdfToLocal = async (bookId, url) => {
  try {
    await ensurePdfDirectory();
    const destPath = `${PDF_BASE_DIR}book_${bookId}.pdf`;

    // Check if file already exists
    const exists = await RNFS.exists(destPath);
    if (exists) {
      const stats = await RNFS.stat(destPath);
      if (parseInt(stats.size, 10) > 1000) {
        pdfPathCache[bookId] = destPath;
        return destPath;
      }
      // If file exists but is too small (possibly corrupted), delete it
      await RNFS.unlink(destPath);
    }

    // Format the URL properly
    const formattedUrl = formatUrl(url);
    console.log("Downloading PDF from formatted URL:", formattedUrl);

    if (!formattedUrl) {
      throw new Error("Invalid PDF URL");
    }

    // Download file
    const result = await RNFS.downloadFile({
      fromUrl: formattedUrl,
      toFile: destPath,
      background: true,
      discretionary: true,
      progressInterval: 500,
      headers: {
        Accept: "*/*",
        "User-Agent": "RamaytilibraryApp",
      },
    }).promise;

    if (result.statusCode === 200) {
      pdfPathCache[bookId] = destPath;
      return destPath;
    } else {
      throw new Error(`Download failed with status ${result.statusCode}`);
    }
  } catch (error) {
    console.error(`Error downloading PDF: ${error}`);
    return null;
  }
};
