import React from 'react';
import {
  Box,
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
  Campaign as MarketingIcon,
  Restaurant as RestaurantIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const Sidebar = ({ open, onClose, onViewSwitch, isMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, isRTL, language } = useLanguage();
  
  const isDemoMode = location.state?.isDemoMode || false;
  
  const menuItems = [
    { id: 'overview', textKey: 'overview', icon: <DashboardIcon />, path: '/cook-dashboard' },
    { id: 'orders', textKey: 'orders', icon: <OrdersIcon />, path: '/orders' },
    { id: 'menu', textKey: 'menu', icon: <FoodIcon />, path: '/menu' },
    { id: 'marketing', textKey: 'marketing', icon: <MarketingIcon />, path: '/marketing' },
    { id: 'invoices', textKey: 'invoices', icon: <ReceiptIcon />, path: '/invoices' },
  ];

  const handleNavigation = (path) => {
    navigate(path, { state: { isDemoMode } });
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  // For mobile: render drawer-like behavior
  if (isMobile) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: 250,
          height: '100vh',
          bgcolor: '#E5DEDD',
          zIndex: 1200,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          overflowY: 'auto',
          direction: isRTL ? 'rtl' : 'ltr',
        }}
      >
        <SidebarContent menuItems={menuItems} isActiveRoute={isActiveRoute} handleNavigation={handleNavigation} isRTL={isRTL} />
      </Box>
    );
  }

  // For desktop: render sticky Box-based sidebar
  return (
    <Box
      sx={{
        width: '22%',
        position: 'sticky',
        top: 0,
        height: '100vh',
        bgcolor: '#E5DEDD',
        overflowY: 'auto',
        overflowX: 'hidden',
        borderRight: 'none',
        boxShadow: 'none',
        direction: isRTL ? 'rtl' : 'ltr',
        flexShrink: 0,
      }}
    >
      <SidebarContent menuItems={menuItems} isActiveRoute={isActiveRoute} handleNavigation={handleNavigation} isRTL={isRTL} />
    </Box>
  );
};

const SidebarContent = ({ menuItems, isActiveRoute, handleNavigation, isRTL }) => {
  const { t } = useLanguage();

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'auto',
    }}>
      {/* Top Section */}
      <Box sx={{
        p: 3,
        textAlign: isRTL ? 'right' : 'left',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <RestaurantIcon sx={{ fontSize: 28, color: '#FF7A00' }} />
          <Typography
            variant="h5"
            sx={{
              fontWeight: 'bold',
              color: '#2C2C2C',
              fontFamily: '"Inter", sans-serif',
            }}
          >
            {t('cookHub')}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: '#666666',
            mt: 1,
            fontSize: '0.9rem',
            fontWeight: 400,
            textAlign: isRTL ? 'right' : 'left',
            fontFamily: '"Inter", sans-serif',
            lineHeight: 1.4,
          }}
        >
          {t('manageYourHomeKitchen') || (isRTL ? 'إدارة مطبخك المنزلي' : 'Manage your home kitchen')}
        </Typography>
      </Box>

      <Divider />

      {/* Menu Items */}
      <List sx={{ flexGrow: 1, px: 1, py: 1 }}>
        {menuItems.map((item) => {
          const isActive = isActiveRoute(item.path);
          return (
            <ListItem
              button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              sx={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                borderRadius: '8px',
                mb: 0.5,
                px: 2.5,
                py: 1.75,
                bgcolor: isActive ? '#FFEDE0' : 'transparent',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: isActive ? '#FFEDE0' : '#F3F4F6',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: isRTL ? 'auto' : 40,
                  ml: isRTL ? 1 : 0,
                  mr: isRTL ? 0 : 1,
                  color: isActive ? '#FF7A00' : '#2C2C2C',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={t(item.textKey)}
                sx={{
                  textAlign: isRTL ? 'right' : 'left',
                  '& .MuiTypography-root': {
                    fontSize: '1rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#FF7A00' : '#2C2C2C',
                    fontFamily: '"Inter", sans-serif',
                  }
                }}
              />
            </ListItem>
          );
        })}
      </List>

      <Divider />
    </Box>
  );
};

export default Sidebar;
