import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import { LocationOn as LocationIcon } from '@mui/icons-material';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../utils/api';

// FIX 1: Replaced free-form address fields (which sent lat:0,lng:0) with a saved-address
// dropdown. Backend receives addressId and resolves verified coordinates from the DB.

const AddressStep = ({ session, onNext, onUpdate }) => {
  const { language, isRTL } = useLanguage();
  const { showNotification } = useNotification();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const response = await api.get('/addresses');
        if (response.data.success) {
          const list = response.data.data;
          setAddresses(list);
          // Pre-select: use session address if known, otherwise default
          const sessionAddrMatch = session?.addressSnapshot?.addressLine1
            ? list.find(a => a.addressLine1 === session.addressSnapshot.addressLine1)
            : null;
          const defaultAddr = list.find(a => a.isDefault);
          const preselect = sessionAddrMatch?._id || defaultAddr?._id || (list[0]?._id ?? '');
          setSelectedAddressId(preselect);
        }
      } catch (err) {
        console.error('Fetch addresses error:', err);
      } finally {
        setLoadingAddresses(false);
      }
    };
    fetchAddresses();
  }, []);

  const handleContinue = async () => {
    if (!session?._id) {
      showNotification('Checkout session error: Session ID is missing.', 'error');
      return;
    }

    if (!selectedAddressId) {
      setError(language === 'ar' ? 'يرجى اختيار عنوان التوصيل' : 'Please select a delivery address');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // FIX 1: Send addressId — backend resolves verified coordinates from Address document
      const response = await api.patch(`/checkout/session/${session._id}/address`, {
        addressId: selectedAddressId
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update address');
      }

      onNext();
      onUpdate(true);
    } catch (err) {
      console.error('❌ Address update error:', err);
      const msg = err.response?.data?.message || 'Failed to update address';
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

        {loadingAddresses ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} sx={{ color: '#FF7A00' }} />
          </Box>
        ) : addresses.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {language === 'ar'
              ? 'لا توجد عناوين محفوظة. يرجى إضافة عنوان من صفحة الملف الشخصي.'
              : 'No saved addresses. Please add an address from your profile page.'}
          </Alert>
        ) : (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>
              {language === 'ar' ? 'اختر عنوان التوصيل' : 'Select Delivery Address'}
            </InputLabel>
            <Select
              value={selectedAddressId}
              label={language === 'ar' ? 'اختر عنوان التوصيل' : 'Select Delivery Address'}
              onChange={(e) => setSelectedAddressId(e.target.value)}
            >
              {addresses.map((addr) => (
                <MenuItem key={addr._id} value={addr._id}>
                  {addr.label} — {addr.addressLine1}, {addr.city}
                  {addr.isDefault ? (language === 'ar' ? ' (افتراضي)' : ' (Default)') : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Button
          fullWidth
          variant="contained"
          onClick={handleContinue}
          disabled={loading || loadingAddresses || addresses.length === 0}
          sx={{
            mt: 1,
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
          {loading
            ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
            : (language === 'ar' ? 'متابعة' : 'Continue')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AddressStep;
