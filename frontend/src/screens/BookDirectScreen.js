import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// 1) Import color palette
import colors from '../config/colors';

const BookDirectScreen = () => {
  const navigation = useNavigation();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBooks = async () => {
    try {
      const response = await fetch('http://10.0.2.2:3000/api/books');
      const data = await response.json();
      setBooks(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching books:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleBookPress = (book) => {
    navigation.navigate('DirectPdfScreen', {
      bookId: book.id,
      bookTitle: book.title,
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleBookPress(item)} style={styles.card}>
      <View style={styles.previewContainer}>
        {/* Use a cover image instead of the placeholder */}
        <Image
          source={require('../assets/book-cover.png')} // Replace with your actual image path
          style={styles.coverImage}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        key="twoColumns"
        data={books}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
      />
    </View>
  );
};

export default BookDirectScreen;

// 3) Updated styles
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
  card: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: colors.card,
    marginVertical: 6,
    borderRadius: 8,
    padding: 8,
    elevation: 3, // Android shadow
    shadowColor: colors.shadow, // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  previewContainer: {
    width: 100,
    height: 140,
    marginBottom: 8,
    overflow: 'hidden',
    borderRadius: 4,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  title: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
});