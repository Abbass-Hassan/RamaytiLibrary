import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

// Import the custom Icon component
import Icon from "../components/Icon";

// Import colors
import colors from "../config/colors";

const BookSectionsScreen = ({ navigation }) => {
  const [books, setBooks] = useState([]);
  const [expandedBookId, setExpandedBookId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Animation value for expand/collapse
  const [rotationValues] = useState({});

  const fetchBooks = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(
        "http://ramaytilibrary-production.up.railway.app/api/books"
      );
      const data = await response.json();

      // Initialize books with empty sections arrays
      const booksWithSections = data.map((book) => {
        // Initialize rotation values for each book
        if (!rotationValues[book.id]) {
          rotationValues[book.id] = new Animated.Value(0);
        }

        return {
          ...book,
          sections: [],
          sectionsLoaded: false,
        };
      });

      setBooks(booksWithSections);
    } catch (error) {
      console.log("Error fetching books:", error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    fetchBooks(true);
  }, []);

  const fetchSectionsForBook = async (bookId) => {
    try {
      // Find the book in our state
      const bookIndex = books.findIndex((book) => book.id === bookId);
      if (bookIndex === -1) return;

      // If sections already loaded, no need to fetch again
      if (books[bookIndex].sectionsLoaded) return;

      // Set temporary loading state for this book
      const updatedBooks = [...books];
      updatedBooks[bookIndex] = {
        ...updatedBooks[bookIndex],
        sectionsLoading: true,
      };
      setBooks(updatedBooks);

      const response = await fetch(
        `http://ramaytilibrary-production.up.railway.app/api/books/${bookId}/sections`
      );
      const sectionsData = await response.json();

      // Update the book with its sections
      const finalBooks = [...books];
      finalBooks[bookIndex] = {
        ...finalBooks[bookIndex],
        sections: sectionsData,
        sectionsLoaded: true,
        sectionsLoading: false,
      };

      setBooks(finalBooks);
    } catch (error) {
      console.log(`Error fetching sections for book ${bookId}:`, error);
      // Reset loading state on error
      const bookIndex = books.findIndex((book) => book.id === bookId);
      if (bookIndex !== -1) {
        const errorBooks = [...books];
        errorBooks[bookIndex] = {
          ...errorBooks[bookIndex],
          sectionsLoading: false,
        };
        setBooks(errorBooks);
      }
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // When a book is expanded, fetch its sections if not already loaded
  useEffect(() => {
    if (expandedBookId) {
      fetchSectionsForBook(expandedBookId);

      // Animate rotation
      Animated.timing(rotationValues[expandedBookId], {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (expandedBookId === null) {
      // Animate all rotations back to 0
      Object.keys(rotationValues).forEach((bookId) => {
        Animated.timing(rotationValues[bookId], {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [expandedBookId]);

  const toggleBookExpansion = (bookId) => {
    if (expandedBookId === bookId) {
      // Animate back before collapsing
      Animated.timing(rotationValues[bookId], {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setExpandedBookId(null);
      });
    } else {
      // If another book is expanded, collapse it first
      if (expandedBookId !== null && rotationValues[expandedBookId]) {
        Animated.timing(rotationValues[expandedBookId], {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
      setExpandedBookId(bookId);
    }
  };

  const renderBookItem = ({ item, index }) => {
    const isExpanded = expandedBookId === item.id;
    const hasRotationValue = rotationValues[item.id] !== undefined;

    // Calculate rotation for the icon
    const iconRotation = hasRotationValue
      ? rotationValues[item.id].interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "180deg"],
        })
      : "0deg";

    // Get a color based on the index for a bit of visual variety
    const accentColors = [
      colors.primary,
      "#1A7BB5",
      "#7E3794",
      "#D05D1F",
      "#2A855C",
    ];
    const accentColor = accentColors[index % accentColors.length];

    return (
      <View
        style={[
          styles.bookContainer,
          { borderLeftColor: accentColor, borderLeftWidth: 4 },
        ]}
      >
        <TouchableOpacity
          style={styles.bookHeader}
          activeOpacity={0.7}
          onPress={() => toggleBookExpansion(item.id)}
        >
          <View style={styles.bookTitleContainer}>
            <Image
              source={require("../assets/book-cover.png")}
              style={styles.bookIcon}
              resizeMode="cover"
            />
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.author && (
                <Text style={styles.bookAuthor}>{item.author}</Text>
              )}
            </View>
          </View>

          {hasRotationValue ? (
            <Animated.View style={{ transform: [{ rotate: iconRotation }] }}>
              <Icon name="chevron-down" size={22} color={accentColor} />
            </Animated.View>
          ) : (
            <Icon
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={22}
              color={accentColor}
            />
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionsContainer}>
            {item.sectionsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={accentColor} />
                <Text style={styles.loadingText}>Loading sections...</Text>
              </View>
            ) : item.sectionsLoaded && item.sections.length > 0 ? (
              item.sections.map((section, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.sectionItem}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate("DummyPdfScreen", {
                      bookId: item.id,
                      sectionIndex: index,
                    })
                  }
                >
                  <View style={styles.sectionInfo}>
                    <Text style={styles.sectionNumber}>{index + 1}</Text>
                    <Text style={styles.sectionName}>{section.name}</Text>
                  </View>
                  <Icon
                    name="arrow-forward"
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Icon
                  name="information-circle"
                  size={22}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyText}>No sections available</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingScreenText}>Loading books...</Text>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyListContainer}>
            <Icon name="book" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyListText}>No books available</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContainer: {
    paddingBottom: 20,
  },
  bookContainer: {
    backgroundColor: colors.card,
    marginHorizontal: 15,
    marginVertical: 7,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  bookHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  bookTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  bookIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  bookAuthor: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "#fafafa",
  },
  sectionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    color: colors.card,
    textAlign: "center",
    lineHeight: 24,
    fontSize: 13,
    fontWeight: "600",
    marginRight: 10,
  },
  sectionName: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  loadingText: {
    color: colors.textSecondary,
    marginLeft: 10,
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  emptyText: {
    color: colors.textSecondary,
    marginLeft: 8,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingScreenText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyListContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyListText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 10,
  },
});

export default BookSectionsScreen;
