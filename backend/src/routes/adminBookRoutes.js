// backend/src/routes/adminBookRoutes.js
const express = require("express");
const router = express.Router();
const adminBookController = require("../controllers/adminBookController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "../../public/files");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Get original file extension
    const ext = path.extname(file.originalname);
    // Generate unique filename
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

// Create upload middleware with file filtering for PDFs
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter: function (req, file, cb) {
    // Accept only PDF files
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"), false);
    }
    cb(null, true);
  },
});

// Admin Book routes
router.post("/", upload.single("pdf"), adminBookController.uploadBook);
router.get("/", adminBookController.getAllBooks);
router.get("/:id", adminBookController.getBookById);
router.put("/:id/sections", adminBookController.updateBookSections);
router.delete("/:id", adminBookController.deleteBook);

module.exports = router;
