import React, { useState, useEffect, useRef } from 'react';
import { useJsApiLoader, GoogleMap } from '@react-google-maps/api';
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
import { getErrorMessage } from '../../../utils/errorHandler';

const LIBRARIES = ['places'];

const AddressSection = ({ session, onUpdate, onComplete, onEdit, completed }) => {
  const { language, isRTL } = useLanguage();

  const placeAutocompleteRef = useRef(null);
  const searchInputRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const dragListenerRef = useRef(null);
  
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

        if (addressList.length === 0) {
          // No saved addresses — open the new-address form immediately
          setSelectedAddressId('new');
          setShowForm(true);
        } else {
          // FIX 1: Only auto-select default if session has no address already set.
          // Prevents overwriting a previously-selected non-default address on page refresh.
          const sessionHasAddress = !!(session?.addressSnapshot?.addressLine1);
          if (!sessionHasAddress) {
            const defaultAddr = addressList.find(addr => addr.isDefault);
            if (defaultAddr && !showForm) {
              setSelectedAddressId(defaultAddr._id);
              fillFormFromAddress(defaultAddr);
              setShowForm(true);
            }
          }
        }
      }
    } catch (err) {
      console.error('Fetch addresses error:', err);
    }
  };

  const fillFormFromAddress = (address) => {
    // Treat stored 0/0 as unset — default to Riyadh so the map is usable
    const rawLat = address.lat ?? 0;
    const rawLng = address.lng ?? 0;
    const hasValidCoords = rawLat !== 0 || rawLng !== 0;
    setFormData({
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      countryCode: address.countryCode || 'SA',
      label: address.label,
      deliveryNotes: address.deliveryNotes || '',
      lat: hasValidCoords ? rawLat : 24.7136,
      lng: hasValidCoords ? rawLng : 46.6753
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

      let resolvedAddressId = selectedAddressId;

      if (selectedAddressId === 'new') {
        // New address: create it first to get a real addressId with coordinates
        const createResponse = await api.post('/addresses', formData);
        if (!createResponse.data.success) {
          throw new Error(createResponse.data.message || 'Failed to save new address');
        }
        const newAddress = createResponse.data.data;
        resolvedAddressId = newAddress._id;
        await fetchAddresses();
        setSelectedAddressId(newAddress._id);
      } else {
        // Existing saved address: check whether coordinates need to be updated.
        // This fixes old addresses stored with lat=0/lng=0 (created before the backend
        // isValidCoordinate gate was added) and also persists any map-drag changes.
        const storedAddr = addresses.find(addr => addr._id === selectedAddressId);
        const storedLat = storedAddr?.lat ?? 0;
        const storedLng = storedAddr?.lng ?? 0;
        const storedInvalid = storedLat === 0 && storedLng === 0;
        const coordChanged = formData.lat !== storedLat || formData.lng !== storedLng;

        if (storedInvalid || coordChanged) {
          console.log('📍 Updating address coordinates before checkout PATCH:', {
            storedLat, storedLng, newLat: formData.lat, newLng: formData.lng
          });
          const updateResp = await api.put(`/addresses/${selectedAddressId}`, {
            lat: formData.lat,
            lng: formData.lng,
          });
          if (!updateResp.data.success) {
            throw new Error(updateResp.data.message || 'Failed to update address location. Please select a map location.');
          }
          // Refresh address list so cached addresses reflect the new coordinates
          await fetchAddresses();
        }
      }

      // Send addressId as the ONLY source of truth — backend resolves coordinates from DB
      console.log('📡 PATCHing address for session:', session?._id, 'addressId:', resolvedAddressId);
      const response = await api.patch(`/checkout/session/${session?._id}/address`, {
        addressId: resolvedAddressId
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Server returned success=false');
      }

      onComplete();
      onUpdate(true);
    } catch (err) {
      console.error('❌ Address update error:', err);
      const msg = getErrorMessage(err) || 'Failed to update address';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });

  const [map, setMap] = useState(null);

  // Sync map state to ref
  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  // MARKER LIFECYCLE: Create/reattach marker when map is ready
  useEffect(() => {
    if (!map || !isLoaded) return;

    console.log('[MARKER] Map ready, creating marker at:', { lat: formData.lat, lng: formData.lng });

    // If marker doesn't exist, create it
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        position: { lat: formData.lat, lng: formData.lng },
        map: map,
        title: '📍',
        draggable: true,
        cursor: 'grab'
      });
      console.log('[MARKER] Marker created and attached to map (draggable)');
      
      // Add drag end listener
      if (dragListenerRef.current) {
        google.maps.event.removeListener(dragListenerRef.current);
      }
      dragListenerRef.current = markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current.getPosition();
        const lat = pos.lat();
        const lng = pos.lng();
        console.log('[MARKER] Drag end ->', { lat, lng });
        
        // Update formData with new coordinates
        setFormData(prev => ({
          ...prev,
          lat,
          lng
        }));
        
        // Pan map to new position
        map.panTo({ lat, lng });
      });
    } else {
      // Marker exists, reattach to map if needed
      if (markerRef.current.getMap() !== map) {
        markerRef.current.setMap(map);
        console.log('[MARKER] Marker reattached to map');
      }
    }

    return () => {
      // Do NOT remove marker on rerender - it persists via ref
    };
  }, [map, isLoaded]);

  // UPDATE MARKER POSITION when location changes (do not recreate)
  useEffect(() => {
    if (!markerRef.current) return;

    const newPosition = { lat: formData.lat, lng: formData.lng };
    markerRef.current.setPosition(newPosition);
    console.log('[MARKER] Position updated:', newPosition);
  }, [formData.lat, formData.lng]);

  // FIXED: Initialize PlaceAutocompleteElement with value polling (gmp-placeselect doesn't fire in modals)
  useEffect(() => {
    if (!isLoaded || !mapDialogOpen) return;
    
    const timer = setTimeout(() => {
      if (!searchInputRef.current) return;

      // Clear previous
      while (searchInputRef.current.firstChild) {
        searchInputRef.current.removeChild(searchInputRef.current.firstChild);
      }

      try {
        const autocomplete = new google.maps.places.PlaceAutocompleteElement();
        searchInputRef.current.appendChild(autocomplete);
        console.log('[AUTOCOMPLETE] Element attached');
        
        let lastValue = '';
        
        // Poll for value changes (gmp-placeselect doesn't fire in modals)
        const pollInterval = setInterval(() => {
          const currentValue = autocomplete.value;
          if (currentValue && currentValue !== lastValue && currentValue.includes(',')) {
            console.log('[AUTOCOMPLETE] Selection detected:', currentValue);
            lastValue = currentValue;
            
            // Use Places API textSearch to get coordinates
            const placesService = new google.maps.places.PlacesService(
              mapRef.current || new google.maps.Map(document.createElement('div'))
            );
            
            placesService.textSearch({
              query: currentValue,
              fields: ['geometry', 'formatted_address', 'name', 'address_components']
            }, (results, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]) {
                const place = results[0];
                if (place.geometry?.location) {
                  const newLat = place.geometry.location.lat();
                  const newLng = place.geometry.location.lng();
                  console.log('[AUTOCOMPLETE] Got coordinates:', { newLat, newLng });
                  
                  let city = '';
                  let countryCode = 'SA';
                  let addressLine1 = place.name || place.formatted_address || '';
                  
                  if (place.address_components) {
                    const cityComp = place.address_components.find(c => 
                      c.types?.includes('locality') || c.types?.includes('administrative_area_level_1')
                    );
                    if (cityComp) city = cityComp.long_name || '';
                    
                    const countryComp = place.address_components.find(c => c.types?.includes('country'));
                    if (countryComp) countryCode = countryComp.short_name || 'SA';
                  }
                  
                  setFormData(prev => ({
                    ...prev,
                    lat: newLat,
                    lng: newLng,
                    addressLine1: addressLine1 || prev.addressLine1,
                    city: city || prev.city,
                    countryCode: countryCode || prev.countryCode
                  }));
                  
                  console.log('[AUTOCOMPLETE] Updated formData:', { newLat, newLng, city });
                  
                  if (mapRef.current) {
                    console.log('[AUTOCOMPLETE] Moving map to:', { lat: newLat, lng: newLng });
                    mapRef.current.panTo({ lat: newLat, lng: newLng });
                    mapRef.current.setZoom(16);
                    console.log('[AUTOCOMPLETE] Map panned successfully!');
                  }
                }
              }
            });
          }
        }, 300);
        
        placeAutocompleteRef.current = autocomplete;
        placeAutocompleteRef.current._pollInterval = pollInterval;
        console.log('[AUTOCOMPLETE] Value polling started');
      } catch (err) {
        console.error('[AUTOCOMPLETE] Error:', err);
      }
    }, 500);
    
    return () => {
      clearTimeout(timer);
      // Clean up polling
      if (placeAutocompleteRef.current?._pollInterval) {
        clearInterval(placeAutocompleteRef.current._pollInterval);
      }
      // Remove element
      if (placeAutocompleteRef.current && searchInputRef.current) {
        try {
          searchInputRef.current.removeChild(placeAutocompleteRef.current);
          placeAutocompleteRef.current = null;
        } catch (err) {
          console.error('[AUTOCOMPLETE] Cleanup error:', err);
        }
      }
    };
  }, [isLoaded, mapDialogOpen]);

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
          disableEnforceFocus
          disableRestoreFocus
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
            {/* Search Box - Inside Dialog but positioned absolutely */}
            <Box ref={searchInputRef} sx={{ 
              position: 'absolute', 
              top: 10, 
              left: '50%', 
              transform: 'translateX(-50%)', 
              zIndex: 100,
              width: '90%',
              maxWidth: '400px'
            }} />
            
            {/* Google Map */}
            {isLoaded && mapDialogOpen ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '400px' }}
                center={{ lat: formData.lat, lng: formData.lng }}
                zoom={15}
                onLoad={setMap}
                onClick={(e) => {
                  const lat = e.latLng.lat();
                  const lng = e.latLng.lng();
                  console.log('[MARKER] Map click ->', { lat, lng });
                  // Update marker position
                  if (markerRef.current) {
                    markerRef.current.setPosition({ lat, lng });
                  }
                  // Update formData
                  setFormData(prev => ({
                    ...prev,
                    lat,
                    lng
                  }));
                }}
              >
                {/* Marker managed via ref in useEffect - not JSX component */}
              </GoogleMap>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '400px',
                  bgcolor: '#E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {language === 'ar' ? 'جاري تحميل الخريطة...' : 'Loading map...'}
                </Typography>
              </Box>
            )}
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
