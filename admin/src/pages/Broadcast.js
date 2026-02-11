import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Alert,
  CircularProgress,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  Send as SendIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material';
import api from '../utils/api';

const TARGET_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'foodies', label: 'All Foodies' },
  { value: 'cooks', label: 'All Cooks' },
  { value: 'active_cooks', label: 'Active Cooks' },
  { value: 'pending_cooks', label: 'Pending Cooks' },
];

const DELIVERY_METHODS = [
  { value: 'push', label: 'Push Notification Only' },
  { value: 'message', label: 'In-App Message Only' },
  { value: 'both', label: 'Both Push & Message' },
];

const Broadcast = () => {
  const [targetAudience, setTargetAudience] = useState('all');
  const [deliveryMethod, setDeliveryMethod] = useState('both');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.post('/admin/broadcast', {
        targetAudience,
        deliveryMethod,
        subject: subject.trim(),
        message: message.trim(),
      });

      if (response.data?.success) {
        setResult(response.data.data);
        // Reset form
        setSubject('');
        setMessage('');
      } else {
        setError(response.data?.message || 'Failed to send broadcast');
      }
    } catch (err) {
      console.error('Broadcast error:', err);
      setError(err.response?.data?.message || 'Failed to send broadcast. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = subject.trim() && message.trim() && targetAudience;

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 600, color: '#1a1a2e' }}>
        Broadcast Message
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: '#64748b' }}>
        Send announcements and notifications to users
      </Typography>

      {result && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Broadcast sent successfully! 
          {result.recipientsCount !== undefined && ` ${result.recipientsCount} recipients notified.`}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            {/* Target Audience */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Target Audience</InputLabel>
              <Select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                input={<OutlinedInput label="Target Audience" />}
              >
                {TARGET_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Delivery Method */}
            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#64748b' }}>
                Delivery Method
              </Typography>
              <RadioGroup
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value)}
              >
                {DELIVERY_METHODS.map((method) => (
                  <FormControlLabel
                    key={method.value}
                    value={method.value}
                    control={<Radio />}
                    label={method.label}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            <Divider sx={{ my: 3 }} />

            {/* Subject */}
            <TextField
              fullWidth
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              sx={{ mb: 3 }}
              inputProps={{ maxLength: 200 }}
              helperText={`${subject.length}/200 characters`}
            />

            {/* Message Body */}
            <TextField
              fullWidth
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              multiline
              rows={6}
              sx={{ mb: 3 }}
              inputProps={{ maxLength: 2000 }}
              helperText={`${message.length}/2000 characters`}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={!isFormValid || loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              sx={{
                bgcolor: '#1976d2',
                '&:hover': { bgcolor: '#1565c0' },
                py: 1.5,
                textTransform: 'none',
                fontSize: '16px',
              }}
            >
              {loading ? 'Sending...' : 'Send Broadcast'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card sx={{ mt: 3, borderRadius: 2, bgcolor: '#f8fafc' }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2, color: '#64748b' }}>
            Delivery Method Details
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0, color: '#64748b', fontSize: '14px' }}>
            <li><strong>Push Notification:</strong> Sends to users' devices via FCM. Users see it even when app is closed.</li>
            <li><strong>In-App Message:</strong> Creates a message in the user's Message Center inbox.</li>
            <li><strong>Both:</strong> Sends push notification AND creates an in-app message for maximum reach.</li>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Broadcast;
