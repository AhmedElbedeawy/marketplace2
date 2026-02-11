import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Typography,
  Divider,
  Tooltip,
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
  Warning as IssuesIcon,
  Notifications as BroadcastIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
} from '@mui/icons-material';

const drawerWidth = 240;
const drawerWidthCollapsed = 72;

const PersistentSidebar = ({ collapsed = false, onCollapseToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'dashboard', text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { id: 'users', text: 'Users', icon: <UsersIcon />, path: '/users' },
    { id: 'products', text: 'Products', icon: <ProductsIcon />, path: '/products' },
    { id: 'cooks', text: 'Cooks', icon: <CooksIcon />, path: '/cooks' },
    { id: 'orders', text: 'Orders', icon: <OrdersIcon />, path: '/orders' },
    { id: 'categories', text: 'Categories', icon: <CategoriesIcon />, path: '/categories' },
    { id: 'campaigns', text: 'Campaigns', icon: <CampaignsIcon />, path: '/campaigns' },
    { id: 'issues', text: 'Resolutions', icon: <IssuesIcon />, path: '/issues' },
    { id: 'broadcast', text: 'Broadcast', icon: <BroadcastIcon />, path: '/broadcast' },
    { id: 'settings', text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const handleToggle = () => {
    if (onCollapseToggle) {
      onCollapseToggle(!collapsed);
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? drawerWidthCollapsed : drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: collapsed ? drawerWidthCollapsed : drawerWidth,
          boxSizing: 'border-box',
          transition: 'width 0.3s',
          borderRight: '1px solid #e2e8f0',
          backgroundColor: '#fff',
          marginTop: '52px', // Header height
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Logo/Brand Section */}
        <Box
          sx={{
            px: 3,
            py: 1.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
          }}
        >
          {!collapsed && (
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2', fontSize: '15px', pl: 0 }}>
              Marketplace
            </Typography>
          )}
          <IconButton onClick={handleToggle} size="small">
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        </Box>

        <Divider />

        {/* Menu Items */}
        <List sx={{ flex: 1, pt: 0.5, px: 1 }}>
          {menuItems.map((item) => (
            <Tooltip
              key={item.id}
              title={collapsed ? item.text : ''}
              placement="right"
              arrow
            >
              <ListItem disablePadding sx={{ mb: 0.25 }}>
                <ListItemButton
                  onClick={() => handleNavigate(item.path)}
                  selected={isActive(item.path)}
                  sx={{
                    mx: 0,
                    borderRadius: '6px',
                    py: 1,
                    px: collapsed ? 1.5 : 1.5,
                    minHeight: '40px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    '&.Mui-selected': {
                      backgroundColor: '#e3f2fd',
                      '&:hover': {
                        backgroundColor: '#bbdefb',
                      },
                      '& .MuiListItemIcon-root': {
                        color: '#1976d2',
                      },
                      '& .MuiListItemText-primary': {
                        fontWeight: 600,
                        color: '#1976d2',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 0 : 36,
                      justifyContent: 'center',
                      color: isActive(item.path) ? '#1976d2' : '#64748b',
                    }}
                  >
                    {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontSize: '13px',
                        fontWeight: isActive(item.path) ? 600 : 400,
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            </Tooltip>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default PersistentSidebar;
