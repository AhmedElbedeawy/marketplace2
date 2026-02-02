import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Chip,
  IconButton
} from '@mui/material';
import {
  LocalOffer as CouponIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { useLanguage } from '../../../contexts/LanguageContext';
import api from '../../../utils/api';

const CouponStep = ({ session, onNext, onBack, onUpdate }) => {
  const { language, isRTL } = useLanguage();

  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const appliedCoupon = session?.appliedCoupon;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال رمز الكوبون' : 'Please enter coupon code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await api.post(`/checkout/session/${session._id}/coupon`, { code: couponCode });

      setSuccess(language === 'ar' ? 'تم تطبيق الكوبون بنجاح!' : 'Coupon applied successfully!');
      setCouponCode('');
      await onUpdate(true);
    } catch (err) {
      console.error('Apply coupon error:', err);
      setError(err.response?.data?.message || (language === 'ar' ? 'كوبون غير صالح' : 'Invalid coupon'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await api.delete(`/checkout/session/${session._id}/coupon`);

      await onUpdate(true);
    } catch (err) {
      console.error('Remove coupon error:', err);
      setError(err.response?.data?.message || 'Failed to remove coupon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ borderRadius: '16px' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <CouponIcon sx={{ color: '#FF7A00', fontSize: 32, mr: isRTL ? 0 : 2, ml: isRTL ? 2 : 0 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C2C2C' }}>
            {language === 'ar' ? 'كوبون الخصم' : 'Discount Coupon'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {appliedCoupon ? (
          <Box
            sx={{
              bgcolor: '#F0FDF4',
              border: '1px solid #10B981',
              borderRadius: '12px',
              p: 2,
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckIcon sx={{ color: '#10B981' }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#10B981' }}>
                  {language === 'ar' ? 'كوبون مطبق' : 'Coupon Applied'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#059669' }}>
                  {appliedCoupon.code}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={handleRemoveCoupon} disabled={loading} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              label={language === 'ar' ? 'أدخل رمز الكوبون' : 'Enter Coupon Code'}
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder={language === 'ar' ? 'مثال: SAVE20' : 'e.g., SAVE20'}
              disabled={loading}
            />
            <Button
              variant="contained"
              onClick={handleApplyCoupon}
              disabled={loading}
              sx={{
                bgcolor: '#FF7A00',
                color: '#FFFFFF',
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: '#E56A00' },
                '&:disabled': { bgcolor: '#D1D5DB' }
              }}
            >
              {loading ? '...' : (language === 'ar' ? 'تطبيق' : 'Apply')}
            </Button>
          </Box>
        )}

        <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 3 }}>
          {language === 'ar'
            ? 'يمكنك تخطي هذه الخطوة إذا لم يكن لديك كوبون'
            : 'You can skip this step if you don\'t have a coupon'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
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
            onClick={onNext}
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
            {language === 'ar' ? 'متابعة' : 'Continue'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CouponStep;
