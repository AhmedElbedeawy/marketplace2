import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
  Grid
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  LocalOffer as OfferIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Discount as DiscountIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';

const Offers = () => {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/api/public/campaigns`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      if (response.data.success) {
        // Filter only active campaigns
        const activeCampaigns = response.data.data.filter(
          campaign => campaign.status === 'ACTIVE'
        );
        setCampaigns(activeCampaigns);
      }
    } catch (err) {
      console.error('Fetch campaigns error:', err);
      setError(err.response?.data?.message || (language === 'ar' ? 'فشل في تحميل العروض' : 'Failed to load offers'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'DRAFT':
        return 'default';
      case 'EXPIRED':
        return 'error';
      default:
        return 'primary';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: '#FF7A00' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: '900px', mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/')}>
          {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto', direction: isRTL ? 'rtl' : 'ltr' }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/')} sx={{ bgcolor: '#FFFFFF' }}>
          <BackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {language === 'ar' ? 'العروض والخصومات' : 'Offers & Discounts'}
        </Typography>
      </Box>

      {campaigns.length === 0 ? (
        <Card sx={{ borderRadius: '12px', textAlign: 'center', py: 6 }}>
          <OfferIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {language === 'ar' ? 'لا توجد عروض نشطة حالياً' : 'No active offers currently'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {language === 'ar' 
              ? 'تحقق من التطبيق لاحقاً للحصول على عروض حصرية' 
              : 'Check back later for exclusive offers'}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/')}
            sx={{ mt: 3, bgcolor: '#FF7A00', '&:hover': { bgcolor: '#FF9933' } }}
          >
            {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {campaigns.map((campaign) => (
            <Grid item xs={12} md={6} lg={4} key={campaign._id}>
              <Card sx={{ 
                borderRadius: '12px', 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                }
              }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DiscountIcon sx={{ color: '#FF7A00' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {campaign.name}
                      </Typography>
                    </Box>
                    <Chip 
                      label={campaign.status} 
                      size="small" 
                      color={getStatusColor(campaign.status)}
                    />
                  </Box>

                  {campaign.discountPercent && (
                    <Box sx={{ 
                      bgcolor: '#FF7A00', 
                      color: 'white', 
                      px: 2, 
                      py: 1, 
                      borderRadius: '8px',
                      display: 'inline-block',
                      mb: 2
                    }}>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {campaign.discountPercent}%
                      </Typography>
                      <Typography variant="caption">
                        {language === 'ar' ? 'خصم' : 'OFF'}
                      </Typography>
                    </Box>
                  )}

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {campaign.description || (language === 'ar' 
                      ? 'عرض خاص متاح الآن' 
                      : 'Special offer available now')}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {language === 'ar' ? 'يبدأ في:' : 'Starts:'} {formatDate(campaign.startAt)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {language === 'ar' ? 'ينتهي في:' : 'Ends:'} {formatDate(campaign.endAt)}
                    </Typography>
                  </Box>

                  {campaign.type === 'COUPON' && campaign.coupons?.[0] && (
                    <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {language === 'ar' ? 'كود الخصم' : 'Coupon Code'}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 2 }}>
                        {campaign.coupons[0].code}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Offers;
