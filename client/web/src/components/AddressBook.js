import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationIcon,
  Map as MapIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';

const LIBRARIES = ['places'];
const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '400px',
  borderRadius: '8px'
};
const DEFAULT_CENTER = {
  lat: 24.7136,
  lng: 46.6753
};

const AddressBook = () => {
  const { language, isRTL } = useLanguage();
  const location = useLocation();
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });
  
  // Debug: log when loaded
  useEffect(() => {
    console.log('[AB] isLoaded:', isLoaded);
    if (typeof google !== 'undefined') {
      console.log('[AB] places available:', !!google?.maps?.places);
    }
  }, [isLoaded]);

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [error, setError] = useState('');
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [autocomplete, setAutocomplete] = useState(null);
  const [map, setMap] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  
  // Persistent refs for map/marker lifecycle
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const dragListenerRef = useRef(null);
  const searchInputRef = useRef(null);
  const placesAutocompleteRef = useRef(null);

  // Compose form state
  const [formData, setFormData] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    countryCode: 'SA',
    label: 'Home',
    deliveryNotes: '',
    lat: 24.7136,
    lng: 46.6753
  });

  useEffect(() => {
    fetchAddresses();
    if (location.state?.openAddAddress) {
      handleOpenForm();
    }
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/addresses');
      if (response.data.success) {
        setAddresses(response.data.data);
      }
    } catch (err) {
      setError('Failed to fetch addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (address = null) => {
    if (address) {
      setEditingAddress(address);
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
    } else {
      setEditingAddress(null);
      setFormData({
        addressLine1: '',
        addressLine2: '',
        city: '',
        countryCode: 'SA',
        label: 'Home',
        deliveryNotes: '',
        lat: 24.7136,
        lng: 46.6753
      });
    }
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditingAddress(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.addressLine1 || !formData.city) {
        setError(language === 'ar' ? 'يرجى إدخال العنوان والمدينة' : 'Please enter Address Line 1 and City');
        return;
      }

      setLoading(true);
      if (editingAddress) {
        await api.put(`/addresses/${editingAddress._id}`, formData);
      } else {
        await api.post('/addresses', formData);
      }
      
      handleCloseForm();
      fetchAddresses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setAddressToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!addressToDelete) return;
    try {
      setLoading(true);
      await api.delete(`/addresses/${addressToDelete}`);
      fetchAddresses();
    } catch (err) {
      setError('Failed to delete address');
    } finally {
      setLoading(false);
      setDeleteConfirmOpen(false);
      setAddressToDelete(null);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      setLoading(true);
      await api.patch(`/addresses/${id}/default`);
      fetchAddresses();
    } catch (err) {
      setError('Failed to set default address');
    } finally {
      setLoading(false);
    }
  };

  const onMapClick = (e) => {
    const newLat = e.latLng.lat();
    const newLng = e.latLng.lng();
    setFormData(prev => ({
      ...prev,
      lat: newLat,
      lng: newLng
    }));
  };

  const onMarkerDragEnd = (e) => {
    const newLat = e.latLng.lat();
    const newLng = e.latLng.lng();
    setFormData(prev => ({
      ...prev,
      lat: newLat,
      lng: newLng
    }));
  };

  // MARKER LIFECYCLE: Create/reattach marker when map is ready
  useEffect(() => {
    if (!map || !isLoaded) return;

    console.log('[AB] Creating marker at:', { lat: formData.lat, lng: formData.lng });

    // If marker doesn't exist, create it
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        position: { lat: formData.lat, lng: formData.lng },
        map: map,
        title: '📍',
        draggable: true,
        cursor: 'grab'
      });
      console.log('[AB] Marker created (draggable)');
      
      // Add drag end listener
      if (dragListenerRef.current) {
        google.maps.event.removeListener(dragListenerRef.current);
      }
      dragListenerRef.current = markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current.getPosition();
        const lat = pos.lat();
        const lng = pos.lng();
        console.log('[AB] Drag end ->', { lat, lng });
        
        setFormData(prev => ({
          ...prev,
          lat,
          lng
        }));
        
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
        }
      });
    } else {
      // Marker exists, reattach if needed
      if (markerRef.current.getMap() !== map) {
        markerRef.current.setMap(map);
        console.log('[AB] Marker reattached');
      }
    }

    return () => {
      // Do NOT remove marker on rerender
    };
  }, [map, isLoaded]);

  // UPDATE MARKER POSITION when formData changes (do not recreate)
  useEffect(() => {
    if (!markerRef.current) return;

    const newPosition = { lat: formData.lat, lng: formData.lng };
    markerRef.current.setPosition(newPosition);
    // console.log('[AB] Position updated:', newPosition); // Too noisy
  }, [formData.lat, formData.lng]);

  // PLACE AUTOCOMPLETE with polling (AddressSection pattern)
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
        console.log('[AB] PlaceAutocompleteElement attached');
        
        let lastValue = '';
        
        // Poll for value changes (gmp-placeselect doesn't fire in modals)
        const pollInterval = setInterval(() => {
          const currentValue = autocomplete.value;
          if (currentValue && currentValue !== lastValue && currentValue.includes(',')) {
            console.log('[AB] Selection detected:', currentValue);
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
                  console.log('[AB] PLACE SELECTED lat/lng:', { newLat, newLng });
                  
                  let city = '';
                  let addressLine1 = place.name || place.formatted_address || '';
                  
                  if (place.address_components) {
                    const cityComp = place.address_components.find(c => 
                      c.types?.includes('locality') || c.types?.includes('administrative_area_level_1')
                    );
                    if (cityComp) city = cityComp.long_name || '';
                  }
                  
                  // Update formData (triggers marker position update + map pan via existing handlers)
                  setFormData(prev => ({
                    ...prev,
                    lat: newLat,
                    lng: newLng,
                    addressLine1: addressLine1 || prev.addressLine1,
                    city: city || prev.city
                  }));
                  
                  // Pan map
                  if (mapRef.current) {
                    console.log('[AB] Panning map to:', { newLat, newLng });
                    mapRef.current.panTo({ lat: newLat, lng: newLng });
                    mapRef.current.setZoom(16);
                  }
                }
              }
            });
          }
        }, 300);
        
        placesAutocompleteRef.current = autocomplete;
        placesAutocompleteRef.current._pollInterval = pollInterval;
        console.log('[AB] Value polling started');
      } catch (err) {
        console.error('[AB] Error:', err);
      }
    }, 500);
    
    return () => {
      clearTimeout(timer);
      // Clean up polling
      if (placesAutocompleteRef.current?._pollInterval) {
        clearInterval(placesAutocompleteRef.current._pollInterval);
      }
      // Remove element
      if (placesAutocompleteRef.current && searchInputRef.current) {
        try {
          searchInputRef.current.removeChild(placesAutocompleteRef.current);
          placesAutocompleteRef.current = null;
        } catch (err) {
          console.error('[AB] Cleanup error:', err);
        }
      }
    };
  }, [isLoaded, mapDialogOpen]);

  if (loading && addresses.length === 0) {
    return <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />;
  }

  return (
    <Box sx={{ mt: 3, direction: isRTL ? 'rtl' : 'ltr' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          {language === 'ar' ? 'دفتر العناوين' : 'Address Book'}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
          sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#FF9933' }, textTransform: 'none' }}
        >
          {language === 'ar' ? 'إضافة عنوان' : 'Add Address'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        {addresses.map((addr) => (
          <Grid item xs={12} key={addr._id}>
            <Card sx={{ 
              borderRadius: '12px', 
              border: addr.isDefault ? '1px solid #FF7A00' : '1px solid #E5E7EB',
              bgcolor: addr.isDefault ? '#FFF9F5' : 'white'
            }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', p: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <LocationIcon sx={{ color: addr.isDefault ? '#FF7A00' : '#9CA3AF', mt: 0.5 }} />
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body1" fontWeight={700}>
                        {addr.label}
                      </Typography>
                      {addr.isDefault && (
                        <Chip 
                          label={language === 'ar' ? 'افتراضي' : 'Default'} 
                          size="small" 
                          color="primary" 
                          sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#FF7A00' }} 
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {addr.addressLine1}
                    </Typography>
                    {addr.addressLine2 && (
                      <Typography variant="body2" color="text.secondary">
                        {addr.addressLine2}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {addr.city}, {addr.countryCode}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {!addr.isDefault && (
                    <Button 
                      size="small" 
                      onClick={() => handleSetDefault(addr._id)}
                      sx={{ color: '#FF7A00', textTransform: 'none' }}
                    >
                      {language === 'ar' ? 'تعيين كافتراضي' : 'Set Default'}
                    </Button>
                  )}
                  <IconButton size="small" onClick={() => handleOpenForm(addr)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(addr._id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Address Form Dialog */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingAddress ? (language === 'ar' ? 'تعديل العنوان' : 'Edit Address') : (language === 'ar' ? 'إضافة عنوان جديد' : 'Add New Address')}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              name="addressLine1"
              label={language === 'ar' ? 'العنوان - السطر 1 *' : 'Address Line 1 *'}
              value={formData.addressLine1}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              name="addressLine2"
              label={language === 'ar' ? 'العنوان - السطر 2' : 'Address Line 2'}
              value={formData.addressLine2}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              name="city"
              label={language === 'ar' ? 'المدينة *' : 'City *'}
              value={formData.city}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              name="countryCode"
              label={language === 'ar' ? 'رمز البلد (SA, EG, etc) *' : 'Country Code (SA, EG, etc) *'}
              value={formData.countryCode}
              onChange={(e) => handleChange({ target: { name: 'countryCode', value: e.target.value.toUpperCase() } })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>{language === 'ar' ? 'التصنيف *' : 'Label *'}</InputLabel>
              <Select
                name="label"
                value={formData.label}
                onChange={handleChange}
                label={language === 'ar' ? 'التصنيف *' : 'Label *'}
              >
                <MenuItem value="Home">{language === 'ar' ? 'المنزل' : 'Home'}</MenuItem>
                <MenuItem value="Work">{language === 'ar' ? 'العمل' : 'Work'}</MenuItem>
                <MenuItem value="Other">{language === 'ar' ? 'أخرى' : 'Other'}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              name="deliveryNotes"
              label={language === 'ar' ? 'ملاحظات التوصيل' : 'Delivery Notes'}
              value={formData.deliveryNotes}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
            />
            <Button
              startIcon={<MapIcon />}
              onClick={() => setMapDialogOpen(true)}
              sx={{ textTransform: 'none', color: '#FF7A00', justifyContent: 'flex-start' }}
            >
              {language === 'ar' ? 'تحديد الموقع على الخريطة' : 'Pick on Map'}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: '#FF7A00' }}>
            {language === 'ar' ? 'حفظ' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Map Picker Dialog - EXACT COPY from AddressSection */}
      <Dialog
        open={mapDialogOpen}
        onClose={() => setMapDialogOpen(false)}
        maxWidth="md"
        fullWidth
        disableEnforceFocus
        disableRestoreFocus
      >
        <DialogTitle>
          {language === 'ar' ? 'اختر الموقع' : 'Pick Location'}
          <IconButton onClick={() => setMapDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, position: 'relative' }}>
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
              onClick={onMapClick}
            >
              {/* Marker managed via ref - see useEffect below */}
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
          <Button onClick={() => setMapDialogOpen(false)} variant="contained" sx={{ bgcolor: '#FF7A00' }}>
            {language === 'ar' ? 'تأكيد الموقع' : 'Confirm Location'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
      <DialogTitle>{language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</DialogTitle>
      <DialogContent>
        <Typography>{language === 'ar' ? 'هل أنت متأكد من حذف هذا العنوان؟' : 'Are you sure you want to delete this address?'}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteConfirmOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
        <Button onClick={confirmDelete} color="error" variant="contained">{language === 'ar' ? 'حذف' : 'Delete'}</Button>
      </DialogActions>
    </Dialog>
  </Box>
);
}

export default AddressBook;
