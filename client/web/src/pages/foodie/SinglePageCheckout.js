import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Button
} from '@mui/material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCountry } from '../../contexts/CountryContext';
import api from '../../utils/api';
import AddressSection from './checkout/AddressSection';
import CouponSection from './checkout/CouponSection';
import PaymentSection from './checkout/PaymentSection';
import ReviewSection from './checkout/ReviewSection';
import OrderSummary from '../../components/OrderSummary';
import SuccessStep from './checkout/SuccessStep';

const SinglePageCheckout = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { language, isRTL } = useLanguage();
  const { countryCode, cart, clearCart, updateCountry } = useCountry();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [geoError, setGeoError] = useState(null);

  const [addressCompleted, setAddressCompleted] = useState(false);
  const [couponCompleted, setCouponCompleted] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const isCreatingSession = useRef(false);

  console.log('🏗️ SinglePageCheckout render:', { addressCompleted, couponCompleted, paymentCompleted, sessionId });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found, redirecting to signup');
      navigate('/signup', { state: { from: location.pathname } });
      return;
    }

    if (sessionId) {
      fetchSession();
    } else if (!isCreatingSession.current) {
      isCreatingSession.current = true;
      createSessionFromCart();
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    if (session && session.addressSnapshot?.countryCode) {
      const sessionCountry = session.addressSnapshot.countryCode.toUpperCase().trim();
      const activeCountry = countryCode.toUpperCase().trim();

      if (sessionCountry !== activeCountry) {
        console.warn(`🌍 Country mismatch: Session=${sessionCountry}, Active=${activeCountry}. Updating context.`);
        updateCountry(sessionCountry);
      }
    }
  }, [session, countryCode, updateCountry]);

  const createSessionFromCart = async () => {
    try {
      setLoading(true);
      const savedCart = cart;

      if (!savedCart || savedCart.length === 0) {
        navigate('/foodie/cart');
        return;
      }

      const savedCookPreferences = localStorage.getItem('cookPreferences');
      const cookPreferences = savedCookPreferences ? JSON.parse(savedCookPreferences) : {};
      console.log('[CHECKOUT] Sending cookPreferences:', cookPreferences);

      const cartItems = savedCart.map(item => ({
        dishId: item.offerId,
        cookId: item.kitchenId,
        quantity: item.quantity,
        unitPrice: item.priceAtAdd || item.price,
        notes: item.notes || '',
        dishName: item.dishName || item.name || 'Unknown Dish',
        photoUrl: item.photoUrl || '',
        fulfillmentMode: item.fulfillmentMode || 'pickup',
        deliveryFee: item.deliveryFee || 0,
        prepTime: item.prepTime || item.prepTimeMinutes,
        prepReadyConfig: item.prepReadyConfig,
        timingPreference: item.timingPreference || 'separate'
      }));

      console.log('[CHECKOUT PAYLOAD] === ITEMS START ===');
      cartItems.forEach((item, idx) => {
        console.log(`[CHECKOUT PAYLOAD] Item ${idx}: dishName="${item.dishName}", photoUrl="${item.photoUrl}"`);
      });
      console.log('[CHECKOUT PAYLOAD] === ITEMS END ===');

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
    console.log('📡 fetchSession called, sessionId:', sessionId);
    try {
      if (!silent) setLoading(true);
      if (!silent) {
        setError('');
        setGeoError(null);
      }

      const response = await api.get(`/checkout/session/${sessionId}`);

      if (response.data.success) {
        console.log('✅ Session fetched successfully. VAT Amount:', response.data.data.pricingBreakdown?.vatAmount);
        setSession(response.data.data);
        if (response.data.data.addressSnapshot?.addressLine1) {
          setAddressCompleted(true);
        }
      }
    } catch (err) {
      console.error('Fetch session error:', err);
      const data = err.response?.data;
      const msg = data?.message || 'Failed to load checkout session';

      if (data?.errorCode === 'CITY_MISMATCH' || data?.errorCode === 'DISTANCE_EXCEEDED') {
        setGeoError({ code: data.errorCode, message: msg });
        setAddressCompleted(false);
      } else if (!silent) {
        setError(msg);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleOrderPlaced = (orderId) => {
    setOrderPlaced(true);
    setOrderId(orderId);
    clearCart();
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

        {geoError && (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: '12px', '& .MuiAlert-message': { width: '100%' } }}
            action={
              <Button color="inherit" size="small" onClick={() => setAddressCompleted(false)}>
                {language === 'ar' ? 'تغيير العنوان' : 'Change Address'}
              </Button>
            }
          >
            <Typography variant="subtitle2" fontWeight={700}>{geoError.message}</Typography>
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <AddressSection
                session={session}
                onUpdate={fetchSession}
                onComplete={() => setAddressCompleted(true)}
                onEdit={() => setAddressCompleted(false)}
                completed={addressCompleted}
              />

              <Box sx={{
                filter: geoError ? 'blur(2px)' : 'none',
                pointerEvents: geoError ? 'none' : 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 3
              }}>
                <CouponSection
                  session={session}
                  onUpdate={fetchSession}
                  onComplete={() => setCouponCompleted(true)}
                  disabled={!addressCompleted}
                />

                <PaymentSection
                  session={session}
                  onUpdate={fetchSession}
                  onComplete={() => setPaymentCompleted(true)}
                  disabled={!addressCompleted}
                />

                <ReviewSection
                  session={session}
                  onOrderPlaced={handleOrderPlaced}
                  disabled={!addressCompleted || !paymentCompleted}
                />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box
              sx={{
                position: 'sticky',
                top: 24,
                filter: geoError ? 'blur(2px)' : 'none',
                pointerEvents: geoError ? 'none' : 'auto'
              }}
            >
              <OrderSummary session={session} />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default SinglePageCheckout;
