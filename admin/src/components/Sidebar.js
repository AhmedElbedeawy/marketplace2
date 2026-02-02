import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  Restaurant as CooksIcon,
  ShoppingCart as OrdersIcon,
  Category as CategoriesIcon,
  LocalOffer as CampaignsIcon,
} from '@mui/icons-material';

const Sidebar = ({ open, onClose }) => {
  const navigate = useNavigate();
  
  const menuItems = [
    { id: 'dashboard', text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { id: 'users', text: 'Users', icon: <UsersIcon />, path: '/users' },
    { id: 'products', text: 'Products', icon: <ProductsIcon />, path: '/products' },
    { id: 'cooks', text: 'Cooks', icon: <CooksIcon />, path: '/cooks' },
    { id: 'orders', text: 'Orders', icon: <OrdersIcon />, path: '/orders' },
    { id: 'categories', text: 'Categories', icon: <CategoriesIcon />, path: '/categories' },
    { id: 'campaigns', text: 'Campaigns', icon: <CampaignsIcon />, path: '/campaigns' },
  ];

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

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
              onClick={() => handleNavigate(item.path)}
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
