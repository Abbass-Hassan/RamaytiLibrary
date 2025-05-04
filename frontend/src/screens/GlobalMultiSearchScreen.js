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
  Switch,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";
import colors from "../config/colors";

// Function to convert Western numbers to Eastern Arabic numerals
const toArabicDigits = (num) => {
  if (!num) return "";
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
};

const GlobalMultiSearchScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [books, setBooks] = useState([]);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [searchProgress, setSearchProgress] = useState({
    current: 0,
    total: 0,
  });
  const [bookFilter, setBookFilter] = useState("");
  const [isBookSectionExpanded, setIsBookSectionExpanded] = useState(true);

  // Format numbers - always use Arabic
  const formatNumber = (num) => toArabicDigits(num);

  // Filter books based on filter text
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
        const sortedBooks = data.sort((a, b) => a.title.localeCompare(b.title));
        const booksWithSelection = sortedBooks.map((book) => ({
          ...book,
          selected: false,
        }));
        setBooks(booksWithSelection);
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
    setSelectedBooks(updatedBooks.filter((b) => b.selected).map((b) => b.id));
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
    setSelectedBooks(updatedBooks.filter((b) => b.selected).map((b) => b.id));
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

      const book = books.find((b) => b.id === bookId);
      const bookTitle = book ? book.title : "Unknown Book";
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
    setSearchProgress({ current: 0, total: selectedBooks.length });

    try {
      const allResults = [];
      let count = 0;

      for (const bookId of selectedBooks) {
        setSearchProgress({ current: ++count, total: selectedBooks.length });
        const bookResults = await searchSingleBook(bookId, searchText);
        allResults.push(...bookResults);
      }

      if (allResults.length > 0) {
        allResults.sort((a, b) => {
          if (a.bookTitle !== b.bookTitle) {
            return a.bookTitle.localeCompare(b.bookTitle);
          }
          return a.page - b.page;
        });
      }

      navigation.navigate("SearchResults", {
        searchText: searchText,
        results: allResults,
      });
    } catch (error) {
      console.error("Error during search:", error);
      Alert.alert(t("errorTitle"), t("searchFailed"));
    } finally {
      setLoadingResults(false);
      setSearchProgress({ current: 0, total: 0 });
    }
  };

  const getSelectedBooksCount = () =>
    books.filter((book) => book.selected).length;

  // Format the book selection count
  const formatBookSelectionText = () => {
    const selected = getSelectedBooksCount();
    const total = books.length;
    return selected === 0
      ? t("selectBooks") || "اختر الكتب"
      : `${t("selectBooks") || "اختر الكتب"}: (${formatNumber(
          selected
        )}/${formatNumber(total)})`;
  };

  if (loadingBooks) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          {t("loadingBooks") || "جاري تحميل الكتب..."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchInputContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t("enterSearchText") || "أدخل نص البحث..."}
          placeholderTextColor="#8896AB"
          value={searchText}
          onChangeText={setSearchText}
          textAlign="right"
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
          {loadingResults ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Icon name="search" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Books Selection Section */}
      <View style={styles.bookSelectionContainer}>
        <View style={styles.bookHeaderRow}>
          <Text style={styles.sectionTitle}>{formatBookSelectionText()}</Text>

          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={handleSelectAll}
            >
              <Text style={styles.selectAllText}>
                {filteredBooks.every((book) => book.selected)
                  ? t("deselectAll") || "إلغاء الكل"
                  : t("selectAll") || "تحديد الكل"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => setIsBookSectionExpanded(!isBookSectionExpanded)}
            >
              <Icon
                name={isBookSectionExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {isBookSectionExpanded ? (
          <>
            {/* Book Filter */}
            <View style={styles.bookFilterContainer}>
              <TextInput
                style={styles.bookFilterInput}
                placeholder={t("filterBooks") || "تصفية الكتب..."}
                value={bookFilter}
                onChangeText={setBookFilter}
                placeholderTextColor="#8896AB"
                textAlign="right"
              />
              {bookFilter ? (
                <TouchableOpacity
                  style={styles.clearFilterButton}
                  onPress={() => setBookFilter("")}
                >
                  <Icon name="close" size={16} color="#8896AB" />
                </TouchableOpacity>
              ) : (
                <Icon
                  name="search"
                  size={16}
                  color="#8896AB"
                  style={styles.searchIcon}
                />
              )}
            </View>

            {/* Book List */}
            <FlatList
              data={filteredBooks}
              keyExtractor={(item) => item.id}
              style={styles.booksList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => toggleBookSelection(item.id)}
                  style={[
                    styles.bookItem,
                    item.selected && styles.bookItemSelected,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.bookTitle,
                      item.selected && styles.bookTitleSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Switch
                    trackColor={{ false: "#E2E8F0", true: colors.primary }}
                    thumbColor={"#FFFFFF"}
                    onValueChange={() => toggleBookSelection(item.id)}
                    value={item.selected}
                  />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="book" size={48} color="#E2E8F0" />
                  <Text style={styles.emptyText}>
                    {t("noBooksFound") || "لا توجد كتب مطابقة"}
                  </Text>
                </View>
              }
            />
          </>
        ) : getSelectedBooksCount() > 0 ? (
          <View style={styles.selectedSummary}>
            <Text style={styles.selectedCount}>
              {formatNumber(getSelectedBooksCount()) +
                " " +
                (t("booksSelected") || "كتب مختارة")}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAFC",
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7FAFC",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#4A5568",
    textAlign: "center",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#4A5568",
    fontSize: 16,
    borderRadius: 10,
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 6,
  },
  disabledButton: {
    backgroundColor: "#CBD5E0",
  },
  bookSelectionContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bookHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2D3748",
    textAlign: "right",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectAllButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  selectAllText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  expandButton: {
    padding: 6,
  },
  bookFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
    backgroundColor: "#F8FAFC",
    position: "relative",
  },
  bookFilterInput: {
    flex: 1,
    fontSize: 14,
    color: "#4A5568",
    paddingHorizontal: 8,
    paddingRight: 28, // Space for the icon
  },
  clearFilterButton: {
    position: "absolute",
    left: 16, // For RTL
    padding: 4,
  },
  searchIcon: {
    position: "absolute",
    left: 16, // For RTL
  },
  booksList: {
    flex: 1,
  },
  bookItem: {
    flexDirection: "row-reverse", // For RTL
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  bookItemSelected: {
    backgroundColor: "rgba(30, 91, 155, 0.05)",
  },
  bookTitle: {
    flex: 1,
    fontSize: 15,
    color: "#4A5568",
    textAlign: "right",
    marginLeft: 12,
  },
  bookTitleSelected: {
    color: colors.primary,
    fontWeight: "500",
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
  },
  selectedSummary: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
});

export default GlobalMultiSearchScreen;
