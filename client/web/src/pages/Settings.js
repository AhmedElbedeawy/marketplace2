import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';

const Settings = () => {
  const { isRTL } = useLanguage();
  const [mobileHeroFeaturedDishId, setMobileHeroFeaturedDishId] = useState('');
  const [mobileSupportFeaturedDishIds, setMobileSupportFeaturedDishIds] = useState([]);
  const [featuredDishes, setFeaturedDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [error, setError] = useState('');

  // Fetch settings and featured dishes
  useEffect(() => {
    fetchSettings();
    fetchFeaturedDishes();
  }, []);

  const fetchFeaturedDishes = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin-dishes/public/featured?limit=50');
      const dishes = response.data.dishes || response.data || [];
      setFeaturedDishes(dishes);
    } catch (err) {
      console.error('Error fetching featured dishes:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/settings');
      setMobileHeroFeaturedDishId(response.data.mobileHeroFeaturedDishId || '');
      setMobileSupportFeaturedDishIds(response.data.mobileSupportFeaturedDishIds || []);
      setError('');
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSupportDishChange = (index, dishId) => {
    const newSupportDishes = [...mobileSupportFeaturedDishIds];
    newSupportDishes[index] = dishId;
    setMobileSupportFeaturedDishIds(newSupportDishes);
  };

  const handleSave = async () => {
    // Validation - ensure exactly 2 support dishes selected
    if (mobileSupportFeaturedDishIds.length !== 2) {
      setSnackbar({
        open: true,
        message: 'Please select exactly 2 support featured dishes',
        severity: 'error'
      });
      return;
    }

    // Ensure support dishes are unique
    if (mobileSupportFeaturedDishIds[0] === mobileSupportFeaturedDishIds[1]) {
      setSnackbar({
        open: true,
        message: 'Support dishes must be different from each other',
        severity: 'error'
      });
      return;
    }

    try {
      setSaving(true);
      await axios.put('http://localhost:5000/api/settings', {
        mobileHeroFeaturedDishId: mobileHeroFeaturedDishId || null,
        mobileSupportFeaturedDishIds: mobileSupportFeaturedDishIds
      });
      setSnackbar({
        open: true,
        message: 'Settings saved successfully!',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      setSnackbar({
        open: true,
        message: 'Failed to save settings',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Get available dishes for support dropdowns (excluding hero dish)
  const getAvailableSupportDishes = (excludeIndex) => {
    return featuredDishes.filter(dish => {
      // Exclude hero dish
      if (dish._id === mobileHeroFeaturedDishId) return false;
      // Exclude other support dish if this is for the second dropdown
      if (excludeIndex === 1 && mobileSupportFeaturedDishIds[0] && dish._id === mobileSupportFeaturedDishIds[0]) return false;
      return true;
    });
  };

  return (
    <Box sx={{ px: '52px', py: 3, direction: isRTL ? 'rtl' : 'ltr', bgcolor: '#FAF5F3', minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        App Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Mobile Home Featured Dishes
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure which dishes appear as featured on the mobile home screen.
          Hero dish appears large at the top, support dishes appear side by side below.
        </Typography>

        {/* Hero Featured Dish Selector */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Hero Featured Dish</InputLabel>
          <Select
            value={mobileHeroFeaturedDishId}
            onChange={(e) => setMobileHeroFeaturedDishId(e.target.value)}
            label="Hero Featured Dish"
          >
            <MenuItem value="">
              <em>Auto (First Featured Dish)</em>
            </MenuItem>
            {featuredDishes.map((dish) => (
              <MenuItem key={dish._id} value={dish._id}>
                {dish.nameEn || dish.name || dish._id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Support Featured Dishes Selectors */}
        <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, mb: 1 }}>
          Support Featured Dishes (Select 2)
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Support Dish 1</InputLabel>
            <Select
              value={mobileSupportFeaturedDishIds[0] || ''}
              onChange={(e) => handleSupportDishChange(0, e.target.value)}
              label="Support Dish 1"
            >
              <MenuItem value="">
                <em>Auto</em>
              </MenuItem>
              {getAvailableSupportDishes(0).map((dish) => (
                <MenuItem key={dish._id} value={dish._id}>
                  {dish.nameEn || dish.name || dish._id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Support Dish 2</InputLabel>
            <Select
              value={mobileSupportFeaturedDishIds[1] || ''}
              onChange={(e) => handleSupportDishChange(1, e.target.value)}
              label="Support Dish 2"
            >
              <MenuItem value="">
                <em>Auto</em>
              </MenuItem>
              {getAvailableSupportDishes(1).map((dish) => (
                <MenuItem key={dish._id} value={dish._id}>
                  {dish.nameEn || dish.name || dish._id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{
              bgcolor: '#FF7A00',
              '&:hover': { bgcolor: '#E66900' }
            }}
          >
            {saving ? <CircularProgress size={24} /> : 'Save Settings'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={fetchSettings}
            disabled={saving}
          >
            Reset
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;
