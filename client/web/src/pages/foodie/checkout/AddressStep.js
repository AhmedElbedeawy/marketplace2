import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert
} from '@mui/material';
import { LocationOn as LocationIcon } from '@mui/icons-material';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../utils/api';

const AddressStep = ({ session, onNext, onUpdate }) => {
  const { language, isRTL } = useLanguage();
  const { showNotification } = useNotification();

  const [address, setAddress] = useState({
    addressLine1: session?.addressSnapshot?.addressLine1 || '',
    city: session?.addressSnapshot?.city || '',
    countryCode: session?.addressSnapshot?.countryCode || 'SA',
    deliveryNotes: session?.addressSnapshot?.deliveryNotes || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleContinue = async () => {
    // Removed debug alert: console.log('📍 handleContinue called with address:', address);

    if (!session?._id) {
      // Removed debug alert: window.alert('Checkout session error: Session ID is missing.');
      showNotification('Checkout session error: Session ID is missing.', 'error');
      return;
    }

    if (!address.addressLine1 || !address.city || !address.countryCode) {
      console.warn('⚠️ Missing required address fields');
      setError(language === 'ar' ? 'يرجى إدخال العنوان والمدينة والبلد' : 'Please enter address, city and country');
      return;
    }

    try {
      setLoading(true);
      setError('');
      console.log('📡 PATCHing address for session:', session?._id);

      const response = await api.patch(`/checkout/session/${session?._id}/address`, {
        addressLine1: address.addressLine1,
        city: address.city,
        countryCode: address.countryCode.toUpperCase(),
        label: 'Home', // Default label
        lat: 0,
        lng: 0,
        deliveryNotes: address.deliveryNotes
      });

      console.log('✅ Address update response:', response.data);

      onNext();
      console.log('➡️ Called onNext()');
      
      onUpdate(true);
      console.log('🔄 Called onUpdate(true)');
    } catch (err) {
      console.error('❌ Address update error:', err);
      const msg = err.response?.data?.message || 'Failed to update address';
      // Removed debug alert: window.alert(`Error updating address: ${msg}`);
      setError(msg);
      showNotification(`Error updating address: ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ borderRadius: '16px' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <LocationIcon sx={{ color: '#FF7A00', fontSize: 32, mr: isRTL ? 0 : 2, ml: isRTL ? 2 : 0 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C2C2C' }}>
            {language === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label={language === 'ar' ? 'العنوان الكامل' : 'Full Address'}
            value={address.addressLine1}
            onChange={(e) => handleChange('addressLine1', e.target.value)}
            multiline
            rows={2}
            required
          />

          <TextField
            fullWidth
            label={language === 'ar' ? 'المدينة' : 'City'}
            value={address.city}
            onChange={(e) => handleChange('city', e.target.value)}
            required
          />

          <TextField
            fullWidth
            label={language === 'ar' ? 'رمز البلد (مثال: SA, EG)' : 'Country Code (e.g. SA, EG)'}
            value={address.countryCode}
            onChange={(e) => handleChange('countryCode', e.target.value.toUpperCase())}
            required
            placeholder="SA"
          />

          <TextField
            fullWidth
            label={language === 'ar' ? 'ملاحظات التوصيل (اختياري)' : 'Delivery Notes (Optional)'}
            value={address.deliveryNotes}
            onChange={(e) => handleChange('deliveryNotes', e.target.value)}
            multiline
            rows={2}
            placeholder={language === 'ar' 
              ? 'مثال: الطابق الثاني، شقة 5' 
              : 'e.g., 2nd floor, Apartment 5'}
          />
        </Box>

        <Button
          fullWidth
          variant="contained"
          onClick={handleContinue}
          disabled={loading}
          sx={{
            mt: 3,
            bgcolor: '#FF7A00',
            color: '#FFFFFF',
            py: 1.5,
            fontSize: '16px',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '12px',
            '&:hover': { bgcolor: '#E56A00' },
            '&:disabled': { bgcolor: '#D1D5DB' }
          }}
        >
          {loading ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'متابعة' : 'Continue')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AddressStep;
