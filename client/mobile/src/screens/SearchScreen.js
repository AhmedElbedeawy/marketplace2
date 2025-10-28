import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Mock categories
  const categories = [
    { id: '1', name: 'All', icon: '🍽️' },
    { id: '2', name: 'Main Course', icon: '🍲' },
    { id: '3', name: 'Desserts', icon: '🍰' },
    { id: '4', name: 'Appetizers', icon: '🥗' },
    { id: '5', name: 'Beverages', icon: '🥤' },
  ];

  // Mock search results
  const searchResults = [
    {
      id: '1',
      name: 'Homemade Pizza',
      cook: 'Maria\'s Kitchen',
      price: 12.99,
      rating: 4.8,
      image: 'https://example.com/pizza.jpg',
    },
    {
      id: '2',
      name: 'Chicken Biryani',
      cook: 'Ahmed\'s Delights',
      price: 10.99,
      rating: 4.9,
      image: 'https://example.com/biryani.jpg',
    },
    {
      id: '3',
      name: 'Chocolate Cake',
      cook: 'Sweet Tooth',
      price: 8.99,
      rating: 4.7,
      image: 'https://example.com/cake.jpg',
    },
    {
      id: '4',
      name: 'Fresh Salad',
      cook: 'Green Kitchen',
      price: 7.99,
      rating: 4.6,
      image: 'https://example.com/salad.jpg',
    },
  ];

  const filteredResults = searchQuery
    ? searchResults.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.cook.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchResults;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for dishes or cooks..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.searchButton}>
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.selectedCategory,
                ]}
                onPress={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryText}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity style={styles.filterButton}>
              <Text style={styles.filterText}>Price: Low to High</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterButton}>
              <Text style={styles.filterText}>Rating: High to Low</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Results */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>
            {filteredResults.length} results found
          </Text>
          
          {filteredResults.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.resultItem}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
            >
              <Image source={{ uri: item.image }} style={styles.resultImage} />
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultCook}>{item.cook}</Text>
                <View style={styles.resultFooter}>
                  <Text style={styles.resultPrice}>${item.price.toFixed(2)}</Text>
                  <Text style={styles.resultRating}>⭐ {item.rating}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  searchInput: {
    flex: 1,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  searchButtonText: {
    fontSize: 20,
  },
  categoriesContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  categoryButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCategory: {
    backgroundColor: '#3498db',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
  },
  filtersContainer: {
    padding: 20,
    paddingTop: 0,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginRight: 10,
  },
  filterText: {
    fontSize: 14,
    color: '#333',
  },
  resultsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  resultsTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  resultItem: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resultImage: {
    width: 100,
    height: 100,
  },
  resultInfo: {
    flex: 1,
    padding: 10,
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  resultCook: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  resultPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  resultRating: {
    fontSize: 14,
    color: '#f39c12',
  },
});

export default SearchScreen;