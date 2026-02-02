import React from 'react';
import {
  Toolbar,
  Typography,
  IconButton,
  Badge,
  MenuItem,
  Menu,
  Box,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';

const Header = ({ onMenuClick, isMobile }) => {
  const { t, isRTL } = useLanguage();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = React.useState(null);
  
  const isMenuOpen = Boolean(anchorEl);
  const isNotificationMenuOpen = Boolean(notificationAnchorEl);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationMenuOpen = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchorEl(null);
  };

  const menuId = 'primary-search-account-menu';
  const notificationMenuId = 'primary-notification-menu';

  return (
    <Box
      sx={{ 
        bgcolor: 'transparent',
        color: 'black',
        width: '100%',
      }}
    >
      <Toolbar sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        minHeight: '60px !important',
        height: '60px',
        px: { xs: 2, md: 3 },
      }}>
        {isRTL ? (
          // RTL Layout
          <>
            {/* Right Side - Notifications and Profile */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="large"
                aria-label="show notifications"
                color="inherit"
                onClick={handleNotificationMenuOpen}
                sx={{ color: 'black' }}
              >
                <Badge badgeContent={3} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
              
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls={menuId}
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
                sx={{ color: 'black' }}
              >
                <AccountCircle />
              </IconButton>
            </Box>
            
            {/* Left Side - Page Title and Menu (mobile only) */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography
                variant="h6"
                component="div"
                sx={{ 
                  fontWeight: 600,
                  color: '#2C2C2C',
                  fontSize: '1.25rem',
                  fontFamily: '"Inter", sans-serif',
                }}
              >
                {/* Page title will be set dynamically by each page */}
              </Typography>
              {isMobile && (
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  onClick={onMenuClick}
                  sx={{ color: 'black' }}
                >
                  <MenuIcon />
                </IconButton>
              )}
            </Box>
          </>
        ) : (
          // LTR Layout
          <>
            {/* Left Side - Menu (mobile only) and Page Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isMobile && (
                <IconButton
                  edge="start"
                  color="inherit"
                  aria-label="open drawer"
                  onClick={onMenuClick}
                  sx={{ color: 'black' }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Typography
                variant="h6"
                component="div"
                sx={{ 
                  fontWeight: 600,
                  color: '#2C2C2C',
                  fontSize: '1.25rem',
                  fontFamily: '"Inter", sans-serif',
                }}
              >
                {/* Page title will be set dynamically by each page */}
              </Typography>
            </Box>
            
            {/* Right Side - Notifications and Profile */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="large"
                aria-label="show notifications"
                color="inherit"
                onClick={handleNotificationMenuOpen}
                sx={{ color: 'black' }}
              >
                <Badge badgeContent={3} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
              
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls={menuId}
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
                sx={{ color: 'black' }}
              >
                <AccountCircle />
              </IconButton>
            </Box>
          </>
        )}
      </Toolbar>
      
      <Menu
        anchorEl={notificationAnchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: isRTL ? 'left' : 'right',
        }}
        id={notificationMenuId}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: isRTL ? 'left' : 'right',
        }}
        open={isNotificationMenuOpen}
        onClose={handleNotificationMenuClose}
      >
        <MenuItem sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>
          <Typography variant="subtitle1">{t('notifications.newOrder')}</Typography>
        </MenuItem>
        <MenuItem sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>
          <Typography variant="subtitle1">{t('notifications.productReview')}</Typography>
        </MenuItem>
        <MenuItem sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>
          <Typography variant="subtitle1">{t('notifications.readyForPickup')}</Typography>
        </MenuItem>
      </Menu>
      
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: isRTL ? 'left' : 'right',
        }}
        id={menuId}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: isRTL ? 'left' : 'right',
        }}
        open={isMenuOpen}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose} sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>{t('profile.profile')}</MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>{t('profile.myAccount')}</MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>{t('profile.logout')}</MenuItem>
      </Menu>
    </Box>
  );
};

export default Header;