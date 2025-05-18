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

// Create a new book (title and image)
exports.createBook = async (req, res) => {
  try {
    console.log("=== CREATE BOOK REQUEST ===");
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    const { title } = req.body;

    if (!title) {
      console.log("Error: Book title is required");
      return res.status(400).json({
        success: false,
        message: "Book title is required",
      });
    }

    if (!req.file) {
      console.log("Error: Book cover image is required");
      return res.status(400).json({
        success: false,
        message: "Book cover image is required",
      });
    }

    // Get image info
    const fileName = req.file.filename;
    const imagePath = `/images/${fileName}`;
    console.log("Image will be saved with path:", imagePath);
    console.log(
      "Full image path:",
      path.join(__dirname, "../../public", imagePath)
    );

    // Add book to Firestore with title and image
    const bookData = {
      title,
      imagePath,
      imageFileName: fileName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      sections: [], // Empty array to store sections
    };

    console.log("Creating book with data:", bookData);
    const bookRef = await db.collection("books").add(bookData);
    const bookId = bookRef.id;
    console.log("Book created with ID:", bookId);

    res.status(201).json({
      success: true,
      message: "Book created successfully.",
      data: {
        id: bookId,
        ...bookData,
      },
    });
  } catch (error) {
    console.error("Book creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create book",
      error: error.message,
    });
  }
};

