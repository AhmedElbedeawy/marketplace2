import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Radio,
  RadioGroup,
  FormControlLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Payment as PaymentIcon,
  AccountBalanceWallet as CashIcon,
  CreditCard as CardIcon
} from '@mui/icons-material';
import { useLanguage } from '../../../contexts/LanguageContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../../../utils/api';

// Initialize Stripe - Use your publishable key
const stripePromise = loadStripe('pk_test_51OyourPublishableKeyHere');

// Card Element options
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#2C2C2C',
      '::placeholder': {
        color: '#9CA3AF',
      },
    },
    invalid: {
      color: '#EF4444',
    },
  },
};

// Stripe Card Form Component
const StripeCardForm = ({ onSuccess, onError, session }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { language } = useLanguage();
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      // Create payment intent on backend
      const response = await api.post(`/checkout/session/${session._id}/payment-intent`);

      const { clientSecret } = response.data.data;

      // Confirm payment with Stripe
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (result.error) {
        onError(result.error.message);
      } else if (result.paymentIntent.status === 'succeeded') {
        onSuccess();
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError(error.response?.data?.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box
        sx={{
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          p: 2,
          mb: 2,
          bgcolor: '#FFFFFF'
        }}
      >
        <CardElement
          options={CARD_ELEMENT_OPTIONS}
          onChange={(e) => setCardComplete(e.complete)}
        />
      </Box>
      <Button
        type="submit"
        variant="contained"
        disabled={!stripe || processing || !cardComplete}
        fullWidth
        sx={{
          bgcolor: '#FF7A00',
          color: '#FFFFFF',
          py: 1.5,
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '12px',
          '&:hover': { bgcolor: '#E56A00' },
          '&:disabled': { bgcolor: '#D1D5DB' }
        }}
      >
        {processing ? (
          <CircularProgress size={24} sx={{ color: '#FFFFFF' }} />
        ) : (
          language === 'ar' ? 'ادفع الآن' : 'Pay Now'
        )}
      </Button>
    </form>
  );
};

const PaymentStep = ({ session, onNext, onBack, onUpdate }) => {
  const { language, isRTL } = useLanguage();

  const [paymentMethod, setPaymentMethod] = useState(session?.paymentMethod || 'CASH');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardPaymentEnabled, setCardPaymentEnabled] = useState(false);
  const [showStripeForm, setShowStripeForm] = useState(false);

  // Fetch settings to check if card payment is enabled
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        setCardPaymentEnabled(response.data.enableCardPayment || false);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
        setCardPaymentEnabled(false);
      }
    };
    fetchSettings();
  }, []);

  const handlePaymentChange = (event) => {
    const newMethod = event.target.value;
    setPaymentMethod(newMethod);
    if (newMethod === 'CARD') {
      setShowStripeForm(true);
    } else {
      setShowStripeForm(false);
    }
  };

  const handleContinue = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      // For CASH payment, just update payment method and proceed
      if (paymentMethod === 'CASH') {
        await api.patch(`/checkout/session/${session._id}/payment-method`, { method: paymentMethod });

        await onUpdate(true);
        onNext();
      }
      // For CARD payment, the Stripe form will handle submission
    } catch (err) {
      console.error('Payment method error:', err);
      setError(err.response?.data?.message || 'Failed to set payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeSuccess = async () => {
    try {
      setLoading(true);

      // Update payment method to CARD
      await api.patch(`/checkout/session/${session._id}/payment-method`, { method: 'CARD' });

      await onUpdate(true);
      onNext();
    } catch (err) {
      console.error('Payment success handler error:', err);
      setError('Payment succeeded but failed to update session');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeError = (errorMessage) => {
    setError(errorMessage);
  };

  return (
    <Card sx={{ borderRadius: '16px' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <PaymentIcon sx={{ color: '#FF7A00', fontSize: 32, mr: isRTL ? 0 : 2, ml: isRTL ? 2 : 0 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C2C2C' }}>
            {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <RadioGroup value={paymentMethod} onChange={handlePaymentChange}>
          {/* Cash Payment */}
          <Box
            sx={{
              border: paymentMethod === 'CASH' ? '2px solid #FF7A00' : '1px solid #E5E7EB',
              borderRadius: '12px',
              p: 2,
              mb: 2,
              cursor: 'pointer',
              bgcolor: paymentMethod === 'CASH' ? '#FFF7ED' : '#FFFFFF',
              transition: 'all 0.2s'
            }}
            onClick={() => setPaymentMethod('CASH')}
          >
            <FormControlLabel
              value="CASH"
              control={<Radio sx={{ color: '#FF7A00', '&.Mui-checked': { color: '#FF7A00' } }} />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CashIcon sx={{ fontSize: 28, color: '#FF7A00' }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {language === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                      {language === 'ar' 
                        ? 'ادفع نقداً عند استلام طلبك' 
                        : 'Pay with cash when you receive your order'}
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </Box>

          {/* Card Payment - Only show if enabled in admin settings */}
          {cardPaymentEnabled && (
            <Box
              sx={{
                border: paymentMethod === 'CARD' ? '2px solid #FF7A00' : '1px solid #E5E7EB',
                borderRadius: '12px',
                p: 2,
                cursor: 'pointer',
                bgcolor: paymentMethod === 'CARD' ? '#FFF7ED' : '#FFFFFF',
                transition: 'all 0.2s'
              }}
              onClick={() => setPaymentMethod('CARD')}
            >
              <FormControlLabel
                value="CARD"
                control={<Radio sx={{ color: '#FF7A00', '&.Mui-checked': { color: '#FF7A00' } }} />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CardIcon sx={{ fontSize: 28, color: '#FF7A00' }} />
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {language === 'ar' ? 'بطاقة الائتمان/الخصم' : 'Credit/Debit Card'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6B7280' }}>
                        {language === 'ar' 
                          ? 'ادفع بأمان ببطاقتك' 
                          : 'Pay securely with your card'}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </Box>
          )}
        </RadioGroup>

        {/* Show Stripe Card Form if CARD is selected */}
        {paymentMethod === 'CARD' && cardPaymentEnabled && showStripeForm && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#2C2C2C' }}>
              {language === 'ar' ? 'تفاصيل البطاقة' : 'Card Details'}
            </Typography>
            <Elements stripe={stripePromise}>
              <StripeCardForm
                session={session}
                onSuccess={handleStripeSuccess}
                onError={handleStripeError}
              />
            </Elements>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant="outlined"
            onClick={onBack}
            disabled={loading}
            sx={{
              flex: 1,
              borderColor: '#D1D5DB',
              color: '#6B7280',
              textTransform: 'none',
              fontWeight: 600,
              py: 1.5,
              borderRadius: '12px'
            }}
          >
            {language === 'ar' ? 'رجوع' : 'Back'}
          </Button>
          {paymentMethod === 'CASH' && (
            <Button
              variant="contained"
              onClick={handleContinue}
              disabled={loading}
              sx={{
                flex: 1,
                bgcolor: '#FF7A00',
                color: '#FFFFFF',
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '12px',
                '&:hover': { bgcolor: '#E56A00' }
              }}
            >
              {loading ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'متابعة' : 'Continue')}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default PaymentStep;
