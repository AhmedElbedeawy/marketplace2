import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
} from 'react-native';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 234 567 8900',
    profileImage: 'https://example.com/profile.jpg',
    isCook: true,
    storeName: 'John\'s Kitchen',
    storeStatus: 'approved',
  });

  const menuItems = [
    { id: '1', title: 'My Orders', icon: '📦', screen: 'MyOrders' },
    { id: '2', title: 'My Favorites', icon: '❤️', screen: 'Favorites' },
    { id: '3', title: 'Payment Methods', icon: '💳', screen: 'PaymentMethods' },
    { id: '4', title: 'Notifications', icon: '🔔', screen: 'Notifications' },
    { id: '5', title: 'Settings', icon: '⚙️', screen: 'Settings' },
  ];

  const cookMenuItems = [
    { id: '1', title: 'Cook Dashboard', icon: '🍳', screen: 'CookDashboard' },
    { id: '2', title: 'My Products', icon: '🛍️', screen: 'MyProducts' },
    { id: '3', title: 'Order Management', icon: '📋', screen: 'OrderManagement' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.header}>
          <Image source={{ uri: user.profileImage }} style={styles.profileImage} />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          
          {user.isCook && (
            <View style={styles.cookBadge}>
              <Text style={styles.cookBadgeText}>Cook</Text>
            </View>
          )}
          
          {!user.isCook && (
            <TouchableOpacity 
              style={styles.becomeCookButton}
              onPress={() => navigation.navigate('BecomeCook')}
            >
              <Text style={styles.becomeCookText}>Become a Cook</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* General Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          {menuItems.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuText}>{item.title}</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cook Menu (if user is a cook) */}
        {user.isCook && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Cook Options</Text>
            {cookMenuItems.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.menuItem}
                onPress={() => navigation.navigate(item.screen)}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuText}>{item.title}</Text>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity 
              style={[styles.menuItem, styles.switchView]}
              onPress={() => navigation.navigate('CookDashboard')}
            >
              <Text style={styles.menuIcon}>🔁</Text>
              <Text style={styles.menuText}>Switch to Cook View</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  cookBadge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 15,
  },
  cookBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  becomeCookButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  becomeCookText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    fontSize: 20,
    width: 30,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  arrow: {
    fontSize: 20,
    color: '#ccc',
  },
  switchView: {
    backgroundColor: '#f0f8ff',
  },
  logoutButton: {
    margin: 20,
    padding: 15,
    backgroundColor: '#e74c3c',
    borderRadius: 5,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;