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
import RNFetchBlob from 'react-native-blob-util';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getBookmarks, saveBookmark, removeBookmark } from '../services/bookmarkService';

const DummyPdfScreen = ({ route }) => {
  // Extract parameters; if bookTitle is not provided, default to empty string.
  const { bookId, sectionIndex, bookTitle = '' } = route.params;
  
  const [localPdfPath, setLocalPdfPath] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search-related states
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // PDF page states: initialize currentPage with section.page if available, otherwise 1
  const [numberOfPages, setNumberOfPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Bookmark state
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Function to check if current page is bookmarked for this book
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
    // Re-check bookmark whenever currentPage changes.
    checkBookmark();
  }, [currentPage, bookId]);

  useEffect(() => {
    const fetchBookAndDownloadPdf = async () => {
      try {
        const response = await fetch(`http://ramaytilibrary-production.up.railway.app/api/books/${bookId}`);
        const data = await response.json();
        const pdfUrl = data.pdfPath;
        const sections = data.sections || [];
        const section = sections[sectionIndex];
        if (section && section.page) {
          setCurrentPage(section.page);
        }
        const { config, fs } = RNFetchBlob;
        const filePath = fs.dirs.DocumentDir + '/downloaded_' + bookId + '.pdf';
        
        const exists = await fs.exists(filePath);
        if (exists) {
          setLocalPdfPath(filePath);
          setLoading(false);
        } else {
          const res = await config({
            fileCache: true,
            path: filePath,
          }).fetch('GET', pdfUrl);
          setLocalPdfPath(res.path());
          setLoading(false);
        }
      } catch (error) {
        console.error('Error downloading PDF:', error);
        Alert.alert('Error', 'Failed to download PDF.');
        setLoading(false);
      }
    };

    fetchBookAndDownloadPdf();
  }, [bookId, sectionIndex]);

  // Perform search
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

  // Jump to a specific match index
  const jumpToMatch = (matchIndex, resultsArray = searchResults) => {
    const match = resultsArray[matchIndex];
    if (!match) return;
    if (match.page > numberOfPages) {
      Alert.alert(
        'Page Not Found',
        `The PDF only has ${numberOfPages} pages, but the search suggested page ${match.page}.`
      );
      return;
    }
    setCurrentPage(match.page);
  };

  // Go to the previous match
  const handlePrevMatch = () => {
    if (currentMatchIndex <= 0) return;
    const newIndex = currentMatchIndex - 1;
    setCurrentMatchIndex(newIndex);
    jumpToMatch(newIndex);
  };

  // Go to the next match
  const handleNextMatch = () => {
    if (currentMatchIndex >= searchResults.length - 1) return;
    const newIndex = currentMatchIndex + 1;
    setCurrentMatchIndex(newIndex);
    jumpToMatch(newIndex);
  };

  // Toggle bookmark function: if current page is bookmarked, remove it; otherwise, add it.
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
          bookTitle, // include book title from route
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!localPdfPath) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Unable to load PDF.</Text>
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
          placeholderTextColor="#999"
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

      {/* PDF Viewer */}
      <Pdf
        source={{ uri: localPdfPath }}
        page={currentPage}
        onLoadComplete={(pages) => {
          console.log(`Number of pages: ${pages}`);
          setNumberOfPages(pages);
        }}
        onPageChanged={(page) => {
          console.log(`Current page: ${page}`);
          setCurrentPage(page);
        }}
        onError={(error) => {
          console.log(error);
        }}
        style={styles.pdf}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#333',
  },
  arrowsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#2196F3',
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
    backgroundColor: '#2196F3',
  },
  arrowDisabled: {
    backgroundColor: '#999',
  },
  searchButton: {
    marginLeft: 8,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 8,
  },
  bookmarkButton: {
    position: 'absolute',
    top: 70,
    right: 20,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 30,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  pdf: {
    flex: 1,
  },
});

export default DummyPdfScreen;