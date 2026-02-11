import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  Stack,
  Divider,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import {
  LocalShipping as DeliveryIcon,
  Store as PickupIcon,
  AccessTime as ClockIcon,
  CheckCircle as CheckCircleIcon,
  Kitchen as KitchenIcon,
  Cancel as CancelIcon,
  LocalDining as DiningIcon,
  Star as StarIcon,
  RateReview as RateReviewIcon,
} from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../utils/localeFormatter';
import RatingDialog from '../../components/RatingDialog';
import RatingReminderBanner from '../../components/RatingReminderBanner';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api, { normalizeImageUrl } from '../../utils/api';

const FoodieOrders = () => {
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedOrderForRating, setSelectedOrderForRating] = useState(null);
  const [orderRatingStatuses, setOrderRatingStatuses] = useState({});

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders');
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch rating statuses for completed orders
  useEffect(() => {
    fetchRatingStatuses();
  }, []);

  const fetchRatingStatuses = async () => {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const token = localStorage.getItem('token');
    
    if (!token || completedOrders.length === 0) return;

    const statuses = {};
    
    for (const order of completedOrders) {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/api/ratings/order/${order._id}/status`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        if (response.data.success) {
          statuses[order._id] = response.data.data;
        }
      } catch (err) {
        console.error('Error fetching rating status:', err);
      }
    }
    
    setOrderRatingStatuses(statuses);
  };

  const handleOpenRatingDialog = (order) => {
    setSelectedOrderForRating(order);
    setRatingDialogOpen(true);
  };

  const handleCloseRatingDialog = () => {
    setRatingDialogOpen(false);
    setSelectedOrderForRating(null);
  };

  const handleRatingSubmitted = () => {
    // Refresh rating statuses
    fetchRatingStatuses();
  };

  const getRatingButton = (order) => {
    if (order.status !== 'completed') return null;

    const ratingStatus = orderRatingStatuses[order._id];
    
    if (!ratingStatus) {
      return (
        <Button
          variant="contained"
          size="small"
          startIcon={<StarIcon />}
          onClick={() => handleOpenRatingDialog(order)}
          sx={{
            bgcolor: '#FF7A00',
            '&:hover': { bgcolor: '#FF9933' },
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {language === 'ar' ? 'قيّم الطلب' : 'Rate Order'}
        </Button>
      );
    }

    if (ratingStatus.isRated && ratingStatus.canEdit) {
      return (
        <Button
          variant="outlined"
          size="small"
          startIcon={<RateReviewIcon />}
          onClick={() => handleOpenRatingDialog(order)}
          sx={{
            borderColor: '#FF7A00',
            color: '#FF7A00',
            '&:hover': {
              borderColor: '#FF9933',
              bgcolor: '#FFF5F0',
            },
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {language === 'ar' ? 'تعديل التقييم' : 'Edit Rating'}
        </Button>
      );
    }

    if (ratingStatus.isRated) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <StarIcon sx={{ color: '#FF7A00', fontSize: 18 }} />
          <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 600 }}>
            {language === 'ar' ? 'تم التقييم' : 'Rated'}
          </Typography>
        </Box>
      );
    }

    return null;
  };

  const handleMarkAsDelivered = async (e, order) => {
    e.stopPropagation();
    try {
      // Find the subOrder for this order
      const subOrder = order.subOrders?.[0];
      if (!subOrder) return;
      
      await api.put(`/orders/sub-order/${subOrder._id}/status`, {
        status: 'delivered'
      });
      
      // Refresh orders
      fetchOrders();
    } catch (err) {
      console.error('Failed to mark as delivered:', err);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      cooking: {
        label: language === 'ar' ? 'قيد التحضير' : 'Being Cooked',
        color: '#F59E0B',
        icon: <KitchenIcon sx={{ fontSize: 14 }} />,
      },
      ready: {
        label: language === 'ar' ? 'جاهز' : 'Ready',
        color: '#10B981',
        icon: <CheckCircleIcon sx={{ fontSize: 14 }} />,
      },
      delivered: {
        label: language === 'ar' ? 'تم التوصيل' : 'Delivered',
        color: '#3B82F6',
        icon: <DeliveryIcon sx={{ fontSize: 14 }} />,
      },
      cancelled: {
        label: language === 'ar' ? 'ملغى' : 'Cancelled',
        color: '#9CA3AF',
        icon: <CancelIcon sx={{ fontSize: 14 }} />,
      },
    };

    const config = statusConfig[status] || statusConfig.cooking;

    return (
      <Chip
        icon={config.icon}
        label={config.label}
        sx={{
          bgcolor: config.color,
          color: '#fff',
          fontWeight: 500,
          fontSize: '13px',
          borderRadius: '12px',
          '& .MuiChip-icon': { color: '#fff' },
        }}
        size="small"
      />
    );
  };

  const getDeliveryChip = (deliveryMode) => {
    if (deliveryMode === 'delivery') {
      return (
        <Chip
          icon={<DeliveryIcon sx={{ fontSize: 14 }} />}
          label={language === 'ar' ? 'توصيل' : 'Delivery'}
          sx={{
            bgcolor: '#3B82F6',
            color: '#fff',
            fontWeight: 500,
            fontSize: '13px',
            borderRadius: '10px',
            '& .MuiChip-icon': { color: '#fff' },
          }}
          size="small"
        />
      );
    }
    return (
      <Chip
        icon={<PickupIcon sx={{ fontSize: 14 }} />}
        label={language === 'ar' ? 'استلام' : 'Pickup'}
        sx={{
          bgcolor: '#6B7280',
          color: '#fff',
          fontWeight: 500,
          fontSize: '13px',
          borderRadius: '10px',
          '& .MuiChip-icon': { color: '#fff' },
        }}
        size="small"
      />
    );
  };

  const tabs = ['pending', 'completed', 'cancelled'];
  const tabLabels = language === 'ar' 
    ? ['نشطة', 'مكتملة', 'ملغاة'] 
    : ['Active', 'Completed', 'Cancelled'];

  const filteredOrders = orders.filter(order => {
    if (currentTab === 0) return ['pending', 'confirmed', 'partially_delivered', 'order_received', 'preparing', 'ready'].includes(order.status);
    return order.status === tabs[currentTab];
  });

  return (
    <>
      <Box sx={{ position: 'fixed', top: 0, right: 0, bgcolor: '#0000AA', color: 'white', px: 2, py: 0.5, zIndex: 9999, fontSize: '12px', fontWeight: 'bold' }}>BUILD_STAMP: FEB04_A1</Box>
      <Box sx={{ 
        minHeight: '100vh',
        bgcolor: '#FAF5F3',
        px: '52px',
        py: 3,
        direction: isRTL ? 'rtl' : 'ltr',
      }}>
      {/* Page Title */}
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
          {language === 'ar' ? 'طلباتي' : 'My Orders'}
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
            ? 'تتبع وإدارة طلباتك 🍽️'
            : 'Track and manage your orders 🍽️'}
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              '&.Mui-selected': {
                color: '#FF7A00',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#FF7A00',
            },
          }}
        >
          {tabLabels.map((label, index) => (
            <Tab key={index} label={label} />
          ))}
        </Tabs>
      </Box>

      {/* Rating Reminder Banner (Touchpoint 3) */}
      <RatingReminderBanner onRateNowClick={handleOpenRatingDialog} />

      {/* Orders List */}
      <Stack spacing={2}>
        {filteredOrders.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="textSecondary">
              {language === 'ar' ? 'لا توجد طلبات' : 'No orders found'}
            </Typography>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card
              key={order._id}
              onClick={() => navigate(`/foodie/order-details/${order._id}`)}
              sx={{
                background: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                overflow: 'visible',
                cursor: 'pointer',
                '&:hover': { boxShadow: '0 6px 16px rgba(0,0,0,0.1)' }
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                {/* Card Header */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  mb: 2,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                }}>
                  <Box sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B', fontSize: '16px' }}>
                      {language === 'ar' ? `طلب ${order._id.substring(order._id.length - 6)}` : `Order #${order._id.substring(order._id.length - 6)}`}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
                      {language === 'ar' ? 'من' : 'From'} {order.subOrders?.[0]?.cook?.name || 'Multiple Cooks'}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                      <ClockIcon sx={{ fontSize: 14, color: '#6B7280' }} />
                      <Typography variant="caption" sx={{ color: '#6B7280' }}>
                        {formatDateTime(order.createdAt)}
                      </Typography>
                    </Stack>
                  </Box>

                  <Box sx={{
                    background: '#EAF2FF',
                    color: '#2563EB',
                    fontWeight: 600,
                    fontSize: '15px',
                    borderRadius: '6px',
                    padding: '6px 12px',
                  }}>
                    {formatCurrency(order.totalAmount, language)}
                  </Box>
                </Box>

                {/* Order Items */}
                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  {order.subOrders?.map((sub) => (
                    sub.items.map((item, idx) => (
                      <Box
                        key={`${sub._id}-${idx}`}
                        sx={{
                          display: 'flex',
                          gap: 2,
                          alignItems: 'center',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        }}
                      >
                        <Avatar
                          src={normalizeImageUrl(item.productSnapshot?.image || item.product?.photoUrl)}
                          variant="rounded"
                          sx={{ width: 60, height: 60, borderRadius: '8px' }}
                        >
                          <DiningIcon />
                        </Avatar>

                        <Box sx={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151' }}>
                            {item.productSnapshot?.name || item.product?.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '13px' }}>
                            {language === 'ar' ? `الكمية: ${item.quantity}` : `Qty: ${item.quantity}`} × {formatCurrency(item.price, language)}
                          </Typography>
                        </Box>

                        {getStatusBadge(sub.status)}
                      </Box>
                    ))
                  ))}
                </Stack>

                {/* Footer */}
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                }}>
                  <Box>{getDeliveryChip(order.deliveryMode)}</Box>
                  
                  {order.status !== 'cancelled' && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/foodie/order-details/${order._id}`);
                      }}
                      sx={{
                        borderColor: '#FF7A00',
                        color: '#FF7A00',
                        '&:hover': {
                          borderColor: '#FF9933',
                          bgcolor: '#FFF5F0',
                        },
                      }}
                    >
                      {language === 'ar' ? 'تفاصيل الطلب' : 'View Details'}
                    </Button>
                  )}

                  {/* Mark as Delivered Button */}
                  {['ready', 'out_for_delivery'].includes(order.status) && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={(e) => handleMarkAsDelivered(e, order)}
                      sx={{
                        bgcolor: '#10B981',
                        color: '#fff',
                        '&:hover': {
                          bgcolor: '#059669',
                        },
                        textTransform: 'none',
                        fontWeight: 600,
                      }}
                    >
                      {language === 'ar' ? 'تأكيد الاستلام' : 'Mark as Delivered'}
                    </Button>
                  )}

                  {/* Rating Button (Touchpoint 2: Persistent Orders CTA) */}
                  {order.status === 'completed' && getRatingButton(order)}
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>

      {/* Rating Dialog (Touchpoint 1: Immediate Post-Completion Prompt) */}
      <RatingDialog
        open={ratingDialogOpen}
        onClose={handleCloseRatingDialog}
        order={selectedOrderForRating}
        onRatingSubmitted={handleRatingSubmitted}
      />
      </Box>
    </>
  );
};

export default FoodieOrders;
