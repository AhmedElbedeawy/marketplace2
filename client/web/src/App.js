import React, { useState } from 'react'; // Save Test
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { 
  Box, 
  CssBaseline, 
  useMediaQuery, 
  useTheme,
  IconButton,
  Badge,
  Menu as MuiMenu,
  MenuItem,
  Typography,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Language as LanguageIcon,
  AccountCircle,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { CountryProvider } from './contexts/CountryContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Sidebar from './components/Sidebar';
import FoodieSidebar from './components/FoodieSidebar';
import FoodieHeader from './components/FoodieHeader';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import CookOrderDetails from './pages/CookOrderDetails';
import Customers from './pages/Customers';
import Reviews from './pages/Reviews';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Menu from './pages/Menu';
import MessageCenter from './pages/MessageCenter';
import Marketing from './pages/Marketing';
import CookInvoices from './pages/CookInvoices';
import FoodieHome from './pages/foodie/FoodieHome';
import Signup from './pages/foodie/Signup';
import FoodieOrders from './pages/foodie/FoodieOrders';
import FoodieFavorites from './pages/foodie/FoodieFavorites';
import FoodieSettings from './pages/foodie/FoodieSettings';
import FoodieMenu from './pages/foodie/FoodieMenu';
import FoodieAbout from './pages/foodie/FoodieAbout';
import FoodieCart from './pages/foodie/FoodieCart';
import CookRegistration from './pages/foodie/CookRegistration';
import CookStatusPage from './pages/foodie/CookStatusPage';
import SuspendedNoticePage from './pages/foodie/SuspendedNoticePage';
import FeaturedDishes from './pages/foodie/FeaturedDishes';
import TopRatedCooks from './pages/foodie/TopRatedCooks';
import DishDetail from './pages/foodie/DishDetail';
import SinglePageCheckout from './pages/foodie/SinglePageCheckout';
import FoodieOrderDetails from './pages/foodie/FoodieOrderDetails';
import Notifications from './pages/foodie/Notifications';
import Offers from './pages/foodie/Offers';
import CookAccountStatus from './pages/foodie/CookAccountStatus';
import AnnouncementDetails from './pages/foodie/AnnouncementDetails';
import LocationGate from './components/LocationGate';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import './App.css';

function AppContent() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isRTL, t, toggleLanguage, language } = useLanguage();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = React.useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const isMenuOpen = Boolean(anchorEl);
  const isNotificationMenuOpen = Boolean(notificationAnchorEl);
  
  // Determine if current view is Foodie or Cook
  const isFoodieView = location.pathname.startsWith('/foodie') || location.pathname === '/';

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
  
  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const handleViewSwitch = () => {
    if (isFoodieView) {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const status = user?.role_cook_status || 'none';

      if (status === 'active') {
        navigate('/cook-dashboard');
      } else if (status === 'pending') {
        navigate('/foodie/cook-status');
      } else if (status === 'suspended') {
        navigate('/foodie/suspended');
      } else {
        navigate('/foodie/cook-registration');
      }
    } else {
      navigate('/');
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      width: '100%',
      direction: isRTL ? 'rtl' : 'ltr',
      bgcolor: isFoodieView ? '#FFFFFF' : '#F5F5F5',
      p: 0,
    }}>
      <CssBaseline />
      <LocationGate />
      
      {/* Foodie Header Navigation (replaces burger menu) */}
      {isFoodieView && (
        <Box sx={{ bgcolor: '#FFFFFF', mb: 0, width: '100%', p: 0, m: 0 }}>
          <FoodieHeader onViewSwitch={handleViewSwitch} />
        </Box>
      )}
      
      {/* Cook Hub Header - Same as Foodie */}
      {!isFoodieView && (
        <Box sx={{ bgcolor: '#FFFFFF', mb: 0, width: '100%', p: 0, m: 0 }}>
          <FoodieHeader onViewSwitch={handleViewSwitch} />
        </Box>
      )}
      
      <Box sx={{ 
        display: 'flex', 
        flex: 1,
        bgcolor: isFoodieView ? '#FFFFFF' : '#F5F5F5',
      }}>
        {/* Sidebar - Cook Hub only */}
        {!isFoodieView && (
          <Sidebar 
            open={sidebarOpen} 
            onClose={() => setSidebarOpen(false)}
            onViewSwitch={handleViewSwitch}
            isMobile={isMobile}
          />
        )}
        
        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: '100%',
            minHeight: 0,
            bgcolor: isFoodieView ? '#FFFFFF' : '#F5F5F5',
            px: 0,
            py: 0,
            position: 'relative',
          }}
        >
          {/* Right Side Icons (Cook Hub only) - Notification, Language, Profile */}
          {/* Removed - Now handled by FoodieHeader */}

        <Routes>
          {/* Default redirect to Foodie */}
          <Route path="/" element={<FoodieHome />} />
          
          {/* Auth Routes - Standalone (no sidebar) */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Cook Hub Routes - Protected */}
          <Route path="/cook-dashboard" element={
            <ProtectedRoute requireCook={true}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/menu" element={
            <ProtectedRoute requireCook={true}>
              <Menu />
            </ProtectedRoute>
          } />
          <Route path="/products" element={
            <ProtectedRoute requireCook={true}>
              <Products />
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute requireCook={true}>
              <Orders />
            </ProtectedRoute>
          } />
          <Route path="/order-details/:orderId" element={
            <ProtectedRoute requireCook={true}>
              <CookOrderDetails />
            </ProtectedRoute>
          } />
          <Route path="/message-center" element={
            <ProtectedRoute>
              <MessageCenter />
            </ProtectedRoute>
          } />
          <Route path="/marketing" element={
            <ProtectedRoute requireCook={true}>
              <Marketing />
            </ProtectedRoute>
          } />
          <Route path="/invoices" element={
            <ProtectedRoute requireCook={true}>
              <CookInvoices />
            </ProtectedRoute>
          } />
          <Route path="/customers" element={
            <ProtectedRoute requireCook={true}>
              <Customers />
            </ProtectedRoute>
          } />
          <Route path="/reviews" element={
            <ProtectedRoute requireCook={true}>
              <Reviews />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute requireCook={true}>
              <Analytics />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute requireCook={true}>
              <Settings />
            </ProtectedRoute>
          } />
          
          {/* Foodie Routes */}
          <Route path="/foodie/home" element={<FoodieHome />} />
          <Route path="/foodie/cook-registration" element={<CookRegistration />} />
          <Route path="/foodie/cook-status" element={<CookStatusPage />} />
          <Route path="/foodie/suspended" element={<SuspendedNoticePage />} />
          <Route path="/foodie/orders" element={<FoodieOrders />} />
          <Route path="/foodie/order-details/:orderId" element={<FoodieOrderDetails />} />
          <Route path="/foodie/favorites" element={<FoodieFavorites />} />
          <Route path="/foodie/messages" element={<MessageCenter />} />
          <Route path="/foodie/menu" element={<FoodieMenu />} />
          <Route path="/foodie/about" element={<FoodieAbout />} />
          <Route path="/foodie/profile" element={<FoodieSettings />} />
          <Route path="/foodie/settings" element={<FoodieSettings />} />
          <Route path="/foodie/cart" element={<FoodieCart />} />
          <Route path="/foodie/featured-dishes" element={<FeaturedDishes />} />
          <Route path="/foodie/top-cooks" element={<TopRatedCooks />} />
          <Route path="/foodie/offer/:offerId" element={<DishDetail />} />
          <Route path="/foodie/kitchen/:kitchenId" element={<FoodieMenu />} />
          <Route path="/foodie/checkout" element={<SinglePageCheckout />} />
          <Route path="/foodie/checkout/:sessionId" element={<SinglePageCheckout />} />
          <Route path="/foodie/notifications" element={<Notifications />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/cook/account-status" element={<CookAccountStatus />} />
          <Route path="/account/suspension" element={<SuspendedNoticePage />} />
          <Route path="/announcements/:announcementId" element={<AnnouncementDetails />} />
          
          {/* Phase 2 Notification Deep Links */}
          <Route path="/cook/reviews" element={
            <ProtectedRoute requireCook={true}>
              <Reviews />
            </ProtectedRoute>
          } />
          <Route path="/cook/payouts" element={
            <ProtectedRoute requireCook={true}>
              <CookInvoices />
            </ProtectedRoute>
          } />
          <Route path="/orders/:orderId" element={<FoodieOrderDetails />} />
          <Route path="/support/messages" element={
            <ProtectedRoute>
              <MessageCenter />
            </ProtectedRoute>
          } />
          <Route path="/support/messages/:threadId" element={
            <ProtectedRoute>
              <MessageCenter />
            </ProtectedRoute>
          } />
          
          {/* Phase 3 Notification Deep Links */}
          <Route path="/cart" element={<FoodieCart />} />
          <Route path="/cook/:id/menu" element={<FoodieMenu />} />
          <Route path="/cook/dashboard" element={
            <ProtectedRoute requireCook={true}>
              <Dashboard />
            </ProtectedRoute>
          } />
        </Routes>
        </Box>
      </Box>
      
      {/* Notification Menu (Cook Hub only) */}
      {!isFoodieView && (
        <MuiMenu
          anchorEl={notificationAnchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: isRTL ? 'left' : 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: isRTL ? 'left' : 'right',
          }}
          open={isNotificationMenuOpen}
          onClose={handleNotificationMenuClose}
        >
          <MenuItem onClick={handleNotificationMenuClose} sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            <Typography variant="subtitle2">{t('notifications.newOrder')}</Typography>
          </MenuItem>
          <MenuItem onClick={handleNotificationMenuClose} sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            <Typography variant="subtitle2">{t('notifications.productReview')}</Typography>
          </MenuItem>
          <MenuItem onClick={handleNotificationMenuClose} sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            <Typography variant="subtitle2">{t('notifications.readyForPickup')}</Typography>
          </MenuItem>
        </MuiMenu>
      )}
      
      {/* Profile Menu (Cook Hub only) */}
      {!isFoodieView && (
        <MuiMenu
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: isRTL ? 'left' : 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: isRTL ? 'left' : 'right',
          }}
          open={isMenuOpen}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => { navigate(isFoodieView ? '/foodie/profile' : '/settings'); handleMenuClose(); }} sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>{t('profile.profile')}</MenuItem>
          <MenuItem onClick={() => { navigate(isFoodieView ? '/foodie/profile' : '/settings'); handleMenuClose(); }} sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>{t('profile.myAccount')}</MenuItem>
          <MenuItem onClick={handleMenuClose} sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>{t('profile.logout')}</MenuItem>
        </MuiMenu>
      )}
    </Box>
  );
}

function App() {
  return (
    <LanguageProvider>
      <CountryProvider>
        <NotificationProvider>
          <Router>
            <AppContent />
          </Router>
        </NotificationProvider>
      </CountryProvider>
    </LanguageProvider>
  );
}



export default App;
