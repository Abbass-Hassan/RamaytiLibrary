// frontend/src/screens/GlobalMultiSearchScreen.js

import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
  I18nManager,
  Switch,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import HighlightedText from "./HighlightedText";
import Icon from "../components/Icon";

// Import colors
import colors from "../config/colors";

// Function to convert Western numbers to Eastern Arabic numerals
const toArabicDigits = (num) => {
  if (!num) return "";
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
};

const GlobalMultiSearchScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const isRTL = i18n.language === "ar";

  const [books, setBooks] = useState([]);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // State to track search progress
  const [searchProgress, setSearchProgress] = useState({
    current: 0,
    total: 0,
  });

  // New state variables for improved UI with many books
  const [bookFilter, setBookFilter] = useState("");
  const [isBookSectionExpanded, setIsBookSectionExpanded] = useState(false);

  // Format numbers based on language
  const formatNumber = (num) => {
    return isRTL ? toArabicDigits(num) : String(num);
  };

  // Filter books based on search text
  const filteredBooks = books.filter((book) =>
    book.title.toLowerCase().includes(bookFilter.toLowerCase())
  );

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoadingBooks(true);
        const response = await fetch(
          "http://ramaytilibrary-production.up.railway.app/api/books"
        );
        const data = await response.json();

        // Sort books alphabetically
        const sortedBooks = data.sort((a, b) => a.title.localeCompare(b.title));

        const booksWithSelection = sortedBooks.map((book) => ({
          ...book,
          selected: false,
        }));
        setBooks(booksWithSelection);

        // Auto-expand if there are few books
        setIsBookSectionExpanded(booksWithSelection.length <= 5);
      } catch (error) {
        console.error("Error fetching books:", error);
        Alert.alert(t("errorTitle"), "Failed to load books");
      } finally {
        setLoadingBooks(false);
      }
    };

    fetchBooks();
  }, []);

  const toggleBookSelection = (bookId) => {
    const updatedBooks = books.map((book) =>
      book.id === bookId ? { ...book, selected: !book.selected } : book
    );
    setBooks(updatedBooks);

    const newlySelected = updatedBooks
      .filter((b) => b.selected)
      .map((b) => b.id);
    setSelectedBooks(newlySelected);
  };

  const handleSelectAll = () => {
    const allSelected = filteredBooks.every((book) => book.selected);

    const updatedBooks = books.map((book) => ({
      ...book,
      selected: bookFilter
        ? book.title.toLowerCase().includes(bookFilter.toLowerCase())
          ? !allSelected
          : book.selected
        : !allSelected,
    }));

    setBooks(updatedBooks);

    const newSelectedIds = updatedBooks
      .filter((b) => b.selected)
      .map((b) => b.id);

    setSelectedBooks(newSelectedIds);
  };

  // Function to search a single book
  const searchSingleBook = async (bookId, query) => {
    try {
      const singleBookUrl = `http://ramaytilibrary-production.up.railway.app/api/books/${bookId}/content`;
      const response = await fetch(singleBookUrl);

      if (!response.ok) {
        console.error(
          `Failed to fetch book content for book ${bookId}: ${response.status}`
        );
        return [];
      }

      const data = await response.json();

      if (!data.content || !Array.isArray(data.content)) {
        console.error(`Invalid content format for book ${bookId}`);
        return [];
      }

      // Find the book title
      const book = books.find((b) => b.id === bookId);
      const bookTitle = book ? book.title : "Unknown Book";

      // Search through the content pages for matches
      const bookResults = [];
      const searchLower = query.toLowerCase();

      data.content.forEach((pageContent, pageIndex) => {
        if (typeof pageContent !== "string") return;

        const pageLower = pageContent.toLowerCase();
        let lastIndex = 0;
        let matchCount = 0;

        while (lastIndex !== -1) {
          lastIndex = pageLower.indexOf(searchLower, lastIndex);

          if (lastIndex !== -1) {
            matchCount++;

            // Get surrounding text for snippet (40 chars before and after)
            const start = Math.max(0, lastIndex - 40);
            const end = Math.min(
              pageContent.length,
              lastIndex + searchLower.length + 40
            );
            const snippet = pageContent.substring(start, end);

            bookResults.push({
              bookId,
              bookTitle,
              page: pageIndex + 1,
              snippet,
            });

            lastIndex += searchLower.length;

            // Limit results per page to avoid too many matches
            if (matchCount >= 5) break;
          }
        }
      });

      return bookResults;
    } catch (error) {
      console.error(`Error searching book ${bookId}:`, error);
      return [];
    }
  };

  const handleSearch = async () => {
    if (!searchText.trim() || selectedBooks.length === 0) {
      Alert.alert(t("errorTitle"), t("emptySearchMessage"));
      return;
    }

    setLoadingResults(true);
    setSearchError(null);
    setResults([]);
    setSearchProgress({ current: 0, total: selectedBooks.length });

    try {
      // Skip trying the global-multi endpoint since it's returning 500 errors
      // Instead, directly search each book individually
      const allResults = [];
      let count = 0;

      for (const bookId of selectedBooks) {
        setSearchProgress({ current: ++count, total: selectedBooks.length });

        const bookResults = await searchSingleBook(bookId, searchText);
        allResults.push(...bookResults);
      }

      if (allResults.length > 0) {
        // Sort results by book title and then by page number
        allResults.sort((a, b) => {
          if (a.bookTitle !== b.bookTitle) {
            return a.bookTitle.localeCompare(b.bookTitle);
          }
          return a.page - b.page;
        });

        setResults(allResults);
      } else {
        setSearchError("No results found. Try a different search term.");
      }
    } catch (error) {
      console.error("Error during search:", error);
      setSearchError(error.message || "Search failed. Please try again.");
    } finally {
      setLoadingResults(false);
      setSearchProgress({ current: 0, total: 0 });
    }
  };

  const handleResultPress = (result) => {
    // Navigate to CustomPdfReader with the necessary parameters
    navigation.navigate("DirectTab", {
      screen: "CustomPdfReader",
      params: {
        bookId: result.bookId,
        bookTitle: result.bookTitle,
        page: result.page,
      },
    });
  };

  const getSelectedBooksCount = () => {
    return books.filter((book) => book.selected).length;
  };

  // Format the book selection count
  const formatBookSelectionText = () => {
    const selected = getSelectedBooksCount();
    const total = books.length;

    if (selected === 0) {
      return t("selectBooks") || "Select Books";
    }

    // Use the t function with formatted numbers
    const countText = isRTL
      ? `(${formatNumber(selected)}/${formatNumber(total)})`
      : `(${selected}/${total})`;

    return `${t("selectBooks")}: ${countText}`;
  };

  // Format results count
  const formatResultsText = () => {
    if (results.length === 0) return t("searchResults");

    const countText = isRTL
      ? `(${formatNumber(results.length)})`
      : `(${results.length})`;

    return `${t("searchResults")} ${countText}`;
  };

  if (loadingBooks) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Card */}
      <View style={styles.card}>
        <View style={styles.searchSection}>
          <TextInput
            style={[
              styles.searchInput,
              { textAlign: isRTL ? "right" : "left" },
            ]}
            placeholder={t("enterSearchText")}
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity
            style={[
              styles.searchButton,
              (!searchText.trim() || selectedBooks.length === 0) &&
                styles.disabledButton,
            ]}
            onPress={handleSearch}
            disabled={
              !searchText.trim() || selectedBooks.length === 0 || loadingResults
            }
          >
            <Text style={styles.searchButtonText}>{t("searchButton")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Books Selection Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>{formatBookSelectionText()}</Text>

          <View style={styles.bookControlsRow}>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={handleSelectAll}
            >
              <Text style={styles.selectAllText}>
                {filteredBooks.every((book) => book.selected)
                  ? t("deselectAll")
                  : t("selectAll")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => setIsBookSectionExpanded(!isBookSectionExpanded)}
            >
              <Icon
                name={isBookSectionExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {isBookSectionExpanded && (
          <>
            <View style={styles.searchBookContainer}>
              <TextInput
                style={[
                  styles.searchBookInput,
                  { textAlign: isRTL ? "right" : "left" },
                ]}
                placeholder={t("filterBooks") || "Filter books..."}
                value={bookFilter}
                onChangeText={setBookFilter}
                placeholderTextColor={colors.textSecondary}
              />
              {bookFilter ? (
                <TouchableOpacity
                  style={[
                    styles.clearFilterButton,
                    isRTL ? { left: 8 } : { right: 8 },
                  ]}
                  onPress={() => setBookFilter("")}
                >
                  <Icon name="x" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={filteredBooks}
              keyExtractor={(item) => item.id}
              style={styles.booksList}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.bookRow,
                    item.selected && styles.bookRowSelected,
                  ]}
                >
                  <Switch
                    style={styles.bookSwitch}
                    trackColor={{ false: "#DDD", true: colors.primary }}
                    thumbColor={item.selected ? "#FFF" : "#F4F3F4"}
                    onValueChange={() => toggleBookSelection(item.id)}
                    value={item.selected}
                  />

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleBookSelection(item.id)}
                    style={styles.bookTitleContainer}
                  >
                    <Text
                      style={[
                        styles.bookTitle,
                        { textAlign: isRTL ? "right" : "left" },
                      ]}
                    >
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.noResultsText}>
                  {t("noBooksFound") || "No books found"}
                </Text>
              }
            />
          </>
        )}

        {!isBookSectionExpanded && getSelectedBooksCount() > 0 && (
          <View style={styles.selectedBooksPreview}>
            <Text style={styles.selectedBooksCount}>
              {isRTL
                ? formatNumber(getSelectedBooksCount()) +
                  " " +
                  (t("booksSelected") || "books selected")
                : getSelectedBooksCount() +
                  " " +
                  (t("booksSelected") || "books selected")}
            </Text>
          </View>
        )}
      </View>

      {/* Results Card */}
      <View style={styles.resultsCard}>
        <Text style={styles.sectionTitle}>{formatResultsText()}</Text>

        <View style={styles.resultsContainer}>
          {loadingResults ? (
            <View style={styles.loadingResultsContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              {searchProgress.total > 0 && (
                <Text style={styles.loadingText}>
                  {t("searching")} {searchProgress.current}/
                  {searchProgress.total}
                </Text>
              )}
            </View>
          ) : searchError ? (
            <View style={styles.loadingResultsContainer}>
              <Text style={styles.errorText}>{searchError}</Text>
            </View>
          ) : results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(item, index) =>
                `${item.bookId}-${item.page}-${index}`
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleResultPress(item)}
                  style={styles.resultItem}
                >
                  <Text
                    style={[
                      styles.resultTitle,
                      { textAlign: isRTL ? "right" : "left" },
                    ]}
                  >
                    {item.bookTitle} - {t("page")}{" "}
                    {isRTL ? formatNumber(item.page) : item.page}
                  </Text>
                  <HighlightedText
                    text={item.snippet}
                    highlight={searchText}
                    textStyle={{ textAlign: isRTL ? "right" : "left" }}
                  />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.resultsList}
            />
          ) : (
            <Text style={styles.noResultsText}>{t("noResultsFound")}</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.text,
    fontSize: 15,
  },
  searchButton: {
    marginLeft: 8,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  disabledButton: {
    backgroundColor: "#AAAAAA",
  },
  searchButtonText: {
    color: "#FFF",
    fontSize: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bookControlsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  expandButton: {
    padding: 6,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: colors.text,
    textAlign: I18nManager.isRTL ? "right" : "left",
  },
  selectAllButton: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectAllText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "500",
  },
  searchBookContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    position: "relative",
  },
  searchBookInput: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.text,
    fontSize: 14,
  },
  clearFilterButton: {
    position: "absolute",
    padding: 4,
  },
  booksList: {
    maxHeight: 200,
  },
  bookRow: {
    flexDirection: "row", // Always left-to-right for switches
    alignItems: "center",
    padding: 10,
    backgroundColor: "#F8F8F8",
    marginBottom: 6,
    borderRadius: 6,
  },
  bookRowSelected: {
    backgroundColor: "rgba(33, 150, 243, 0.1)",
    borderRightWidth: I18nManager.isRTL ? 2 : 0,
    borderLeftWidth: I18nManager.isRTL ? 0 : 2,
    borderRightColor: colors.primary,
    borderLeftColor: colors.primary,
  },
  bookSwitch: {
    // The switch is always on the left side
    marginRight: 10,
  },
  bookTitleContainer: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 14,
    color: colors.text,
  },
  selectedBooksPreview: {
    paddingVertical: 8,
    alignItems: "center",
  },
  selectedBooksCount: {
    color: colors.primary,
    fontWeight: "500",
    fontSize: 14,
  },
  resultsCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  resultsContainer: {
    flex: 1,
    marginTop: 10,
  },
  loadingResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: colors.text,
    fontSize: 14,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 14,
    textAlign: "center",
    padding: 10,
  },
  resultsList: {
    paddingBottom: 10,
  },
  resultItem: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: "#F9F9F9",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 5,
  },
  noResultsText: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 20,
    textAlign: "center",
  },
});

export default GlobalMultiSearchScreen;
