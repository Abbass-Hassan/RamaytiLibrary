// backend/scripts/exportBooks.js
const admin = require("../src/config/firebase");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const db = admin.firestore();

// Helper to download a file
const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith("https") ? https : http;

    protocol
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {}); // Delete the file on error
        reject(err);
      });
  });
};

// Extract filename from URL/path
const getFilenameFromPath = (urlPath) => {
  if (!urlPath) return null;
  const parts = urlPath.split("/");
  return parts[parts.length - 1];
};

async function exportBooks() {
  try {
    console.log("Starting book export...");

    // Create directories
    const exportDir = path.join(__dirname, "../../export");
    const pdfsDir = path.join(exportDir, "pdfs");
    const imagesDir = path.join(exportDir, "images");

    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);
    if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir);
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);

    // Get all books
    const booksSnapshot = await db.collection("books").get();
    const books = [];

    for (const doc of booksSnapshot.docs) {
      const bookData = doc.data();
      const bookId = doc.id;

      console.log(`Processing book: ${bookData.title}`);

      // Process book cover image
      let localImagePath = null;
      if (bookData.imagePath) {
        const imageFilename = getFilenameFromPath(bookData.imagePath);
        if (imageFilename) {
          localImagePath = `images/${imageFilename}`;

          // Check if image exists locally
          const serverImagePath = path.join(
            __dirname,
            "../../public",
            bookData.imagePath
          );
          if (fs.existsSync(serverImagePath)) {
            // Copy local image
            fs.copyFileSync(
              serverImagePath,
              path.join(exportDir, localImagePath)
            );
            console.log(`  ✓ Copied image: ${imageFilename}`);
          } else if (bookData.imagePath.startsWith("http")) {
            // Download remote image
            try {
              await downloadFile(
                bookData.imagePath,
                path.join(exportDir, localImagePath)
              );
              console.log(`  ✓ Downloaded image: ${imageFilename}`);
            } catch (err) {
              console.log(`  ✗ Failed to download image: ${err.message}`);
              localImagePath = null;
            }
          }
        }
      }

      // Process sections (PDFs)
      const sections = [];
      if (bookData.sections && bookData.sections.length > 0) {
        for (const section of bookData.sections) {
          const pdfFilename = getFilenameFromPath(section.pdfPath);
          if (pdfFilename) {
            const localPdfPath = `pdfs/${pdfFilename}`;

            // Check if PDF exists locally
            const serverPdfPath = path.join(
              __dirname,
              "../../public",
              section.pdfPath
            );
            if (fs.existsSync(serverPdfPath)) {
              // Copy local PDF
              fs.copyFileSync(
                serverPdfPath,
                path.join(exportDir, localPdfPath)
              );
              console.log(`  ✓ Copied PDF: ${pdfFilename}`);

              sections.push({
                ...section,
                pdfPath: localPdfPath,
                pdfFilename: pdfFilename,
              });
            } else if (section.pdfPath.startsWith("http")) {
              // Download remote PDF
              try {
                await downloadFile(
                  section.pdfPath,
                  path.join(exportDir, localPdfPath)
                );
                console.log(`  ✓ Downloaded PDF: ${pdfFilename}`);

                sections.push({
                  ...section,
                  pdfPath: localPdfPath,
                  pdfFilename: pdfFilename,
                });
              } catch (err) {
                console.log(`  ✗ Failed to download PDF: ${err.message}`);
              }
            }
          }
        }
      } else if (bookData.pdfPath) {
        // Handle single PDF books (legacy format)
        const pdfFilename = getFilenameFromPath(bookData.pdfPath);
        if (pdfFilename) {
          const localPdfPath = `pdfs/${pdfFilename}`;

          // Check if PDF exists locally
          const serverPdfPath = path.join(
            __dirname,
            "../../public/files",
            pdfFilename
          );
          if (fs.existsSync(serverPdfPath)) {
            // Copy local PDF
            fs.copyFileSync(serverPdfPath, path.join(exportDir, localPdfPath));
            console.log(`  ✓ Copied PDF: ${pdfFilename}`);
            bookData.pdfPath = localPdfPath;
            bookData.pdfFilename = pdfFilename;
          }
        }
      }

      // Create book object for JSON
      const exportBook = {
        id: bookId,
        title: bookData.title,
        imagePath: localImagePath,
        sections: sections,
        pdfPath: bookData.pdfPath
          ? `pdfs/${getFilenameFromPath(bookData.pdfPath)}`
          : null,
        pdfFilename: bookData.pdfPath
          ? getFilenameFromPath(bookData.pdfPath)
          : null,
        createdAt: bookData.createdAt,
        // Include extracted content if available
        extractedContent: bookData.extractedContent || null,
        totalPages: bookData.totalPages || null,
        extractionStatus: bookData.extractionStatus || null,
      };

      books.push(exportBook);
    }

    // Write books.json
    const booksJsonPath = path.join(exportDir, "books.json");
    fs.writeFileSync(booksJsonPath, JSON.stringify(books, null, 2));
    console.log(`\n✓ Exported ${books.length} books to ${booksJsonPath}`);

    console.log("\n=== Export Summary ===");
    console.log(`Total books: ${books.length}`);
    console.log(`Location: ${exportDir}`);
    console.log("\nNext steps:");
    console.log(
      "1. Copy export/pdfs/* to frontend/android/app/src/main/assets/pdfs/"
    );
    console.log(
      "2. Copy export/images/* to frontend/android/app/src/main/assets/images/"
    );
    console.log(
      "3. Copy export/books.json to frontend/android/app/src/main/assets/"
    );
    console.log("\nFor iOS:");
    console.log("1. Add pdfs folder to Xcode project");
    console.log("2. Add images folder to Xcode project");
    console.log("3. Add books.json to Xcode project");
  } catch (error) {
    console.error("Export error:", error);
  }
}

// Run the export
exportBooks()
  .then(() => {
    console.log("\nExport complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Export failed:", err);
    process.exit(1);
  });
