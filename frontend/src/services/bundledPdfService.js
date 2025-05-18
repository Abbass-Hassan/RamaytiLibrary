// /frontend/src/services/bundledPdfService.js
import RNFS from "react-native-fs";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// In Android, the assets path should NOT include any leading slash
const BUNDLED_PDF_PATH =
  Platform.OS === "ios" ? `${RNFS.MainBundlePath}/pdfs` : "pdfs";

// Map of book IDs to their bundled PDF filenames
const bundledPdfs = {};

// Hardcoded map of known bundled PDFs - this serves as a fallback
// when file system operations fail
const KNOWN_BUNDLED_PDFS = {
  "174534127-92879.pdf": "pdfs/174534127-92879.pdf",
  "174534175-95989.pdf": "pdfs/174534175-95989.pdf",
  "174568508-65869.pdf": "pdfs/174568508-65869.pdf",
  "arabic_text_test.pdf": "pdfs/arabic_text_test.pdf",
  // Add more bundled PDFs here as you add them to the app
};

// Cache key for storing bundled PDF info
const BUNDLED_PDFS_CACHE_KEY = "bundled_pdfs_info";

// Save the bundled PDFs info to AsyncStorage
const saveBundledPdfsInfo = async () => {
  try {
    await AsyncStorage.setItem(
      BUNDLED_PDFS_CACHE_KEY,
      JSON.stringify(bundledPdfs)
    );
    console.log("Saved bundled PDFs info to AsyncStorage");
  } catch (error) {
    console.error("Error saving bundled PDFs info:", error);
  }
};

// Load the bundled PDFs info from AsyncStorage
const loadBundledPdfsInfo = async () => {
  try {
    const info = await AsyncStorage.getItem(BUNDLED_PDFS_CACHE_KEY);
    if (info) {
      const parsed = JSON.parse(info);
      Object.assign(bundledPdfs, parsed);
      console.log(
        `Loaded ${Object.keys(bundledPdfs).length} bundled PDFs from cache`
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error loading bundled PDFs info:", error);
    return false;
  }
};

// Initialize the list of bundled PDFs
export const initializeBundledPdfs = async () => {
  try {
    console.log("Starting bundled PDF initialization...");

    // First, try to load from cache
    const loaded = await loadBundledPdfsInfo();
    if (loaded && Object.keys(bundledPdfs).length > 0) {
      console.log("Using cached bundled PDFs info");
      return Object.keys(bundledPdfs).length;
    }

    // Merge in known bundled PDFs as a starting point
    Object.assign(bundledPdfs, KNOWN_BUNDLED_PDFS);
    console.log(
      `Added ${Object.keys(KNOWN_BUNDLED_PDFS).length} known bundled PDFs`
    );

    // Try to discover more PDFs from the filesystem
    if (Platform.OS === "android") {
      try {
        console.log("Reading Android assets directory:", BUNDLED_PDF_PATH);
        const files = await RNFS.readDirAssets(BUNDLED_PDF_PATH);
        console.log("Found files in assets:", JSON.stringify(files));

        files.forEach((file) => {
          if (file.name.endsWith(".pdf")) {
            // Store by filename without extension as key
            const fileKey = file.name.replace(".pdf", "");
            bundledPdfs[fileKey] = `${BUNDLED_PDF_PATH}/${file.name}`;
            console.log(
              `Added bundled PDF: ${file.name} → ${bundledPdfs[fileKey]}`
            );

            // Also store with full filename as key for better matching
            bundledPdfs[file.name] = `${BUNDLED_PDF_PATH}/${file.name}`;
          }
        });
      } catch (error) {
        console.log("Error reading bundled PDFs from assets:", error.message);
        // Try with a different path format as fallback
        try {
          console.log("Trying fallback path for Android assets");
          const fallbackPath = "pdfs"; // No leading slash
          const files = await RNFS.readDirAssets(fallbackPath);
          console.log("Found files in fallback path:", JSON.stringify(files));

          files.forEach((file) => {
            if (file.name.endsWith(".pdf")) {
              const fileKey = file.name.replace(".pdf", "");
              bundledPdfs[fileKey] = `${fallbackPath}/${file.name}`;
              bundledPdfs[file.name] = `${fallbackPath}/${file.name}`;
              console.log(`Added bundled PDF (fallback): ${file.name}`);
            }
          });
        } catch (fbError) {
          console.log("Fallback path also failed:", fbError.message);
        }
      }
    } else if (Platform.OS === "ios") {
      // iOS implementation remains the same
      try {
        console.log("Reading iOS bundle directory:", BUNDLED_PDF_PATH);
        const files = await RNFS.readDir(BUNDLED_PDF_PATH);
        console.log("Found files in bundle:", JSON.stringify(files));

        files.forEach((file) => {
          if (file.name.endsWith(".pdf")) {
            const fileKey = file.name.replace(".pdf", "");
            bundledPdfs[fileKey] = file.path;
            bundledPdfs[file.name] = file.path;
            console.log(`Added bundled PDF: ${file.name}`);
          }
        });
      } catch (error) {
        console.log(
          "Error reading bundled PDFs from iOS bundle:",
          error.message
        );
      }
    }

    // Save the bundled PDFs info to cache
    await saveBundledPdfsInfo();

    console.log(
      `Initialized ${Object.keys(bundledPdfs).length} bundled PDFs:`,
      Object.keys(bundledPdfs).join(", ")
    );
    return Object.keys(bundledPdfs).length;
  } catch (error) {
    console.log("Error initializing bundled PDFs:", error.message);
    return 0;
  }
};

// Check if a book has a bundled PDF by filename
export const hasBundledPdf = (filename) => {
  if (!filename) return false;

  console.log("Checking if bundled PDF exists:", filename);
  console.log("Available bundled PDFs:", Object.keys(bundledPdfs).join(", "));

  // Extract just the filename if it contains path information
  const parts = filename.split("/");
  const justFilename = parts[parts.length - 1];

  // Check various ways the PDF might be referenced
  if (bundledPdfs[justFilename]) {
    console.log("Found exact match by filename:", justFilename);
    return true;
  }

  const fileKey = justFilename.replace(".pdf", "");
  if (bundledPdfs[fileKey]) {
    console.log("Found match by filename without extension:", fileKey);
    return true;
  }

  // Check if any bundled PDF path contains this filename
  const matchByPath = Object.values(bundledPdfs).some((path) =>
    path.includes(justFilename)
  );

  if (matchByPath) {
    console.log("Found match by path inclusion");
    return true;
  }

  console.log("No bundled PDF match found for:", filename);
  return false;
};

// Get path to a bundled PDF by filename
export const getBundledPdfPath = (filename) => {
  if (!filename) return null;

  const parts = filename.split("/");
  const justFilename = parts[parts.length - 1];

  // Try all possible ways to find the PDF
  if (bundledPdfs[justFilename]) {
    return bundledPdfs[justFilename];
  }

  const fileKey = justFilename.replace(".pdf", "");
  if (bundledPdfs[fileKey]) {
    return bundledPdfs[fileKey];
  }

  // Find the first path that includes this filename
  const matchingPath = Object.values(bundledPdfs).find((path) =>
    path.includes(justFilename)
  );

  console.log("Returning bundled PDF path:", matchingPath || "null");
  return matchingPath || null;
};

// Get list of all bundled PDF paths
export const getAllBundledPdfs = () => {
  return { ...bundledPdfs };
};
