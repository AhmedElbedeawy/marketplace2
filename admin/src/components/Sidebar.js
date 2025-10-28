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
  People as UsersIcon,
  Fastfood as ProductsIcon,
  ShoppingCart as OrdersIcon,
  Category as CategoriesIcon,
  BarChart as AnalyticsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

const Sidebar = ({ open, onClose, onNavigate }) => {
  const menuItems = [
    { id: 'dashboard', text: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'users', text: 'Users', icon: <UsersIcon /> },
    { id: 'products', text: 'Products', icon: <ProductsIcon /> },
    { id: 'orders', text: 'Orders', icon: <OrdersIcon /> },
    { id: 'categories', text: 'Categories', icon: <CategoriesIcon /> },
    { id: 'analytics', text: 'Analytics', icon: <AnalyticsIcon /> },
    { id: 'settings', text: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <div style={{ width: 250, padding: 20 }}>
        <Typography variant="h6" style={{ marginBottom: 20 }}>
          Admin Panel
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