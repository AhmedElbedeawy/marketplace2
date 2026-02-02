import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  Divider,
  CircularProgress
} from '@mui/material';
import { CheckCircle as CheckIcon } from '@mui/icons-material';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getCountryContext } from '../../../utils/countryContext';
import api from '../../../utils/api';
import { v4 as uuidv4 } from 'uuid';

const ReviewStep = ({ session, onBack, onOrderPlaced, onUpdate }) => {
  const { language, isRTL } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
  
  if (session) {
    console.log('📦 [DEBUG] ReviewStep Pricing Breakdown:');
    console.log(`   - Selected country code: ${pricing.countryCode}`);
    console.log(`   - Checkout VAT rate: ${pricing.vatRate}%`);
    console.log(`   - Net Total: ${pricing.netTotal}`);
    console.log(`   - VAT Amount: ${pricing.vatAmount}`);
    console.log(`   - Gross Total: ${pricing.total}`);
  }

  const handlePlaceOrder = async () => {
    try {
      setLoading(true);
      setError('');
      const idempotencyKey = uuidv4();

      const response = await api.post(`/checkout/session/${session._id}/confirm`, { idempotencyKey });

      if (response.data.success) {
        onOrderPlaced(response.data.data.orderId);
      }
    } catch (err) {
      console.error('Place order error:', err);
      setError(err.response?.data?.message || 'Failed to place order');
      
      // If price changed, refresh session
      if (err.response?.status === 400) {
        await onUpdate();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ borderRadius: '16px' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <CheckIcon sx={{ color: '#FF7A00', fontSize: 32, mr: isRTL ? 0 : 2, ml: isRTL ? 2 : 0 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C2C2C' }}>
            {language === 'ar' ? 'مراجعة وتأكيد' : 'Review & Confirm'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Address */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            {language === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280' }}>
            {session?.addressSnapshot?.addressLine1 || 'N/A'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280' }}>
            {session?.addressSnapshot?.city}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Payment Method */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280' }}>
            {session?.paymentMethod === 'CASH'
              ? (language === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery')
              : (language === 'ar' ? 'بطاقة ائتمان' : 'Credit Card')}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Price Summary */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</Typography>
            <Typography variant="body2">{formatCurrency(pricing.subtotal)}</Typography>
          </Box>
          
          {pricing.couponDiscount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#10B981' }}>
                {language === 'ar' ? 'خصم الكوبون' : 'Coupon Discount'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#10B981' }}>
                -{formatCurrency(pricing.couponDiscount)}
              </Typography>
            </Box>
          )}

          {pricing.autoDiscount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#10B981' }}>
                {language === 'ar' ? 'خصم تلقائي' : 'Auto Discount'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#10B981' }}>
                -{formatCurrency(pricing.autoDiscount)}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">{language === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}</Typography>
            <Typography variant="body2">{formatCurrency(pricing.deliveryFee)}</Typography>
          </Box>

          {pricing.vatAmount > 0 && pricing.vatRate > 0 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">{language === 'ar' ? 'المجموع بدون الضريبة' : 'Net Total'}</Typography>
                <Typography variant="body2">{formatCurrency(pricing.netTotal || (pricing.total - (pricing.vatAmount || 0)))}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  {pricing.vatLabel?.includes(`(${pricing.vatRate}%)`) ? pricing.vatLabel : `${pricing.vatLabel || 'VAT'} (${pricing.vatRate}%)`}
                </Typography>
                <Typography variant="body2">{formatCurrency(pricing.vatAmount)}</Typography>
              </Box>
            </>
          )}

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {language === 'ar' ? 'الإجمالي' : 'Total'}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#FF7A00' }}>
              {formatCurrency(pricing.total)}
            </Typography>
          </Box>
        </Box>

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
          <Button
            variant="contained"
            onClick={handlePlaceOrder}
            disabled={loading}
            sx={{
              flex: 2,
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
            {loading ? (
              <CircularProgress size={24} sx={{ color: '#FFFFFF' }} />
            ) : (
              language === 'ar' ? 'تأكيد الطلب' : 'Place Order'
            )}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ReviewStep;
