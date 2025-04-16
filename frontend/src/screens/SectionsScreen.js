import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

// Import the custom Icon component
import Icon from "../components/Icon";

// Import colors
import colors from "../config/colors";

const SectionsScreen = ({ navigation }) => {
  const [books, setBooks] = useState([]);
  const [expandedBookId, setExpandedBookId] = useState(null);

  const fetchBooks = async () => {
    try {
      const response = await fetch(
        "http://ramaytilibrary-production.up.railway.app/api/books"
      );
      const data = await response.json();

      // Initialize books with empty sections arrays
      const booksWithSections = data.map((book) => ({
        ...book,
        sections: [],
        sectionsLoaded: false,
      }));

      setBooks(booksWithSections);
    } catch (error) {
      console.log("Error fetching books:", error);
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
                  onPress={() =>
                    navigation.navigate("DummyPdfScreen", {
                      bookId: item.id,
                      sectionIndex: index,
                    })
                  }
                >
                  <Text style={styles.sectionName}>{section.name}</Text>
                </TouchableOpacity>
              ))
            ) : item.sectionsLoaded && item.sections.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No sections available</Text>
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading sections...</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

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
  },
  sectionName: {
    fontSize: 16,
    color: colors.text,
  },
  loadingContainer: {
    padding: 15,
    alignItems: "center",
  },
  loadingText: {
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  emptyContainer: {
    padding: 15,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textSecondary,
  },
});

export default SectionsScreen;
