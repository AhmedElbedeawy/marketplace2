import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Divider,
  Typography,
  Tooltip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as UsersIcon,
  Fastfood as ProductsIcon,
  Restaurant as CooksIcon,
  ShoppingCart as OrdersIcon,
  Category as CategoriesIcon,
  LocalOffer as CampaignsIcon,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';

const DRAWER_WIDTH = 240;
const DRAWER_WIDTH_COLLAPSED = 72;

const NewSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  
  const menuItems = [
    { id: 'dashboard', text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { id: 'users', text: 'Users', icon: <UsersIcon />, path: '/users' },
    { id: 'products', text: 'Products', icon: <ProductsIcon />, path: '/products' },
    { id: 'cooks', text: 'Cooks', icon: <CooksIcon />, path: '/cooks' },
    { id: 'orders', text: 'Orders', icon: <OrdersIcon />, path: '/orders' },
    { id: 'categories', text: 'Categories', icon: <CategoriesIcon />, path: '/categories' },
    { id: 'campaigns', text: 'Campaigns', icon: <CampaignsIcon />, path: '/campaigns' },
    { id: 'settings', text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid #e0e0e0',
          backgroundColor: '#fff',
          transition: 'width 0.2s ease',
          overflowX: 'hidden'
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, minHeight: 56 }}>
        {!collapsed && (
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#FF7A00' }}>
            Admin
          </Typography>
        )}
        <IconButton onClick={() => setCollapsed(!collapsed)} size="small">
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Box>
      <Divider />
      <List sx={{ px: 1, py: 2 }}>
        {menuItems.map((item) => (
          <Tooltip key={item.id} title={collapsed ? item.text : ''} placement="right">
            <ListItem 
              button 
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                backgroundColor: isActive(item.path) ? '#FFF5EC' : 'transparent',
                '&:hover': {
                  backgroundColor: isActive(item.path) ? '#FFF5EC' : '#f5f5f5'
                }
              }}
            >
              <ListItemIcon sx={{ 
                minWidth: collapsed ? 'auto' : 40,
                color: isActive(item.path) ? '#FF7A00' : '#666'
              }}>
                {item.icon}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive(item.path) ? 600 : 400,
                    color: isActive(item.path) ? '#FF7A00' : '#333'
                  }}
                />
              )}
            </ListItem>
          </Tooltip>
        ))}
      </List>
    </Drawer>
  );
};

export default NewSidebar;
