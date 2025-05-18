// backend/src/routes/adminBookRoutes.js
const express = require("express");
const router = express.Router();
const adminBookController = require("../controllers/adminBookController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads directories if they don't exist
const uploadPdfDir = path.join(__dirname, "../../public/files");
const uploadImgDir = path.join(__dirname, "../../public/images");

console.log("PDF directory path:", uploadPdfDir);
console.log("Image directory path:", uploadImgDir);

if (!fs.existsSync(uploadPdfDir)) {
  fs.mkdirSync(uploadPdfDir, { recursive: true });
  console.log("Created PDF directory:", uploadPdfDir);
}

if (!fs.existsSync(uploadImgDir)) {
  fs.mkdirSync(uploadImgDir, { recursive: true });
  console.log("Created image directory:", uploadImgDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(
      "Multer handling file:",
      file.fieldname,
      file.originalname,
      file.mimetype
    );
    // Store PDFs and images in different directories
    if (file.fieldname === "pdf") {
      console.log("Saving PDF to:", uploadPdfDir);
      cb(null, uploadPdfDir);
    } else if (file.fieldname === "image") {
      console.log("Saving image to:", uploadImgDir);
      cb(null, uploadImgDir);
    } else {
      console.log("Unknown fieldname, defaulting to PDF dir:", file.fieldname);
      cb(null, uploadPdfDir); // Default
    }
  },
  filename: function (req, file, cb) {
    // Get original file extension
    const ext = path.extname(file.originalname);
    // Generate unique filename
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    console.log("Generated filename:", filename);
    cb(null, filename);
  },
});

// Create upload middleware with file filtering
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    console.log("Filtering file:", file.fieldname, file.mimetype);
    if (file.fieldname === "pdf") {
      // Accept only PDF files for the pdf field
      if (file.mimetype !== "application/pdf") {
        console.log("Rejected PDF:", file.originalname, file.mimetype);
        return cb(new Error("Only PDF files are allowed for sections"), false);
      }
    } else if (file.fieldname === "image") {
      // Accept only image files for the image field
      if (!file.mimetype.startsWith("image/")) {
        console.log("Rejected image:", file.originalname, file.mimetype);
        return cb(
          new Error("Only image files are allowed for book covers"),
          false
        );
      }
    }
    console.log("Accepted file:", file.originalname, file.mimetype);
    cb(null, true);
  },
});

// Book routes
router.post("/", upload.single("image"), adminBookController.createBook); // Create new book with image
router.get("/", adminBookController.getAllBooks); // Get all books
router.get("/:id", adminBookController.getBookById); // Get a book by ID
router.delete("/:id", adminBookController.deleteBook); // Delete a book

// Section routes
router.post(
  "/:id/sections",
  upload.single("pdf"),
  adminBookController.addBookSection
); // Add section to a book
router.delete(
  "/:bookId/sections/:sectionId",
  adminBookController.deleteSection
); // Delete a section

module.exports = router;
