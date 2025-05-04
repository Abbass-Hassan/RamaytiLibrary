// frontend/src/screens/SearchResultsScreen.js

import React, { useState, useRef } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";
import HighlightedText from "./HighlightedText";
import colors from "../config/colors";

// Function to convert Western numbers to Eastern Arabic numerals
const toArabicDigits = (num) => {
  if (!num) return "";
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
};

const SearchResultsScreen = ({ route }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  // Get data from route params
  const { searchText, results = [] } = route.params || {};

  // State for current selected result
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  // Ref for FlatList
  const resultsListRef = useRef(null);

  // Format numbers - always use Arabic numerals
  const formatNumber = (num) => {
    return toArabicDigits(num);
  };

  // Navigation through results
  const navigateToNextResult = () => {
    if (results.length <= 1) return;

    const nextIndex = (selectedResultIndex + 1) % results.length;
    setSelectedResultIndex(nextIndex);

    // Scroll to the selected result
    if (resultsListRef.current) {
      resultsListRef.current.scrollToIndex({
        index: nextIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  };

  const navigateToPrevResult = () => {
    if (results.length <= 1) return;

    const prevIndex =
      (selectedResultIndex - 1 + results.length) % results.length;
    setSelectedResultIndex(prevIndex);

    // Scroll to the selected result
    if (resultsListRef.current) {
      resultsListRef.current.scrollToIndex({
        index: prevIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  };

  // Handle result press
  const handleResultPress = (result) => {
    // Navigate to CustomPdfReader
    navigation.navigate("DirectTab", {
      screen: "CustomPdfReader",
      params: {
        bookId: result.bookId,
        bookTitle: result.bookTitle,
        page: result.page,
        searchTerm: searchText,
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Back button - aligned to the left */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-forward" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search info bar - fixed to match screenshot */}
      <View style={styles.searchInfoBar}>
        <Text style={styles.searchQuery}>{`عبارة البحث: ${searchText}`}</Text>
        <Text style={styles.resultsCount}>
          ({formatNumber(results.length)})
        </Text>
      </View>

      {/* Results section */}
      <View style={styles.resultsContainer}>
        {results.length > 0 ? (
          <>
            {/* Results navigation controls */}
            <View style={styles.resultNavigation}>
              <TouchableOpacity
                onPress={navigateToPrevResult}
                style={styles.navButton}
              >
                <Icon name="chevron-up" size={24} color={colors.primary} />
              </TouchableOpacity>

              <Text style={styles.resultCount}>
                {`${formatNumber(selectedResultIndex + 1)} / ${formatNumber(
                  results.length
                )}`}
              </Text>

              <TouchableOpacity
                onPress={navigateToNextResult}
                style={styles.navButton}
              >
                <Icon name="chevron-down" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Results list */}
            <FlatList
              ref={resultsListRef}
              data={results}
              keyExtractor={(item, index) =>
                `${item.bookId}-${item.page}-${index}`
              }
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => handleResultPress(item)}
                  style={[
                    styles.resultItem,
                    index === selectedResultIndex && styles.selectedResultItem,
                  ]}
                >
                  {/* Moved dot to the right side for RTL layout */}
                  <View style={styles.resultItemContent}>
                    {/* Book title with page number */}
                    <Text style={styles.resultTitle}>
                      {`الصفحة ${formatNumber(item.page)} - ${item.bookTitle}`}
                    </Text>

                    {/* Highlighted text */}
                    <HighlightedText
                      text={item.snippet}
                      highlight={searchText}
                      textStyle={styles.resultText}
                      highlightStyle={styles.highlightedText}
                    />
                  </View>

                  {/* Blue dot on the right side */}
                  <View style={styles.resultDot} />
                </TouchableOpacity>
              )}
              initialScrollIndex={0}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  if (resultsListRef.current) {
                    resultsListRef.current.scrollToIndex({
                      index: 0,
                      animated: false,
                    });
                  }
                }, 100);
              }}
            />
          </>
        ) : (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>لا توجد نتائج</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  searchInfoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#03395f", // Darker blue based on screenshot
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  searchQuery: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right",
  },
  resultsCount: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  resultNavigation: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#F8F8F8",
    borderBottomWidth: 1,
    borderBottomColor: "#DDDDDD",
  },
  navButton: {
    padding: 8,
  },
  resultCount: {
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 16,
    color: colors.primary,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    padding: 16,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  selectedResultItem: {
    backgroundColor: "#EBF5FB", // Light blue background for selected item
  },
  resultItemContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 8,
    textAlign: "right",
  },
  resultText: {
    fontSize: 14,
    color: colors.text,
    textAlign: "right",
  },
  highlightedText: {
    backgroundColor: "yellow",
    fontWeight: "bold",
  },
  resultDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginRight: 16, // Changed from marginLeft to marginRight for the right side
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  noResultsText: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

export default SearchResultsScreen;
