const express = require('express');
const path = require('path');
const app = express();

// Parse JSON bodies
app.use(express.json());

// Use the book routes
const bookRoutes = require('./src/routes/bookRoutes');
app.use('/api/books', bookRoutes);

// Serve static PDFs from the public/files folder
app.use('/files', express.static(path.join(__dirname, 'public/files')));

const searchRoutes = require('./src/routes/searchRoutes');
app.use('/api/search', searchRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});