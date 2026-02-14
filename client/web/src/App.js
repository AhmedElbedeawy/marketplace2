import React from 'react';
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
} from '@mui/material';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { CountryProvider } from './contexts/CountryContext';
import { NotificationProvider } from './contexts/NotificationContext';
import PublicLayout from './components/PublicLayout';
import CookHubLayout from './components/CookHubLayout';
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
import MobileBlockerPage from './pages/MobileBlockerPage';
import LocationGate from './components/LocationGate';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import './App.css';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isRTL } = useLanguage();
  
  // Mobile detection and redirect
  React.useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    const onMobilePage = location.pathname === '/mobile';
    
    if (isMobile && !onMobilePage) {
      navigate('/mobile', { replace: true });
    } else if (!isMobile && onMobilePage) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);
  
  // Determine if current view is Foodie or Cook
  const isFoodieView = location.pathname.startsWith('/foodie') || location.pathname === '/';

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
      
      {/* Foodie Header for public foodie routes */}
      {isFoodieView && (
        <Box sx={{ bgcolor: '#FFFFFF', mb: 0, width: '100%', p: 0, m: 0 }}>
          <FoodieHeader onViewSwitch={handleViewSwitch} />
        </Box>
      )}
      
      <Box sx={{ 
        display: 'flex', 
        flex: 1,
        bgcolor: isFoodieView ? '#FFFFFF' : '#F5F5F5',
      }}>
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
        <Routes>
          {/* Mobile Blocker Page */}
          <Route path="/mobile" element={<MobileBlockerPage />} />
          
          {/* Default redirect to Foodie */}
          <Route path="/" element={<FoodieHome />} />
          
          {/* Auth Routes - Public Layout (no sidebar) */}
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
          
          {/* Cook Hub Routes - Protected with Cook Hub Layout */}
          <Route element={
            <ProtectedRoute requireCook={true}>
              <CookHubLayout />
            </ProtectedRoute>
          }>
            <Route path="/cook-dashboard" element={<Dashboard />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/products" element={<Products />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/order-details/:orderId" element={<CookOrderDetails />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/invoices" element={<CookInvoices />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          
          {/* Message Center - Available to all authenticated users */}
          <Route path="/message-center" element={
            <ProtectedRoute>
              <MessageCenter />
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
          
          {/* Phase 2 Notification Deep Links - Cook Hub Layout */}
          <Route element={
            <ProtectedRoute requireCook={true}>
              <CookHubLayout />
            </ProtectedRoute>
          }>
            <Route path="/cook/reviews" element={<Reviews />} />
            <Route path="/cook/payouts" element={<CookInvoices />} />
            <Route path="/cook/dashboard" element={<Dashboard />} />
          </Route>
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
        </Routes>
        </Box>
      </Box>
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
