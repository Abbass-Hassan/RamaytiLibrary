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
  SectionList,
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
  const [groupedBookmarks, setGroupedBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Group bookmarks by book
  const groupBookmarksByBook = (bookmarkList) => {
    const grouped = {};
    
    // Group bookmarks by bookId
    bookmarkList.forEach(bookmark => {
      if (!grouped[bookmark.bookId]) {
        grouped[bookmark.bookId] = {
          title: bookmark.bookTitle,
          data: []
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
      const updated = [];
      for (const b of data) {
        try {
          const res = await fetch(`http://ramaytilibrary-production.up.railway.app/api/books/${b.bookId}`);
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
      setGroupedBookmarks(groupBookmarksByBook(updated));
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

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const renderBookmarkItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.bookmarkItem}
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
          <View style={styles.previewPlaceholder}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>
      
      <View style={styles.bookmarkDetails}>
        <Text style={styles.pageText}>{t('page')} {item.page}</Text>
        {item.note && item.note.trim() !== '' && (
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
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
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
        <Text style={styles.emptyText}>{t('noBookmarksFound')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={groupedBookmarks}
        keyExtractor={(item) => item.id}
        renderItem={renderBookmarkItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={true}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

export default BookmarksScreen;

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
  sectionHeader: {
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 8,
  },
  sectionHeaderText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'right',
  },
  bookmarkItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginVertical: 4,
    marginHorizontal: 12,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  previewContainer: {
    width: 70,
    height: 100,
    marginRight: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pdfPreview: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  bookmarkDetails: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  pageText: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
  },
  noteText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },
  removeButton: {
    padding: 8,
    alignSelf: 'center',
    marginLeft: 6,
  }
});