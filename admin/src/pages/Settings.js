import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import axios from 'axios';
import HeroImagesManager from '../components/HeroImagesManager';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAllVatCountries, setShowAllVatCountries] = useState(false);

  const [settings, setSettings] = useState({
    heroAdsCount: 5,
    enableCardPayment: false,
    stripePublicKey: '',
    stripeSecretKey: '',
    vatByCountry: [],
  });

  // Fetch current settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5005/api/settings');
      setSettings(response.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleAddCountry = () => {
    setSettings(prev => ({
      ...prev,
      vatByCountry: [
        ...prev.vatByCountry,
        {
          countryCode: '',
          countryName: '',
          checkoutVatEnabled: false,
          checkoutVatRate: 15,
          invoiceVatEnabled: false,
          invoiceVatRate: 15,
          vatLabel: 'VAT'
        }
      ]
    }));
  };

  const handleRemoveCountry = (index) => {
    setSettings(prev => ({
      ...prev,
      vatByCountry: prev.vatByCountry.filter((_, i) => i !== index)
    }));
  };

  const handleCountryChange = (index, field, value) => {
    setSettings(prev => {
      const updated = [...prev.vatByCountry];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, vatByCountry: updated };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validate
      if (settings.heroAdsCount < 1 || settings.heroAdsCount > 5) {
        setError('Hero Ads Count must be between 1 and 5');
        return;
      }

      // Validate per-country VAT
      if (settings.vatByCountry && settings.vatByCountry.length > 0) {
        for (const country of settings.vatByCountry) {
          if (!country.countryCode || !country.countryName) {
            setError('All VAT country entries must have a code and name');
            return;
          }
          if (country.checkoutVatEnabled && (country.checkoutVatRate < 0 || country.checkoutVatRate > 100)) {
            setError(`Checkout VAT Rate for ${country.countryName} must be between 0 and 100`);
            return;
          }
          if (country.invoiceVatEnabled && (country.invoiceVatRate < 0 || country.invoiceVatRate > 100)) {
            setError(`Invoice VAT Rate for ${country.countryName} must be between 0 and 100`);
            return;
          }
        }
      }

      const token = localStorage.getItem('token');
      await axios.put(
        'http://localhost:5005/api/settings',
        settings,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSuccess('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 56px)', width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '24px', mb: 0.5 }}>
          App Settings
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '13px' }}>
          Configure application settings, payment methods, and VAT rates
        </Typography>
      </Box>

      <Paper sx={{ p: 3, borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2.5 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Hero Images Management */}
        <Box sx={{ mb: 4 }}>
          <HeroImagesManager />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Payment Settings */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, fontSize: '15px', color: '#1a1a1a' }}>
            Payment Settings
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={settings.enableCardPayment}
                onChange={(e) => handleChange('enableCardPayment', e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '13px', color: '#1a1a1a' }}>
                  Enable Card Payment
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                  Allow customers to pay with credit/debit cards via Stripe
                </Typography>
              </Box>
            }
            sx={{ mb: 3, alignItems: 'flex-start' }}
          />

          {settings.enableCardPayment && (
            <Box sx={{ ml: 4, p: 2.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#1a1a1a', fontSize: '13px' }}>
                Stripe Configuration
              </Typography>

              <TextField
                label="Stripe Publishable Key"
                value={settings.stripePublicKey}
                onChange={(e) => handleChange('stripePublicKey', e.target.value)}
                fullWidth
                size="small"
                placeholder="pk_test_..."
                helperText="Your Stripe publishable key (starts with pk_)"
                sx={{ mb: 2, fontSize: '13px' }}
              />

              <TextField
                label="Stripe Secret Key"
                value={settings.stripeSecretKey}
                onChange={(e) => handleChange('stripeSecretKey', e.target.value)}
                fullWidth
                size="small"
                type="password"
                placeholder="sk_test_..."
                helperText="Your Stripe secret key (starts with sk_). Keep this secure!"
                sx={{ mb: 2, fontSize: '13px' }}
              />

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontSize: '12px' }}>
                  <strong>Note:</strong> When card payment is disabled, only Cash on Delivery will be available to customers during checkout.
                </Typography>
              </Alert>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* VAT Settings (Per Country) */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '15px', color: '#1a1a1a' }}>
              VAT Settings (Per Country)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="text"
                onClick={() => setShowAllVatCountries(!showAllVatCountries)}
                size="small"
                sx={{
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: 500,
                  textTransform: 'none',
                  mr: 1
                }}
              >
                {showAllVatCountries
                  ? 'View enabled only'
                  : `View all countries (${settings.vatByCountry.length})`}
              </Button>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddCountry}
                size="small"
                sx={{
                  color: '#1976d2',
                  borderColor: '#1976d2',
                  fontSize: '12px',
                  fontWeight: 500,
                  textTransform: 'none',
                  '&:hover': { borderColor: '#1565c0', bgcolor: '#1976d210' }
                }}
              >
                Add Country
              </Button>
            </Box>
          </Box>

          {(() => {
            const enabledCountries = settings.vatByCountry.filter(c => c.checkoutVatEnabled);
            const displayedCountries = showAllVatCountries ? settings.vatByCountry : enabledCountries;

            if (settings.vatByCountry.length === 0) {
              return (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontSize: '13px' }}>
                    No per-country VAT settings configured. VAT will be OFF by default for all countries.
                  </Typography>
                </Alert>
              );
            }

            if (displayedCountries.length === 0) {
              return (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontSize: '13px' }}>
                    No checkout VAT enabled yet.
                  </Typography>
                </Alert>
              );
            }

            return displayedCountries.map((country, displayIndex) => {
              const originalIndex = settings.vatByCountry.findIndex(c => c.countryCode === country.countryCode && c.countryName === country.countryName);
              return (
              <Box
                key={country.countryCode || displayIndex}
                sx={{
                  p: 3,
                  mb: 3,
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  bgcolor: '#f8fafc',
                  position: 'relative'
                }}
              >
                <IconButton
                  onClick={() => handleRemoveCountry(originalIndex)}
                  sx={{ position: 'absolute', top: 8, right: 8, color: '#9ca3af' }}
                  size="small"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2, mb: 3 }}>
                  <TextField
                    label="Country Code (ISO)"
                    value={country.countryCode}
                    onChange={(e) => handleCountryChange(originalIndex, 'countryCode', e.target.value.toUpperCase())}
                    placeholder="e.g. SA, EG, AE"
                    required
                    size="small"
                    sx={{ fontSize: '13px' }}
                  />
                  <TextField
                    label="Country Name"
                    value={country.countryName}
                    onChange={(e) => handleCountryChange(originalIndex, 'countryName', e.target.value)}
                    placeholder="e.g. Saudi Arabia, Egypt"
                    required
                    size="small"
                    sx={{ fontSize: '13px' }}
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {/* Checkout VAT */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: '13px', color: '#1a1a1a' }}>
                      Checkout VAT
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={country.checkoutVatEnabled}
                          onChange={(e) => handleCountryChange(originalIndex, 'checkoutVatEnabled', e.target.checked)}
                          color="primary"
                          size="small"
                        />
                      }
                      label="Enable for Checkout"
                      sx={{ mb: 1 }}
                    />
                    {country.checkoutVatEnabled && (
                      <TextField
                        label="Checkout VAT Rate (%)"
                        type="number"
                        value={country.checkoutVatRate}
                        onChange={(e) => handleCountryChange(originalIndex, 'checkoutVatRate', parseFloat(e.target.value) || 0)}
                        fullWidth
                        size="small"
                        inputProps={{ min: 0, max: 100, step: 0.01 }}
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>

                  {/* Invoice VAT */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: '13px', color: '#1a1a1a' }}>
                      Cook Invoice VAT
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={country.invoiceVatEnabled}
                          onChange={(e) => handleCountryChange(originalIndex, 'invoiceVatEnabled', e.target.checked)}
                          color="primary"
                          size="small"
                        />
                      }
                      label="Enable for Invoices"
                      sx={{ mb: 1 }}
                    />
                    {country.invoiceVatEnabled && (
                      <TextField
                        label="Invoice VAT Rate (%)"
                        type="number"
                        value={country.invoiceVatRate}
                        onChange={(e) => handleCountryChange(originalIndex, 'invoiceVatRate', parseFloat(e.target.value) || 0)}
                        fullWidth
                        size="small"
                        inputProps={{ min: 0, max: 100, step: 0.01 }}
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>
                </Box>

                <TextField
                  label="VAT Label"
                  value={country.vatLabel}
                  onChange={(e) => handleCountryChange(originalIndex, 'vatLabel', e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ mt: 2 }}
                />
              </Box>
            );
          })()}
          )}
        </Box>

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            sx={{
              bgcolor: '#1976d2',
              color: '#FFFFFF',
              px: 4,
              py: 1.2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '13px',
              '&:hover': { bgcolor: '#1565c0' }
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Settings;
