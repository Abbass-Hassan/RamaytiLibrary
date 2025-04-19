const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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

// Serve static PDFs from the public/files folder
app.use("/files", express.static(path.join(__dirname, "public/files")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
