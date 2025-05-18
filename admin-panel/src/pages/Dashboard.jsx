// src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/dashboard.css";

const API_URL = "http://localhost:3000/api";

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // State for books and sections
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Book form state
  const [newBookTitle, setNewBookTitle] = useState("");
  const [bookImage, setBookImage] = useState(null);

  // Section form states
  const [sectionName, setSectionName] = useState("");
  const [sectionFile, setSectionFile] = useState(null);

  // Fetch books on component mount
  useEffect(() => {
    fetchBooks();
  }, []);

  async function fetchBooks() {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/books`);
      console.log("Fetched books:", response.data);
      setBooks(response.data.data);
      setLoading(false);
    } catch (error) {
      setError("Failed to load books");
      console.error(error);
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }

  // Handle file input change for sections
  function handleFileChange(e) {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setSectionFile(selectedFile);
      setError("");
    } else {
      setSectionFile(null);
      setError("Please select a valid PDF file");
    }
  }

  // Handle image input change for book cover
  function handleImageChange(e) {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setBookImage(selectedFile);
      setError("");
      console.log(
        "Image selected:",
        selectedFile.name,
        selectedFile.type,
        selectedFile.size
      );
    } else {
      setBookImage(null);
      setError("Please select a valid image file");
    }
  }

  // Create a new book (title and image)
  async function handleCreateBook(e) {
    e.preventDefault();

    if (!newBookTitle.trim()) {
      setError("Please enter a book title");
      return;
    }

    if (!bookImage) {
      setError("Please select a cover image");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("title", newBookTitle);
      formData.append("image", bookImage);

      // Debug logging
      console.log("FormData contents:");
      for (let pair of formData.entries()) {
        console.log(
          pair[0],
          pair[1] instanceof File
            ? `File: ${pair[1].name}, size: ${pair[1].size}, type: ${pair[1].type}`
            : pair[1]
        );
      }

      console.log("Sending request to:", `${API_URL}/admin/books`);
      const response = await axios.post(`${API_URL}/admin/books`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Create book response:", response.data);

      // Reset form
      setNewBookTitle("");
      setBookImage(null);
      setSuccess("Book created successfully!");

      // Refresh books list
      fetchBooks();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);

      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error(
        "Create book error:",
        error.response?.data || error.message
      );
      setError(
        "Failed to create book. " +
          (error.response?.data?.message || "Please try again.")
      );
    }
  }

  // Add section to a book
  async function handleAddSection(e) {
    e.preventDefault();

    if (!selectedBook) {
      setError("No book selected");
      return;
    }

    if (!sectionFile) {
      setError("Please select a PDF file");
      return;
    }

    if (!sectionName.trim()) {
      setError("Please enter a section name");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("pdf", sectionFile);
      formData.append("name", sectionName);

      // Debug logging
      console.log("Section FormData contents:");
      for (let pair of formData.entries()) {
        console.log(
          pair[0],
          pair[1] instanceof File
            ? `File: ${pair[1].name}, size: ${pair[1].size}, type: ${pair[1].type}`
            : pair[1]
        );
      }

      const response = await axios.post(
        `${API_URL}/admin/books/${selectedBook.id}/sections`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Add section response:", response.data);

      // Reset form
      setSectionName("");
      setSectionFile(null);
      setSuccess("Section added successfully!");

      // Refresh book details
      const bookResponse = await axios.get(
        `${API_URL}/admin/books/${selectedBook.id}`
      );
      setSelectedBook(bookResponse.data.data);

      // Refresh books list for sidebar
      fetchBooks();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);

      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error(
        "Add section error:",
        error.response?.data || error.message
      );
      setError(
        "Failed to add section. " +
          (error.response?.data?.message || "Please try again.")
      );
    }
  }

  // View book details
  function viewBook(book) {
    console.log("Viewing book:", book);
    setSelectedBook(book);
  }

  // Delete book
  async function deleteBook(id) {
    if (
      !window.confirm(
        "Are you sure you want to delete this book? This will also delete all associated sections."
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      await axios.delete(`${API_URL}/admin/books/${id}`);

      setSuccess("Book deleted successfully!");

      // Close book details if the deleted book was selected
      if (selectedBook && selectedBook.id === id) {
        setSelectedBook(null);
      }

      // Refresh books list
      fetchBooks();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);

      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error(
        "Delete book error:",
        error.response?.data || error.message
      );
      setError(
        "Failed to delete book. " +
          (error.response?.data?.message || "Please try again.")
      );
    }
  }

  // Delete section
  async function deleteSection(sectionId) {
    if (!window.confirm("Are you sure you want to delete this section?")) {
      return;
    }

    try {
      setLoading(true);

      await axios.delete(
        `${API_URL}/admin/books/${selectedBook.id}/sections/${sectionId}`
      );

      setSuccess("Section deleted successfully!");

      // Refresh book details
      const response = await axios.get(
        `${API_URL}/admin/books/${selectedBook.id}`
      );
      setSelectedBook(response.data.data);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);

      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error(
        "Delete section error:",
        error.response?.data || error.message
      );
      setError(
        "Failed to delete section. " +
          (error.response?.data?.message || "Please try again.")
      );
    }
  }

  // Back to book list
  function closeBookDetails() {
    setSelectedBook(null);
  }

  return (
    <div className="dashboard">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-brand">Ramayti Library Admin</div>
          <div className="navbar-user">
            <span className="user-email">{currentUser?.email}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </nav>
      <br />
      <br />
      <main className="dashboard-content">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Horizontal layout container */}
        {!selectedBook && (
          <div className="dashboard-horizontal-layout">
            {/* Books list on the left */}
            <div className="dashboard-card books-card">
              <h2>Books Library</h2>
              {loading && <p className="loading-message">Loading books...</p>}
              {!loading && books.length === 0 ? (
                <p className="empty-message">No books created yet.</p>
              ) : (
                <div className="books-list">
                  {books.map((book) => (
                    <div key={book.id} className="book-item">
                      <div className="book-info">
                        <h3>{book.title}</h3>
                        {book.imagePath && (
                          <img
                            src={`${API_URL}${book.imagePath}`}
                            alt={book.title}
                            className="book-cover-thumbnail"
                            onError={(e) => {
                              console.error("Image load error:", e);
                              e.target.src =
                                "https://via.placeholder.com/80x120?text=No+Image";
                              e.target.alt = "Image not found";
                            }}
                          />
                        )}
                        <p>
                          Sections: {book.sections ? book.sections.length : 0}
                        </p>
                      </div>
                      <div className="book-actions">
                        <button
                          className="view-btn"
                          onClick={() => viewBook(book)}
                        >
                          View Details
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => deleteBook(book.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create new book form on the right */}
            <div className="dashboard-card upload-card">
              <h2>Create New Book</h2>
              <form onSubmit={handleCreateBook} className="upload-form">
                <div className="form-group">
                  <label htmlFor="title">Book Title</label>
                  <input
                    type="text"
                    id="title"
                    value={newBookTitle}
                    onChange={(e) => setNewBookTitle(e.target.value)}
                    placeholder="Enter book title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="bookImage">Cover Image</label>
                  <input
                    type="file"
                    id="bookImage"
                    accept="image/*"
                    onChange={handleImageChange}
                    required
                  />
                  {bookImage && (
                    <div className="image-preview">
                      <img
                        src={URL.createObjectURL(bookImage)}
                        alt="Book cover preview"
                        className="cover-preview"
                      />
                    </div>
                  )}
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? "Creating..." : "Create Book"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Book details and add section view */}
        {selectedBook && (
          <div className="dashboard-container">
            <div className="dashboard-card book-details-card">
              <div className="book-details-header">
                <button className="back-btn" onClick={closeBookDetails}>
                  &larr; Back to books
                </button>
                <h2>{selectedBook.title}</h2>
                {selectedBook.imagePath && (
                  <img
                    src={`${API_URL}${selectedBook.imagePath}`}
                    alt={selectedBook.title}
                    className="book-cover-large"
                    onError={(e) => {
                      console.error("Image load error:", e);
                      e.target.src =
                        "https://via.placeholder.com/150x225?text=No+Image";
                      e.target.alt = "Image not found";
                    }}
                  />
                )}
              </div>

              <div className="book-details">
                <div className="sections-header">
                  <h3>Sections</h3>
                </div>

                {/* Display sections */}
                <div className="sections-list">
                  {selectedBook.sections && selectedBook.sections.length > 0 ? (
                    <ul>
                      {selectedBook.sections.map((section) => (
                        <li key={section.id} className="section-item">
                          <div className="section-info">
                            <span className="section-name">{section.name}</span>
                            <a
                              href={`${API_URL}${section.pdfPath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="pdf-link"
                            >
                              View PDF
                            </a>
                          </div>
                          <button
                            className="delete-btn"
                            onClick={() => deleteSection(section.id)}
                          >
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No sections added to this book yet</p>
                  )}
                </div>

                {/* Add new section form */}
                <div className="add-section-form">
                  <h3>Add New Section</h3>
                  <form onSubmit={handleAddSection}>
                    <div className="form-group">
                      <label htmlFor="sectionName">Section Name</label>
                      <input
                        type="text"
                        id="sectionName"
                        value={sectionName}
                        onChange={(e) => setSectionName(e.target.value)}
                        placeholder="Enter section name"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="sectionPdf">PDF File</label>
                      <input
                        type="file"
                        id="sectionPdf"
                        accept=".pdf"
                        onChange={handleFileChange}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="submit-btn"
                      disabled={loading}
                    >
                      {loading ? "Adding..." : "Add Section"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
