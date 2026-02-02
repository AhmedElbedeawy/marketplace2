import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Button,
} from '@mui/material';
import {
  Home as HomeIcon,
  ShoppingBag as OrdersIcon,
  Favorite as FavoriteIcon,
  Message as MessageIcon,
  Person as ProfileIcon,
  Restaurant as RestaurantIcon,
  SwapHoriz as SwitchIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const FoodieSidebar = ({ open, onClose, onViewSwitch, isMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, isRTL, language } = useLanguage();

  const menuItems = [
    { 
      text: language === 'ar' ? 'الرئيسية' : 'Home', 
      icon: <HomeIcon />, 
      path: '/foodie/home' 
    },
    { 
      text: language === 'ar' ? 'طلباتي' : 'My Orders', 
      icon: <OrdersIcon />, 
      path: '/foodie/orders' 
    },
    { 
      text: language === 'ar' ? 'المفضلة' : 'Favorites', 
      icon: <FavoriteIcon />, 
      path: '/foodie/favorites' 
    },
    { 
      text: language === 'ar' ? 'مركز الرسائل' : 'Message Center', 
      icon: <MessageIcon />, 
      path: '/foodie/messages' 
    },
    { 
      text: language === 'ar' ? 'الحساب' : 'Account',
      icon: <ProfileIcon />, 
      path: '/foodie/profile' 
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const drawerContent = (
    <Box
      sx={{
        width: 250,
        height: '100%',
        bgcolor: '#2C2C2C',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo & Title */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <RestaurantIcon sx={{ fontSize: 28, color: '#FF7A00' }} />
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 'bold', 
              color: 'white',
              fontFamily: '"Inter", sans-serif',
            }}
          >
            {language === 'ar' ? 'فودي' : 'Foodie'}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Menu Items */}
      <List sx={{ flexGrow: 1, px: 2, py: 2 }}>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.path}
            onClick={() => handleNavigation(item.path)}
            sx={{
              borderRadius: '8px',
              mb: 1,
              bgcolor: location.pathname === item.path ? '#FF7A00' : 'transparent',
              '&:hover': {
                bgcolor: location.pathname === item.path ? '#FF9933' : 'rgba(255, 255, 255, 0.05)',
              },
              flexDirection: isRTL ? 'row-reverse' : 'row',
            }}
          >
            <ListItemIcon
              sx={{
                color: location.pathname === item.path ? 'white' : '#9CA3AF',
                minWidth: isRTL ? 'auto' : 40,
                ml: isRTL ? 2 : 0,
                mr: isRTL ? 0 : 0,
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              sx={{
                '& .MuiListItemText-primary': {
                  fontWeight: location.pathname === item.path ? 600 : 400,
                  textAlign: isRTL ? 'right' : 'left',
                },
              }}
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Switch to Cook Hub Button */}
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<SwitchIcon />}
          onClick={onViewSwitch}
          sx={{
            borderColor: '#FF7A00',
            color: '#FF7A00',
            fontWeight: 600,
            borderRadius: '8px',
            textTransform: 'none',
            py: 1,
            '&:hover': {
              borderColor: '#FF9933',
              bgcolor: 'rgba(255, 122, 0, 0.1)',
            },
          }}
        >
          {language === 'ar' ? 'التبديل إلى Cook Hub' : 'Switch to Cook Hub'}
        </Button>
      </Box>

      <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Footer */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
          © 2025 {language === 'ar' ? 'فودي' : 'Foodie'}
        </Typography>
      </Box>
    </Box>
  );

  // Always use temporary drawer (burger menu)
  return (
    <Drawer
      anchor={isRTL ? 'right' : 'left'}
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default FoodieSidebar;
