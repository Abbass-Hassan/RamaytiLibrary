import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
  Modal,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  getBookmarks,
  saveBookmark,
  removeBookmark,
} from "../services/bookmarkService";
import colors from "../config/colors";
import HighlightedText from "./HighlightedText";

const CustomPdfReaderScreen = ({ route }) => {
  // Expecting bookId, bookTitle, and optional initial page
  const { bookId, bookTitle, page } = route.params || {};

  // Content states
  const [bookContent, setBookContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Page tracking
  const [numberOfPages, setNumberOfPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(page || 1);

  // Bookmark state
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Search states
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Text customization
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Fetch the book content from your backend
  useEffect(() => {
    const fetchBookContent = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://ramaytilibrary-production.up.railway.app/api/books/${bookId}/content`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const data = await response.json();
        setBookContent(data.content);
        setNumberOfPages(data.content.length);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching book content:", error);
        setError(error.message);
        setLoading(false);
        Alert.alert("Error", "Failed to load book content. " + error.message);
      }
    };

    fetchBookContent();
  }, [bookId]);

  // Check bookmark whenever page changes
  const checkBookmark = async () => {
    try {
      const bookmarks = await getBookmarks();
      const exists = bookmarks.some(
        (b) => b.bookId === bookId && b.page === currentPage
      );
      setIsBookmarked(exists);
    } catch (error) {
      console.error("Error checking bookmark:", error);
    }
  };

  useEffect(() => {
    checkBookmark();
  }, [currentPage]);

  // Search in content
  const handleSearch = async () => {
    if (!searchText.trim()) return;

    const results = [];

    // Search through all pages
    bookContent.forEach((pageText, pageIndex) => {
      const lowerCasePageText = pageText.toLowerCase();
      const lowerCaseSearchText = searchText.toLowerCase();

      let startIndex = 0;
      while (startIndex < lowerCasePageText.length) {
        const foundIndex = lowerCasePageText.indexOf(
          lowerCaseSearchText,
          startIndex
        );

        if (foundIndex === -1) break;

        // Get surrounding text for the snippet
        const snippetStart = Math.max(0, foundIndex - 40);
        const snippetEnd = Math.min(
          pageText.length,
          foundIndex + searchText.length + 40
        );
        const snippet = pageText.substring(snippetStart, snippetEnd);

        results.push({
          page: pageIndex + 1,
          index: foundIndex,
          snippet,
        });

        // Move to next potential match
        startIndex = foundIndex + lowerCaseSearchText.length;
      }
    });

    setSearchResults(results);
    setCurrentMatchIndex(0);

    if (results.length > 0) {
      jumpToMatch(0, results);
    } else {
      Alert.alert("Search", "No matches found.");
    }
  };

  const jumpToMatch = (matchIndex, resultsArray = searchResults) => {
    const match = resultsArray[matchIndex];
    if (!match) return;

    setCurrentPage(match.page);
  };

  const handlePrevMatch = () => {
    if (currentMatchIndex <= 0) return;
    const newIndex = currentMatchIndex - 1;
    setCurrentMatchIndex(newIndex);
    jumpToMatch(newIndex);
  };

  const handleNextMatch = () => {
    if (currentMatchIndex >= searchResults.length - 1) return;
    const newIndex = currentMatchIndex + 1;
    setCurrentMatchIndex(newIndex);
    jumpToMatch(newIndex);
  };

  const handleToggleBookmark = async () => {
    try {
      const bookmarks = await getBookmarks();
      const existing = bookmarks.find(
        (b) => b.bookId === bookId && b.page === currentPage
      );

      if (existing) {
        await removeBookmark(existing.id);
        setIsBookmarked(false);
        Alert.alert(
          "Bookmark removed",
          `Removed bookmark for Page ${currentPage}`
        );
      } else {
        const bookmark = {
          id: Date.now().toString(),
          bookId,
          bookTitle: bookTitle || "",
          page: currentPage,
          note: "",
        };
        await saveBookmark(bookmark);
        setIsBookmarked(true);
        Alert.alert(
          "Bookmark added",
          `Book: ${bookTitle}, Page: ${currentPage}`
        );
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      Alert.alert("Error", "Failed to toggle bookmark.");
    }
  };

  const goToPage = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > numberOfPages) {
      Alert.alert(
        "Invalid Page",
        `Please enter a page between 1 and ${numberOfPages}`
      );
      return;
    }
    setCurrentPage(pageNumber);
  };

  const goToNextPage = () => {
    if (currentPage < numberOfPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Loading indicator
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Error handling
  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Error loading content: {error}</Text>
      </View>
    );
  }

  // If we failed to get content
  if (!bookContent || bookContent.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text>No content available for this book.</Text>
      </View>
    );
  }

  const currentPageContent = bookContent[currentPage - 1] || "";
  const currentMatch = searchResults[currentMatchIndex];

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={goToPrevPage}
          disabled={currentPage <= 1}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={currentPage <= 1 ? "#999" : "#FFF"}
          />
        </TouchableOpacity>

        <View style={styles.pageInfo}>
          <Text style={styles.pageInfoText}>
            Page {currentPage} of {numberOfPages}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.navButton}
          onPress={goToNextPage}
          disabled={currentPage >= numberOfPages}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={currentPage >= numberOfPages ? "#999" : "#FFF"}
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search in book"
          placeholderTextColor={colors.textSecondary || "#999"}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
        />
        {searchResults.length > 0 ? (
          <View style={styles.arrowsContainer}>
            <Text style={styles.matchCount}>
              {currentMatchIndex + 1}/{searchResults.length}
            </Text>
            <TouchableOpacity
              onPress={handlePrevMatch}
              disabled={currentMatchIndex === 0}
              style={[
                styles.arrowButton,
                currentMatchIndex === 0 && styles.arrowDisabled,
              ]}
            >
              <Ionicons name="chevron-up" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNextMatch}
              disabled={currentMatchIndex === searchResults.length - 1}
              style={[
                styles.arrowButton,
                currentMatchIndex === searchResults.length - 1 &&
                  styles.arrowDisabled,
              ]}
            >
              <Ionicons name="chevron-down" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Ionicons name="search" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Settings and Bookmark Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowSettingsModal(true)}
        >
          <Ionicons name="settings-outline" size={22} color="#FFF" />
          <Text style={styles.actionButtonText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleToggleBookmark}
        >
          <Ionicons
            name={isBookmarked ? "bookmark" : "bookmark-outline"}
            size={22}
            color="#FFF"
          />
          <Text style={styles.actionButtonText}>Bookmark</Text>
        </TouchableOpacity>
      </View>

      {/* Content Display */}
      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={styles.contentInner}
      >
        {searchText && currentMatch && currentMatch.page === currentPage ? (
          <HighlightedText
            text={currentPageContent}
            highlight={searchText}
            textStyle={{
              fontSize: fontSize,
              color: textColor,
              lineHeight: fontSize * 1.5,
            }}
            highlightStyle={{ backgroundColor: "yellow" }}
          />
        ) : (
          <Text
            style={{
              fontSize: fontSize,
              color: textColor,
              lineHeight: fontSize * 1.5,
            }}
          >
            {currentPageContent}
          </Text>
        )}
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reader Settings</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Text Size:</Text>
              <View style={styles.settingControls}>
                <TouchableOpacity
                  style={styles.settingButton}
                  onPress={() => setFontSize(Math.max(10, fontSize - 2))}
                >
                  <Ionicons name="remove" size={18} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.settingValue}>{fontSize}px</Text>
                <TouchableOpacity
                  style={styles.settingButton}
                  onPress={() => setFontSize(Math.min(32, fontSize + 2))}
                >
                  <Ionicons name="add" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Text Color:</Text>
              <View style={styles.colorOptions}>
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { backgroundColor: "#000000" },
                    textColor === "#000000" && styles.colorSelected,
                  ]}
                  onPress={() => setTextColor("#000000")}
                />
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { backgroundColor: "#4A4A4A" },
                    textColor === "#4A4A4A" && styles.colorSelected,
                  ]}
                  onPress={() => setTextColor("#4A4A4A")}
                />
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { backgroundColor: "#0066CC" },
                    textColor === "#0066CC" && styles.colorSelected,
                  ]}
                  onPress={() => setTextColor("#0066CC")}
                />
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { backgroundColor: "#663399" },
                    textColor === "#663399" && styles.colorSelected,
                  ]}
                  onPress={() => setTextColor("#663399")}
                />
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { backgroundColor: "#006633" },
                    textColor === "#006633" && styles.colorSelected,
                  ]}
                  onPress={() => setTextColor("#006633")}
                />
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Background:</Text>
              <View style={styles.colorOptions}>
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { backgroundColor: "#FFFFFF" },
                    backgroundColor === "#FFFFFF" && styles.colorSelected,
                  ]}
                  onPress={() => setBackgroundColor("#FFFFFF")}
                />
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { backgroundColor: "#F5F5DC" },
                    backgroundColor === "#F5F5DC" && styles.colorSelected,
                  ]}
                  onPress={() => setBackgroundColor("#F5F5DC")}
                />
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { backgroundColor: "#E8DDC9" },
                    backgroundColor === "#E8DDC9" && styles.colorSelected,
                  ]}
                  onPress={() => setBackgroundColor("#E8DDC9")}
                />
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { backgroundColor: "#222222" },
                    backgroundColor === "#222222" && styles.colorSelected,
                  ]}
                  onPress={() => setBackgroundColor("#222222")}
                />
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { backgroundColor: "#121212" },
                    backgroundColor === "#121212" && styles.colorSelected,
                  ]}
                  onPress={() => setBackgroundColor("#121212")}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  navBar: {
    flexDirection: "row",
    backgroundColor: colors.primary || "#2196F3",
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  navButton: {
    padding: 8,
  },
  pageInfo: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pageInfoText: {
    color: "#FFF",
    fontSize: 14,
  },
  searchBarContainer: {
    flexDirection: "row",
    backgroundColor: colors.background || "#F5F5F5",
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.card || "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.text || "#333",
  },
  arrowsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    backgroundColor: colors.primary || "#2196F3",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchCount: {
    color: "#FFF",
    marginRight: 8,
    fontSize: 14,
  },
  arrowButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginHorizontal: 2,
    backgroundColor: colors.primary || "#2196F3",
  },
  arrowDisabled: {
    backgroundColor: "#999",
  },
  searchButton: {
    marginLeft: 8,
    backgroundColor: colors.primary || "#2196F3",
    borderRadius: 8,
    padding: 8,
  },
  buttonRow: {
    flexDirection: "row",
    backgroundColor: colors.background || "#F5F5F5",
    justifyContent: "space-around",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#DDD",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary || "#2196F3",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  actionButtonText: {
    color: "#FFF",
    marginLeft: 6,
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: colors.primary || "#2196F3",
  },
  settingRow: {
    marginBottom: 15,
  },
  settingLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
  },
  settingControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  settingButton: {
    backgroundColor: colors.primary || "#2196F3",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  settingValue: {
    marginHorizontal: 15,
    fontSize: 16,
    width: 50,
    textAlign: "center",
  },
  colorOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 5,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: colors.primary || "#2196F3",
  },
  closeButton: {
    backgroundColor: colors.primary || "#2196F3",
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 15,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default CustomPdfReaderScreen;
