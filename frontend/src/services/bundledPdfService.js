// /frontend/src/services/bundledPdfService.js
import RNFS from "react-native-fs";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// In Android, the assets path should NOT include any leading slash
const BUNDLED_PDF_PATH =
  Platform.OS === "ios" ? `${RNFS.MainBundlePath}/pdfs` : "pdfs";
const BUNDLED_IMAGES_PATH =
  Platform.OS === "ios" ? `${RNFS.MainBundlePath}/images` : "images";
const BUNDLED_BOOKS_JSON =
  Platform.OS === "ios" ? `${RNFS.MainBundlePath}/books.json` : "books.json";

// Map of book IDs to their bundled PDF filenames
const bundledPdfs = {};

// Bundled books data
let bundledBooksData = [];

// Cache keys
const BUNDLED_PDFS_CACHE_KEY = "bundled_pdfs_info";
const BUNDLED_BOOKS_DATA_KEY = "bundled_books_data";

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

// Load the bundled books data
export const loadBundledBooksData = async () => {
  try {
    console.log("Loading bundled books data...");

    // Try to load from cache first
    const cached = await AsyncStorage.getItem(BUNDLED_BOOKS_DATA_KEY);
    if (cached) {
      bundledBooksData = JSON.parse(cached);
      console.log(`Loaded ${bundledBooksData.length} books from cache`);

      // Also rebuild the PDF mapping
      bundledBooksData.forEach((book) => {
        if (book.pdfFilename) {
          bundledPdfs[
            book.pdfFilename
          ] = `${BUNDLED_PDF_PATH}/${book.pdfFilename}`;
        }
        if (book.sections) {
          book.sections.forEach((section) => {
            if (section.pdfFilename) {
              bundledPdfs[
                section.pdfFilename
              ] = `${BUNDLED_PDF_PATH}/${section.pdfFilename}`;
            }
          });
        }
      });

      return bundledBooksData;
    }

    // Load books.json from assets
    let booksJson;
    if (Platform.OS === "android") {
      // Read from Android assets
      try {
        booksJson = await RNFS.readFileAssets(BUNDLED_BOOKS_JSON, "utf8");
      } catch (error) {
        console.log("Error reading books.json from assets:", error);
        // Try without 'utf8' encoding
        booksJson = await RNFS.readFileAssets(BUNDLED_BOOKS_JSON);
      }
    } else {
      // Read from iOS bundle
      booksJson = await RNFS.readFile(BUNDLED_BOOKS_JSON, "utf8");
    }

    bundledBooksData = JSON.parse(booksJson);
    console.log(`Loaded ${bundledBooksData.length} books from books.json`);

    // Build PDF mapping
    bundledBooksData.forEach((book) => {
      if (book.pdfFilename) {
        bundledPdfs[
          book.pdfFilename
        ] = `${BUNDLED_PDF_PATH}/${book.pdfFilename}`;
      }
      if (book.sections) {
        book.sections.forEach((section) => {
          if (section.pdfFilename) {
            bundledPdfs[
              section.pdfFilename
            ] = `${BUNDLED_PDF_PATH}/${section.pdfFilename}`;
          }
        });
      }
    });

    // Cache the data
    await AsyncStorage.setItem(
      BUNDLED_BOOKS_DATA_KEY,
      JSON.stringify(bundledBooksData)
    );
    await saveBundledPdfsInfo();

    return bundledBooksData;
  } catch (error) {
    console.error("Error loading bundled books data:", error);
    return [];
  }
};

// Get all bundled books
export const getBundledBooks = () => {
  return bundledBooksData;
};

// Initialize the bundled PDFs and books data
export const initializeBundledPdfs = async () => {
  try {
    console.log("Starting bundled PDF initialization...");

    // Load books data which also populates PDF mapping
    const books = await loadBundledBooksData();

    console.log(
      `Initialized ${books.length} bundled books with ${
        Object.keys(bundledPdfs).length
      } PDFs`
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

  // Extract just the filename if it contains path information
  const parts = filename.split("/");
  const justFilename = parts[parts.length - 1];

  console.log("Checking if bundled PDF exists:", justFilename);

  if (bundledPdfs[justFilename]) {
    console.log("Found bundled PDF:", justFilename);
    return true;
  }

  // Check without .pdf extension
  const fileKey = justFilename.replace(".pdf", "");
  if (bundledPdfs[fileKey]) {
    console.log("Found bundled PDF by key:", fileKey);
    return true;
  }

  console.log("No bundled PDF found for:", justFilename);
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

  console.log("No bundled PDF path found for:", filename);
  return null;
};

// Get bundled image path
export const getBundledImagePath = (imagePath) => {
  if (!imagePath) return null;

  // Extract filename from path
  const parts = imagePath.split("/");
  const filename = parts[parts.length - 1];

  if (Platform.OS === "android") {
    return `asset:/images/${filename}`;
  } else {
    return `${RNFS.MainBundlePath}/images/${filename}`;
  }
};

// Get list of all bundled PDF paths
export const getAllBundledPdfs = () => {
  return { ...bundledPdfs };
};