// Add a section to a book
exports.addBookSection = async (req, res) => {
  try {
    console.log("=== ADD SECTION REQUEST ===");
    console.log("Book ID:", req.params.id);
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    const { id } = req.params; // Book ID
    const { name } = req.body;

    if (!req.file) {
      console.log("Error: No PDF file uploaded");
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    if (!name) {
      console.log("Error: Section name is required");
      return res.status(400).json({
        success: false,
        message: "Section name is required",
      });
    }

    // Check if book exists
    const bookDoc = await db.collection("books").doc(id).get();
    if (!bookDoc.exists) {
      console.log("Error: Book not found");
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    // Get file info
    const fileName = req.file.filename;
    const filePath = `/files/${fileName}`;
    console.log("PDF will be saved with path:", filePath);

    // Create section data
    const sectionData = {
      name,
      fileName,
      pdfPath: filePath,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      extractionStatus: "pending",
    };

    console.log("Creating section with data:", sectionData);

    // Use subcollection approach for sections
    const sectionRef = await db
      .collection("books")
      .doc(id)
      .collection("sections")
      .add(sectionData);
    const sectionId = sectionRef.id;
    console.log("Section created with ID:", sectionId);

    // For easier access in the frontend, also store basic section info in the books document
    const bookData = bookDoc.data();
    const updatedSections = [
      ...(bookData.sections || []),
      {
        id: sectionId,
        name: name,
        pdfPath: filePath,
      },
    ];

    await db.collection("books").doc(id).update({
      sections: updatedSections,
    });
    console.log("Book document updated with new section");

    // Send response
    res.status(201).json({
      success: true,
      message: "Section added successfully. Text extraction in progress.",
      data: {
        id: sectionId,
        ...sectionData,
      },
    });

    // Perform text extraction asynchronously
    try {
      console.log("Starting text extraction for section:", sectionId);
      const extractionResult = await extractPdfText(filePath);

      if (extractionResult.success) {
        // Store extracted text in Firestore section document
        await sectionRef.update({
          extractedContent: extractionResult.content,
          totalPages: extractionResult.totalPages,
          extractionStatus: "completed",
          extractionCompleted: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Text extraction completed for section ID: ${sectionId}`);
      } else {
        // Store extraction error
        await sectionRef.update({
          extractionStatus: "failed",
          extractionError: extractionResult.error,
        });
        console.log(
          `Text extraction failed for section ID: ${sectionId}: ${extractionResult.error}`
        );
      }
    } catch (extractionError) {
      console.error(
        `Unhandled extraction error for section ID: ${sectionId}:`,
        extractionError
      );
      await sectionRef.update({
        extractionStatus: "failed",
        extractionError: extractionError.message,
      });
    }
  } catch (error) {
    console.error("Add section error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add section",
      error: error.message,
    });
  }
};

// Get all books
exports.getAllBooks = async (req, res) => {
  try {
    console.log("=== GET ALL BOOKS REQUEST ===");
    const booksSnapshot = await db.collection("books").get();

    const books = [];
    booksSnapshot.forEach((doc) => {
      books.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    console.log(`Retrieved ${books.length} books`);
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

// Get a single book by ID with all sections
exports.getBookById = async (req, res) => {
  try {
    console.log("=== GET BOOK BY ID REQUEST ===");
    console.log("Book ID:", req.params.id);

    const { id } = req.params;

    const bookDoc = await db.collection("books").doc(id).get();

    if (!bookDoc.exists) {
      console.log("Error: Book not found");
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    // Retrieve book data
    const bookData = {
      id: bookDoc.id,
      ...bookDoc.data(),
    };
    console.log("Retrieved book data:", bookData);

    // Get all sections from subcollection
    const sectionsSnapshot = await db
      .collection("books")
      .doc(id)
      .collection("sections")
      .get();

    const sections = [];
    sectionsSnapshot.forEach((doc) => {
      sections.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    console.log(`Retrieved ${sections.length} sections for the book`);

    // If there are sections in the subcollection but not in the book document array,
    // update the book document
    if (
      sections.length > 0 &&
      (!bookData.sections || bookData.sections.length !== sections.length)
    ) {
      const simplifiedSections = sections.map((section) => ({
        id: section.id,
        name: section.name,
        pdfPath: section.pdfPath,
      }));

      await db.collection("books").doc(id).update({
        sections: simplifiedSections,
      });
      console.log("Updated book document with sections from subcollection");

      bookData.sections = simplifiedSections;
    }

    res.status(200).json({
      success: true,
      data: bookData,
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

// Delete a section
exports.deleteSection = async (req, res) => {
  try {
    console.log("=== DELETE SECTION REQUEST ===");
    console.log("Book ID:", req.params.bookId);
    console.log("Section ID:", req.params.sectionId);

    const { bookId, sectionId } = req.params;

    // Check if book exists
    const bookDoc = await db.collection("books").doc(bookId).get();
    if (!bookDoc.exists) {
      console.log("Error: Book not found");
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    // Check if section exists
    const sectionDoc = await db
      .collection("books")
      .doc(bookId)
      .collection("sections")
      .doc(sectionId)
      .get();
    if (!sectionDoc.exists) {
      console.log("Error: Section not found");
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    const sectionData = sectionDoc.data();
    console.log("Section to delete:", sectionData);

    // Delete PDF file from server
    if (sectionData.pdfPath) {
      const filePath = path.join(
        __dirname,
        "../../public",
        sectionData.pdfPath
      );
      console.log("Attempting to delete PDF file:", filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("PDF file deleted successfully");
      } else {
        console.log("PDF file not found on server");
      }
    }

    // Delete section from Firestore subcollection
    await db
      .collection("books")
      .doc(bookId)
      .collection("sections")
      .doc(sectionId)
      .delete();
    console.log("Section document deleted from Firestore");

    // Update book document to remove section from array
    const bookData = bookDoc.data();
    const updatedSections = (bookData.sections || []).filter(
      (section) => section.id !== sectionId
    );

    await db.collection("books").doc(bookId).update({
      sections: updatedSections,
    });
    console.log("Book document updated to remove section");

    res.status(200).json({
      success: true,
      message: "Section deleted successfully",
    });
  } catch (error) {
    console.error("Delete section error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete section",
      error: error.message,
    });
  }
};

// Delete a book and all its sections
exports.deleteBook = async (req, res) => {
  try {
    console.log("=== DELETE BOOK REQUEST ===");
    console.log("Book ID:", req.params.id);

    const { id } = req.params;

    const bookDoc = await db.collection("books").doc(id).get();

    if (!bookDoc.exists) {
      console.log("Error: Book not found");
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    const bookData = bookDoc.data();
    console.log("Book to delete:", bookData);

    // Delete book cover image if it exists
    if (bookData.imagePath) {
      const imagePath = path.join(
        __dirname,
        "../../public",
        bookData.imagePath
      );
      console.log("Attempting to delete image file:", imagePath);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log("Image file deleted successfully");
      } else {
        console.log("Image file not found on server");
      }
    }

    // Get all sections to delete their files
    const sectionsSnapshot = await db
      .collection("books")
      .doc(id)
      .collection("sections")
      .get();
    console.log(`Found ${sectionsSnapshot.size} sections to delete`);

    // Delete all section files
    const deletePromises = [];
    sectionsSnapshot.forEach((doc) => {
      const sectionData = doc.data();
      if (sectionData.pdfPath) {
        const filePath = path.join(
          __dirname,
          "../../public",
          sectionData.pdfPath
        );
        console.log("Attempting to delete section PDF file:", filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("Section PDF file deleted successfully");
        } else {
          console.log("Section PDF file not found on server");
        }
      }
      // Add promise to delete the section document
      deletePromises.push(
        db
          .collection("books")
          .doc(id)
          .collection("sections")
          .doc(doc.id)
          .delete()
      );
    });

    // Wait for all section deletions to complete
    await Promise.all(deletePromises);
    console.log("All section documents deleted from Firestore");

    // Delete the book document
    await db.collection("books").doc(id).delete();
    console.log("Book document deleted from Firestore");

    res.status(200).json({
      success: true,
      message: "Book and all sections deleted successfully",
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
