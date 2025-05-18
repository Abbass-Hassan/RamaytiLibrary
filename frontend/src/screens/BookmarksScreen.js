// frontend/src/screens/BookmarksScreen.js

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SectionList,
  I18nManager,
} from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { getBookmarks, removeBookmark } from "../services/bookmarkService";
import colors from "../config/colors";

const BookmarksScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL || i18n.language === "ar";

  const [bookmarks, setBookmarks] = useState([]);
  const [groupedBookmarks, setGroupedBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Format numbers to Arabic digits when in Arabic mode
  const formatNumber = (num) => {
    if (!num) return "";
    if (!isRTL) return String(num);

    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
  };

  // Group bookmarks by book
  const groupBookmarksByBook = (bookmarkList) => {
    const grouped = {};

    // Group bookmarks by bookId
    bookmarkList.forEach((bookmark) => {
      if (!grouped[bookmark.bookId]) {
        grouped[bookmark.bookId] = {
          title: bookmark.bookTitle || "Untitled Book",
          data: [],
        };
      }
      grouped[bookmark.bookId].data.push(bookmark);
    });

    // Convert to array format needed for SectionList
    return Object.values(grouped).sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  };

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      const data = await getBookmarks();
      setBookmarks(data);
      setGroupedBookmarks(groupBookmarksByBook(data));
    } catch (error) {
      console.error("Error loading bookmarks:", error);
      Alert.alert("Error", "Failed to load bookmarks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadBookmarks();
    }
  }, [isFocused]);

  const handleRemoveBookmark = async (bookmarkId) => {
    try {
      await removeBookmark(bookmarkId);
      loadBookmarks();
    } catch (error) {
      console.error("Error removing bookmark:", error);
      Alert.alert("Error", "Failed to remove bookmark.");
    }
  };

  const handleBookmarkPress = (bookmark) => {
    navigation.navigate("DirectTab", {
      screen: "CustomPdfReader",
      params: {
        bookId: bookmark.bookId,
        page: bookmark.page,
        bookTitle: bookmark.bookTitle,
      },
    });
  };

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
      <View style={styles.headerUnderline} />
    </View>
  );

  const renderBookmarkItem = ({ item }) => (
    <TouchableOpacity
      style={styles.bookmarkItem}
      onPress={() => handleBookmarkPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.pageIndicator}>
        <Text style={styles.pageNumber}>
          {isRTL ? formatNumber(item.page) : item.page}
        </Text>
      </View>

      <View style={styles.bookmarkDetails}>
        <Text style={styles.bookTitle} numberOfLines={1}>
          {item.bookTitle}
        </Text>
        <Text style={styles.pageText}>
          {t("page")} {isRTL ? formatNumber(item.page) : item.page}
        </Text>
        {item.note && item.note.trim() !== "" && (
          <Text style={styles.noteText} numberOfLines={2}>
            {item.note}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={() => handleRemoveBookmark(item.id)}
        style={styles.removeButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="trash-outline"
          size={20}
          color={colors.danger || "#FF3B30"}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="bookmark-outline"
        size={72}
        color={colors.primary}
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyText}>{t("noBookmarks")}</Text>
      <Text style={styles.emptySubText}>{t("addBookmarks")}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t("loadingBookmarks")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {bookmarks.length === 0 ? (
        renderEmptyList()
      ) : (
        <SectionList
          sections={groupedBookmarks}
          keyExtractor={(item) => item.id}
          renderItem={renderBookmarkItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={true}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "600",
  },
  emptySubText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || "#E0E0E0",
  },
  sectionHeaderText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 18,
    textAlign: "right",
    marginBottom: 4,
  },
  headerUnderline: {
    height: 2,
    width: "30%",
    backgroundColor: colors.primary,
    alignSelf: "flex-end",
  },
  bookmarkItem: {
    flexDirection: "row",
    backgroundColor: colors.card,
    marginVertical: 6,
    marginHorizontal: 12,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    borderRightWidth: 3, // RTL: right border instead of left
    borderRightColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pageIndicator: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10, // RTL: margin left instead of right
  },
  pageNumber: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  bookmarkDetails: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: "flex-end", // RTL: align to end (right)
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    textAlign: "right",
    marginBottom: 3,
  },
  pageText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: "right",
  },
  removeButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,59,48,0.1)",
  },
});

export default BookmarksScreen;
