const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");

router.get("/", bookController.getAllBooks);
router.get("/:bookId", bookController.getBookById);
router.get("/:bookId/sections", bookController.getBookSections);
router.get("/:bookId/sections/:sectionIndex/pdf", bookController.redirectToPdf);
router.get("/:bookId/content", bookController.getBookContent);
module.exports = router;
