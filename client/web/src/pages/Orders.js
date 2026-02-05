import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Menu as MuiMenu,
  MenuItem,
  TextField,
  InputAdornment,
  Select,
  FormControl,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Stack,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  LocalShipping as DeliveryIcon,
  Store as PickupIcon,
  Paid as PaidIcon,
  Money as CashIcon,
  Kitchen as KitchenIcon,
  Assignment as ReadyIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Message as MessageIcon,
  Cancel as CancelIcon,
  FileDownload as ExportIcon,
  Warning as WarningIcon,
  AccessTime as ClockIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  LocalDining as DiningIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/localeFormatter';
import { normalizeImageUrl } from '../utils/api';

const Orders = () => {
  const { t, isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [hoveredOrderId, setHoveredOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await api.get('/orders/cook/orders');
        // Transform API orders to match component structure
        const ordersData = Array.isArray(response.data) ? response.data : response.data.data;
        const transformedOrders = ordersData?.map(order => ({
          id: order._id,
          orderNumber: order.orderId || order._id.slice(-6),
          foodieName: order.customer?.name || 'Unknown Customer',
          foodiePhone: order.customer?.phone || '',
          foodieAddress: order.shippingAddress?.street || '',
          orderDate: order.createdAt,
          deliveryDate: order.scheduledDeliveryTime || order.createdAt,
          totalAmount: order.total,
          items: order.items?.map(item => ({
            id: item._id || item.product?._id,
            photo: item.productSnapshot?.image || item.product?.image || '/assets/dishes/placeholder.png',
            title: item.productSnapshot?.name || item.product?.name || 'Unknown Item',
            description: item.productSnapshot?.description || '',
            quantity: item.quantity,
            price: item.price,
            status: item.status || 'pending',
          })) || [],
          deliveryMode: order.fulfillmentMode || 'delivery',
          paymentStatus: order.paymentStatus || 'pending',
          status: order.status,
        })) || [];
        setOrders(transformedOrders);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        setError(err.response?.data?.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Generate sample orders
  const getSampleOrders = () => {
    if (language === 'ar') {
      return [
        {
          id: 1,
          orderNumber: '10452',
          foodieName: 'أحمد حسن',
          foodiePhone: '+20 100 123 4567',
          foodieAddress: '15 شارع النزهة، مدينة نصر، القاهرة',
          orderDate: '2025-10-29T14:30:00',
          deliveryDate: '2025-10-29T18:00:00',
          totalAmount: 115.00,
          items: [
            {
              id: 101,
              photo: 'https://via.placeholder.com/60',
              title: 'دجاج مشوي',
              description: 'دجاج مشوي متبل مع خضروات',
              quantity: 2,
              price: 45.00,
              status: 'cooking',
            },
            {
              id: 102,
              photo: 'https://via.placeholder.com/60',
              title: 'سلطة سيزر',
              description: 'خس طازج مع صوص سيزر',
              quantity: 1,
              price: 25.00,
              status: 'cooking',
            },
          ],
          deliveryMode: 'delivery',
          paymentStatus: 'paid',
        },
        {
          id: 2,
          orderNumber: '10453',
          foodieName: 'سارة محمد',
          foodiePhone: '+20 101 234 5678',
          foodieAddress: '28 عباس العقاد، مدينة نصر، القاهرة',
          orderDate: '2025-10-29T15:45:00',
          deliveryDate: '2025-10-29T19:00:00',
          totalAmount: 65.00,
          items: [
            {
              id: 103,
              photo: 'https://via.placeholder.com/60',
              title: 'لازانيا',
              description: 'لازانيا محلية الصنع مع لحم البقر',
              quantity: 1,
              price: 65.00,
              status: 'ready',
            },
          ],
          deliveryMode: 'pickup',
          paymentStatus: 'cash',
        },
      ];
    } else {
      return [
        {
          id: 1,
          orderNumber: '10452',
          foodieName: 'Ahmed Hassan',
          foodiePhone: '+20 100 123 4567',
          foodieAddress: '15 El Nozha St, Nasr City, Cairo',
          orderDate: '2025-10-29T14:30:00',
          deliveryDate: '2025-10-29T18:00:00',
          totalAmount: 115.00,
          items: [
            {
              id: 101,
              photo: 'https://via.placeholder.com/60',
              title: 'Grilled Chicken',
              description: 'Marinated grilled chicken with vegetables',
              quantity: 2,
              price: 45.00,
              status: 'cooking',
            },
            {
              id: 102,
              photo: 'https://via.placeholder.com/60',
              title: 'Caesar Salad',
              description: 'Fresh romaine lettuce with caesar dressing',
              quantity: 1,
              price: 25.00,
              status: 'cooking',
            },
          ],
          deliveryMode: 'delivery',
          paymentStatus: 'paid',
        },
        {
          id: 2,
          orderNumber: '10453',
          foodieName: 'Sara Mohammed',
          foodiePhone: '+20 101 234 5678',
          foodieAddress: '28 Abbas El Akkad, Nasr City, Cairo',
          orderDate: '2025-10-29T15:45:00',
          deliveryDate: '2025-10-29T19:00:00',
          totalAmount: 65.00,
          items: [
            {
              id: 103,
              photo: 'https://via.placeholder.com/60',
              title: 'Lasagna',
              description: 'Homemade lasagna with beef',
              quantity: 1,
              price: 65.00,
              status: 'ready',
            },
          ],
          deliveryMode: 'pickup',
          paymentStatus: 'cash',
        },
      ];
    }
  };

  const [orders, setOrders] = useState([]);

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

  const isOrderOverdue = (order) => {
    const deliveryDate = new Date(order.deliveryDate);
    const now = new Date();
    return now > deliveryDate;
  };

  const handleMenuOpen = (event, order) => {
    setAnchorEl(event.currentTarget);
    setCurrentOrder(order);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsReady = () => {
    // Implement mark as ready logic
    handleMenuClose();
  };

  const handleViewShipping = () => {
    setShippingDialogOpen(true);
    handleMenuClose();
  };

  const handleOpenCancel = () => {
    setCancelDialogOpen(true);
    handleMenuClose();
  };

  const handleCancelOrder = () => {
    // Implement cancel order logic
    setCancelDialogOpen(false);
    setCurrentOrder(null);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      cooking: {
        label: language === 'ar' ? 'قيد التحضير' : 'Cooking',
        color: '#F59E0B',
        icon: <KitchenIcon sx={{ fontSize: 14 }} />,
      },
      ready: {
        label: language === 'ar' ? 'جاهز' : 'Ready',
        color: '#10B981',
        icon: <ReadyIcon sx={{ fontSize: 14 }} />,
      },
      delivered: {
        label: language === 'ar' ? 'تم التوصيل' : 'Delivered',
        color: '#3B82F6',
        icon: <DeliveryIcon sx={{ fontSize: 14 }} />,
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
          fontSize: '12px',
          borderRadius: '8px',
          '& .MuiChip-icon': { color: '#fff' },
        }}
        size="small"
      />
    );
  };

  const getPaymentChip = (status) => {
    const isPaid = status === 'paid';
    return (
      <Chip
        icon={isPaid ? <PaidIcon sx={{ fontSize: 14 }} /> : <CashIcon sx={{ fontSize: 14 }} />}
        label={isPaid ? (language === 'ar' ? 'مدفوع' : 'Paid') : (language === 'ar' ? 'نقدي' : 'Cash')}
        sx={{
          bgcolor: isPaid ? '#ECFDF5' : '#FEF3C7',
          color: isPaid ? '#059669' : '#D97706',
          fontWeight: 500,
          fontSize: '13px',
          borderRadius: '10px',
          '& .MuiChip-icon': { color: isPaid ? '#059669' : '#D97706' },
        }}
        size="small"
      />
    );
  };

  const getDeliveryChip = (mode) => {
    const isDelivery = mode === 'delivery';
    if (isDelivery) {
      return (
        <Chip
          icon={<DeliveryIcon sx={{ fontSize: 14 }} />}
          label={language === 'ar' ? 'توصيل' : 'Delivery'}
          sx={{
            bgcolor: '#E0F2FE',
            color: '#0284C7',
            fontWeight: 500,
            fontSize: '13px',
            borderRadius: '10px',
            '& .MuiChip-icon': { color: '#0284C7' },
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.foodieName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDelivery = deliveryFilter === 'all' || order.deliveryMode === deliveryFilter;
    const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;
    return matchesSearch && matchesDelivery && matchesPayment;
  });

  return (
    <>
      <Box sx={{ position: 'fixed', top: 0, right: 0, bgcolor: '#00AA00', color: 'white', px: 2, py: 0.5, zIndex: 9999, fontSize: '12px', fontWeight: 'bold' }}>BUILD_STAMP: FEB04_A1</Box>
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: '#FAF5F3', 
      px: '52px',
      py: 3,
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      {/* Loading State */}
      {loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>{language === 'ar' ? 'جاري تحميل الطلبات...' : 'Loading orders...'}</Typography>
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Box sx={{ textAlign: 'center', py: 4, color: 'error.main' }}>
          <Typography>{error}</Typography>
        </Box>
      )}

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
          {language === 'ar' ? 'الطلبات' : 'Orders'}
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
            ? 'إدارة طلبات مطبخك النشطة وتتبع ما يتم طهيه 🍲'
            : "Manage your kitchen's active orders and track what's cooking 🍲"}
        </Typography>
      </Box>

      {/* Filter Bar */}
      <Card sx={{
        background: '#FAF5F3',
        borderRadius: '10px',
        padding: '12px 18px',
        boxShadow: 'none',
        mb: 3,
      }}>
        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          spacing={2} 
          alignItems="center"
          justifyContent="space-between"
        >
          <TextField
            placeholder={language === 'ar' ? 'بحث برقم الطلب أو اسم الزبون...' : 'Search by order number or foodie name...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#9CA3AF' }} />
                </InputAdornment>
              ),
            }}
            sx={{ 
              flex: 1,
              minWidth: { xs: '100%', md: '300px' },
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                bgcolor: '#FFFFFF',
                border: '1px solid #E5E7EB',
              },
            }}
            size="small"
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value)}
              displayEmpty
              sx={{ 
                borderRadius: '8px', 
                bgcolor: '#FFFFFF',
                border: '1px solid #E5E7EB',
              }}
            >
              <MenuItem value="all">{language === 'ar' ? 'كل وسائل التوصيل' : 'Delivery Mode'}</MenuItem>
              <MenuItem value="delivery">{language === 'ar' ? 'توصيل' : 'Delivery'}</MenuItem>
              <MenuItem value="pickup">{language === 'ar' ? 'استلام' : 'Pickup'}</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              displayEmpty
              sx={{ 
                borderRadius: '8px', 
                bgcolor: '#FFFFFF',
                border: '1px solid #E5E7EB',
              }}
            >
              <MenuItem value="all">{language === 'ar' ? 'كل طرق الدفع' : 'Payment'}</MenuItem>
              <MenuItem value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</MenuItem>
              <MenuItem value="cash">{language === 'ar' ? 'نقدي' : 'Cash'}</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<ExportIcon />}
            sx={{
              color: '#FFFFFF',
              bgcolor: '#2563EB',
              fontWeight: 500,
              borderRadius: '8px',
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              '&:hover': {
                bgcolor: '#1E40AF',
                boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
              },
            }}
          >
            {language === 'ar' ? 'تصدير الكل' : 'EXPORT ALL'}
          </Button>
        </Stack>
      </Card>

      {/* Orders List */}
      <Stack spacing={2}>
        {filteredOrders.map((order) => (
          <Card
            key={order.id}
            onMouseEnter={() => setHoveredOrderId(order.id)}
            onMouseLeave={() => setHoveredOrderId(null)}
            sx={{
              background: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: hoveredOrderId === order.id 
                ? '0 6px 16px rgba(0,0,0,0.08)' 
                : '0 4px 12px rgba(0,0,0,0.06)',
              transition: 'all 0.3s ease-in-out',
              transform: hoveredOrderId === order.id ? 'translateY(-2px)' : 'none',
              position: 'relative',
              overflow: 'visible',
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
                    {language === 'ar' ? `رقم الطلب ${order.orderNumber}` : `Order #${order.orderNumber}`} – {order.foodieName}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <ClockIcon sx={{ fontSize: 14, color: '#6B7280' }} />
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                      {formatDateTime(order.orderDate)}
                    </Typography>
                    <Typography sx={{ color: '#6B7280' }}>•</Typography>
                    <CalendarIcon sx={{ fontSize: 14, color: '#6B7280' }} />
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                      {formatDateTime(order.deliveryDate)}
                    </Typography>
                  </Stack>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                  
                  {hoveredOrderId === order.id && (
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, order)}
                      sx={{ 
                        bgcolor: '#F3F4F6',
                        '&:hover': { bgcolor: '#E5E7EB' },
                      }}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  )}
                </Box>
              </Box>

              {/* Order Items */}
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {order.items.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: 'flex',
                      gap: 2,
                      alignItems: 'center',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    }}
                  >
                    <Avatar
                      src={normalizeImageUrl(item.photo)}
                      variant="rounded"
                      sx={{ width: 60, height: 60, borderRadius: '8px' }}
                    >
                      <DiningIcon />
                    </Avatar>

                    <Box sx={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151' }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '13px' }}>
                        {item.description}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '13px' }}>
                        {language === 'ar' ? `الكمية: ${item.quantity}` : `Qty: ${item.quantity}`}
                      </Typography>
                      {getStatusBadge(item.status)}
                    </Stack>
                  </Box>
                ))}
              </Stack>

              {/* Footer - Payment & Delivery Info */}
              <Divider sx={{ my: 1.5 }} />
              <Stack 
                direction="row" 
                spacing={1} 
                justifyContent={isRTL ? 'flex-end' : 'flex-start'}
                flexWrap="wrap"
              >
                {getPaymentChip(order.paymentStatus)}
                {getDeliveryChip(order.deliveryMode)}
                {isOrderOverdue(order) && (
                  <Chip
                    icon={<WarningIcon sx={{ fontSize: 14 }} />}
                    label={language === 'ar' ? 'الطلب متأخر' : 'Order is overdue'}
                    sx={{
                      color: '#EF4444',
                      bgcolor: '#FEE2E2',
                      fontWeight: 500,
                      fontSize: '13px',
                      borderRadius: '10px',
                      '& .MuiChip-icon': { color: '#EF4444' },
                    }}
                    size="small"
                  />
                )}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Action Menu */}
      <MuiMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: isRTL ? 'left' : 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: isRTL ? 'left' : 'right',
        }}
        slotProps={{
          paper: {
            elevation: 3,
            sx: {
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '180px',
            },
          },
        }}
      >
        <MenuItem 
          onClick={() => {
            navigate(`/order-details/${currentOrder?.id}`);
            handleMenuClose();
          }}
          sx={{
            py: 1.5,
            px: 2,
            fontSize: '14px',
            '&:hover': { bgcolor: '#F3F4F6' },
            direction: isRTL ? 'rtl' : 'ltr',
          }}
        >
          <VisibilityIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#FF7A00' }} />
          {language === 'ar' ? 'عرض تفاصيل الطلب' : 'View Order Details'}
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem 
          onClick={handleMarkAsReady}
          sx={{
            py: 1.5,
            px: 2,
            fontSize: '14px',
            '&:hover': { bgcolor: '#F3F4F6' },
            direction: isRTL ? 'rtl' : 'ltr',
          }}
        >
          <CheckCircleIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#10B981' }} />
          {language === 'ar' ? 'وضع علامة كجاهز' : 'Mark as Ready'}
        </MenuItem>
        <MenuItem 
          onClick={handleViewShipping}
          sx={{
            py: 1.5,
            px: 2,
            fontSize: '14px',
            '&:hover': { bgcolor: '#F3F4F6' },
            direction: isRTL ? 'rtl' : 'ltr',
          }}
        >
          <LocationIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#3B82F6' }} />
          {language === 'ar' ? 'عرض تفاصيل الشحن' : 'View Shipping Details'}
        </MenuItem>
        <MenuItem
          sx={{
            py: 1.5,
            px: 2,
            fontSize: '14px',
            '&:hover': { bgcolor: '#F3F4F6' },
            direction: isRTL ? 'rtl' : 'ltr',
          }}
        >
          <MessageIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#6B7280' }} />
          {language === 'ar' ? 'الاتصال بالعميل' : 'Contact Foodie'}
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem 
          onClick={handleOpenCancel} 
          sx={{ 
            py: 1.5,
            px: 2,
            fontSize: '14px',
            color: '#EF4444',
            '&:hover': { bgcolor: '#FEE2E2' },
            direction: isRTL ? 'rtl' : 'ltr',
          }}
        >
          <CancelIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20 }} />
          {language === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}
        </MenuItem>
      </MuiMenu>

      {/* Shipping Dialog */}
      <Dialog 
        open={shippingDialogOpen} 
        onClose={() => setShippingDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: '12px', minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {language === 'ar' ? 'تفاصيل الشحن' : 'Shipping Details'}
        </DialogTitle>
        <DialogContent>
          {currentOrder && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {currentOrder.foodieName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {currentOrder.foodiePhone}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  {language === 'ar' ? 'العنوان' : 'Address'}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {currentOrder.foodieAddress}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShippingDialogOpen(false)}>
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog 
        open={cancelDialogOpen} 
        onClose={() => setCancelDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: '12px', minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {language === 'ar' ? 'سبب الإلغاء' : 'Cancellation Reason'}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <Select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">{language === 'ar' ? 'اختر السبب' : 'Please select a reason'}</MenuItem>
              <MenuItem value="buyer">{language === 'ar' ? 'طلب المشتري الإلغاء' : "Buyer asked to cancel"}</MenuItem>
              <MenuItem value="address">{language === 'ar' ? 'مشكلة في العنوان' : "Problem with address"}</MenuItem>
              <MenuItem value="unpaid">{language === 'ar' ? 'لم يدفع المشتري' : "Buyer hasn't paid"}</MenuItem>
              <MenuItem value="other">{language === 'ar' ? 'سبب آخر' : "Other reason"}</MenuItem>
            </Select>
          </FormControl>
          {cancelReason === 'other' && (
            <TextField
              fullWidth
              multiline
              rows={3}
              value={cancelReasonText}
              onChange={(e) => setCancelReasonText(e.target.value)}
              placeholder={language === 'ar' ? 'اكتب السبب...' : 'Enter reason...'}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleCancelOrder} 
            variant="contained" 
            color="error"
            disabled={!cancelReason}
          >
            {language === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancellation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </>
  );
};

export default Orders;
