import React, { useState, useEffect } from 'react';
import { Box, Button, Menu, MenuItem, Badge, Snackbar, Alert, IconButton } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useCountry } from '../contexts/CountryContext';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';
import api from '../utils/api';

const FoodieHeader = ({ onViewSwitch }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, isRTL, toggleLanguage } = useLanguage();
  const { countryCode, updateCountry, countryName: activeCountryName, cart } = useCountry();
  const { showNotification } = useNotification();
  const [profileAnchorEl, setProfileAnchorEl] = React.useState(null);
  const [countryAnchorEl, setCountryAnchorEl] = React.useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Fetch notification count
  useEffect(() => {
    const fetchNotificationCount = async () => {
      if (isLoggedIn) {
        try {
          const response = await api.get('/notifications', { params: { unreadOnly: true } });
          setUnreadNotifications(response.data.data.unreadCount || 0);
        } catch (err) {
          console.error('Failed to fetch notification count:', err);
        }
      }
    };
    
    fetchNotificationCount();
    // Refresh notification count periodically
    const interval = setInterval(fetchNotificationCount, 60000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    };
    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Badge count is derived from context cart
  const cartItemsCount = cart.length;

  const profileMenuItems = [
    { label: language === 'ar' ? 'الحساب' : 'Account', path: '/foodie/profile' },
    { label: language === 'ar' ? 'طلباتي' : 'My Orders', path: '/foodie/orders' },
    { label: language === 'ar' ? 'المفضلة' : 'Favorites', path: '/foodie/favorites' },
  ];

  const countryOptions = [
    { name: 'Saudi Arabia', code: 'SA', icon: 'Saudi Arabia.png' },
    { name: 'Egypt', code: 'EG', icon: 'Egypt.png' },
    { name: 'Emirates', code: 'AE', icon: 'Emirates.png' },
    { name: 'Kuwait', code: 'KW', icon: 'Kuwait.png' },
    { name: 'Qatar', code: 'QA', icon: 'Qatar.png' },
  ];

  const handleProfileMenuOpen = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };

  const handleCountryMenuOpen = (event) => {
    setCountryAnchorEl(event.currentTarget);
  };

  const handleCountryMenuClose = () => {
    setCountryAnchorEl(null);
  };

  const handleCountrySelect = (code) => {
    const target = countryOptions.find(c => c.code === code);
    if (code !== countryCode) {
      updateCountry(code);
      
      // Only show notification on Cart page
      if (location.pathname === '/foodie/cart') {
        showNotification(language === 'ar' ? `تم الانتقال إلى سلة ${target.name}` : `Switched to ${target.name} cart`, 'info');
      }
    }
    handleCountryMenuClose();
  };

  const handleProfileItemClick = (path) => {
    navigate(path);
    handleProfileMenuClose();
  };

  const handleDemoLogin = async () => {
    try {
      const response = await axios.post('http://localhost:5005/api/auth/demo-login', {
        role: 'cook' // Changed from 'foodie' to 'cook' to allow Cook Hub access
      });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setIsLoggedIn(true);
      window.dispatchEvent(new Event('storage'));
      showNotification(language === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Logged in successfully!', 'success');
    } catch (err) {
      showNotification(language === 'ar' ? 'فشل تسجيل الدخول' : 'Demo login failed', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    handleProfileMenuClose();
    window.dispatchEvent(new Event('storage'));
    navigate('/foodie/home');
  };

  const isProfileMenuOpen = Boolean(profileAnchorEl);
  const isCountryMenuOpen = Boolean(countryAnchorEl);

  return (
    <Box
      sx={{
        bgcolor: '#FFFFFF',
        height: '106px', // Increased from 96px to accommodate 10px bottom padding
        boxSizing: 'border-box',
        pt: 0,
        pb: '10px',
        pl: '52px',
        pr: '52px',
        display: 'flex',
        alignItems: 'center',
        gap: 0, // Removed gap to allow precise positioning via pl/pr/ml/mr
        direction: isRTL ? 'rtl' : 'ltr',
        width: '100%',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Logo */}
      <Box
        component="img"
        src="/assets/images/T Logo.png"
        alt="Logo"
        sx={{
          width: 'calc(13.2vw * 1.0)', // Increased from 0.7
          maxHeight: '91px', // Adjusted to 106px - 15px (7.5px top + 7.5px bottom)
          height: 'auto',
          objectFit: 'contain',
          objectPosition: 'center',
          flexShrink: 0,
          alignSelf: 'flex-start', // Align to top to precisely control padding
          mt: '7.5px', // Exact upper padding as requested
          mb: '-2.5px', // Overlay the 10px header padding by 2.5px to leave 7.5px space at the bottom
          ml: 0,
          mr: 0,
        }}
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />

      {/* Navigation Buttons */}
      <Box
        sx={{
          display: 'flex',
          gap: 0,
          ml: isRTL ? 'auto' : 0,
          mr: isRTL ? 0 : 'auto',
          pl: isRTL ? 0 : `calc(35vw - calc(13.2vw * 1.0) - 52px - 16px)`,
          pr: isRTL ? `calc(35vw - calc(13.2vw * 1.0) - 52px - 16px)` : 0,
          alignItems: 'center',
        }}
      >
        {language === 'ar' ? (
          <>
            <Button onClick={() => navigate('/foodie/home')} sx={{ color: location.pathname === '/foodie/home' ? '#FFFFFF' : '#6B6B6B', fontSize: '20px', fontFamily: 'Inter', px: 2, py: 1, borderRadius: location.pathname === '/foodie/home' ? '5px' : 'none', bgcolor: location.pathname === '/foodie/home' ? '#2C2C2C' : 'transparent', height: location.pathname === '/foodie/home' ? '40px' : 'auto' }}>الرئيسية</Button>
            <Button onClick={() => navigate('/foodie/menu')} sx={{ color: location.pathname === '/foodie/menu' ? '#FFFFFF' : '#6B6B6B', fontSize: '20px', fontFamily: 'Inter', px: 2, py: 1, borderRadius: location.pathname === '/foodie/menu' ? '5px' : 'none', bgcolor: location.pathname === '/foodie/menu' ? '#2C2C2C' : 'transparent', height: location.pathname === '/foodie/menu' ? '40px' : 'auto' }}>المنيو</Button>
            <Button onClick={onViewSwitch} sx={{ color: location.pathname === '/cook-dashboard' ? '#FFFFFF' : '#6B6B6B', fontSize: '20px', fontFamily: 'Inter', px: 2, py: 1, borderRadius: location.pathname === '/cook-dashboard' ? '5px' : 'none', bgcolor: location.pathname === '/cook-dashboard' ? '#2C2C2C' : 'transparent', height: location.pathname === '/cook-dashboard' ? '40px' : 'auto' }}>إدارة المطبخ</Button>
            <Button onClick={() => navigate('/foodie/messages')} sx={{ color: location.pathname === '/foodie/messages' ? '#FFFFFF' : '#6B6B6B', fontSize: '20px', fontFamily: 'Inter', px: 2, py: 1, borderRadius: location.pathname === '/foodie/messages' ? '5px' : 'none', bgcolor: location.pathname === '/foodie/messages' ? '#2C2C2C' : 'transparent', height: location.pathname === '/foodie/messages' ? '40px' : 'auto' }}>الرسائل</Button>
            <Button onClick={() => navigate('/foodie/about')} sx={{ color: location.pathname === '/foodie/about' ? '#FFFFFF' : '#6B6B6B', fontSize: '20px', fontFamily: 'Inter', px: 2, py: 1, borderRadius: location.pathname === '/foodie/about' ? '5px' : 'none', bgcolor: location.pathname === '/foodie/about' ? '#2C2C2C' : 'transparent', height: location.pathname === '/foodie/about' ? '40px' : 'auto' }}>من نحن</Button>
          </>
        ) : (
          <>
            <Button onClick={() => navigate('/foodie/home')} sx={{ color: location.pathname === '/foodie/home' ? '#FFFFFF' : '#6B6B6B', fontSize: '18px', fontFamily: 'Inter', px: 2, py: 1, borderRadius: location.pathname === '/foodie/home' ? '5px' : 'none', bgcolor: location.pathname === '/foodie/home' ? '#2C2C2C' : 'transparent', height: location.pathname === '/foodie/home' ? '38px' : 'auto' }}>Home</Button>
            <Button onClick={() => navigate('/foodie/menu')} sx={{ color: location.pathname === '/foodie/menu' ? '#FFFFFF' : '#6B6B6B', fontSize: '18px', fontFamily: 'Inter', px: 2, py: 1, borderRadius: location.pathname === '/foodie/menu' ? '5px' : 'none', bgcolor: location.pathname === '/foodie/menu' ? '#2C2C2C' : 'transparent', height: location.pathname === '/foodie/menu' ? '38px' : 'auto' }}>Menu</Button>
            <Button onClick={onViewSwitch} sx={{ color: location.pathname === '/cook-dashboard' ? '#FFFFFF' : '#6B6B6B', fontSize: '18px', fontFamily: 'Inter', px: 2, py: 1, borderRadius: location.pathname === '/cook-dashboard' ? '5px' : 'none', bgcolor: location.pathname === '/cook-dashboard' ? '#2C2C2C' : 'transparent', height: location.pathname === '/cook-dashboard' ? '38px' : 'auto' }}>Cook Hub</Button>
            <Button onClick={() => navigate('/foodie/messages')} sx={{ color: location.pathname === '/foodie/messages' ? '#FFFFFF' : '#6B6B6B', fontSize: '18px', fontFamily: 'Inter', px: 2, py: 1, borderRadius: location.pathname === '/foodie/messages' ? '5px' : 'none', bgcolor: location.pathname === '/foodie/messages' ? '#2C2C2C' : 'transparent', height: location.pathname === '/foodie/messages' ? '38px' : 'auto' }}>Messages</Button>
            <Button onClick={() => navigate('/foodie/about')} sx={{ color: location.pathname === '/foodie/about' ? '#FFFFFF' : '#6B6B6B', fontSize: '18px', fontFamily: 'Inter', px: 2, py: 1, borderRadius: location.pathname === '/foodie/about' ? '5px' : 'none', bgcolor: location.pathname === '/foodie/about' ? '#2C2C2C' : 'transparent', height: location.pathname === '/foodie/about' ? '38px' : 'auto' }}>About Us</Button>
          </>
        )}
      </Box>

      {/* Right Side Icons */}
      <Box
        sx={{
          ml: isRTL ? 0 : 'auto',
          mr: isRTL ? 'auto' : 0,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {language === 'ar' ? (
          <>
            <Button onClick={toggleLanguage} sx={{ minWidth: 'auto', p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px', width: 'auto' }}>
              <Box component="img" src="/assets/icons/English.png" alt="English" sx={{ height: '28px', width: 'auto', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
            </Button>
            <Button onClick={handleCountryMenuOpen} sx={{ minWidth: 'auto', p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px', width: '28px' }}>
              <Box component="img" src={`/assets/icons/${activeCountryName}.png`} alt={activeCountryName} sx={{ height: '28px', width: '28px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
            </Button>
            {isLoggedIn ? (
              <>
                <IconButton
                  onClick={() => navigate('/foodie/notifications')}
                  sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px', width: '28px' }}
                >
                  <Badge
                    badgeContent={unreadNotifications}
                    invisible={unreadNotifications === 0}
                    sx={{
                      '& .MuiBadge-badge': {
                        backgroundColor: '#FF7A00',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 600,
                        minWidth: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        padding: '0 3px',
                        top: '0',
                        right: '0',
                        border: '2px solid #FFFFFF',
                        zIndex: 1
                      }
                    }}
                  >
                    <NotificationsIcon sx={{ color: '#6B6B6B', fontSize: '24px' }} />
                  </Badge>
                </IconButton>
                <Button onClick={handleProfileMenuOpen} sx={{ minWidth: 'auto', p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px', width: '28px' }}>
                  <Box component="img" src="/assets/icons/Profile.png" alt="Profile" sx={{ height: '28px', width: '28px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleDemoLogin}
                sx={{ 
                  bgcolor: '#FF7A00',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  px: 2,
                  py: 0.5,
                  borderRadius: '8px',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#E56A00' }
                }}
              >
                {language === 'ar' ? 'تسجيل دخول' : 'Demo Login'}
              </Button>
            )}
            <Button 
              onClick={() => navigate('/foodie/cart')} 
              sx={{ 
                minWidth: 'auto', 
                p: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '28px', 
                width: '28px',
                position: 'relative'
              }}
            >
              <Badge 
                badgeContent={cartItemsCount} 
                invisible={cartItemsCount === 0}
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: '#FF7A00',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 600,
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    padding: '0 4px',
                    top: '-2px',
                    right: '-2px',
                    border: '2px solid #FFFFFF',
                    zIndex: 1
                  }
                }}
              >
                <Box component="img" src="/assets/icons/Cart.png" alt="Cart" sx={{ height: '28px', width: '28px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
              </Badge>
            </Button>
          </>
        ) : (
          <>
            <Button onClick={toggleLanguage} sx={{ minWidth: 'auto', p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px', width: 'auto' }}>
              <Box component="img" src="/assets/icons/Arabic.png" alt="Arabic" sx={{ height: '28px', width: 'auto', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
            </Button>
            <Button onClick={handleCountryMenuOpen} sx={{ minWidth: 'auto', p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px', width: '28px' }}>
              <Box component="img" src={`/assets/icons/${activeCountryName}.png`} alt={activeCountryName} sx={{ height: '28px', width: '28px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
            </Button>
            {isLoggedIn ? (
              <>
                <IconButton
                  onClick={() => navigate('/foodie/notifications')}
                  sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px', width: '28px' }}
                >
                  <Badge
                    badgeContent={unreadNotifications}
                    invisible={unreadNotifications === 0}
                    sx={{
                      '& .MuiBadge-badge': {
                        backgroundColor: '#FF7A00',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 600,
                        minWidth: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        padding: '0 3px',
                        top: '0',
                        right: '0',
                        border: '2px solid #FFFFFF',
                        zIndex: 1
                      }
                    }}
                  >
                    <NotificationsIcon sx={{ color: '#6B6B6B', fontSize: '24px' }} />
                  </Badge>
                </IconButton>
                <Button onClick={handleProfileMenuOpen} sx={{ minWidth: 'auto', p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px', width: '28px' }}>
                  <Box component="img" src="/assets/icons/Profile.png" alt="Profile" sx={{ height: '28px', width: '28px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleDemoLogin}
                sx={{ 
                  bgcolor: '#FF7A00',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  px: 2,
                  py: 0.5,
                  borderRadius: '8px',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#E56A00' }
                }}
              >
                {language === 'ar' ? 'تسجيل دخول' : 'Demo Login'}
              </Button>
            )}
            <Button 
              onClick={() => navigate('/foodie/cart')} 
              sx={{ 
                minWidth: 'auto', 
                p: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '28px', 
                width: '28px',
                position: 'relative'
              }}
            >
              <Badge 
                badgeContent={cartItemsCount} 
                invisible={cartItemsCount === 0}
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: '#FF7A00',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 600,
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    padding: '0 4px',
                    top: '-2px',
                    right: '-2px',
                    border: '2px solid #FFFFFF',
                    zIndex: 1
                  }
                }}
              >
                <Box component="img" src="/assets/icons/Cart.png" alt="Cart" sx={{ height: '28px', width: '28px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
              </Badge>
            </Button>
          </>
        )}
      </Box>

      {/* Country Menu */}
      <Menu
        anchorEl={countryAnchorEl}
        anchorOrigin={{ vertical: 'bottom', horizontal: isRTL ? 'left' : 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: isRTL ? 'left' : 'right' }}
        open={isCountryMenuOpen}
        onClose={handleCountryMenuClose}
      >
        {countryOptions.map((country) => (
          <MenuItem key={country.name} onClick={() => handleCountrySelect(country.code)} sx={{ direction: isRTL ? 'rtl' : 'ltr', color: '#2C2C2C', fontSize: '14px', display: 'flex', gap: 1 }}>
            <Box component="img" src={`/assets/icons/${country.icon}`} alt={country.name} sx={{ height: '20px', width: '20px', objectFit: 'contain' }} />
            {country.name}
          </MenuItem>
        ))}
      </Menu>

      {/* Profile Menu */}
      <Menu
        anchorEl={profileAnchorEl}
        anchorOrigin={{ vertical: 'bottom', horizontal: isRTL ? 'left' : 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: isRTL ? 'left' : 'right' }}
        open={isProfileMenuOpen}
        onClose={handleProfileMenuClose}
      >
        {profileMenuItems.map((item) => (
          <MenuItem key={item.path} onClick={() => handleProfileItemClick(item.path)} sx={{ direction: isRTL ? 'rtl' : 'ltr', color: '#2C2C2C', fontSize: '20px' }}>
            {item.label}
          </MenuItem>
        ))}
        <MenuItem 
          onClick={handleLogout} 
          sx={{ 
            direction: isRTL ? 'rtl' : 'ltr', 
            color: '#FF4444', 
            fontSize: '20px',
            borderTop: '1px solid #E5E7EB',
            mt: 1
          }}
        >
          {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default FoodieHeader;
