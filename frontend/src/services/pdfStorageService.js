// services/pdfStorageService.js
import RNFS from 'react-native-fs';
import { Alert } from 'react-native';

// Cache for storing PDF paths
const pdfPathCache = {};

// Base directory for storing PDFs
const PDF_BASE_DIR = RNFS.DocumentDirectoryPath + '/pdfs/';

// Ensure the PDF directory exists
const ensurePdfDirectory = async () => {
  try {
    const exists = await RNFS.exists(PDF_BASE_DIR);
    if (!exists) {
      await RNFS.mkdir(PDF_BASE_DIR);
    }
    return true;
  } catch (error) {
    console.error('Error creating PDF directory:', error);
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
    console.error('Error getting PDF path:', error);
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
    
    // Download file
    const result = await RNFS.downloadFile({
      fromUrl: url,
      toFile: destPath,
      background: true,
      discretionary: true,
      progressInterval: 500,
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