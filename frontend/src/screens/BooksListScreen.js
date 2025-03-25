import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import colors from '../config/colors';

const BooksListScreen = ({ navigation }) => {
  const [books, setBooks] = useState([]);

  const fetchBooks = async () => {
    try {
      const response = await fetch('http://ramaytilibrary-production.up.railway.app/api/books');
      const data = await response.json();
      setBooks(data);
    } catch (error) {
      console.log('Error fetching books:', error);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('SectionsScreen', { bookId: item.id })}
      style={styles.card}
    >
      <View style={styles.coverContainer}>
        <Image 
          source={require('../assets/book-cover.png')} 
          style={styles.coverImage} 
          resizeMode="cover"
        />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={<Text style={styles.emptyText}>No books found.</Text>}
      />
    </View>
  );
};

export default BooksListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50,
  },
  listContainer: {
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: colors.card,
    marginVertical: 8,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  coverContainer: {
    width: 120,
    height: 160,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: colors.textSecondary,
  },
});