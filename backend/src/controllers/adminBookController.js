// backend/src/controllers/adminBookController.js
const admin = require("../config/firebase");
const db = admin.firestore();
const fs = require("fs");
const path = require("path");

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

    // Add book to Firestore
    const bookData = {
      title,
      pdfPath: filePath,
      fileName,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      sections: parsedSections || [],
    };

    const bookRef = await db.collection("books").add(bookData);

    res.status(201).json({
      success: true,
      message: "Book uploaded successfully",
      data: {
        id: bookRef.id,
        ...bookData,
      },
    });
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
