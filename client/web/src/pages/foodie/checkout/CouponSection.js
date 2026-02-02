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
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useLanguage } from '../../../contexts/LanguageContext';
import api from '../../../utils/api';

const CouponSection = ({ session, onUpdate, onComplete, disabled }) => {
  const { language, isRTL } = useLanguage();

  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const appliedCoupon = session?.appliedCoupon;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال رمز الكوبون' : 'Please enter a coupon code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await api.post(`/checkout/session/${session?._id}/coupon`, { code: couponCode });

      if (response.data.success) {
        setSuccess(language === 'ar' ? 'تم تطبيق الكوبون بنجاح' : 'Coupon applied successfully');
        setCouponCode('');
        await onUpdate(true);
        if (onComplete) onComplete();
      }
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

      await api.delete(`/checkout/session/${session?._id}/coupon`);

      setSuccess('');
      await onUpdate(true);
    } catch (err) {
      console.error('Remove coupon error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ borderRadius: '16px', opacity: disabled ? 0.6 : 1 }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CouponIcon sx={{ color: '#FF7A00', fontSize: 28, mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C2C2C' }}>
            {language === 'ar' ? 'كوبون الخصم' : 'Discount Coupon'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ml: isRTL ? 0 : 1, mr: isRTL ? 1 : 0 }}>
            ({language === 'ar' ? 'اختياري' : 'Optional'})
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Applied Coupon Display */}
        {appliedCoupon && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: '#F0FDF4',
              border: '1px solid #86EFAC',
              borderRadius: '8px',
              mb: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CheckIcon sx={{ color: '#16A34A', mr: 1 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#16A34A' }}>
                  {appliedCoupon.code}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {appliedCoupon.description || (language === 'ar' ? 'خصم مطبق' : 'Discount applied')}
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={handleRemoveCoupon} disabled={loading || disabled}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        {/* Coupon Input */}
        {!appliedCoupon && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder={language === 'ar' ? 'أدخل رمز الكوبون' : 'Enter coupon code'}
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              disabled={loading || disabled}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleApplyCoupon();
              }}
            />
            <Button
              variant="contained"
              onClick={handleApplyCoupon}
              disabled={loading || disabled || !couponCode.trim()}
              sx={{
                bgcolor: '#FF7A00',
                color: '#FFFFFF',
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: '#E56A00' },
                '&:disabled': { bgcolor: '#D1D5DB' },
                whiteSpace: 'nowrap'
              }}
            >
              {loading ? '...' : (language === 'ar' ? 'تطبيق' : 'Apply')}
            </Button>
          </Box>
        )}

        {disabled && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {language === 'ar' 
              ? 'يرجى إكمال قسم العنوان أولاً' 
              : 'Please complete the address section first'}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default CouponSection;
