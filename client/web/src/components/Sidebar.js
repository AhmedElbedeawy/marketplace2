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
  Dashboard as DashboardIcon,
  Fastfood as FoodIcon,
  ShoppingCart as OrdersIcon,
  Message as MessageIcon,
  Campaign as MarketingIcon,
  SwapHoriz as SwapIcon,
  Language as LanguageIcon,
  AccountCircle,
  Logout as LogoutIcon,
  Restaurant as RestaurantIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const Sidebar = ({ open, onClose, onViewSwitch, isMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, isRTL, language, toggleLanguage } = useLanguage();
  
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
    if (isMobile) {
      onClose();
    }
  };

  const handleSwitchView = () => {
    if (onViewSwitch) {
      onViewSwitch();
    }
    if (isMobile) {
      onClose();
    }
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  return (
    <Drawer 
      anchor={isRTL ? "right" : "left"} 
      open={isMobile ? open : true}
      onClose={onClose}
      variant={isMobile ? "temporary" : "permanent"}
      sx={{
        width: isMobile ? 250 : '22%',
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: isMobile ? 250 : '22%',
          boxSizing: 'border-box',
          bgcolor: '#E5DEDD',
          boxShadow: 'none',
          border: 'none',
          height: 'calc(100vh - 106px)',
          position: 'fixed',
          top: '106px',
          left: isRTL ? 'auto' : 0,
          right: isRTL ? 0 : 'auto',
          overflowY: 'auto',
          overflowX: 'hidden',
          zIndex: isMobile ? 1200 : 10,
        },
      }}
      ModalProps={{
        keepMounted: true,
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        overflow: 'auto',
      }}>
        {/* Top Section - restored and aligned with dashboard content */}
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
            {isRTL ? 'إدارة مطبخك المنزلي' : 'Manage your home kitchen'}
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

        {/* Bottom Section - Removed 'Switch to Foodie View' button */}
        {/* Navigation between views now handled by FoodieHeader */}

        <Divider />

        {/* Bottom Section - Logout option removed */}
      </Box>
    </Drawer>
  );
};

export default Sidebar;
