import React, { useState, useEffect, useContext } from 'react';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Collapse,
  Paper,
} from '@mui/material';
import {
  Campaign as CampaignIcon,
  TrendingUp as TrendingUpIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  RestaurantMenu as DishIcon,
  Discount as DiscountIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { formatNumber, formatDateTime } from '../utils/localeFormatter';
import api from '../utils/api';

const Marketing = () => {
  const { t, isRTL, language } = useLanguage();
  const { showNotification } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState(null);
  const [error, setError] = useState('');
  const [expandedCampaigns, setExpandedCampaigns] = useState({});

  useEffect(() => {
    fetchCampaignImpact();
  }, []);

  const fetchCampaignImpact = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/campaigns/impact/my-dishes');
      
      if (response.data.success) {
        setCampaignData(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch campaign data');
      }
    } catch (err) {
      console.error('Error fetching campaign impact:', err);
      setError(err.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCampaignExpand = (campaignId) => {
    setExpandedCampaigns(prev => ({
      ...prev,
      [campaignId]: !prev[campaignId]
    }));
  };

  const formatCampaignDate = (dateStr) => {
    if (!dateStr) return '';
    return formatDateTime(dateStr, language);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PAUSED': return 'warning';
      case 'ENDED': return 'default';
      default: return 'default';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'DISCOUNT': return 'primary';
      case 'COUPON': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        bgcolor: '#FAF5F3', 
        px: '52px',
        py: 3,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <CircularProgress sx={{ color: '#FF7A00' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: '#FAF5F3', 
      px: '52px',
      py: 3,
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      {/* Page Title & Subtitle */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            color: '#1E293B',
            mb: 0.5,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {language === 'ar' ? 'الحملات التسويقية' : 'Marketing Campaigns'}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#6B7280',
            fontSize: '14px',
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {language === 'ar' 
            ? 'عرض الحملات النشطة التي تؤثر على أطباقك 📊'
            : 'View active campaigns affecting your dishes 📊'}
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Summary Stats */}
      {campaignData && campaignData.campaigns.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#10b981', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Box 
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)', 
                      borderRadius: '50%', 
                      width: 40, 
                      height: 40, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    <CampaignIcon style={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={700}>
                      {formatNumber(campaignData.summary?.totalActiveCampaigns || 0, language)}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {language === 'ar' ? 'حملات نشطة' : 'Active Campaigns'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Box 
                    sx={{ 
                      bgcolor: '#3f51b5', 
                      borderRadius: '50%', 
                      width: 40, 
                      height: 40, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    <TrendingUpIcon style={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={700}>
                      {formatNumber(campaignData.summary?.totalAffectedDishes || 0, language)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {language === 'ar' ? 'طبق受到影响' : 'Affected Dishes'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Box 
                    sx={{ 
                      bgcolor: '#ff9800', 
                      borderRadius: '50%', 
                      width: 40, 
                      height: 40, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    <DiscountIcon style={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={700}>
                      {formatNumber(campaignData.summary?.discountCampaigns || 0, language)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {language === 'ar' ? 'خصومات' : 'Discounts'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Box 
                    sx={{ 
                      bgcolor: '#9c27b0', 
                      borderRadius: '50%', 
                      width: 40, 
                      height: 40, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    <DishIcon style={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={700}>
                      {formatNumber(campaignData.summary?.couponCampaigns || 0, language)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {language === 'ar' ? 'كوبونات' : 'Coupons'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
        {language === 'ar'
          ? 'الحملات التسويقية تُنشأ وتُدار من قِبل المنصة. يعرض هذا القسم فقط التأثير على أطباقك.'
          : 'Marketing campaigns are created and managed by the platform. This section shows only the impact on your dishes.'}
      </Alert>

      {/* Active Campaigns List */}
      {campaignData && campaignData.campaigns.length > 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              {language === 'ar' ? 'الحملات النشطة التي تؤثر على أطباقك' : 'Active Campaigns Affecting Your Dishes'}
            </Typography>
            
            <Grid container spacing={2}>
              {campaignData.campaigns.map((campaign) => (
                <Grid item xs={12} key={campaign.id}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      borderRadius: '12px',
                      overflow: 'hidden',
                      borderColor: '#e0e0e0',
                    }}
                  >
                    {/* Campaign Header */}
                    <Box 
                      sx={{ 
                        p: 2, 
                        bgcolor: '#f8f9fa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#f0f0f0' }
                      }}
                      onClick={() => toggleCampaignExpand(campaign.id)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        <Box 
                          sx={{ 
                            width: 48, 
                            height: 48, 
                            borderRadius: '12px',
                            bgcolor: campaign.type === 'DISCOUNT' ? '#ff9800' : '#9c27b0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                          }}
                        >
                          <CampaignIcon />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {campaign.name}
                            </Typography>
                            <Chip 
                              label={campaign.type} 
                              size="small" 
                              color={getTypeColor(campaign.type)}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                            <Chip 
                              label={campaign.status} 
                              size="small" 
                              color={getStatusColor(campaign.status)}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          </Box>
                          <Typography variant="body2" color="textSecondary">
                            {language === 'ar' 
                              ? `${campaign.affectedDishCount} طبق受到影响`
                              : `${campaign.affectedDishCount} dishes affected`}
                            {campaign.discountPercent > 0 && ` • ${campaign.discountPercent}% ${language === 'ar' ? 'خصم' : 'discount'}`}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton size="small">
                        {expandedCampaigns[campaign.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>

                    {/* Campaign Details */}
                    <Collapse in={expandedCampaigns[campaign.id]}>
                      <Divider />
                      <Box sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                          {/* Campaign Info */}
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                              {language === 'ar' ? 'تفاصيل الحملة' : 'Campaign Details'}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="textSecondary">
                                  {language === 'ar' ? 'نسبة الخصم' : 'Discount %'}
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  {campaign.discountPercent}%
                                </Typography>
                              </Box>
                              {campaign.minOrderValue > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" color="textSecondary">
                                    {language === 'ar' ? 'الحد الأدنى للطلب' : 'Min Order Value'}
                                  </Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {formatNumber(campaign.minOrderValue, language)}
                                  </Typography>
                                </Box>
                              )}
                              {campaign.maxDiscountAmount > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" color="textSecondary">
                                    {language === 'ar' ? 'الحد الأقصى للخصم' : 'Max Discount'}
                                  </Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {formatNumber(campaign.maxDiscountAmount, language)}
                                  </Typography>
                                </Box>
                              )}
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="textSecondary">
                                  {language === 'ar' ? 'تاريخ البداية' : 'Start Date'}
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  {formatCampaignDate(campaign.startAt)}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="textSecondary">
                                  {language === 'ar' ? 'تاريخ النهاية' : 'End Date'}
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  {formatCampaignDate(campaign.endAt)}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>

                          {/* Affected Dishes */}
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                              {language === 'ar' ? 'الأطباق المتأثرة' : 'Affected Dishes'}
                              {campaign.scope.applyToAll && (
                                <Chip 
                                  label={language === 'ar' ? 'الكل' : 'All'} 
                                  size="small" 
                                  color="success"
                                  sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                                />
                              )}
                            </Typography>
                            {campaign.affectedDishes && campaign.affectedDishes.length > 0 ? (
                              <Box 
                                sx={{ 
                                  maxHeight: 150, 
                                  overflowY: 'auto',
                                  bgcolor: '#f9f9f9',
                                  borderRadius: '8px',
                                  p: 1
                                }}
                              >
                                {campaign.affectedDishes.map((dish) => (
                                  <Box 
                                    key={dish.id}
                                    sx={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 1,
                                      py: 0.5,
                                      px: 1,
                                      borderRadius: '4px',
                                      '&:hover': { bgcolor: '#eee' }
                                    }}
                                  >
                                    <DishIcon sx={{ fontSize: 18, color: '#666' }} />
                                    <Typography variant="body2">
                                      {dish.name}
                                    </Typography>
                                  </Box>
                                ))}
                                {campaign.affectedDishCount > 10 && (
                                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                                    {language === 'ar' 
                                      ? `و ${campaign.affectedDishCount - 10} أطباق أخرى...`
                                      : `And ${campaign.affectedDishCount - 10} more dishes...`}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                {language === 'ar' ? 'لا توجد أطباق محددة' : 'No specific dishes'}
                              </Typography>
                            )}
                          </Grid>
                        </Grid>
                      </Box>
                    </Collapse>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      ) : (
        /* Empty State */
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <Box 
              sx={{ 
                width: 80, 
                height: 80, 
                borderRadius: '50%', 
                bgcolor: '#f0f0f0', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <CampaignIcon sx={{ fontSize: 40, color: '#999' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {language === 'ar' ? 'لا توجد حملات نشطة' : 'No Active Campaigns'}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 400, mx: 'auto' }}>
              {language === 'ar' 
                ? 'لا توجد حالياً حملات تسويقية نشطة تؤثر على أطباقك. ستظهر هنا عندما يُنشئ الفريق حملات جديدة.'
                : 'There are currently no active marketing campaigns affecting your dishes. They will appear here when the team creates new campaigns.'}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Marketing;
