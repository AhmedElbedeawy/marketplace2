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
  Restaurant as RestaurantIcon,
  LocalShipping as LocalShippingIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { formatCurrency } from '../utils/localeFormatter';
import { normalizeImageUrl } from '../utils/api';

// Helper to group items by fulfillment mode and readyAt for Cook Hub
const groupItemsByFulfillmentAndReady = (items, order) => {
  // If subOrders array exists (new API), use it directly with real subOrder IDs
  if (order.subOrders && order.subOrders.length > 0) {
    return order.subOrders.map(subOrder => ({
      fulfillmentMode: subOrder.fulfillmentMode || 'pickup',
      readyAt: subOrder.items.length > 0 && subOrder.items[0].readyAt ? subOrder.items[0].readyAt : null,
      items: subOrder.items,
      subOrderId: subOrder._id, // Real subOrder._id for status updates
    }));
  }
  
  // Fallback: group flattened items (old API or backward compatibility)
  const timingPref = order.timingPreference || 'separate';
  const groups = {};
  
  for (const item of items) {
    const fulfillmentMode = item.fulfillmentMode || order.fulfillmentMode || 'pickup';
    const readyAt = timingPref === 'separate' && item.readyAt ? item.readyAt : 'combined';
    const groupKey = `${fulfillmentMode}_${readyAt}`;
    
    if (!groups[groupKey]) {
      groups[groupKey] = {
        fulfillmentMode,
        readyAt: readyAt === 'combined' ? null : item.readyAt,
        items: [],
      };
    }
    groups[groupKey].items.push(item);
  }
  
  return Object.values(groups);
};

