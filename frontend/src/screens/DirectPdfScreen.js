import React, { useState, useEffect, useRef } from 'react';
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
import Icon from '../components/Icon';
import { getBookmarks, saveBookmark, removeBookmark } from '../services/bookmarkService';
import i18n from '../i18n';
import colors from '../config/colors';
import HighlightedText from './HighlightedText';

const DirectPdfScreen = ({ route }) => {
  const { bookId, bookTitle, page } = route.params || {};
  const pdfRef = useRef(null);

  // PDF loading states
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfError, setPdfError] = useState(null);

  // Page tracking
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
        Alert.alert(i18n.t('errorTitle'), 'Failed to load PDF info.');
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
      const results = data.results || [];
      setSearchResults(results);
      setCurrentMatchIndex(0);

      if (results.length > 0) {
        jumpToMatch(0, results);
      }
    } catch (error) {
      console.error('Error searching PDF:', error);
      Alert.alert(i18n.t('errorTitle'), 'Failed to search in PDF.');
    }
  };

  const jumpToMatch = (matchIndex, resultsArray = searchResults) => {
    const match = resultsArray[matchIndex];
    if (!match) return;
    
    console.log(`Jumping to match on page ${match.page}`);
    
    // Just go to the page, don't worry about page count mismatches
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
        Alert.alert(i18n.t('bookmarkRemoved'), `${i18n.t('page')} ${currentPage}`);
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
        Alert.alert(
          i18n.t('bookmarkAdded'),
          `${bookTitle ? bookTitle + ', ' : ''}${i18n.t('page')} ${currentPage}`
        );
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Alert.alert(i18n.t('errorTitle'), 'Failed to toggle bookmark.');
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

  // If there was an error loading the PDF
  if (pdfError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error loading PDF: {pdfError}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setPdfError(null);
            setLoading(true);
            // Re-trigger the fetch book effect
            setPdfUrl(null);
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
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
          placeholder={i18n.t('enterSearchText')}
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
              <Icon name="chevron-up" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNextMatch}
              disabled={currentMatchIndex === searchResults.length - 1}
              style={[
                styles.arrowButton,
                currentMatchIndex === searchResults.length - 1 && styles.arrowDisabled,
              ]}
            >
              <Icon name="chevron-down" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Icon name="search" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Highlighted Search Result Panel (under the search bar) */}
      {currentMatch && (
        <View style={styles.snippetContainer}>
          <Text style={styles.snippetPageText}>
            {i18n.t('page')} {currentMatch.page}
          </Text>
          <HighlightedText text={currentMatch.snippet} highlight={searchText} />
        </View>
      )}

      {/* PDF Viewer */}
      <Pdf
        ref={pdfRef}
        source={{ 
          uri: pdfUrl, 
          cache: false  // Disable cache for better loading
        }}
        trustAllCerts={false}
        enablePaging={true}
        fitPolicy={0} // Width fit
        spacing={0}
        page={currentPage}
        onPageChanged={(newPage) => {
          console.log(`Page changed to ${newPage}`);
          setCurrentPage(newPage);
        }}
        onError={(error) => {
          console.error('PDF Error:', error);
          setPdfError(error.toString());
        }}
        style={styles.pdf}
      />

      {/* Floating Bookmark Toggle Button */}
      <TouchableOpacity style={styles.bookmarkButton} onPress={handleToggleBookmark}>
        <Icon
          name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
          size={24}
          color="#FFF"
        />
      </TouchableOpacity>
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
    textAlign: 'right',
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
    textAlign: 'right',
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
  snippetContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginHorizontal: 10,
    marginVertical: 6,
    borderRadius: 8,
    elevation: 2,
    alignItems: 'flex-end',
  },
  snippetPageText: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: colors.text || '#333',
    textAlign: 'right',
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
  errorText: {
    color: 'red',
    textAlign: 'center',
    margin: 20,
  },
  retryButton: {
    backgroundColor: colors.primary || '#2196F3',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  }
});