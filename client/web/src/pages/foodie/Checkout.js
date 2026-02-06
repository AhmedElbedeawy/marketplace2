import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../utils/api';
import AddressStep from './checkout/AddressStep';
import CouponStep from './checkout/CouponStep';
import PaymentStep from './checkout/PaymentStep';
import ReviewStep from './checkout/ReviewStep';
import SuccessStep from './checkout/SuccessStep';
import OrderSummary from '../../components/OrderSummary';

const steps = ['Address', 'Coupon', 'Payment', 'Review'];
const stepsAr = ['العنوان', 'كوبون', 'الدفع', 'المراجعة'];

const Checkout = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();

  const [activeStep, setActiveStep] = useState(0);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    } else {
      createSessionFromCart();
    }

    const handleCountryUpdate = async () => {
      if (sessionId) {
        try {
          const countryCode = localStorage.getItem('selectedCountryCode') || 'SA';
          await api.patch(`/checkout/session/${sessionId}/country`, { countryCode });
          fetchSession(true);
        } catch (err) {
          console.error('Error updating country for session:', err);
        }
      }
    };

    window.addEventListener('countryUpdated', handleCountryUpdate);
    return () => window.removeEventListener('countryUpdated', handleCountryUpdate);
  }, [sessionId]);

  const createSessionFromCart = async () => {
    try {
      setLoading(true);
      const savedCart = JSON.parse(localStorage.getItem('foodie_cart') || '[]');
      const countryCode = localStorage.getItem('selectedCountryCode') || 'SA';
      const cookPreferences = JSON.parse(localStorage.getItem('cookPreferences') || '{}');

      if (savedCart.length === 0) {
        navigate('/foodie/cart');
        return;
      }

      // Transform cart items for API
      const cartItems = savedCart.map(item => ({
        dishId: item.offerId,
        cookId: item.kitchenId,
        quantity: item.quantity,
        unitPrice: item.priceAtAdd || item.price,
        notes: item.notes || '',
        dishName: item.dishName || item.name || 'Unknown Dish',
        fulfillmentMode: item.fulfillmentMode || 'pickup',
        deliveryFee: item.deliveryFee || 0,
        prepTime: item.prepTime,
        prepReadyConfig: item.prepReadyConfig,
        timingPreference: item.timingPreference || 'separate'
      }));
  
      const response = await api.post('/checkout/session', { 
        cartItems,
        countryCode,
        cookPreferences
      });
  
      if (response.data.success) {
        const newSessionId = response.data.data.sessionId;
        navigate(`/foodie/checkout/${newSessionId}`, { replace: true });
      }
    } catch (err) {
      console.error('Create session error:', err);
      setError(err.response?.data?.message || 'Failed to create checkout session');
      setLoading(false);
    }
  };
  
  const fetchSession = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const response = await api.get(`/checkout/session/${sessionId}`);
  
      if (response.data.success) {
        setSession(response.data.data);
      }
    } catch (err) {
      console.error('Fetch session error:', err);
      setError(err.response?.data?.message || 'Failed to load checkout session');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleNext = () => {
    console.log('🏁 handleNext called. Current step:', activeStep);
    setActiveStep((prev) => {
      const next = prev + 1;
      console.log('✅ Updated activeStep to:', next);
      return next;
    });
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleOrderPlaced = (orderId) => {
    setOrderPlaced(true);
    setOrderId(orderId);
    // Clear cart
    localStorage.removeItem('foodie_cart');
    window.dispatchEvent(new Event('storage'));
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#FAF5F3'
        }}
      >
        <CircularProgress sx={{ color: '#FF7A00' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#FAF5F3',
          px: 2
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/foodie/cart')}
          sx={{
            bgcolor: '#FF7A00',
            '&:hover': { bgcolor: '#E56A00' },
            textTransform: 'none'
          }}
        >
          {language === 'ar' ? 'العودة للسلة' : 'Back to Cart'}
        </Button>
      </Box>
    );
  }

  if (orderPlaced) {
    return <SuccessStep orderId={orderId} />;
  }

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <AddressStep
            session={session}
            onNext={handleNext}
            onUpdate={fetchSession}
          />
        );
      case 1:
        return (
          <CouponStep
            session={session}
            onNext={handleNext}
            onBack={handleBack}
            onUpdate={fetchSession}
          />
        );
      case 2:
        return (
          <PaymentStep
            session={session}
            onNext={handleNext}
            onBack={handleBack}
            onUpdate={fetchSession}
          />
        );
      case 3:
        return (
          <ReviewStep
            session={session}
            onBack={handleBack}
            onOrderPlaced={handleOrderPlaced}
            onUpdate={fetchSession}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#FAF5F3',
        py: 4,
        px: '52px',
        direction: isRTL ? 'rtl' : 'ltr'
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: '#2B1E16',
            mb: 4,
            textAlign: isRTL ? 'right' : 'left'
          }}
        >
          {language === 'ar' ? 'إتمام الطلب' : 'Checkout'}
        </Typography>

        {/* Stepper */}
        <Card sx={{ mb: 3, borderRadius: '16px' }}>
          <CardContent>
            <Stepper activeStep={activeStep} alternativeLabel>
              {(language === 'ar' ? stepsAr : steps).map((label, index) => (
                <Step key={index}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Step Content */}
          <Box sx={{ flex: 1 }}>
            {getStepContent(activeStep)}
          </Box>

          {/* Order Summary Sidebar */}
          <Box sx={{ width: { xs: '100%', md: '400px' } }}>
            <OrderSummary session={session} />
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Checkout;
