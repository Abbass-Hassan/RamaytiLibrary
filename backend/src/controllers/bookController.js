// backend/src/controllers/bookController.js
const admin = require("../config/firebase");
const db = admin.firestore();
const { extractTextFromPdfUrlWithPdfJs } = require("../pdfJsService");
const path = require("path");
const fs = require("fs");

// Helper function to clean and properly encode URLs
function cleanAndEncodeUrl(url) {
  if (!url) return null;

  // First trim the URL
  let cleanUrl = url.trim();

  // Check if it's a local file path from the new admin panel
  if (cleanUrl.startsWith("/files/")) {
    // For local files, use the server URL
    const serverUrl =
      process.env.SERVER_URL ||
      "http://ramaytilibrary-production.up.railway.app";
    cleanUrl = `${serverUrl}${cleanUrl}`;
    console.log("Using local file path:", cleanUrl);
    return cleanUrl;
  }

  // Convert GitHub repository URLs to raw URLs
  if (cleanUrl.includes("github.com") && cleanUrl.includes("/blob/")) {
    // For GitHub blob URLs
    cleanUrl = cleanUrl
      .replace("github.com", "raw.githubusercontent.com")
      .replace("/blob/", "/");
    console.log("Converted GitHub URL to raw URL:", cleanUrl);
  }

  // Handle GitHub Pages URLs
  if (cleanUrl.includes("abbass-hassan.github.io")) {
    try {
      // Parse the URL to separate the base URL from the filename
      const urlParts = cleanUrl.split("/");
      const filename = urlParts[urlParts.length - 1];
      const baseUrl = cleanUrl.substring(0, cleanUrl.length - filename.length);

      // Decode first in case it's already encoded, then re-encode properly
      const decodedFilename = decodeURIComponent(filename);
      const encodedFilename = encodeURIComponent(decodedFilename);

      // Reconstruct the URL with properly encoded filename
      cleanUrl = baseUrl + encodedFilename;
      console.log("Encoded URL:", cleanUrl);
    } catch (e) {
      console.error("Error processing URL encoding:", e);
    }
  }

  return cleanUrl;
}

// Helper function to get the PDF filename from a URL or path
function getFilenameFromPath(pdfPath) {
  if (!pdfPath) return null;

  // Extract filename from URL or path
  const parts = pdfPath.split("/");
  return parts[parts.length - 1];
}

// Helper function to check if a PDF exists in the assets directory
function checkPdfInAssets(filename) {
  if (!filename) return false;

  try {
    const assetsPath = path.join(__dirname, "../../public/files", filename);
    return fs.existsSync(assetsPath);
  } catch (error) {
    console.error(`Error checking if PDF exists in assets: ${error}`);
    return false;
  }
}

exports.getAllBooks = async (req, res) => {
  try {
    const snapshot = await db.collection("books").get();
    const books = snapshot.docs.map((doc) => {
      const data = doc.data();
      if (data.pdfPath && data.pdfPath.includes("localhost")) {
        data.pdfPath = data.pdfPath.replace(
          "localhost",
          "ramaytilibrary-production.up.railway.app"
        );
      }

      // Extract filename from pdfPath for asset reference
      const pdfFilename = getFilenameFromPath(data.pdfPath);
      const isInAssets = checkPdfInAssets(pdfFilename);

      return {
        id: doc.id,
        ...data,
        pdfFilename,
        isInAssets,
      };
    });
    res.json(books);
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ error: "Failed to get books" });
  }
};

exports.getBookById = async (req, res) => {
  try {
    const { bookId } = req.params;
    const docRef = db.collection("books").doc(bookId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Book not found" });
    }

    const data = docSnap.data();
    if (data.pdfPath && data.pdfPath.includes("localhost")) {
      data.pdfPath = data.pdfPath.replace(
        "localhost",
        "ramaytilibrary-production.up.railway.app"
      );
    }

    // Clean and encode URLs in the response
    if (data.pdfPath) {
      data.pdfPath = cleanAndEncodeUrl(data.pdfPath);
    }

    // Extract filename from pdfPath for asset reference
    const pdfFilename = getFilenameFromPath(data.pdfPath);
    const isInAssets = checkPdfInAssets(pdfFilename);

    res.json({
      id: docSnap.id,
      ...data,
      pdfFilename,
      isInAssets,
    });
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ error: "Failed to get book" });
  }
};

// Rest of your code remains the same...
// ...

exports.getBookSections = async (req, res) => {
  try {
    const { bookId } = req.params;
    const docRef = db.collection("books").doc(bookId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Book not found" });
    }

    const bookData = docSnap.data();
    const sections = bookData.sections || [];
    res.json(sections);
  } catch (error) {
    console.error("Error fetching sections:", error);
    res.status(500).json({ error: "Failed to get sections" });
  }
};

