// backend/server.js with added debugging for static files
const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();

console.log("Starting server with debugging enabled...");

// Middleware
app.use(cors());
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === "POST" || req.method === "PUT") {
    console.log("Content-Type:", req.headers["content-type"]);
  }
  next();
});

// Use the book routes
const bookRoutes = require("./src/routes/bookRoutes");
app.use("/api/books", bookRoutes);

// Use the admin book routes
const adminBookRoutes = require("./src/routes/adminBookRoutes");
app.use("/api/admin/books", adminBookRoutes);

// Use the auth routes
const authRoutes = require("./src/routes/authRoutes");
app.use("/api/auth", authRoutes);

// Use the search routes
const searchRoutes = require("./src/routes/searchRoutes");
app.use("/api/search", searchRoutes);

// Serve static files from the public directories
const filesPath = path.join(__dirname, "public/files");
const imagesPath = path.join(__dirname, "public/images");

console.log("Static files configuration:");
console.log("Files directory path:", filesPath);
console.log("Images directory path:", imagesPath);

// Check if directories exist
const fs = require("fs");
if (!fs.existsSync(path.join(__dirname, "public"))) {
  console.log("Creating public directory");
  fs.mkdirSync(path.join(__dirname, "public"), { recursive: true });
}
if (!fs.existsSync(filesPath)) {
  console.log("Creating files directory");
  fs.mkdirSync(filesPath, { recursive: true });
}
if (!fs.existsSync(imagesPath)) {
  console.log("Creating images directory");
  fs.mkdirSync(imagesPath, { recursive: true });
}

// Serve static files
app.use("/files", express.static(filesPath));
app.use("/images", express.static(imagesPath));

// Test route to ensure server is working
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is running properly" });
});

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0"; // <-- This is required for Fly.io

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`File access URL: http://${HOST}:${PORT}/files/test.pdf`);
  console.log(`Image access URL: http://${HOST}:${PORT}/images/test.jpg`);
});
