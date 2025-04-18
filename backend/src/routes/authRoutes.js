const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Auth routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/profile/:uid", authController.getUserProfile);

module.exports = router;
