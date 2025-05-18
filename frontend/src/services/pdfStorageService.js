// /frontend/src/services/pdfStorageService.js
import RNFS from "react-native-fs";
import { Platform } from "react-native";
import { hasBundledPdf, getBundledPdfPath } from "./bundledPdfService";

// Document directory for downloaded PDFs
const PDF_STORAGE_DIR = `${RNFS.DocumentDirectoryPath}/pdfs`;

// Ensure the PDF storage directory exists
export const ensurePdfStorageDir = async () => {
  try {
    const exists = await RNFS.exists(PDF_STORAGE_DIR);
    if (!exists) {
      await RNFS.mkdir(PDF_STORAGE_DIR);
      console.log("Created PDF storage directory:", PDF_STORAGE_DIR);
    }
    return true;
  } catch (error) {
    console.error("Error ensuring PDF storage directory:", error);
    return false;
  }
};

// Get the local path to a PDF - either bundled or downloaded
export const getPdfPath = async (bookId, filename) => {
  // If no filename provided, try to guess from bookId
  if (!filename) {
    filename = `${bookId}.pdf`;
  }

  // First check if we have a bundled version
  if (hasBundledPdf(filename)) {
    const bundledPath = getBundledPdfPath(filename);
    console.log(`Using bundled PDF for ${filename}: ${bundledPath}`);
    return bundledPath;
  }

  // Next check if we have downloaded this PDF
  const localPath = `${PDF_STORAGE_DIR}/${filename}`;
  try {
    const exists = await RNFS.exists(localPath);
    if (exists) {
      console.log(`Using downloaded PDF: ${localPath}`);
      return localPath;
    }
  } catch (error) {
    console.log(`Error checking for downloaded PDF ${filename}:`, error);
  }

  // Not found locally
  console.log(`PDF ${filename} not found locally`);
  return null;
};

// Extract filename from a path or URL
export const getFilenameFromPath = (path) => {
  if (!path) return null;
  const parts = path.split("/");
  return parts[parts.length - 1];
};

// Download a PDF to local storage
export const downloadPdfToLocal = async (pdfUrl, filename, onProgress) => {
  try {
    await ensurePdfStorageDir();

    // Get the filename from the URL if not provided
    if (!filename) {
      filename = getFilenameFromPath(pdfUrl);
    }

    // Skip if this is a bundled PDF
    if (hasBundledPdf(filename)) {
      console.log(`PDF ${filename} is bundled, no need to download`);
      return getBundledPdfPath(filename);
    }

    const localPath = `${PDF_STORAGE_DIR}/${filename}`;

    // Check if already downloaded
    const exists = await RNFS.exists(localPath);
    if (exists) {
      console.log(`PDF already downloaded: ${localPath}`);
      return localPath;
    }

    console.log(`Downloading PDF from ${pdfUrl} to ${localPath}`);

    // Make sure URL starts with http:// or https://
    if (!pdfUrl.startsWith("http")) {
      pdfUrl = "https://ramaytilibrary-production.up.railway.app" + pdfUrl;
    }

    // Download the file
    const { promise } = RNFS.downloadFile({
      fromUrl: pdfUrl,
      toFile: localPath,
      background: true,
      progressDivider: 10,
      progress: onProgress,
    });

    const result = await promise;
    if (result.statusCode === 200) {
      console.log("PDF download complete:", localPath);
      return localPath;
    } else {
      console.error(`Download failed with status ${result.statusCode}`);
      return null;
    }
  } catch (error) {
    console.error("Error downloading PDF:", error);
    return null;
  }
};
