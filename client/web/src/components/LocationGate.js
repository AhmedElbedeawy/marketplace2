import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Button,
  CircularProgress
} from '@mui/material';
import { LocationOn as LocationIcon } from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const LocationGate = () => {
  const { language, isRTL } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Routes that require a location
  const protectedRoutes = ['/', '/foodie/home', '/foodie/menu', '/foodie/checkout'];
  const isProtectedRoute = protectedRoutes.includes(location.pathname) || location.pathname.startsWith('/foodie/kitchen/');

  useEffect(() => {
    const checkLocation = async () => {
      const token = localStorage.getItem('token');
      if (!token || !isProtectedRoute) {
        setLoading(false);
        setOpen(false);
        return;
      }

      try {
        const response = await api.get('/addresses');
        if (response.data.success) {
          const addresses = response.data.data;
          const hasDefault = addresses.some(addr => addr.isDefault);
          
          if (addresses.length === 0 || !hasDefault) {
            setOpen(true);
          } else {
            setOpen(false);
            // Store default lat/lng in session storage for distance-based queries if needed
            const defaultAddr = addresses.find(addr => addr.isDefault) || addresses[0];
            sessionStorage.setItem('userLat', defaultAddr.lat);
            sessionStorage.setItem('userLng', defaultAddr.lng);
            sessionStorage.setItem('userCity', defaultAddr.city);
          }
        }
      } catch (err) {
        console.error('LocationGate error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkLocation();
  }, [location.pathname, isProtectedRoute]);

  const handleAddAddress = () => {
    setOpen(false);
    navigate('/foodie/profile', { state: { openAddAddress: true } });
  };

  if (loading || !open) return null;

  return (
    <Dialog
      open={open}
      onClose={() => {}} // Block closing
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '16px', p: 2, textAlign: 'center' }
      }}
    >
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <LocationIcon sx={{ fontSize: 60, color: '#FF7A00', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {language === 'ar' ? 'حدد موقعك أولاً' : 'Set Your Location First'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {language === 'ar' 
              ? 'نحتاج لمعرفة موقعك لنعرض لك أفضل الطباخين القريبين منك والذين يمكنهم التوصيل إليك.' 
              : 'We need your location to show you the best cooks nearby who can deliver to you.'}
          </Typography>
        </Box>
        <Button
          fullWidth
          variant="contained"
          onClick={handleAddAddress}
          sx={{
            bgcolor: '#FF7A00',
            py: 1.5,
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': { bgcolor: '#FF9933' }
          }}
        >
          {language === 'ar' ? 'إضافة عنوان توصيل' : 'Add Delivery Address'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default LocationGate;
