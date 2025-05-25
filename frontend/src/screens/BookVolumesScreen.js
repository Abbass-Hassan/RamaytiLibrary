import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  Platform,
} from "react-native";
import colors from "../config/colors";
import Icon from "react-native-vector-icons/Ionicons";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Helper function to convert numbers to Arabic numerals
const toArabicNumeral = (num) => {
  const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return num
    .toString()
    .split("")
    .map((digit) =>
      isNaN(parseInt(digit)) ? digit : arabicNumerals[parseInt(digit)]
    )
    .join("");
};

// Preload default book cover
const DEFAULT_BOOK_COVER = require("../assets/book-cover.png");

const SERVER_URL = "https://backend-aged-smoke-3335.fly.dev";

const BookVolumesScreen = ({ route, navigation }) => {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL || i18n.language === "ar";
  const { book, bookId, bookTitle } = route.params;

  const [volumes, setVolumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (book && book.sections) {
      // Extract volumes from the book sections
      const bookVolumes = book.sections.map((section, index) => ({
        ...section,
        id: section.id || `${bookId}_section_${index}`,
        number: index + 1,
        bookTitle: bookTitle,
        bookId: bookId,
        coverImageUrl: book.coverImageUrl, // Use same cover as parent book
      }));

      setVolumes(bookVolumes);
    } else {
      // Fetch volumes if not provided in route params
      fetchVolumes();
    }
  }, [book]);

  const fetchVolumes = async () => {
    try {
      setLoading(true);

      // Check network status
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        setIsOffline(true);
        // Try to get from cache
        const cachedVolumes = await getCachedVolumes(bookId);
        if (cachedVolumes) {
          setVolumes(cachedVolumes);
        } else {
          setError(t("offlineNoVolumes"));
        }
        setLoading(false);
        return;
      }

      const response = await fetch(`${SERVER_URL}/api/books/${bookId}`);

      if (!response.ok) {
        throw new Error(`${t("serverError")}: ${response.status}`);
      }

      const bookData = await response.json();

      if (bookData.sections && bookData.sections.length > 0) {
        const formattedVolumes = bookData.sections.map((section, index) => ({
          ...section,
          id: section.id || `${bookId}_section_${index}`,
          number: index + 1,
          bookTitle: bookData.title || bookTitle,
          bookId: bookId,
          coverImageUrl: bookData.imagePath
            ? bookData.imagePath.startsWith("http")
              ? bookData.imagePath
              : `${SERVER_URL}${bookData.imagePath}`
            : null,
        }));

        setVolumes(formattedVolumes);
        // Cache volumes for offline use
        saveVolumesToCache(bookId, formattedVolumes);
      } else {
        setError(t("noVolumesFound"));
      }
    } catch (error) {
      console.error("Error fetching volumes:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Cache utilities for volumes
  const saveVolumesToCache = async (bookId, volumesData) => {
    try {
      await AsyncStorage.setItem(
        `volumes_${bookId}`,
        JSON.stringify({
          timestamp: Date.now(),
          data: volumesData,
        })
      );
    } catch (error) {
      console.error("Error saving volumes to cache:", error);
    }
  };

  const getCachedVolumes = async (bookId) => {
    try {
      const cached = await AsyncStorage.getItem(`volumes_${bookId}`);
      if (cached) {
        const parsedData = JSON.parse(cached);
        return parsedData.data;
      }
      return null;
    } catch (error) {
      console.error("Error getting cached volumes:", error);
      return null;
    }
  };

  const handleVolumePress = (volume) => {
    // Navigate to PDF reader with the volume data
    navigation.navigate("CustomPdfReader", {
      bookId: volume.bookId,
      bookTitle: volume.bookTitle,
      sectionId: volume.id,
      sectionName: volume.name,
      page: 1,
      pdfPath: volume.pdfPath,
      pdfFilename: volume.fileName,
    });
  };

  const renderVolumeItem = ({ item, index }) => (
    <TouchableOpacity
      onPress={() => handleVolumePress(item)}
      style={styles.volumeCard}
    >
      <View style={styles.coverContainer}>
        {/* Use book cover image for all volumes - Fixed for Android */}
        {item.coverImageUrl ? (
          Platform.OS === "ios" ? (
            <Image
              source={{ uri: item.coverImageUrl }}
              style={styles.coverImage}
              resizeMode="cover"
              defaultSource={DEFAULT_BOOK_COVER}
            />
          ) : (
            <Image
              source={{ uri: item.coverImageUrl }}
              style={styles.coverImage}
              resizeMode="cover"
              // Removed defaultSource on Android
            />
          )
        ) : (
          <Image
            source={DEFAULT_BOOK_COVER}
            style={styles.coverImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.volumeOverlay}>
          <Text style={styles.volumeNumber}>
            {toArabicNumeral(item.number)}
          </Text>
        </View>
        <Text style={styles.volumeName} numberOfLines={2}>
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t("loadingVolumes")}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon
            name={isRTL ? "chevron-forward" : "chevron-back"}
            size={28}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {bookTitle}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>{t("offlineMode")}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={volumes}
        renderItem={renderVolumeItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          !loading &&
          !error && <Text style={styles.emptyText}>{t("noVolumesFound")}</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    textAlign: "center",
  },
  headerRight: {
    width: 40,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
  errorContainer: {
    padding: 15,
    backgroundColor: "#ffebee",
    margin: 10,
    borderRadius: 5,
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
  listContainer: {
    padding: 10,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  volumeCard: {
    width: "48%",
    marginVertical: 8,
    alignItems: "center",
  },
  coverContainer: {
    width: 150,
    height: 210,
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  volumeOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  volumeNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  volumeName: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text,
    textAlign: "center",
    marginTop: 50,
  },
  offlineBanner: {
    backgroundColor: "#ff9800",
    padding: 5,
    alignItems: "center",
  },
  offlineBannerText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default BookVolumesScreen;
