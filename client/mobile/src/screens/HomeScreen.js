import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
} from 'react-native';

const HomeScreen = ({ navigation }) => {
  // Mock data for featured products
  const featuredProducts = [
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
  ];

  const categories = [
    { id: '1', name: 'Main Course', icon: '🍲' },
    { id: '2', name: 'Desserts', icon: '🍰' },
    { id: '3', name: 'Appetizers', icon: '🥗' },
    { id: '4', name: 'Beverages', icon: '🥤' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Home Food Marketplace</Text>
          <Text style={styles.subtitle}>Discover delicious home-cooked meals</Text>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((category) => (
              <TouchableOpacity key={category.id} style={styles.categoryCard}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Dishes</Text>
          {featuredProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
            >
              <Image source={{ uri: product.image }} style={styles.productImage} />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.cookName}>{product.cook}</Text>
                <View style={styles.productFooter}>
                  <Text style={styles.price}>${product.price}</Text>
                  <Text style={styles.rating}>⭐ {product.rating}</Text>
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
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  categoryCard: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    marginRight: 10,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 100,
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  categoryName: {
    fontSize: 14,
    color: '#333',
  },
  productCard: {
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
  productImage: {
    width: 100,
    height: 100,
  },
  productInfo: {
    flex: 1,
    padding: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cookName: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  rating: {
    fontSize: 14,
    color: '#f39c12',
  },
});

export default HomeScreen;