exports.redirectToPdf = async (req, res) => {
  try {
    const { bookId, sectionIndex } = req.params;
    const docRef = db.collection("books").doc(bookId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Book not found" });
    }

    const bookData = docSnap.data();
    const sections = bookData.sections || [];
    const index = parseInt(sectionIndex, 10);

    if (index < 0 || index >= sections.length) {
      return res.status(404).json({ error: "Section not found" });
    }

    const section = sections[index];
    const page = section.page;
    let pdfPath = bookData.pdfPath;

    // Clean and format the PDF path
    if (pdfPath && pdfPath.includes("localhost")) {
      pdfPath = pdfPath.replace(
        "localhost",
        "ramaytilibrary-production.up.railway.app"
      );
    }

    // Properly encode the URL
    pdfPath = cleanAndEncodeUrl(pdfPath);

    res.redirect(`${pdfPath}#page=${page}`);
  } catch (error) {
    console.error("Error redirecting to PDF:", error);
    res.status(500).json({ error: "Failed to redirect to PDF" });
  }
};

exports.getBookContent = async (req, res) => {
  try {
    const { bookId } = req.params;
    console.log(`Getting content for book ID: ${bookId}`);

    // Get the book from Firestore
    const docRef = db.collection("books").doc(bookId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log(`Book not found: ${bookId}`);
      return res.status(404).json({ error: "Book not found" });
    }

    const bookData = docSnap.data();
    console.log(`Found book: ${bookData.title}`);

    // Check if we already have extracted content
    if (
      bookData.extractionStatus === "completed" &&
      bookData.extractedContent &&
      bookData.extractedContent.length > 0
    ) {
      console.log(
        `Using pre-extracted content (${bookData.extractedContent.length} pages)`
      );

      // Return the pre-extracted content
      return res.json({
        bookId: docSnap.id,
        title: bookData.title,
        totalPages: bookData.totalPages || bookData.extractedContent.length,
        content: bookData.extractedContent,
      });
    }

    // If extraction is in progress, inform the client
    if (bookData.extractionStatus === "pending") {
      console.log(`Text extraction is still in progress for book ${bookId}`);
      // Return a limited set of pages with a message
      const pendingMessage = [
        `Text extraction is in progress for "${bookData.title}".`,
        "This process may take a few minutes for large books.",
        "Please try again shortly.",
      ];

      return res.json({
        bookId: docSnap.id,
        title: bookData.title,
        totalPages: 1,
        content: pendingMessage,
        isProcessing: true,
      });
    }

    // If extraction failed or not yet started, extract on demand
    // Find the PDF path
    let pdfPath = null;

    // Check all the possible field names that might contain the path
    if (bookData.pdfPath) {
      pdfPath = bookData.pdfPath;
    } else if (bookData.pdfpath) {
      pdfPath = bookData.pdfpath;
    } else if (bookData.pdf_path) {
      pdfPath = bookData.pdf_path;
    } else {
      // Look through all fields to find anything that might contain a PDF URL
      for (const key in bookData) {
        if (
          typeof bookData[key] === "string" &&
          (bookData[key].endsWith(".pdf") ||
            bookData[key].includes("pdf-hosting"))
        ) {
          pdfPath = bookData[key];
          console.log(`Found PDF URL in field '${key}': ${pdfPath}`);
          break;
        }
      }
    }

    if (!pdfPath) {
      return res.status(400).json({
        error: "PDF path not found in book data",
        bookData: { title: bookData.title, id: docSnap.id },
      });
    }

    // Format the PDF path
    if (pdfPath.includes("localhost")) {
      pdfPath = pdfPath.replace(
        "localhost",
        "ramaytilibrary-production.up.railway.app"
      );
    }

    // Clean and properly encode the URL (handles Arabic filenames)
    pdfPath = cleanAndEncodeUrl(pdfPath);

    console.log(`Cleaned PDF path: ${pdfPath}`);
    console.log(`Starting on-demand PDF text extraction...`);

    // Extract text content from the PDF
    try {
      const textContent = await extractTextFromPdfUrlWithPdfJs(pdfPath);
      console.log(`Text extraction complete, processing pages...`);

      // Split text by form feed character to get pages
      const pages = textContent
        .split("\f")
        .filter((page) => page.trim() !== "");
      console.log(`Extracted ${pages.length} pages of content`);

      // Store the extracted content for future use
      await docRef.update({
        extractedContent: pages,
        totalPages: pages.length,
        extractionStatus: "completed",
        extractionCompleted: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({
        bookId: docSnap.id,
        title: bookData.title,
        totalPages: pages.length,
        content: pages,
      });
    } catch (pdfError) {
      console.error("PDF processing error:", pdfError);

      // Update the extraction status
      await docRef.update({
        extractionStatus: "failed",
        extractionError: pdfError.message,
      });

      // Fallback with mock content
      console.log("Using fallback content generation");

      // Create a simple mock content as fallback
      const fallbackPages = [];
      const pageCount = 10; // Mock 10 pages

      for (let i = 1; i <= pageCount; i++) {
        fallbackPages.push(
          `This is page ${i} of ${bookData.title}.\n\n` +
            `PDF text extraction failed. Please use the Standard PDF viewer.\n\n` +
            `Error: ${pdfError.message}`
        );
      }

      res.json({
        bookId: docSnap.id,
        title: bookData.title,
        totalPages: pageCount,
        content: fallbackPages,
        isPreview: true,
        error: pdfError.message,
      });
    }
  } catch (error) {
    console.error("Error getting book content:", error);
    res
      .status(500)
      .json({ message: "Failed to get book content", error: error.message });
  }
};
