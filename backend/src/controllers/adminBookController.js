// backend/src/controllers/adminBookController.js
const admin = require("../config/firebase");
const db = admin.firestore();
const fs = require("fs");
const path = require("path");
const { extractTextFromPdfUrlWithPdfJs } = require("../pdfJsService");

// Helper function to get absolute server URL
const getServerUrl = () => {
  // When running locally, use localhost
  if (process.env.NODE_ENV === "development" || !process.env.SERVER_URL) {
    return "http://localhost:3000";
  }
  return (
    process.env.SERVER_URL || "http://ramaytilibrary-production.up.railway.app"
  );
};

// Extract text from uploaded PDF
const extractPdfText = async (filePath) => {
  try {
    // Check if file exists before attempting extraction
    const localFilePath = path.join(__dirname, "../../public", filePath);
    if (!fs.existsSync(localFilePath)) {
      console.error(`File not found at: ${localFilePath}`);
      return {
        success: false,
        error: "PDF file not found on server",
      };
    }

    // For local development, use direct file path instead of HTTP
    let pdfSource;
    if (process.env.NODE_ENV === "development" || !process.env.SERVER_URL) {
      // Direct file access when running locally
      pdfSource = `file://${localFilePath}`;
      console.log("Using direct file access:", pdfSource);
    } else {
      // HTTP access when in production
      pdfSource = `${getServerUrl()}${filePath}`;
      console.log("Using HTTP access:", pdfSource);
    }

    // Extract text using our enhanced extraction function
    const textContent = await extractTextFromPdfUrlWithPdfJs(pdfSource);

    // Split text by form feed character to get pages
    const pages = textContent.split("\f").filter((page) => page.trim() !== "");

    console.log(`Extracted ${pages.length} pages of content`);
    return {
      success: true,
      totalPages: pages.length,
      content: pages,
    };
  } catch (error) {
    console.error("PDF text extraction error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Upload a new book
exports.uploadBook = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { title, sections } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Book title is required",
      });
    }

    // Parse sections if they were sent as a JSON string
    let parsedSections = [];
    if (sections) {
      try {
        parsedSections =
          typeof sections === "string" ? JSON.parse(sections) : sections;
      } catch (error) {
        console.error("Error parsing sections:", error);
        parsedSections = [];
      }
    }

    // Get file info
    const fileName = req.file.filename;
    const filePath = `/files/${fileName}`;

    // Add book to Firestore - initially without extracted content
    const bookData = {
      title,
      pdfPath: filePath,
      fileName,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      sections: parsedSections || [],
      extractionStatus: "pending",
    };

    const bookRef = await db.collection("books").add(bookData);
    const bookId = bookRef.id;

    // Start text extraction in the background
    console.log(`Starting PDF extraction for book ID: ${bookId}`);

    // Send response immediately so the user doesn't have to wait
    res.status(201).json({
      success: true,
      message: "Book uploaded successfully. Text extraction in progress.",
      data: {
        id: bookId,
        ...bookData,
      },
    });

    // Perform text extraction asynchronously
    try {
      const extractionResult = await extractPdfText(filePath);

      if (extractionResult.success) {
        // Store extracted text in Firestore
        await bookRef.update({
          extractedContent: extractionResult.content,
          totalPages: extractionResult.totalPages,
          extractionStatus: "completed",
          extractionCompleted: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Text extraction completed for book ID: ${bookId}`);
      } else {
        // Store extraction error
        await bookRef.update({
          extractionStatus: "failed",
          extractionError: extractionResult.error,
        });
        console.log(
          `Text extraction failed for book ID: ${bookId}: ${extractionResult.error}`
        );
      }
    } catch (extractionError) {
      console.error(
        `Unhandled extraction error for book ID: ${bookId}:`,
        extractionError
      );
      await bookRef.update({
        extractionStatus: "failed",
        extractionError: extractionError.message,
      });
    }
  } catch (error) {
    console.error("Book upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload book",
      error: error.message,
    });
  }
};

// Get all books
exports.getAllBooks = async (req, res) => {
  try {
    const booksSnapshot = await db.collection("books").get();

    const books = [];
    booksSnapshot.forEach((doc) => {
      books.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      success: true,
      count: books.length,
      data: books,
    });
  } catch (error) {
    console.error("Get all books error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve books",
      error: error.message,
    });
  }
};

// Get a single book by ID
exports.getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    const bookDoc = await db.collection("books").doc(id).get();

    if (!bookDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: bookDoc.id,
        ...bookDoc.data(),
      },
    });
  } catch (error) {
    console.error("Get book error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve book",
      error: error.message,
    });
  }
};

// Update book sections
exports.updateBookSections = async (req, res) => {
  try {
    const { id } = req.params;
    const { sections } = req.body;

    if (!sections) {
      return res.status(400).json({
        success: false,
        message: "Sections are required",
      });
    }

    const bookDoc = await db.collection("books").doc(id).get();

    if (!bookDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    await db.collection("books").doc(id).update({
      sections: sections,
    });

    res.status(200).json({
      success: true,
      message: "Book sections updated successfully",
    });
  } catch (error) {
    console.error("Update book sections error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update book sections",
      error: error.message,
    });
  }
};

// Delete a book
exports.deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    const bookDoc = await db.collection("books").doc(id).get();

    if (!bookDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    const bookData = bookDoc.data();

    // Delete file from server
    const filePath = path.join(__dirname, "../../public", bookData.pdfPath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from Firestore
    await db.collection("books").doc(id).delete();

    res.status(200).json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    console.error("Delete book error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete book",
      error: error.message,
    });
  }
};