const Orders = () => {
  const { t, isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeSubOrderId, setActiveSubOrderId] = useState(null); // Track which subOrder is being acted on
  const [activeSubOrderFulfillment, setActiveSubOrderFulfillment] = useState(null); // Track fulfillment mode
  const [cancelTargetSubOrderId, setCancelTargetSubOrderId] = useState(null); // Track which subOrder to cancel
  const [shippingTargetSubOrderId, setShippingTargetSubOrderId] = useState(null); // Track which delivery subOrder to view
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [hoveredOrderId, setHoveredOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real orders from API
  useEffect(() => {
    console.log('[ORDERS PAGE] 🔄 Component mounted/fetchOrders triggered');
    console.log('[ORDERS PAGE] Orders count before fetch:', orders.length);
    
    const fetchOrders = async () => {
      try {
        console.log('[ORDERS PAGE] 📡 Fetching orders from API...');
        setLoading(true);
        const response = await api.get('/orders/cook/orders');
        
        console.log('[ORDERS PAGE] ✅ API response received:', response.data?.length || response.data?.data?.length || 0, 'orders');
        
        // Transform API orders to match component structure
        // Handle both array and wrapped response formats
        let ordersData = [];
        if (Array.isArray(response.data)) {
          ordersData = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          ordersData = response.data.data;
        } else {
          console.error('[Orders] Unexpected response shape:', response.data);
        }
        
        const transformedOrders = ordersData.map(apiOrder => {
          // Safe slice: ensure we always have a string
          const orderIdStr = String(apiOrder._id || apiOrder.orderId || '');
          const orderIdForDisplay = orderIdStr.slice(-6);
          
          // Transform subOrders if they exist (new API structure)
          const subOrders = (apiOrder.subOrders || []).map(sub => ({
            _id: sub._id,
            items: (sub.items || []).map(item => ({
              id: item._id || item.product?._id,
              photo: item.productSnapshot?.image || 
                     item.product?.photoUrl || 
                     item.product?.images?.[0] || 
                     '/assets/dishes/placeholder.png',
              title: item.productSnapshot?.name || item.product?.name || 'Unknown Item',
              description: item.productSnapshot?.description || '',
              quantity: item.quantity,
              price: item.price,
              status: item.status || 'pending',
              readyAt: item.readyAt,
              fulfillmentMode: item.fulfillmentMode || sub.fulfillmentMode || 'pickup',
            })),
            status: sub.status,
            fulfillmentMode: sub.fulfillmentMode || 'pickup',
            timingPreference: sub.timingPreference || 'separate',
            totalAmount: sub.totalAmount,
            prepTime: sub.prepTime,
          }));
          
          return {
            id: apiOrder._id,
            orderId: apiOrder.orderId || apiOrder._id,
            orderNumber: orderIdForDisplay,
            customerId: apiOrder.customer?._id || apiOrder.customer,
            foodieName: apiOrder.customer?.name || 'Unknown Customer',
            foodiePhone: apiOrder.customer?.phone || '',
            foodieAddress: apiOrder.shippingAddress?.street || '',
            createdAt: apiOrder.createdAt,
            orderDate: apiOrder.createdAt,
            deliveryDate: apiOrder.scheduledDeliveryTime || apiOrder.createdAt,
            totalAmount: apiOrder.totalAmount || apiOrder.total || 0,
            // For backward compatibility: flatten items from all subOrders
            items: subOrders.length > 0 
              ? subOrders.flatMap(sub => sub.items)
              : (apiOrder.items || []).map(item => ({
                  id: item._id || item.product?._id,
                  photo: item.productSnapshot?.image || 
                         item.product?.photoUrl || 
                         item.product?.images?.[0] || 
                         '/assets/dishes/placeholder.png',
                  title: item.productSnapshot?.name || item.product?.name || 'Unknown Item',
                  description: item.productSnapshot?.description || '',
                  quantity: item.quantity,
                  price: item.price,
                  status: item.status || 'pending',
                  readyAt: item.readyAt,
                  fulfillmentMode: item.fulfillmentMode || apiOrder.fulfillmentMode,
                })),
            deliveryMode: apiOrder._isMixed || (subOrders.length > 1) ? 'mixed' : (apiOrder.fulfillmentMode || 'unknown'),
            paymentStatus: apiOrder.paymentStatus || 'pending',
            status: apiOrder.status,
            // Store subOrders array for grouped rendering
            subOrders: subOrders.length > 0 ? subOrders : null,
            // For backward compatibility: use first subOrder's ID
            subOrderId: subOrders.length > 0 ? subOrders[0]._id : (apiOrder._id || apiOrder.subOrderId),
            combinedReadyTime: apiOrder.combinedReadyTime,
            prepTime: apiOrder.prepTime || 30,
            _isMixed: apiOrder._isMixed || subOrders.length > 1 || false,
            timingPreference: apiOrder.timingPreference || (subOrders.length > 0 ? subOrders[0].timingPreference : 'separate'),
          };
        });
        
        
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
    const completedStatuses = ['ready', 'delivered', 'cancelled'];
    if (completedStatuses.includes(order.status)) return false;
    
    if (!order.createdAt || !order.prepTime) return false;
    
    const createdMs = new Date(order.createdAt).getTime();
    const prepMs = Number(order.prepTime) * 60 * 1000;
    const readyByMs = createdMs + prepMs;
    const isOverdue = Date.now() > readyByMs;
    return isOverdue;
  };

  const handleMenuOpen = (event, order) => {
    console.log('Menu opened for order:', order.id, 'Button rect:', event.currentTarget.getBoundingClientRect());
    setAnchorEl(event.currentTarget);
    setCurrentOrder(order);
    setActiveOrderId(order.id);
    // Set default subOrder (first one for backward compatibility)
    if (order.subOrders && order.subOrders.length > 0) {
      setActiveSubOrderId(order.subOrders[0]._id);
      setActiveSubOrderFulfillment(order.subOrders[0].fulfillmentMode);
    } else {
      setActiveSubOrderId(order.subOrderId);
      setActiveSubOrderFulfillment(order.fulfillmentMode || order.deliveryMode);
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setActiveOrderId(null);
  };

  const handleMarkAsReady = async () => {
    await updateOrderStatus('ready', 'تم وضع علامة الطلب كجاهز', 'Order marked as ready');
  };

  const handleMarkAsPreparing = async () => {
    await updateOrderStatus('preparing', 'تم وضع علامة الطلب كجارٍ تحضيره', 'Order marked as preparing');
  };

  const handleMarkAsOutForDelivery = async () => {
    await updateOrderStatus('out_for_delivery', 'تم وضع علامة الطلب في الطريق', 'Order marked as out for delivery');
  };

  const handleMarkAsDelivered = async () => {
    await updateOrderStatus('delivered', 'تم تسليم الطلب بنجاح', 'Order marked as delivered');
  };

  const handleMarkAsPickedUp = async () => {
    await updateOrderStatus('delivered', 'تم استلام الطلب بنجاح', 'Order marked as picked up');
  };

  // Generic status update function
  const updateOrderStatus = async (newStatus, successMessageAr, successMessageEn) => {
    console.log('[ORDERS STATUS] ==========================================');
    console.log('[ORDERS STATUS] 🎯 Status update handler called!');
    console.log('[ORDERS STATUS] currentOrder:', currentOrder);
    console.log('[ORDERS STATUS] activeSubOrderId:', activeSubOrderId);
    console.log('[ORDERS STATUS] newStatus:', newStatus);
    console.log('[ORDERS STATUS] Orders count before update:', orders.length);
    
    const subOrderIdToUpdate = activeSubOrderId || currentOrder?.subOrderId;
    
    if (!currentOrder || !subOrderIdToUpdate) {
      showNotification('Unable to update order status', 'error');
      handleMenuClose();
      return;
    }

    const url = `/orders/sub-order/${subOrderIdToUpdate}/status`;
    console.log('[Orders] Making API request to:', url);

    try {
      const token = localStorage.getItem('token');
      console.log('[Orders] Token available:', !!token);
      console.log('[Orders] Token preview:', token?.slice(0, 20) + '...');
      
      const response = await api.put(url, {
        status: newStatus
      });
      console.log('[Orders] API response:', response.data);
      
      showNotification(
        language === 'ar' ? successMessageAr : successMessageEn,
        'success'
      );
      
      // Update local state instead of reloading entire page
      console.log('[ORDERS STATUS] ✅ API success, updating local state...');
      console.log('[ORDERS STATUS] Orders count before setOrders:', orders.length);
      
      setOrders(prev => {
        console.log('[ORDERS STATUS] setOrders callback - prev.length:', prev.length);
        const updated = prev.map(order => {
          // If order has subOrders, update the specific subOrder
          if (order.subOrders && order.subOrders.length > 0) {
            return {
              ...order,
              subOrders: order.subOrders.map(subOrder => {
                if (subOrder._id === subOrderIdToUpdate) {
                  console.log('[ORDERS STATUS] 🎯 Updated subOrder', subOrderIdToUpdate, 'status to', newStatus);
                  return { ...subOrder, status: newStatus };
                }
                return subOrder;
              })
            };
          }
          // If it's a single order (backward compatibility)
          if (order._id === currentOrder?._id || order.orderId === currentOrder?.orderId) {
            console.log('[ORDERS STATUS] 🎯 Updated order', order._id, 'status to', newStatus);
            return { ...order, status: newStatus };
          }
          return order;
        });
        console.log('[ORDERS STATUS] ✅ Local state updated, new count:', updated.length);
        return updated;
      });
    } catch (error) {
      console.error('[Orders] API error:', error);
      console.error('[Orders] Error response:', error.response);
      console.error('[Orders] Error status:', error.response?.status);
      console.error('[Orders] Error message:', error.response?.data?.message);
      
      showNotification(
        error.response?.data?.message || (language === 'ar' ? 'فشل تحديث حالة الطلب' : 'Failed to update order status'),
        'error'
      );
    } finally {
      handleMenuClose();
    }
  };

  // Update status for a specific subOrder (used for mixed orders)
  const updateOrderStatusForSubOrder = async (subOrderId, newStatus, successMessage) => {
    console.log('[Orders] updateOrderStatusForSubOrder called:');
    console.log('  subOrderId:', subOrderId);
    console.log('  newStatus:', newStatus);
    
    if (!subOrderId) {
      showNotification('Unable to update order status', 'error');
      handleMenuClose();
      return;
    }

    const url = `/orders/sub-order/${subOrderId}/status`;
    console.log('[Orders] Making API request to:', url);

    try {
      const response = await api.put(url, {
        status: newStatus
      });
      console.log('[Orders] API response:', response.data);
      
      showNotification(successMessage, 'success');
      
      // Update local state instead of reloading entire page
      setOrders(prev => prev.map(order => {
        if (order.subOrders && order.subOrders.length > 0) {
          return {
            ...order,
            subOrders: order.subOrders.map(subOrder => {
              if (subOrder._id === subOrderId) {
                return { ...subOrder, status: newStatus };
              }
              return subOrder;
            })
          };
        }
        return order;
      }));
    } catch (error) {
      console.error('[Orders] API error:', error);
      showNotification(
        error.response?.data?.message || (language === 'ar' ? 'فشل تحديث حالة الطلب' : 'Failed to update order status'),
        'error'
      );
    } finally {
      handleMenuClose();
    }
  };

  const handleViewShipping = () => {
    setShippingDialogOpen(true);
    handleMenuClose();
  };

  // View shipping for a specific delivery subOrder (mixed orders)
  const handleViewShippingForSubOrder = (subOrderId) => {
    setShippingTargetSubOrderId(subOrderId);
    setShippingDialogOpen(true);
    handleMenuClose();
  };

  const handleOpenCancel = () => {
    setCancelDialogOpen(true);
    handleMenuClose();
  };

  // Open cancel dialog for a specific subOrder (mixed orders)
  const handleOpenCancelForSubOrder = (subOrderId) => {
    setCancelTargetSubOrderId(subOrderId);
    setCancelDialogOpen(true);
    handleMenuClose();
  };

  const handleContactFoodie = () => {
    console.log('[Orders] Contact Foodie - currentOrder:', currentOrder);
    console.log('[Orders] customerId:', currentOrder?.customerId);
    if (currentOrder && currentOrder.customerId) {
      const targetUrl = `/message-center?userId=${currentOrder.customerId}`;
      console.log('[Orders] Navigating to:', targetUrl);
      navigate(targetUrl);
    } else {
      console.error('[Orders] Missing customerId in currentOrder');
    }
    handleMenuClose();
  };

  const handleCancelOrder = async () => {
    // Determine which subOrder to cancel
    const subOrderIdToCancel = cancelTargetSubOrderId || activeSubOrderId || currentOrder?.subOrderId;
    
    if (!subOrderIdToCancel) {
      showNotification('Unable to cancel order', 'error');
      setCancelDialogOpen(false);
      return;
    }

    const url = `/orders/sub-order/${subOrderIdToCancel}/cancel`;
    
    try {
      await api.put(url, {
        reason: cancelReason,
        reasonText: cancelReasonText
      });
      
      showNotification(
        language === 'ar' ? 'تم إلغاء الطلب بنجاح' : 'Order cancelled successfully',
        'success'
      );
      
      // Reset and update local state instead of reloading
      setCancelDialogOpen(false);
      setCancelTargetSubOrderId(null);
      setCancelReason('');
      setCancelReasonText('');
      setCurrentOrder(null);
      
      // Update local state to reflect cancelled status
      setOrders(prev => prev.map(order => {
        if (order.subOrders && order.subOrders.length > 0) {
          return {
            ...order,
            subOrders: order.subOrders.map(subOrder => {
              if (subOrder._id === subOrderIdToCancel) {
                return { ...subOrder, status: 'cancelled' };
              }
              return subOrder;
            })
          };
        }
        return order;
      }));
    } catch (error) {
      console.error('[Orders] Cancel error:', error);
      showNotification(
        error.response?.data?.message || (language === 'ar' ? 'فشل إلغاء الطلب' : 'Failed to cancel order'),
        'error'
      );
    }
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
    if (mode === 'mixed') {
      return (
        <Chip
          icon={<DeliveryIcon sx={{ fontSize: 14 }} />}
          label={language === 'ar' ? 'مختلط' : 'Mixed'}
          sx={{
            bgcolor: '#9333EA',
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
    if (mode === 'delivery') {
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
    if (mode === 'pickup') {
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
    }
    // Unknown mode
    return (
      <Chip
        label={language === 'ar' ? 'غير معروف' : 'Unknown'}
        sx={{
          bgcolor: '#F3F4F6',
          color: '#6B7280',
          fontWeight: 500,
          fontSize: '13px',
          borderRadius: '10px',
        }}
        size="small"
      />
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.foodieName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDelivery = deliveryFilter === 'all' || order.deliveryMode === deliveryFilter || (deliveryFilter === 'delivery' && order.deliveryMode === 'mixed');
    const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;
    return matchesSearch && matchesDelivery && matchesPayment;
  });

  return (
    <>
      {process.env.NODE_ENV !== 'production' && (
        <Box sx={{ position: 'fixed', top: 0, right: 0, bgcolor: '#00AA00', color: 'white', px: 2, py: 0.5, zIndex: 9999, fontSize: '12px', fontWeight: 'bold' }}>BUILD_STAMP: FEB04_A1</Box>
      )}
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
                  
                  <IconButton
                    onClick={(e) => handleMenuOpen(e, order)}
                    sx={{ 
                      bgcolor: hoveredOrderId === order.id ? '#F3F4F6' : 'transparent',
                      opacity: hoveredOrderId === order.id ? 1 : 0,
                      pointerEvents: hoveredOrderId === order.id ? 'auto' : 'none',
                      '&:hover': { bgcolor: '#E5E7EB' },
                    }}
                    size="small"
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* Order Items - Grouped by fulfillment and ready time */}
              <Stack spacing={2} sx={{ mb: 2 }}>
                {(() => {
                  const groups = groupItemsByFulfillmentAndReady(order.items || [], order);
                  
                  return groups.map((group, groupIdx) => (
                    <Box key={groupIdx}>
                      {/* Group header with fulfillment badge */}
                      {groups.length > 1 && (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1, 
                          mb: 1,
                          pb: 0.5,
                          borderBottom: '1px solid #E5E7EB',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        }}>
                          {getDeliveryChip(group.fulfillmentMode)}
                          {group.readyAt && (
                            <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '12px' }}>
                              • {new Date(group.readyAt).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          )}
                        </Box>
                      )}
                      
                      {/* Items in this group */}
                      <Stack spacing={1}>
                        {group.items.map((item) => (
                          <Box
                            key={item.id}
                            sx={{
                              display: 'flex',
                              gap: 2,
                              alignItems: 'center',
                              flexDirection: isRTL ? 'row-reverse' : 'row',
                              pl: groups.length > 1 ? 2 : 0,
                              pr: groups.length > 1 ? 2 : 0,
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
                    </Box>
                  ));
                })()}
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
        open={Boolean(anchorEl) && Boolean(activeOrderId)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 3,
          sx: {
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '180px',
          },
        }}
      >
        <MenuItem 
          onClick={() => {
            navigate(`/order-details/${currentOrder?.orderId || currentOrder?.id}`);
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
        
        {/* Multiple subOrders: show actions per group */}
        {currentOrder?.subOrders && currentOrder.subOrders.length > 1 ? (
          currentOrder.subOrders.map((subOrder, idx) => {
            const subOrderId = subOrder._id;
            const subOrderStatus = (subOrder.status || currentOrder.status).toLowerCase();
            const subOrderFulfillment = (subOrder.fulfillmentMode || 'pickup').toLowerCase();
            
            return [
              // Group header
              <Divider key={`divider-${idx}`} sx={{ my: 0.5 }} />,
              <MenuItem 
                key={`header-${idx}`}
                disabled
                sx={{
                  py: 1,
                  px: 2,
                  fontSize: '12px',
                  fontWeight: 600,
                  color: subOrderFulfillment === 'pickup' ? '#6B7280' : '#3B82F6',
                  bgcolor: '#F9FAFB',
                  direction: isRTL ? 'rtl' : 'ltr',
                }}
              >
                {subOrderFulfillment === 'pickup' ? <PickupIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 16 }} /> : <DeliveryIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 16 }} />}
                {subOrderFulfillment === 'pickup' 
                  ? (language === 'ar' ? 'استلام' : 'Pickup')
                  : (language === 'ar' ? 'توصيل' : 'Delivery')}
              </MenuItem>,
              
              // Actions for this subOrder
              subOrderStatus === 'order_received' && (
                <MenuItem 
                  key={`preparing-${idx}`}
                  onClick={async () => {
                    await updateOrderStatusForSubOrder(subOrderId, 'preparing', 
                      language === 'ar' ? 'تم وضع علامة كجارٍ تحضيره' : 'Order marked as preparing');
                  }} 
                  sx={{ py: 1.5, px: 2, fontSize: '14px', '&:hover': { bgcolor: '#F3F4F6' }, direction: isRTL ? 'rtl' : 'ltr' }}
                >
                  <RestaurantIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#F59E0B' }} />
                  {language === 'ar' ? 'وضع علامة كجارٍ تحضيره' : 'Mark as Preparing'}
                </MenuItem>
              ),
              
              subOrderStatus === 'preparing' && (
                <MenuItem 
                  key={`ready-${idx}`}
                  onClick={async () => {
                    await updateOrderStatusForSubOrder(subOrderId, 'ready',
                      language === 'ar' ? 'تم وضع علامة كجاهز' : 'Order marked as ready');
                  }} 
                  sx={{ py: 1.5, px: 2, fontSize: '14px', '&:hover': { bgcolor: '#F3F4F6' }, direction: isRTL ? 'rtl' : 'ltr' }}
                >
                  <CheckCircleIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#10B981' }} />
                  {language === 'ar' ? 'وضع علامة كجاهز' : 'Mark as Ready'}
                </MenuItem>
              ),
              
              subOrderStatus === 'ready' && subOrderFulfillment === 'delivery' && (
                <MenuItem 
                  key={`outfordelivery-${idx}`}
                  onClick={async () => {
                    await updateOrderStatusForSubOrder(subOrderId, 'out_for_delivery',
                      language === 'ar' ? 'تم وضع علامة في الطريق' : 'Order marked as out for delivery');
                  }} 
                  sx={{ py: 1.5, px: 2, fontSize: '14px', '&:hover': { bgcolor: '#F3F4F6' }, direction: isRTL ? 'rtl' : 'ltr' }}
                >
                  <LocalShippingIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#3B82F6' }} />
                  {language === 'ar' ? 'وضع علامة في الطريق' : 'Mark as Out for Delivery'}
                </MenuItem>
              ),
              
              subOrderStatus === 'ready' && subOrderFulfillment === 'pickup' && (
                <MenuItem 
                  key={`pickedup-${idx}`}
                  onClick={async () => {
                    await updateOrderStatusForSubOrder(subOrderId, 'delivered',
                      language === 'ar' ? 'تم استلام الطلب بنجاح' : 'Order marked as picked up');
                  }} 
                  sx={{ py: 1.5, px: 2, fontSize: '14px', '&:hover': { bgcolor: '#F3F4F6' }, direction: isRTL ? 'rtl' : 'ltr' }}
                >
                  <CheckCircleIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#10B981' }} />
                  {language === 'ar' ? 'وضع علامة كتم الاستلام' : 'Mark as Picked Up'}
                </MenuItem>
              ),
              
              subOrderStatus === 'out_for_delivery' && (
                <MenuItem 
                  key={`delivered-${idx}`}
                  onClick={async () => {
                    await updateOrderStatusForSubOrder(subOrderId, 'delivered',
                      language === 'ar' ? 'تم تسليم الطلب بنجاح' : 'Order marked as delivered');
                  }} 
                  sx={{ py: 1.5, px: 2, fontSize: '14px', '&:hover': { bgcolor: '#F3F4F6' }, direction: isRTL ? 'rtl' : 'ltr' }}
                >
                  <CheckCircleIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#10B981' }} />
                  {language === 'ar' ? 'وضع علامة كتم التسليم' : 'Mark as Delivered'}
                </MenuItem>
              ),
              
              // View Shipping - only for delivery subOrders
              subOrderFulfillment === 'delivery' && (
                <MenuItem 
                  key={`shipping-${idx}`}
                  onClick={() => handleViewShippingForSubOrder(subOrderId)}
                  sx={{ py: 1.5, px: 2, fontSize: '14px', '&:hover': { bgcolor: '#F3F4F6' }, direction: isRTL ? 'rtl' : 'ltr' }}
                >
                  <LocationIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#3B82F6' }} />
                  {language === 'ar' ? 'عرض تفاصيل الشحن' : 'View Shipping Details'}
                </MenuItem>
              ),
              
              // Cancel action for this subOrder
              <MenuItem 
                key={`cancel-${idx}`}
                onClick={() => handleOpenCancelForSubOrder(subOrderId)}
                sx={{ py: 1.5, px: 2, fontSize: '14px', color: '#EF4444', '&:hover': { bgcolor: '#FEE2E2' }, direction: isRTL ? 'rtl' : 'ltr' }}
              >
                <CancelIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20 }} />
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </MenuItem>,
            ].filter(Boolean);
          }).flat()
        ) : (
          // Single subOrder: original behavior
          <>
            {/* order_received → preparing */}
            {currentOrder?.status === 'order_received' && (
              <MenuItem onClick={handleMarkAsPreparing} sx={{ py: 1.5, px: 2, fontSize: '14px', '&:hover': { bgcolor: '#F3F4F6' }, direction: isRTL ? 'rtl' : 'ltr' }}>
                <RestaurantIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#F59E0B' }} />
                {language === 'ar' ? 'وضع علامة كجارٍ تحضيره' : 'Mark as Preparing'}
              </MenuItem>
            )}
            
            {/* preparing → ready */}
            {currentOrder?.status === 'preparing' && (
              <MenuItem onClick={handleMarkAsReady} sx={{ py: 1.5, px: 2, fontSize: '14px', '&:hover': { bgcolor: '#F3F4F6' }, direction: isRTL ? 'rtl' : 'ltr' }}>
                <CheckCircleIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#10B981' }} />
                {language === 'ar' ? 'وضع علامة كجاهز' : 'Mark as Ready'}
              </MenuItem>
            )}
            
            {/* ready → out_for_delivery (delivery only) */}
            {currentOrder?.status === 'ready' && currentOrder?.deliveryMode === 'delivery' && (
              <MenuItem onClick={handleMarkAsOutForDelivery} sx={{ py: 1.5, px: 2, fontSize: '14px', '&:hover': { bgcolor: '#F3F4F6' }, direction: isRTL ? 'rtl' : 'ltr' }}>
                <LocalShippingIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#3B82F6' }} />
                {language === 'ar' ? 'وضع علامة في الطريق' : 'Mark as Out for Delivery'}
              </MenuItem>
            )}
            
            {/* ready → picked up (pickup only) */}
            {currentOrder?.status === 'ready' && currentOrder?.deliveryMode === 'pickup' && (
              <MenuItem onClick={handleMarkAsPickedUp} sx={{ py: 1.5, px: 2, fontSize: '14px', '&:hover': { bgcolor: '#F3F4F6' }, direction: isRTL ? 'rtl' : 'ltr' }}>
                <CheckCircleIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#10B981' }} />
                {language === 'ar' ? 'وضع علامة كتم الاستلام' : 'Mark as Picked Up'}
              </MenuItem>
            )}
            
            {/* out_for_delivery → delivered */}
            {currentOrder?.status === 'out_for_delivery' && (
              <MenuItem onClick={handleMarkAsDelivered} sx={{ py: 1.5, px: 2, fontSize: '14px', '&:hover': { bgcolor: '#F3F4F6' }, direction: isRTL ? 'rtl' : 'ltr' }}>
                <CheckCircleIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#10B981' }} />
                {language === 'ar' ? 'وضع علامة كتم التسليم' : 'Mark as Delivered'}
              </MenuItem>
            )}
            
            {/* View Shipping - single subOrder delivery */}
            {currentOrder?.deliveryMode === 'delivery' && (
              <MenuItem onClick={handleViewShipping} sx={{ py: 1.5, px: 2, fontSize: '14px', '&:hover': { bgcolor: '#F3F4F6' }, direction: isRTL ? 'rtl' : 'ltr' }}>
                <LocationIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20, color: '#3B82F6' }} />
                {language === 'ar' ? 'عرض تفاصيل الشحن' : 'View Shipping Details'}
              </MenuItem>
            )}
            
            {/* Cancel - single subOrder */}
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={handleOpenCancel} sx={{ py: 1.5, px: 2, fontSize: '14px', color: '#EF4444', '&:hover': { bgcolor: '#FEE2E2' }, direction: isRTL ? 'rtl' : 'ltr' }}>
              <CancelIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, fontSize: 20 }} />
              {language === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}
            </MenuItem>
          </>
        )}
        
        <MenuItem
          onClick={handleContactFoodie}
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
          {(() => {
            // For mixed orders: find the selected delivery subOrder
            const targetSubOrder = shippingTargetSubOrderId && currentOrder?.subOrders
              ? currentOrder.subOrders.find(sub => sub._id === shippingTargetSubOrderId)
              : null;
            
            // Use subOrder context if available, otherwise fall back to order-level data
            const shippingData = targetSubOrder || currentOrder;
            
            if (!shippingData) return null;
            
            return (
              <Stack spacing={2}>
                {targetSubOrder && (
                  <Box sx={{ p: 1.5, bgcolor: '#EFF6FF', borderRadius: '8px', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: '#3B82F6', fontWeight: 600 }}>
                      {language === 'ar' ? 'توصيل' : 'Delivery SubOrder'}
                    </Typography>
                  </Box>
                )}
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
            );
          })()}
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
