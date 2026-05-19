import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Alert,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  ShoppingBag as OrderIcon
} from '@mui/icons-material';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getCountryContext } from '../../../utils/countryContext';
import api from '../../../utils/api';
import PhoneVerificationModal from '../../../components/PhoneVerificationModal';

import { v4 as uuidv4 } from 'uuid';

const ReviewSection = ({ session, onOrderPlaced, disabled }) => {
  const { language, isRTL } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

  // Read user from localStorage; re-read on each render so it reflects after verify
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const isPhoneVerified = storedUser?.isPhoneVerified === true;

  const pricing = session?.pricingBreakdown || {};
  const context = getCountryContext(pricing.countryCode);
  const currency = pricing.currencyCode || context.currencyCode;

  const formatCurrency = (amount) => {
    const val = Number(amount) || 0;
    if (language === 'ar') {
      const arCurrency = currency === 'SAR' ? 'ر.س' : (currency === 'EGP' ? 'ج.م' : currency);
      return `${val.toFixed(2)} ${arCurrency}`;
    }
    return `${currency} ${val.toFixed(2)}`;
  };

  const handlePlaceOrder = async () => {
    console.log('🚀 handlePlaceOrder initiating for session:', session?._id);
    try {
      setLoading(true);
      setError('');
      const idempotencyKey = uuidv4();

      const response = await api.post(`/checkout/session/${session?._id}/confirm`, { 
        idempotencyKey,
        paymentMethod: 'CASH' 
      });
      console.log('✅ Order confirmation response:', response.data);

      if (response.data.success) {
        onOrderPlaced(response.data.data.orderId);
      }
    } catch (err) {
      console.error('❌ Place order error:', err);
      setError(err.response?.data?.message || (language === 'ar' ? 'فشل في تأكيد الطلب' : 'Failed to place order'));
    } finally {
      setLoading(false);
    }
  };

  if (session) {
    console.log('📦 [DEBUG] ReviewSection Pricing Breakdown:');
    console.log(`   - Selected country code: ${pricing.countryCode}`);
    console.log(`   - Checkout VAT rate: ${pricing.vatRate}%`);
    console.log(`   - Net Total: ${pricing.netTotal}`);
    console.log(`   - VAT Amount: ${pricing.vatAmount}`);
    console.log(`   - Gross Total: ${pricing.total}`);
  }

  return (
    <Card sx={{ borderRadius: '16px', opacity: disabled ? 0.6 : 1 }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <CheckIcon sx={{ color: '#FF7A00', fontSize: 28, mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C2C2C' }}>
            {language === 'ar' ? 'مراجعة وتأكيد الطلب' : 'Review & Place Order'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Order Review Summary */}
        {session && (
          <Box sx={{ mb: 3 }}>
            {/* Delivery Address */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {language === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {session.addressSnapshot?.addressLine1 || (language === 'ar' ? 'لم يتم تحديد العنوان' : 'No address specified')}
              </Typography>
              {session.addressSnapshot?.addressLine2 && (
                <Typography variant="body2" color="text.secondary">
                  {session.addressSnapshot.addressLine2}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {session.addressSnapshot?.city}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Payment Method */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {language === 'ar' ? 'الدفع نقداً عند الاستلام' : 'Cash on Delivery'}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Total Amount */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(pricing.subtotal)}
                </Typography>
              </Box>

              {pricing.vatAmount > 0 && pricing.vatRate > 0 && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {language === 'ar' ? 'المجموع بدون الضريبة' : 'Net Total'}
                    </Typography>
                    <Typography variant="body2">
                      {formatCurrency(pricing.netTotal || (pricing.total - (pricing.vatAmount || 0)))}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {pricing.vatLabel || 'VAT'} ({pricing.vatRate}%)
                    </Typography>
                    <Typography variant="body2">
                      {formatCurrency(pricing.vatAmount)}
                    </Typography>
                  </Box>
                </>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {language === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(pricing.deliveryFee)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {language === 'ar' ? 'المجموع الكلي' : 'Total Amount'}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#FF7A00' }}>
                {formatCurrency(pricing.total)}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Phone verification gate — shown when user has no verified phone */}
        {!isPhoneVerified && !disabled && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button
                size="small"
                onClick={() => setPhoneModalOpen(true)}
                sx={{ color: '#FF7A00', fontWeight: 600, textTransform: 'none' }}
              >
                {language === 'ar' ? 'تحقق الآن' : 'Verify now'}
              </Button>
            }
          >
            {language === 'ar'
              ? 'يجب التحقق من رقم هاتفك قبل تأكيد الطلب'
              : 'You must verify your phone number before placing an order.'}
          </Alert>
        )}

        {/* Place Order Button */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <OrderIcon />}
          onClick={handlePlaceOrder}
          disabled={loading || disabled || !isPhoneVerified}
          sx={{
            bgcolor: '#FF7A00',
            color: '#FFFFFF',
            py: 1.8,
            fontSize: '18px',
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: '12px',
            '&:hover': { bgcolor: '#E56A00' },
            '&:disabled': { bgcolor: '#D1D5DB', color: '#9CA3AF' }
          }}
        >
          {loading
            ? (language === 'ar' ? 'جاري تأكيد الطلب...' : 'Placing Order...')
            : (language === 'ar' ? 'تأكيد الطلب' : 'Place Order')}
        </Button>

        {disabled && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
            {language === 'ar'
              ? 'يرجى إكمال جميع الأقسام المطلوبة أولاً'
              : 'Please complete all required sections first'}
          </Typography>
        )}

        {/* Terms Note */}
        {!disabled && isPhoneVerified && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
            {language === 'ar'
              ? 'بالضغط على "تأكيد الطلب"، فإنك توافق على شروط وأحكام الخدمة'
              : 'By clicking "Place Order", you agree to our terms and conditions'}
          </Typography>
        )}

        {/* Phone verification modal */}
        <PhoneVerificationModal
          open={phoneModalOpen}
          onClose={() => setPhoneModalOpen(false)}
          onVerified={() => setPhoneModalOpen(false)}
          language={language}
          title={language === 'ar' ? 'تحقق من رقم الهاتف لتأكيد الطلب' : 'Verify phone to place your order'}
        />
      </CardContent>
    </Card>
  );
};

export default ReviewSection;