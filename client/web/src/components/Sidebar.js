import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Fastfood as FoodIcon,
  ShoppingCart as OrdersIcon,
  Reviews as ReviewsIcon,
  BarChart as AnalyticsIcon,
  Settings as SettingsIcon,
  People as CustomersIcon,
  Favorite as FavoritesIcon,
} from '@mui/icons-material';

const Sidebar = ({ open, onClose, onNavigate }) => {
  const menuItems = [
    { id: 'dashboard', text: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'products', text: 'My Products', icon: <FoodIcon /> },
    { id: 'orders', text: 'Order Management', icon: <OrdersIcon /> },
    { id: 'customers', text: 'My Customers', icon: <CustomersIcon /> },
    { id: 'reviews', text: 'Reviews', icon: <ReviewsIcon /> },
    { id: 'favorites', text: 'Favorites Analytics', icon: <FavoritesIcon /> },
    { id: 'analytics', text: 'Analytics', icon: <AnalyticsIcon /> },
    { id: 'settings', text: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <div style={{ width: 250, padding: 20 }}>
        <Typography variant="h6" style={{ marginBottom: 20 }}>
          Cook Dashboard
        </Typography>
        <Divider />
        <List>
          {menuItems.map((item) => (
            <ListItem 
              button 
              key={item.id} 
              onClick={() => onNavigate(item.id)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </div>
    </Drawer>
  );
};

export default Sidebar;