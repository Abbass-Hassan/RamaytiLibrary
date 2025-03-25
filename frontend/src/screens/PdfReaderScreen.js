import React, { useState, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Pdf from 'react-native-pdf';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getBookmarks, saveBookmark, removeBookmark } from '../services/bookmarkService';

// Import your colors and any highlight component if needed
import colors from '../config/colors';
import HighlightedText from './HighlightedText';

const DirectPdfScreen = ({ route }) => {
  // Expecting bookId, bookTitle, and optional initial page
  const { bookId, bookTitle, page } = route.params || {};

  // PDF loading states
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  // Page tracking
  const [numberOfPages, setNumberOfPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(page || 1);

  // Bookmark state
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Search states
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Fetch the PDF path from your backend
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await fetch(`http://ramaytilibrary-production.up.railway.app/api/books/${bookId}`);
        const data = await response.json();
        setPdfUrl(data.pdfPath);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching PDF info:', error);
        Alert.alert('Error', 'Failed to load PDF info.');
        setLoading(false);
      }
    };
    fetchBook();
  }, [bookId]);

  // Check bookmark whenever page changes
  const checkBookmark = async () => {
    try {
      const bookmarks = await getBookmarks();
      const exists = bookmarks.some(
        (b) => b.bookId === bookId && b.page === currentPage
      );
      setIsBookmarked(exists);
    } catch (error) {
      console.error('Error checking bookmark:', error);
    }
  };

  useEffect(() => {
    checkBookmark();
  }, [currentPage]);

  // Search in PDF
  const handleSearch = async () => {
    if (!searchText.trim()) return;
    try {
      const response = await fetch(
        `http://ramaytilibrary-production.up.railway.app/api/search/pdf?bookId=${bookId}&q=${encodeURIComponent(searchText)}`
      );
      const data = await response.json();
      setSearchResults(data.results || []);
      setCurrentMatchIndex(0);

      if (data.results && data.results.length > 0) {
        jumpToMatch(0, data.results);
      }
    } catch (error) {
      console.error('Error searching PDF:', error);
      Alert.alert('Error', 'Failed to search in PDF.');
    }
  };

  const jumpToMatch = (matchIndex, resultsArray = searchResults) => {
    const match = resultsArray[matchIndex];
    if (!match) return;
    if (match.page > numberOfPages) {
      Alert.alert(
        'Page Not Found',
        `The PDF has only ${numberOfPages} pages, but the search suggests page ${match.page}.`
      );
      return;
    }
    setCurrentPage(match.page);
  };

  const handlePrevMatch = () => {
    if (currentMatchIndex <= 0) return;
    const newIndex = currentMatchIndex - 1;
    setCurrentMatchIndex(newIndex);
    jumpToMatch(newIndex);
  };

  const handleNextMatch = () => {
    if (currentMatchIndex >= searchResults.length - 1) return;
    const newIndex = currentMatchIndex + 1;
    setCurrentMatchIndex(newIndex);
    jumpToMatch(newIndex);
  };

  const handleToggleBookmark = async () => {
    try {
      const bookmarks = await getBookmarks();
      const existing = bookmarks.find(
        (b) => b.bookId === bookId && b.page === currentPage
      );

      if (existing) {
        await removeBookmark(existing.id);
        setIsBookmarked(false);
        Alert.alert('Bookmark removed', `Removed bookmark for Page ${currentPage}`);
      } else {
        const bookmark = {
          id: Date.now().toString(),
          bookId,
          bookTitle: bookTitle || '',
          page: currentPage,
          note: '',
        };
        await saveBookmark(bookmark);
        setIsBookmarked(true);
        Alert.alert('Bookmark added', `Book: ${bookTitle}, Page: ${currentPage}`);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to toggle bookmark.');
    }
  };

  // Loading indicator
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // If we failed to get the PDF path
  if (!pdfUrl) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Unable to load PDF URL.</Text>
      </View>
    );
  }

  const currentMatch = searchResults[currentMatchIndex];

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search in PDF"
          placeholderTextColor={colors.textSecondary || '#999'}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
        />
        {searchResults.length > 0 ? (
          <View style={styles.arrowsContainer}>
            <Text style={styles.matchCount}>
              {currentMatchIndex + 1}/{searchResults.length}
            </Text>
            <TouchableOpacity
              onPress={handlePrevMatch}
              disabled={currentMatchIndex === 0}
              style={[
                styles.arrowButton,
                currentMatchIndex === 0 && styles.arrowDisabled,
              ]}
            >
              <Ionicons name="chevron-up" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNextMatch}
              disabled={currentMatchIndex === searchResults.length - 1}
              style={[
                styles.arrowButton,
                currentMatchIndex === searchResults.length - 1 && styles.arrowDisabled,
              ]}
            >
              <Ionicons name="chevron-down" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Ionicons name="search" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Floating Bookmark Toggle Button */}
      <TouchableOpacity style={styles.bookmarkButton} onPress={handleToggleBookmark}>
        <Ionicons
          name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
          size={24}
          color="#FFF"
        />
      </TouchableOpacity>

      {/* PDF Viewer (load directly from server) */}
      <Pdf
        source={{ uri: pdfUrl, cache: true }} // <--- Key difference: no RNFetchBlob
        page={currentPage}
        onLoadComplete={(pages) => {
          setNumberOfPages(pages);
        }}
        onPageChanged={(newPage) => {
          setCurrentPage(newPage);
        }}
        onError={(error) => {
          console.log('PDF Error:', error);
        }}
        style={styles.pdf}
      />

      {/* If there's a current match, show snippet overlay (optional) */}
      {currentMatch && (
        <View style={styles.snippetOverlay}>
          <HighlightedText text={currentMatch.snippet} highlight={searchText} />
        </View>
      )}
    </View>
  );
};

export default DirectPdfScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background || '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.card || '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.text || '#333',
  },
  arrowsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: colors.primary || '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchCount: {
    color: '#FFF',
    marginRight: 8,
    fontSize: 14,
  },
  arrowButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginHorizontal: 2,
    backgroundColor: colors.primary || '#2196F3',
  },
  arrowDisabled: {
    backgroundColor: '#999',
  },
  searchButton: {
    marginLeft: 8,
    backgroundColor: colors.primary || '#2196F3',
    borderRadius: 8,
    padding: 8,
  },
  bookmarkButton: {
    position: 'absolute',
    top: 70,
    right: 20,
    backgroundColor: colors.primary || '#2196F3',
    padding: 10,
    borderRadius: 30,
    zIndex: 10,
    elevation: 4,
  },
  pdf: {
    flex: 1,
  },
  snippetOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
});