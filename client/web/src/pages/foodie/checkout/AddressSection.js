import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Add as AddIcon,
  Map as MapIcon,
  Close as CloseIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useLanguage } from '../../../contexts/LanguageContext';
import api from '../../../utils/api';

const AddressSection = ({ session, onUpdate, onComplete, onEdit, completed }) => {
  const { language, isRTL } = useLanguage();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('new');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapDialogOpen, setMapDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    countryCode: 'SA',
    label: 'Home',
    deliveryNotes: '',
    lat: 24.7136, // Default Riyadh
    lng: 46.6753
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  useEffect(() => {
    // Auto-fill if session has address
    if (session?.addressSnapshot?.addressLine1 && !completed) {
      setFormData({
        addressLine1: session.addressSnapshot.addressLine1 || '',
        addressLine2: session.addressSnapshot.addressLine2 || '',
        city: session.addressSnapshot.city || '',
        countryCode: session.addressSnapshot.countryCode || 'SA',
        label: session.addressSnapshot.label || 'Home',
        deliveryNotes: session.addressSnapshot.deliveryNotes || '',
        lat: session.addressSnapshot.lat || 24.7136,
        lng: session.addressSnapshot.lng || 46.6753
      });
      setShowForm(true);
      setSelectedAddressId('current');
    }
  }, [session]);

  const fetchAddresses = async () => {
    try {
      const response = await api.get('/addresses');

      if (response.data.success) {
        const addressList = response.data.data;
        setAddresses(addressList);

        // Auto-select default address
        const defaultAddr = addressList.find(addr => addr.isDefault);
        if (defaultAddr && !showForm) {
          setSelectedAddressId(defaultAddr._id);
          fillFormFromAddress(defaultAddr);
          setShowForm(true);
        }
      }
    } catch (err) {
      console.error('Fetch addresses error:', err);
    }
  };

  const fillFormFromAddress = (address) => {
    setFormData({
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      countryCode: address.countryCode || 'SA',
      label: address.label,
      deliveryNotes: address.deliveryNotes || '',
      lat: address.lat,
      lng: address.lng
    });
  };

  const handleAddressSelect = (addressId) => {
    setSelectedAddressId(addressId);
    if (addressId === 'new') {
      setFormData({
        addressLine1: '',
        addressLine2: '',
        city: '',
        label: 'Home',
        deliveryNotes: '',
        lat: 24.7136,
        lng: 46.6753
      });
      setShowForm(true);
    } else if (addressId !== 'current') {
      const selected = addresses.find(addr => addr._id === addressId);
      if (selected) {
        fillFormFromAddress(selected);
        setShowForm(true);
      }
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAndContinue = async () => {
    console.log('📍 handleSaveAndContinue called with:', formData);
    
    if (!session?._id) {
      console.error('❌ Session ID is missing!');
      setError(language === 'ar' ? 'خطأ في الجلسة' : 'Checkout session error: Session ID is missing.');
      return;
    }

    if (!formData.addressLine1 || !formData.city) {
      setError(language === 'ar' ? 'يرجى إدخال العنوان والمدينة' : 'Please enter Address Line 1 and City');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      let finalAddressData = { ...formData };

      // 1. If "new" is selected, create the address in the user's address book first
      if (selectedAddressId === 'new') {
        const createResponse = await api.post('/addresses', formData);
        if (createResponse.data.success) {
          const newAddress = createResponse.data.data;
          // Refresh addresses list and select the new one
          await fetchAddresses();
          setSelectedAddressId(newAddress._id);
          finalAddressData = {
            ...formData,
            // ensure we use any fields returned by server if needed
          };
        }
      }

      // 2. Update session with address snapshot
      console.log('📡 PATCHing address for session:', session?._id);
      const response = await api.patch(`/checkout/session/${session?._id}/address`, finalAddressData);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Server returned success=false');
      }

      onComplete();
      onUpdate(true);
    } catch (err) {
      console.error('❌ Address update error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to update address';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ borderRadius: '16px' }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LocationIcon sx={{ color: '#FF7A00', fontSize: 28, mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C2C2C' }}>
              {language === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}
            </Typography>
          </Box>
          {completed && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={<CheckIcon />}
                label={language === 'ar' ? 'مكتمل' : 'Completed'}
                color="success"
                size="small"
              />
              {onEdit && (
                <Button
                  size="small"
                  onClick={onEdit}
                  sx={{
                    color: '#FF7A00',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'none'
                  }}
                >
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </Button>
              )}
            </Box>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Address Dropdown Selector */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>{language === 'ar' ? 'اختر عنوان' : 'Select Address'}</InputLabel>
          <Select
            value={selectedAddressId}
            onChange={(e) => handleAddressSelect(e.target.value)}
            label={language === 'ar' ? 'اختر عنوان' : 'Select Address'}
            disabled={completed}
          >
            {addresses.map(addr => (
              <MenuItem key={addr._id} value={addr._id}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {addr.label} {addr.isDefault && `(${language === 'ar' ? 'افتراضي' : 'Default'})`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {addr.addressLine1}, {addr.city}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
            <MenuItem value="new">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AddIcon sx={{ mr: 1, color: '#FF7A00' }} />
                <Typography variant="body2" sx={{ color: '#FF7A00', fontWeight: 600 }}>
                  {language === 'ar' ? 'إضافة عنوان جديد' : 'Add New Address'}
                </Typography>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        {/* Address Form */}
        {showForm && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label={language === 'ar' ? 'العنوان - السطر 1 *' : 'Address Line 1 *'}
              value={formData.addressLine1}
              onChange={(e) => handleChange('addressLine1', e.target.value)}
              required
              disabled={completed}
              placeholder={language === 'ar' ? 'مثال: 123 شارع الملك فهد' : 'e.g., 123 King Fahd Road'}
            />

            <TextField
              fullWidth
              label={language === 'ar' ? 'العنوان - السطر 2' : 'Address Line 2'}
              value={formData.addressLine2}
              onChange={(e) => handleChange('addressLine2', e.target.value)}
              disabled={completed}
              placeholder={language === 'ar' ? 'مثال: الطابق الثاني، شقة 5' : 'e.g., 2nd floor, Apartment 5'}
            />

            <TextField
              fullWidth
              label={language === 'ar' ? 'المدينة / المنطقة *' : 'City / Area *'}
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              required
              disabled={completed}
            />

            <TextField
              fullWidth
              label={language === 'ar' ? 'رمز البلد (مثال: SA, EG) *' : 'Country Code (e.g. SA, EG) *'}
              value={formData.countryCode}
              onChange={(e) => handleChange('countryCode', e.target.value.toUpperCase())}
              required
              disabled={completed}
              placeholder="SA"
            />

            <FormControl fullWidth>
              <InputLabel>{language === 'ar' ? 'التصنيف *' : 'Label *'}</InputLabel>
              <Select
                value={formData.label}
                onChange={(e) => handleChange('label', e.target.value)}
                label={language === 'ar' ? 'التصنيف *' : 'Label *'}
                disabled={completed}
              >
                <MenuItem value="Home">{language === 'ar' ? 'المنزل' : 'Home'}</MenuItem>
                <MenuItem value="Work">{language === 'ar' ? 'العمل' : 'Work'}</MenuItem>
                <MenuItem value="Other">{language === 'ar' ? 'أخرى' : 'Other'}</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label={language === 'ar' ? 'ملاحظات التوصيل' : 'Delivery Notes'}
              value={formData.deliveryNotes}
              onChange={(e) => handleChange('deliveryNotes', e.target.value)}
              multiline
              rows={2}
              disabled={completed}
              placeholder={language === 'ar' 
                ? 'أي تعليمات خاصة للسائق' 
                : 'Any special instructions for the driver'}
            />

            {/* Map Link */}
            <Button
              startIcon={<MapIcon />}
              onClick={() => setMapDialogOpen(true)}
              disabled={completed}
              sx={{
                textTransform: 'none',
                color: '#FF7A00',
                justifyContent: 'flex-start'
              }}
            >
              {language === 'ar' ? 'عرض على الخريطة' : 'View on Map'}
            </Button>

            {/* Save Button */}
            {!completed && (
              <Button
                fullWidth
                variant="contained"
                onClick={handleSaveAndContinue}
                disabled={loading}
                sx={{
                  mt: 2,
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
                {loading ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ ومتابعة' : 'Save & Continue')}
              </Button>
            )}
          </Box>
        )}

        {/* Map Dialog */}
        <Dialog
          open={mapDialogOpen}
          onClose={() => setMapDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {language === 'ar' ? 'موقع التوصيل' : 'Delivery Location'}
            <IconButton
              onClick={() => setMapDialogOpen(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{
                width: '100%',
                height: '400px',
                bgcolor: '#E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px'
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {language === 'ar' ? 'سيتم دمج خريطة جوجل هنا' : 'Google Maps integration will be added here'}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {language === 'ar' ? 'الموقع الحالي' : 'Current location'}: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMapDialogOpen(false)}>
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AddressSection;
