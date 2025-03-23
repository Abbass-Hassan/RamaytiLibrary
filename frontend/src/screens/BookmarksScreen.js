// frontend/src/screens/BookmarksScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Pdf from 'react-native-pdf';
import RNFetchBlob from 'react-native-blob-util';
import { useTranslation } from 'react-i18next';

import { getBookmarks, removeBookmark } from '../services/bookmarkService';
import colors from '../config/colors';

// Configure RNFetchBlob globally
if (Platform.OS === 'android') {
  RNFetchBlob.config({
    trusty: true,
  });
}

// Updated getLocalPdfPath function: re-download if file exists but its size is below threshold.
const getLocalPdfPath = async (bookId, pdfUrl) => {
  try {
    const { fs, config } = RNFetchBlob;
    const filePath = fs.dirs.DocumentDir + `/downloaded_${bookId}.pdf`;
    const exists = await fs.exists(filePath);
    if (exists) {
      const stat = await fs.stat(filePath);
      // If file size is above 1000 bytes, assume it's valid; otherwise, re-download.
      if (parseInt(stat.size, 10) > 1000) {
        return filePath;
      }
    }
    const res = await config({ 
      fileCache: true, 
      path: filePath,
      trusty: true 
    }).fetch('GET', pdfUrl);
    return res.path();
  } catch (error) {
    console.error('Error downloading or locating PDF:', error);
    throw error;
  }
};

const BookmarksScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { t } = useTranslation();

  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      const data = await getBookmarks();
      const updated = [];
      for (const b of data) {
        try {
          const res = await fetch(`http://10.0.2.2:3000/api/books/${b.bookId}`);
          const bookData = await res.json();
          const localPath = await getLocalPdfPath(b.bookId, bookData.pdfPath);
          updated.push({
            ...b,
            pdfLocalPath: localPath,
          });
        } catch (error) {
          console.error('Error preparing bookmark PDF:', error);
          updated.push({ ...b, pdfLocalPath: null });
        }
      }
      setBookmarks(updated);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      Alert.alert('Error', 'Failed to load bookmarks.');
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
      console.error('Error removing bookmark:', error);
      Alert.alert('Error', 'Failed to remove bookmark.');
    }
  };

  const handleBookmarkPress = (bookmark) => {
    navigation.navigate('DirectTab', {
      screen: 'DirectPdfScreen',
      params: {
        bookId: bookmark.bookId,
        page: bookmark.page,
        bookTitle: bookmark.bookTitle,
      },
    });
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.previewWrapper}
        onPress={() => handleBookmarkPress(item)}
      >
        <View style={styles.previewContainer}>
          {item.pdfLocalPath ? (
            <Pdf
              key={item.pdfLocalPath + '_' + item.page}
              source={{ uri: item.pdfLocalPath, cache: false }}
              trustAllCerts={true}
              page={item.page}
              scale={1.0}
              horizontal={false}
              fitPolicy={0}
              style={styles.pdfPreview}
              onError={(error) => {
                console.log('Error loading PDF preview:', error);
              }}
            />
          ) : (
            <Text>Loading preview...</Text>
          )}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.bookTitle} - {t('page')} {item.page}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handleRemoveBookmark(item.id)}
        style={styles.removeIcon}
      >
        <Ionicons name="trash-outline" size={24} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No bookmarks found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        key="twoColumns"
        data={bookmarks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
      />
    </View>
  );
};

export default BookmarksScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50,
  },
  listContainer: {
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  card: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: colors.card,
    marginVertical: 6,
    borderRadius: 8,
    padding: 8,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  previewWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  previewContainer: {
    width: 100,
    height: 140,
    marginBottom: 8,
    overflow: 'hidden',
  },
  pdfPreview: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  removeIcon: {
    marginTop: 8,
  },
});