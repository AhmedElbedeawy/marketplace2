import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';

const ProductDetailScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  const [quantity, setQuantity] = useState(1);

  // Mock product data
  const product = {
    id: productId,
    name: 'Homemade Pizza',
    cook: 'Maria\'s Kitchen',
    cookRating: 4.8,
    cookReviews: 128,
    price: 12.99,
    description: 'Delicious homemade pizza with fresh ingredients, baked to perfection. Made with love and traditional recipes.',
    prepTime: 30, // in minutes
    stock: 5,
    image: 'https://example.com/pizza.jpg',
    category: 'Main Course',
  };

  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const addToCart = () => {
    Alert.alert(
      'Added to Cart',
      `${quantity} ${product.name} added to your cart!`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Image source={{ uri: product.image }} style={styles.productImage} />
        
        <View style={styles.content}>
          <Text style={styles.productName}>{product.name}</Text>
          
          <TouchableOpacity 
            style={styles.cookContainer}
            onPress={() => navigation.navigate('CookProfile', { cookId: '123' })}
          >
            <Text style={styles.cookName}>{product.cook}</Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.rating}>⭐ {product.cookRating}</Text>
              <Text style={styles.reviews}>({product.cookReviews} reviews)</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${product.price.toFixed(2)}</Text>
            <Text style={styles.prepTime}>{product.prepTime} min prep</Text>
          </View>
          
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>
          
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryLabel}>Category:</Text>
            <Text style={styles.category}>{product.category}</Text>
          </View>
          
          <View style={styles.stockContainer}>
            <Text style={styles.stockLabel}>Available:</Text>
            <Text style={styles.stock}>{product.stock} items</Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Add to Cart Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity style={styles.quantityButton} onPress={decrementQuantity}>
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantity}>{quantity}</Text>
          <TouchableOpacity style={styles.quantityButton} onPress={incrementQuantity}>
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.addToCartButton} onPress={addToCart}>
          <Text style={styles.addToCartText}>Add to Cart • ${(product.price * quantity).toFixed(2)}</Text>
        </TouchableOpacity>
      </View>
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
  productImage: {
    width: '100%',
    height: 300,
  },
  content: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  cookContainer: {
    marginBottom: 15,
  },
  cookName: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  rating: {
    fontSize: 14,
    color: '#f39c12',
    marginRight: 10,
  },
  reviews: {
    fontSize: 14,
    color: '#666',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  prepTime: {
    fontSize: 16,
    color: '#27ae60',
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  category: {
    fontSize: 16,
    color: '#3498db',
  },
  stockContainer: {
    flexDirection: 'row',
  },
  stockLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  stock: {
    fontSize: 16,
    color: '#27ae60',
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
  },
  quantityButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  quantity: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 15,
    color: '#333',
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: '#e74c3c',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProductDetailScreen;