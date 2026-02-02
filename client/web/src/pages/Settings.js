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
} from '@mui/material';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';

const Settings = () => {
  const { isRTL } = useLanguage();
  const [heroAdsCount, setHeroAdsCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [error, setError] = useState('');

  // Fetch current settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/settings');
      setHeroAdsCount(response.data.heroAdsCount || 5);
      setError('');
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    const count = parseInt(heroAdsCount);
    if (isNaN(count) || count < 1 || count > 5) {
      setSnackbar({
        open: true,
        message: 'Hero Ads Count must be between 1 and 5',
        severity: 'error'
      });
      return;
    }

    try {
      setSaving(true);
      await axios.put('http://localhost:5000/api/settings', {
        heroAdsCount: count
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
          Hero Ads Configuration
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Control how many hero advertisement banners are displayed in the Foodie mobile app home screen.
          Images are loaded from Ad1.png through Ad5.png in the images folder.
        </Typography>

        <TextField
          label="Hero Ads Count"
          type="number"
          value={heroAdsCount}
          onChange={(e) => setHeroAdsCount(e.target.value)}
          fullWidth
          inputProps={{ min: 1, max: 5 }}
          helperText="Enter a number between 1 and 5"
          sx={{ mb: 3 }}
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
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
