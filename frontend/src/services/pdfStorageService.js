// /frontend/src/services/pdfStorageService.js
import RNFS from "react-native-fs";
import { Platform } from "react-native";
import { hasBundledPdf, getBundledPdfPath } from "./bundledPdfService";

// Document directory for downloaded PDFs (for future use if needed)
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

// Get the local path to a PDF - prioritize bundled PDFs
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

  // For non-bundled PDFs (shouldn't happen in offline-first approach)
  console.log(`PDF ${filename} not found in bundle`);
  return null;
};

// Extract filename from a path or URL
export const getFilenameFromPath = (path) => {
  if (!path) return null;
  const parts = path.split("/");
  return parts[parts.length - 1];
};

// Check if a PDF is available offline (bundled)
export const isPdfAvailableOffline = (filename) => {
  return hasBundledPdf(filename);
};

// Get the appropriate PDF source for react-native-pdf
export const getPdfSource = async (bookId, filename, pdfPath) => {
  // Try to get local path first
  const localPath = await getPdfPath(bookId, filename);

  if (localPath) {
    if (Platform.OS === "android" && localPath.startsWith("pdfs/")) {
      // For Android bundled PDFs, use asset:// protocol
      return { uri: `bundle-assets://${localPath}` };
    } else if (Platform.OS === "ios") {
      // For iOS bundled PDFs, use the full path
      return { uri: localPath };
    }
  }

  // Fallback to network URL (shouldn't happen in offline-first approach)
  if (pdfPath && pdfPath.startsWith("http")) {
    console.log(`Warning: Using network URL for PDF ${filename}`);
    return { uri: pdfPath };
  }

  return null;
};

// Legacy download function - kept for future use if needed
export const downloadPdfToLocal = async (pdfUrl, filename, onProgress) => {
  console.log(
    "Download function called but not needed in offline-first approach"
  );
  // In offline-first approach, all PDFs should be bundled
  // This function is kept for potential future use
  return null;
};
