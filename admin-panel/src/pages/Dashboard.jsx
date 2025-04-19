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

  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [sections, setSections] = useState([{ name: "", page: "" }]);

  // Section editing states
  const [editingSections, setEditingSections] = useState(false);
  const [editedSections, setEditedSections] = useState([]);

  // Fetch books on component mount
  useEffect(() => {
    fetchBooks();
  }, []);

  async function fetchBooks() {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/books`);
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

  // Handle file input change
  function handleFileChange(e) {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError("");
    } else {
      setFile(null);
      setError("Please select a valid PDF file");
    }
  }

  // Handle section input change
  function handleSectionChange(index, field, value) {
    const updatedSections = [...sections];
    updatedSections[index][field] = value;
    setSections(updatedSections);
  }

  // Add new section
  function addSection() {
    setSections([...sections, { name: "", page: "" }]);
  }

  // Remove section
  function removeSection(index) {
    const updatedSections = [...sections];
    updatedSections.splice(index, 1);
    setSections(updatedSections);
  }

  // Handle form submission
  async function handleSubmit(e) {
    e.preventDefault();

    if (!file) {
      setError("Please select a PDF file");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a book title");
      return;
    }

    // Validate sections
    const validSections = sections
      .filter((section) => section.name.trim() && section.page)
      .map((section) => ({
        name: section.name.trim(),
        page: parseInt(section.page, 10),
      }));

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("title", title);
      formData.append("sections", JSON.stringify(validSections));

      await axios.post(`${API_URL}/admin/books`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Reset form
      setTitle("");
      setFile(null);
      setSections([{ name: "", page: "" }]);
      setSuccess("Book uploaded successfully!");

      // Refresh books list
      fetchBooks();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);

      setLoading(false);
    } catch (error) {
      setLoading(false);
      setError("Failed to upload book. Please try again.");
      console.error(error);
    }
  }

  // View book details
  function viewBook(book) {
    setSelectedBook(book);
    setEditingSections(false);
    setEditedSections(book.sections || []);
  }

  // Edit book sections
  function startEditingSections() {
    setEditingSections(true);
    setEditedSections(selectedBook.sections || []);
  }

  // Handle edited section change
  function handleEditedSectionChange(index, field, value) {
    const updatedSections = [...editedSections];
    updatedSections[index][field] = value;
    setEditedSections(updatedSections);
  }

  // Add new section to edited sections
  function addEditedSection() {
    setEditedSections([...editedSections, { name: "", page: "" }]);
  }

  // Remove section from edited sections
  function removeEditedSection(index) {
    const updatedSections = [...editedSections];
    updatedSections.splice(index, 1);
    setEditedSections(updatedSections);
  }

  // Save edited sections
  async function saveEditedSections() {
    // Validate sections
    const validSections = editedSections
      .filter((section) => section.name.trim() && section.page)
      .map((section) => ({
        name: section.name.trim(),
        page: parseInt(section.page, 10),
      }));

    try {
      setLoading(true);
      setError("");

      await axios.put(`${API_URL}/admin/books/${selectedBook.id}/sections`, {
        sections: validSections,
      });

      setSuccess("Sections updated successfully!");
      setEditingSections(false);

      // Update local state
      const updatedSelectedBook = { ...selectedBook, sections: validSections };
      setSelectedBook(updatedSelectedBook);

      // Update books list
      const updatedBooks = books.map((book) =>
        book.id === selectedBook.id ? updatedSelectedBook : book
      );
      setBooks(updatedBooks);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);

      setLoading(false);
    } catch (error) {
      setLoading(false);
      setError("Failed to update sections. Please try again.");
      console.error(error);
    }
  }

  // Delete book
  async function deleteBook(id) {
    if (!window.confirm("Are you sure you want to delete this book?")) {
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
      setError("Failed to delete book. Please try again.");
      console.error(error);
    }
  }

  // Back to book list
  function closeBookDetails() {
    setSelectedBook(null);
    setEditingSections(false);
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

        {/* Book upload form */}
        {!selectedBook && (
          <div className="dashboard-card">
            <h2>Upload New Book</h2>
            <form onSubmit={handleSubmit} className="upload-form">
              <div className="form-group">
                <label htmlFor="title">Book Title</label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter book title"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="pdf">PDF File</label>
                <input
                  type="file"
                  id="pdf"
                  accept=".pdf"
                  onChange={handleFileChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Sections</label>
                <div className="sections-container">
                  {sections.map((section, index) => (
                    <div key={index} className="section-row">
                      <input
                        type="text"
                        value={section.name}
                        onChange={(e) =>
                          handleSectionChange(index, "name", e.target.value)
                        }
                        placeholder="Section name"
                      />
                      <input
                        type="number"
                        value={section.page}
                        onChange={(e) =>
                          handleSectionChange(index, "page", e.target.value)
                        }
                        placeholder="Page"
                        min="1"
                      />
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeSection(index)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-section-btn"
                    onClick={addSection}
                  >
                    + Add Section
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Uploading..." : "Upload Book"}
              </button>
            </form>
          </div>
        )}

        {/* Book details view */}
        {selectedBook && (
          <div className="dashboard-card">
            <div className="book-details-header">
              <button className="back-btn" onClick={closeBookDetails}>
                &larr; Back to books
              </button>
              <h2>{selectedBook.title}</h2>
            </div>

            <div className="book-details">
              <div className="book-details-row">
                <span className="detail-label">PDF:</span>
                <a
                  href={`http://localhost:3000${selectedBook.pdfPath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pdf-link"
                >
                  View PDF
                </a>
              </div>

              <div className="book-details-row">
                <span className="detail-label">Uploaded:</span>
                <span>
                  {selectedBook.uploadedAt
                    ? new Date(
                        selectedBook.uploadedAt.seconds * 1000
                      ).toLocaleString()
                    : "N/A"}
                </span>
              </div>

              <div className="sections-header">
                <h3>Sections</h3>
                {!editingSections ? (
                  <button className="edit-btn" onClick={startEditingSections}>
                    Edit Sections
                  </button>
                ) : (
                  <button
                    className="save-btn"
                    onClick={saveEditedSections}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                )}
              </div>

              {!editingSections ? (
                <div className="sections-list">
                  {selectedBook.sections && selectedBook.sections.length > 0 ? (
                    <ul>
                      {selectedBook.sections.map((section, index) => (
                        <li key={index}>
                          <span className="section-name">{section.name}</span>
                          <span className="section-page">
                            Page {section.page}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No sections defined</p>
                  )}
                </div>
              ) : (
                <div className="sections-container">
                  {editedSections.map((section, index) => (
                    <div key={index} className="section-row">
                      <input
                        type="text"
                        value={section.name}
                        onChange={(e) =>
                          handleEditedSectionChange(
                            index,
                            "name",
                            e.target.value
                          )
                        }
                        placeholder="Section name"
                      />
                      <input
                        type="number"
                        value={section.page}
                        onChange={(e) =>
                          handleEditedSectionChange(
                            index,
                            "page",
                            e.target.value
                          )
                        }
                        placeholder="Page"
                        min="1"
                      />
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeEditedSection(index)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-section-btn"
                    onClick={addEditedSection}
                  >
                    + Add Section
                  </button>
                </div>
              )}

              <div className="book-actions">
                <button
                  className="delete-btn"
                  onClick={() => deleteBook(selectedBook.id)}
                  disabled={loading}
                >
                  Delete Book
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Books list */}
        {!selectedBook && (
          <div className="dashboard-card">
            <h2>Books Library</h2>
            {loading && <p className="loading-message">Loading books...</p>}
            {!loading && books.length === 0 ? (
              <p className="empty-message">No books uploaded yet.</p>
            ) : (
              <div className="books-list">
                {books.map((book) => (
                  <div key={book.id} className="book-item">
                    <div className="book-info">
                      <h3>{book.title}</h3>
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
        )}
      </main>
    </div>
  );
}
