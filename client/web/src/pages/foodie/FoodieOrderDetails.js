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
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Map as MapIcon,
  CalendarToday as CalendarIcon,
  AccessTime as ClockIcon,
  LocalDining as DiningIcon,
  Close as CloseIcon,
  Store as StoreIcon,
  Warning as WarningIcon,
  SupportAgent as SupportIcon,
  Cancel as CancelIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../utils/api';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const GOOGLE_MAP_LIBRARIES = ['places'];

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '400px',
  borderRadius: '8px'
};

const FoodieOrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAP_LIBRARIES
  });

  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubOrder, setSelectedSubOrder] = useState(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [reportingIssue, setReportingIssue] = useState(false);
  const [issueReason, setIssueReason] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/orders/${orderId}`);

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

  const handleOpenMap = (subOrder) => {
    setSelectedSubOrder(subOrder);
    setMapDialogOpen(true);
  };

  const handleReportIssue = async () => {
    if (!issueReason || !issueDescription) return;
    
    setReportingIssue(true);
    try {
      await api.post(
        `/orders/${orderId}/report-issue`,
        { reason: issueReason, description: issueDescription }
      );
      
      setIssueDialogOpen(false);
      setIssueReason('');
      setIssueDescription('');
      fetchOrderDetails(); // Refresh to show issue status
    } catch (err) {
      console.error('Report issue error:', err);
      setError(err.response?.data?.message || (language === 'ar' ? 'فشل في الإبلاغ عن المشكلة' : 'Failed to report issue'));
    } finally {
      setReportingIssue(false);
    }
  };

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      await api.post(`/orders/${orderId}/cancel`, { reason: cancelReason.trim() || 'No reason provided' });
      
      setCancelDialogOpen(false);
      setCancelReason('');
      fetchOrderDetails(); // Refresh to show cancelled status
    } catch (err) {
      console.error('Cancel order error:', err);
      setError(err.response?.data?.message || (language === 'ar' ? 'فشل في إلغاء الطلب' : 'Failed to cancel order'));
    } finally {
      setCancelling(false);
    }
  };

  // Check if order can be cancelled (within 15 minutes)
  const canCancelOrder = () => {
    if (!orderData?.createdAt) return false;
    if (orderData?.status === 'cancelled') return false;
    if (orderData?.hasIssue) return false;
    
    const orderTime = new Date(orderData.createdAt);
    const currentTime = new Date();
    const timeDiffMinutes = (currentTime - orderTime) / (1000 * 60);
    
    return timeDiffMinutes <= 15;
  };

  // Get remaining cancellation time
  const getRemainingCancelTime = () => {
    if (!orderData?.createdAt) return 0;
    
    const orderTime = new Date(orderData.createdAt);
    const currentTime = new Date();
    const timeDiffMinutes = (currentTime - orderTime) / (1000 * 60);
    
    return Math.max(0, 15 - timeDiffMinutes);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: '#FF7A00' }} />
      </Box>
    );
  }

  if (error || !orderData) {
    return (
      <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Order not found'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/foodie/orders')}>
          {language === 'ar' ? 'العودة لطلباتي' : 'Back to My Orders'}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '900px', mx: 'auto', direction: isRTL ? 'rtl' : 'ltr' }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/foodie/orders')} sx={{ bgcolor: '#FFFFFF' }}>
          <BackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {language === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}
        </Typography>
      </Box>

      {/* Issue Banner - Show if order has an issue */}
      {orderData?.hasIssue && orderData?.issue && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3, alignItems: 'flex-start' }}
          icon={<WarningIcon />}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={() => navigate('/foodie/messages')}
            >
              {language === 'ar' ? 'تواصل مع الدعم' : 'Contact Support'}
            </Button>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {language === 'ar' ? 'تم الإبلاغ عن مشكلة في هذا الطلب' : 'Issue Reported for This Order'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {language === 'ar' 
              ? `السبب: ${orderData.issue.reason}\n${orderData.issue.description}`
              : `Reason: ${orderData.issue.reason}\n${orderData.issue.description}`}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {language === 'ar' 
              ? `الحالة: ${orderData.issue.status === 'open' ? 'قيد المراجعة' : 'تم الحل'}`
              : `Status: ${orderData.issue.status === 'open' ? 'Under Review' : 'Resolved'}`}
          </Typography>
        </Alert>
      )}

      <Card sx={{ borderRadius: '12px', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {language === 'ar' ? 'الأصناف المطلوبة' : 'Ordered Items'}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {orderData.subOrders.map((sub, idx) => (
            <Box key={sub._id} sx={{ mb: idx < orderData.subOrders.length - 1 ? 3 : 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {language === 'ar' ? 'من:' : 'From:'} {sub.cook?.name}
                </Typography>
                <Chip label={sub.status} size="small" color="primary" />
              </Box>
              
              {sub.cookLocationSnapshot && (
                <Button
                  startIcon={<StoreIcon />}
                  onClick={() => handleOpenMap(sub)}
                  sx={{ mb: 1, textTransform: 'none', color: '#FF7A00' }}
                >
                  {language === 'ar' ? 'موقع الاستلام' : 'Pickup Location'}
                </Button>
              )}

              <Stack spacing={1}>
                {sub.items.map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{item.product?.name} x {item.quantity}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.price?.toFixed(2)} SAR</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          ))}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: '12px' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {language === 'ar' ? 'ملخص الحساب' : 'Payment Summary'}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body1">{language === 'ar' ? 'الإجمالي' : 'Total'}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#FF7A00' }}>
              {orderData.totalAmount?.toFixed(2)} SAR
            </Typography>
          </Box>
          {orderData.vatSnapshot && (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Prices include {orderData.vatSnapshot.checkoutVatRateAtOrder}% {orderData.vatSnapshot.vatLabel}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Cancel & Report Issue Buttons */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        {/* Rate Order Button - Only show if delivered */}
        {orderData?.status === 'delivered' && (
          <Button
            variant="contained"
            startIcon={<StarIcon />}
            onClick={() => navigate(`/foodie/orders/${orderId}/rate`)}
            sx={{
              bgcolor: '#FF7A00',
              color: '#FFFFFF',
              '&:hover': { bgcolor: '#E66A00' }
            }}
          >
            {language === 'ar' ? 'تقييم الطلب' : 'Rate Order'}
          </Button>
        )}
        
        {/* Cancel Order Button - Only show if within 15 min window */}
        {orderData?.status !== 'cancelled' && !orderData?.hasIssue && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={() => canCancelOrder() ? setCancelDialogOpen(true) : null}
            disabled={!canCancelOrder()}
            sx={{
              opacity: canCancelOrder() ? 1 : 0.5,
              cursor: canCancelOrder() ? 'pointer' : 'not-allowed',
            }}
          >
            {canCancelOrder() 
              ? (language === 'ar' ? 'إلغاء الطلب' : 'Cancel Order')
              : (language === 'ar' 
                  ? `انتهى وقت الإلغاء (${Math.ceil(getRemainingCancelTime())}m ago)` 
                  : `Cancel Window Closed (${Math.ceil(getRemainingCancelTime())}m ago)`)
            }
          </Button>
        )}
        
        {/* Report Issue Button */}
        {!orderData?.hasIssue && orderData?.status !== 'cancelled' && (
          <Button
            variant="outlined"
            color="warning"
            startIcon={<WarningIcon />}
            onClick={() => setIssueDialogOpen(true)}
          >
            {language === 'ar' ? 'الإبلاغ عن مشكلة' : 'Report an Issue'}
          </Button>
        )}
      </Box>

      <Dialog open={mapDialogOpen} onClose={() => setMapDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {language === 'ar' ? 'موقع الاستلام' : 'Pickup Location'}
          <IconButton onClick={() => setMapDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {isLoaded && selectedSubOrder?.cookLocationSnapshot ? (
            <Box>
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={{ lat: selectedSubOrder.cookLocationSnapshot.lat, lng: selectedSubOrder.cookLocationSnapshot.lng }}
                zoom={15}
              >
                <Marker position={{ lat: selectedSubOrder.cookLocationSnapshot.lat, lng: selectedSubOrder.cookLocationSnapshot.lng }} />
              </GoogleMap>
              <Box sx={{ p: 2 }}>
                <Typography variant="body1" sx={{ mb: 1 }}>{selectedSubOrder.cookLocationSnapshot.address}</Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedSubOrder.cookLocationSnapshot.lat},${selectedSubOrder.cookLocationSnapshot.lng}`, '_blank')}
                  sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#FF9933' } }}
                >
                  {language === 'ar' ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}
                </Button>
              </Box>
            </Box>
          ) : <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}
        </DialogContent>
      </Dialog>

      {/* Report Issue Dialog */}
      <Dialog open={issueDialogOpen} onClose={() => setIssueDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {language === 'ar' ? 'الإبلاغ عن مشكلة' : 'Report an Issue'}
          <IconButton onClick={() => setIssueDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              {language === 'ar' ? 'سبب المشكلة' : 'Issue Reason'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {['Wrong items', 'Quality issue', 'Late delivery', 'Missing items', 'Other'].map((reason) => (
                <Chip
                  key={reason}
                  label={reason}
                  onClick={() => setIssueReason(reason)}
                  color={issueReason === reason ? 'primary' : 'default'}
                  variant={issueReason === reason ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
            
            <Typography variant="subtitle2" gutterBottom>
              {language === 'ar' ? 'وصف المشكلة' : 'Issue Description'}
            </Typography>
            <textarea
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder={language === 'ar' ? 'اشرح المشكلة بالتفصيل...' : 'Describe the issue in detail...'}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIssueDialogOpen(false)}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleReportIssue} 
            variant="contained" 
            disabled={!issueReason || !issueDescription || reportingIssue}
            sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#FF9933' } }}
          >
            {reportingIssue ? (language === 'ar' ? 'جاري الإرسال...' : 'Submitting...') : (language === 'ar' ? 'إرسال' : 'Submit')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {language === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}
          <IconButton onClick={() => setCancelDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {language === 'ar' 
                ? 'هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.' 
                : 'Are you sure you want to cancel this order? This action cannot be undone.'}
            </Alert>
            
            <Typography variant="subtitle2" gutterBottom>
              {language === 'ar' ? 'سبب الإلغاء (اختياري)' : 'Cancellation Reason (Optional)'}
            </Typography>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={language === 'ar' ? 'أخبرنا لماذا تريد إلغاء هذا الطلب...' : 'Tell us why you want to cancel this order...'}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelDialogOpen(false)}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleCancelOrder} 
            variant="contained" 
            color="error"
            disabled={cancelling}
          >
            {cancelling 
              ? (language === 'ar' ? 'جاري الإلغاء...' : 'Cancelling...') 
              : (language === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancellation')
            }
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FoodieOrderDetails;
