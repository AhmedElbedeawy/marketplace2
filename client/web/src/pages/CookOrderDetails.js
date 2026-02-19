import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Divider,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Map as MapIcon,
  CalendarToday as CalendarIcon,
  AccessTime as ClockIcon,
  LocalDining as DiningIcon,
  Receipt as ReceiptIcon,
  Close as CloseIcon,
  LocalShipping as ShippingIcon,
  Schedule as ScheduleIcon,
  MergeType as MergeIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import api, { normalizeImageUrl } from '../utils/api';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '400px',
  borderRadius: '8px'
};

const CookOrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ['places']
  });

  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapDialogOpen, setMapDialogOpen] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    console.log('CookOrderDetails - Fetching order:', orderId);
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/orders/cook/orders/${orderId}`);

      if (response.data.success) {
        setOrderData(response.data.data);
      }
    } catch (err) {
      console.error('Fetch order details error:', err);
      setError(err.response?.data?.message || (language === 'ar' ? 'فشل في تحميل تفاصيل الطلب' : 'Failed to load order details'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#F5F5F5'
        }}
      >
        <CircularProgress sx={{ color: '#FF7A00' }} />
      </Box>
    );
  }

  if (error || !orderData) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#F5F5F5',
          p: 3
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || (language === 'ar' ? 'الطلب غير موجود' : 'Order not found')}
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/orders')}
          sx={{ textTransform: 'none' }}
        >
          {language === 'ar' ? 'العودة للطلبات' : 'Back to Orders'}
        </Button>
      </Box>
    );
  }

  return (
    <>
      {process.env.NODE_ENV !== 'production' && (
        <Box sx={{ position: 'fixed', top: 0, right: 0, bgcolor: '#0000AA', color: 'white', px: 2, py: 0.5, zIndex: 9999, fontSize: '12px', fontWeight: 'bold' }}>BUILD_STAMP: FEB04_A1</Box>
      )}
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#F5F5F5',
          p: 3,
          direction: isRTL ? 'rtl' : 'ltr'
        }}
      >
        {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton
          onClick={() => navigate('/orders')}
          sx={{ bgcolor: '#FFFFFF', '&:hover': { bgcolor: '#F3F4F6' } }}
        >
          <BackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2C2C2C' }}>
            {language === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            #{orderData.orderId}
          </Typography>
        </Box>
      </Box>

      {/* Main Content - Two Column Layout */}
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Left Column - Order Items */}
        <Box sx={{ flex: 1 }}>
          <Card sx={{ borderRadius: '12px', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DiningIcon sx={{ color: '#FF7A00', fontSize: 24, mr: isRTL ? 0 : 1, ml: isRTL ? 1 : 0 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {language === 'ar' ? 'العناصر المطلوبة' : 'Order Items'}
                </Typography>
              </Box>
              
              {/* Combine/Separate Status Banner */}
              {orderData.timingPreference && orderData.items.length > 1 && (
                <Box 
                  sx={{ 
                    mb: 3, 
                    p: 2, 
                    bgcolor: orderData.timingPreference === 'combined' ? '#E8F5E9' : '#FFF3E0',
                    borderRadius: '8px',
                    border: `1px solid ${orderData.timingPreference === 'combined' ? '#4CAF50' : '#FF9800'}`
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {orderData.timingPreference === 'combined' ? (
                      <MergeIcon sx={{ color: '#4CAF50' }} />
                    ) : (
                      <ScheduleIcon sx={{ color: '#FF9800' }} />
                    )}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: orderData.timingPreference === 'combined' ? '#2E7D32' : '#E65100' }}>
                        {orderData.timingPreference === 'combined'
                          ? (language === 'ar' ? 'طلب مجمع' : 'Combined Order')
                          : (language === 'ar' ? 'طلب منفصل' : 'Separate Order')
                        }
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {orderData.timingPreference === 'combined'
                          ? (orderData.fulfillmentMode === 'delivery'
                              ? (language === 'ar' 
                                  ? `سيتم توصيل جميع العناصر معاً - التحضير بحلول ${orderData.combinedReadyTime ? formatTime(orderData.combinedReadyTime) : 'الوقت المحدد'}`
                                  : `All items delivered together - Prepare by ${orderData.combinedReadyTime ? formatTime(orderData.combinedReadyTime) : 'scheduled time'}`)
                              : (language === 'ar'
                                  ? `جميع العناصر جاهزة للاستلام معاً - التحضير بحلول ${orderData.combinedReadyTime ? formatTime(orderData.combinedReadyTime) : 'الوقت المحدد'}`
                                  : `All items ready for pickup together - Prepare by ${orderData.combinedReadyTime ? formatTime(orderData.combinedReadyTime) : 'scheduled time'}`)
                            )
                          : (orderData.fulfillmentMode === 'delivery'
                              ? (language === 'ar' ? 'سيتم توصيل كل عنصر على حدة حسب وقت تحضيره' : 'Each item delivered separately when ready')
                              : (language === 'ar' ? 'كل عنصر جاهز للاستلام حسب وقت تحضيره' : 'Each item ready for pickup according to prep time')
                            )
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
              
              {/* Fulfillment Mode Badge */}
              <Box sx={{ mb: 2 }}>
                <Chip
                  icon={orderData.fulfillmentMode === 'delivery' ? <ShippingIcon /> : <LocationIcon />}
                  label={orderData.fulfillmentMode === 'delivery' 
                    ? (language === 'ar' ? 'توصيل' : 'Delivery')
                    : (language === 'ar' ? 'استلام' : 'Pickup')
                  }
                  sx={{ 
                    bgcolor: orderData.fulfillmentMode === 'delivery' ? '#E3F2FD' : '#F3E5F5',
                    color: orderData.fulfillmentMode === 'delivery' ? '#1565C0' : '#6A1B9A',
                    fontWeight: 600
                  }}
                />
              </Box>

              <Stack spacing={2}>
                {orderData.items.map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      gap: 2,
                      p: 2,
                      bgcolor: '#F9FAFB',
                      borderRadius: '8px'
                    }}
                  >
                    <Avatar
                      src={normalizeImageUrl(item.productSnapshot?.image || item.product?.photoUrl || item.product?.image || '/assets/dishes/placeholder.png')}
                      variant="rounded"
                      sx={{ width: 60, height: 60 }}
                    >
                      <DiningIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {item.product?.name || (language === 'ar' ? 'عنصر' : 'Item')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {language === 'ar' ? 'الكمية' : 'Quantity'}: {item.quantity}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#FF7A00', mt: 0.5 }}>
                        {item.price?.toFixed(2)} {language === 'ar' ? 'ر.س' : 'SAR'}
                      </Typography>
                      {/* Show individual prep time if separate */}
                      {orderData.timingPreference === 'separate' && item.prepTime && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {language === 'ar' ? 'وقت التحضير: ' : 'Prep Time: '}{item.prepTime} {language === 'ar' ? 'دقيقة' : 'min'}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Total */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {language === 'ar' ? 'المجموع' : 'Total'}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#FF7A00' }}>
                  {orderData.totalAmount?.toFixed(2)} {language === 'ar' ? 'ر.س' : 'SAR'}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Order Notes */}
          {orderData.notes && (
            <Card sx={{ borderRadius: '12px' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <ReceiptIcon sx={{ color: '#FF7A00', fontSize: 24, mr: isRTL ? 0 : 1, ml: isRTL ? 1 : 0 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {language === 'ar' ? 'ملاحظات الطلب' : 'Order Notes'}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {orderData.notes}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Right Column - Delivery & Customer Info */}
        <Box sx={{ width: { xs: '100%', md: '400px' } }}>
          {/* Customer Info */}
          <Card sx={{ borderRadius: '12px', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                {language === 'ar' ? 'معلومات العميل' : 'Customer Information'}
              </Typography>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {language === 'ar' ? 'الاسم' : 'Name'}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {orderData.customer?.name || 'N/A'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {language === 'ar' ? 'الهاتف' : 'Phone'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <PhoneIcon sx={{ fontSize: 18, color: '#6B7280' }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {orderData.customer?.phone || 'N/A'}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {orderData.customer?.email || 'N/A'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card sx={{ borderRadius: '12px', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationIcon sx={{ color: '#FF7A00', fontSize: 24, mr: isRTL ? 0 : 1, ml: isRTL ? 1 : 0 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {language === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}
                  </Typography>
                </Box>
                {orderData.deliveryAddress?.label && (
                  <Chip
                    label={orderData.deliveryAddress.label}
                    size="small"
                    sx={{ bgcolor: '#FFF7ED', color: '#FF7A00', fontWeight: 600 }}
                  />
                )}
              </Box>

              <Stack spacing={1.5}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {orderData.deliveryAddress?.addressLine1}
                </Typography>

                {orderData.deliveryAddress?.addressLine2 && (
                  <Typography variant="body2" color="text.secondary">
                    {orderData.deliveryAddress.addressLine2}
                  </Typography>
                )}

                <Typography variant="body2" color="text.secondary">
                  {orderData.deliveryAddress?.city}
                </Typography>

                {orderData.deliveryAddress?.deliveryNotes && (
                  <Box sx={{ mt: 1, p: 1.5, bgcolor: '#F9FAFB', borderRadius: '8px' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      {language === 'ar' ? 'ملاحظات التوصيل' : 'Delivery Notes'}
                    </Typography>
                    <Typography variant="body2">
                      {orderData.deliveryAddress.deliveryNotes}
                    </Typography>
                  </Box>
                )}

                <Button
                  startIcon={<MapIcon />}
                  onClick={() => setMapDialogOpen(true)}
                  sx={{
                    mt: 1,
                    textTransform: 'none',
                    color: '#FF7A00',
                    justifyContent: 'flex-start'
                  }}
                >
                  {language === 'ar' ? 'عرض على الخريطة' : 'View on Map'}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Order Timeline */}
          <Card sx={{ borderRadius: '12px' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                {language === 'ar' ? 'الجدول الزمني' : 'Timeline'}
              </Typography>

              <Stack spacing={2}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon sx={{ fontSize: 18, color: '#6B7280' }} />
                    <Typography variant="caption" color="text.secondary">
                      {language === 'ar' ? 'تاريخ الطلب' : 'Order Date'}
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 500, ml: 3.5 }}>
                    {formatDate(orderData.orderDate)}
                  </Typography>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ClockIcon sx={{ fontSize: 18, color: '#6B7280' }} />
                    <Typography variant="caption" color="text.secondary">
                      {language === 'ar' ? 'وقت الطلب' : 'Order Time'}
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 500, ml: 3.5 }}>
                    {formatTime(orderData.orderDate)}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </Typography>
                  <Chip
                    label={orderData.status === 'order_received' ? (language === 'ar' ? 'تم الاستلام' : 'Received') :
                           orderData.status === 'preparing' ? (language === 'ar' ? 'قيد التحضير' : 'Preparing') :
                           orderData.status === 'ready' ? (language === 'ar' ? 'جاهز' : 'Ready') :
                           orderData.status}
                    color={orderData.status === 'ready' ? 'success' : 'warning'}
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Map Dialog */}
      <Dialog
        open={mapDialogOpen}
        onClose={() => setMapDialogOpen(false)}
        maxWidth="md"
        fullWidth
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
        <DialogContent dividers sx={{ p: 0 }}>
          {isLoaded ? (
            <Box>
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={{ 
                  lat: orderData.deliveryAddress?.lat || 24.7136, 
                  lng: orderData.deliveryAddress?.lng || 46.6753 
                }}
                zoom={15}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false
                }}
              >
                <Marker 
                  position={{ 
                    lat: orderData.deliveryAddress?.lat || 24.7136, 
                    lng: orderData.deliveryAddress?.lng || 46.6753 
                  }} 
                />
              </GoogleMap>
              <Box sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                  {orderData.deliveryAddress?.addressLine1}
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    const lat = orderData.deliveryAddress?.lat;
                    const lng = orderData.deliveryAddress?.lng;
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                  }}
                  sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#FF9933' }, textTransform: 'none' }}
                >
                  {language === 'ar' ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMapDialogOpen(false)}>
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </>
  );
};

export default CookOrderDetails;
