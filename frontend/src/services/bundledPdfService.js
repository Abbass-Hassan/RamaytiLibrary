// /frontend/src/services/bundledPdfService.js
import RNFS from "react-native-fs";
import { Platform } from "react-native";

// Path to the bundled PDFs - different for Android and iOS
const BUNDLED_PDF_PATH =
  Platform.OS === "ios" ? `${RNFS.MainBundlePath}/pdfs` : "pdfs";

// Map of book IDs to their bundled PDF filenames
// This will be populated with all PDFs included in the app bundle
const bundledPdfs = {};

// Initialize the list of bundled PDFs
export const initializeBundledPdfs = async () => {
  try {
    // We need to check which PDFs are included in the bundle
    // For Android, list the PDFs in the assets/pdfs directory
    if (Platform.OS === "android") {
      try {
        await RNFS.readDirAssets(BUNDLED_PDF_PATH);
        const files = await RNFS.readDirAssets(BUNDLED_PDF_PATH);
        files.forEach((file) => {
          if (file.name.endsWith(".pdf")) {
            // Store by filename without extension as key
            const fileKey = file.name.replace(".pdf", "");
            bundledPdfs[fileKey] = `${BUNDLED_PDF_PATH}/${file.name}`;
          }
        });
      } catch (error) {
        console.error("Error reading bundled PDFs from assets:", error);
      }
    }
    // For iOS, list PDFs in the app bundle's pdfs directory
    else if (Platform.OS === "ios") {
      try {
        const bundlePath = `${RNFS.MainBundlePath}/pdfs`;
        const files = await RNFS.readDir(bundlePath);
        files.forEach((file) => {
          if (file.name.endsWith(".pdf")) {
            const fileKey = file.name.replace(".pdf", "");
            bundledPdfs[fileKey] = file.path;
          }
        });
      } catch (error) {
        console.error("Error reading bundled PDFs on iOS:", error);
      }
    }

    console.log(`Initialized ${Object.keys(bundledPdfs).length} bundled PDFs`);
    return Object.keys(bundledPdfs).length;
  } catch (error) {
    console.error("Error initializing bundled PDFs:", error);
    return 0;
  }
};

// Check if a book has a bundled PDF by filename
export const hasBundledPdf = (filename) => {
  if (!filename) return false;

  // Check if we have a direct match by filename without extension
  const fileKey = filename.replace(".pdf", "");
  if (bundledPdfs[fileKey]) return true;

  // Also check by full filename
  return Object.values(bundledPdfs).some((path) => path.includes(filename));
};

// Get path to a bundled PDF by filename
export const getBundledPdfPath = (filename) => {
  if (!filename) return null;

  const fileKey = filename.replace(".pdf", "");
  return bundledPdfs[fileKey] || null;
};

// Get list of all bundled PDF paths
export const getAllBundledPdfs = () => {
  return { ...bundledPdfs };
};
