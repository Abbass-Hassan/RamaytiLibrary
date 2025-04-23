import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  I18nManager,
} from "react-native";
import { useTranslation } from "react-i18next";

// Import the custom Icon component
import Icon from "../components/Icon";

// Import colors
import colors from "../config/colors";

const SectionsScreen = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL || i18n.language === "ar";

  const [books, setBooks] = useState([]);
  const [expandedBookId, setExpandedBookId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if a specific bookId was passed to the screen
  const { bookId: initialBookId } = route.params || {};

  // Format numbers to Arabic digits when in Arabic mode
  const formatNumber = (num) => {
    if (!num) return "";
    if (!isRTL) return String(num);

    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
  };

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "http://ramaytilibrary-production.up.railway.app/api/books"
      );

      if (!response.ok) {
        throw new Error(`Server responded with status code ${response.status}`);
      }

      const data = await response.json();

      // Initialize books with empty sections arrays
      const booksWithSections = data.map((book) => ({
        ...book,
        sections: [],
        sectionsLoaded: false,
      }));

      setBooks(booksWithSections);

      // If we have an initial bookId, expand it automatically
      if (initialBookId) {
        setExpandedBookId(initialBookId);
      }

      setLoading(false);
    } catch (error) {
      console.log("Error fetching books:", error);
      Alert.alert("Error", "Failed to load books. Please try again.");
      setLoading(false);
    }
  };

  const fetchSectionsForBook = async (bookId) => {
    try {
      // Find the book in our state
      const bookIndex = books.findIndex((book) => book.id === bookId);
      if (bookIndex === -1) return;

      // If sections already loaded, no need to fetch again
      if (books[bookIndex].sectionsLoaded) return;

      const response = await fetch(
        `http://ramaytilibrary-production.up.railway.app/api/books/${bookId}/sections`
      );

      if (!response.ok) {
        throw new Error(`Server responded with status code ${response.status}`);
      }

      const sectionsData = await response.json();

      // Update the book with its sections
      const updatedBooks = [...books];
      updatedBooks[bookIndex] = {
        ...updatedBooks[bookIndex],
        sections: sectionsData,
        sectionsLoaded: true,
      };

      setBooks(updatedBooks);
    } catch (error) {
      console.log(`Error fetching sections for book ${bookId}:`, error);
      Alert.alert("Error", "Failed to load sections. Please try again.");
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // When a book is expanded, fetch its sections if not already loaded
  useEffect(() => {
    if (expandedBookId) {
      fetchSectionsForBook(expandedBookId);
    }
  }, [expandedBookId]);

  const toggleBookExpansion = (bookId) => {
    setExpandedBookId(expandedBookId === bookId ? null : bookId);
  };

  const handleSectionPress = (book, sectionIndex) => {
    const section = book.sections[sectionIndex];

    // Navigate to CustomPdfReader instead of DummyPdfScreen
    navigation.navigate("CustomPdfReader", {
      bookId: book.id,
      bookTitle: book.title,
      page: section.page || 1,
    });
  };

  const renderBookItem = ({ item }) => {
    const isExpanded = expandedBookId === item.id;

    return (
      <View style={styles.bookContainer}>
        <TouchableOpacity
          style={styles.bookHeader}
          onPress={() => toggleBookExpansion(item.id)}
        >
          <Text style={styles.bookTitle}>{item.title}</Text>
          <Icon
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionsContainer}>
            {item.sectionsLoaded && item.sections.length > 0 ? (
              item.sections.map((section, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.sectionItem}
                  onPress={() => handleSectionPress(item, index)}
                >
                  <Text style={styles.sectionName}>{section.name}</Text>
                  <Text style={styles.sectionPage}>
                    {t("page")}{" "}
                    {isRTL
                      ? formatNumber(section.page || "?")
                      : section.page || "?"}
                  </Text>
                </TouchableOpacity>
              ))
            ) : item.sectionsLoaded && item.sections.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t("noSectionsAvailable")}</Text>
                <TouchableOpacity
                  style={styles.readFullBookButton}
                  onPress={() =>
                    navigation.navigate("CustomPdfReader", {
                      bookId: item.id,
                      bookTitle: item.title,
                      page: 1,
                    })
                  }
                >
                  <Text style={styles.readFullBookText}>
                    {t("readFullBook")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>{t("loadingSections")}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t("loadingBooks")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderBookItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centeredContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingVertical: 10,
  },
  bookContainer: {
    backgroundColor: colors.card,
    marginHorizontal: 15,
    marginVertical: 7,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bookHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  sectionsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionItem: {
    padding: 12,
    paddingLeft: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionName: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  sectionPage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  loadingContainer: {
    padding: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 10,
    marginLeft: 10,
    fontStyle: "italic",
  },
  emptyContainer: {
    padding: 15,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textSecondary,
    marginBottom: 10,
  },
  readFullBookButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 5,
  },
  readFullBookText: {
    color: "#FFF",
    fontWeight: "500",
  },
});

export default SectionsScreen;
