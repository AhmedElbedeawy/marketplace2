import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Autocomplete,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

const Orders = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [cooks, setCooks] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterCook, setFilterCook] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting states
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Apply filters on button click
  const applyFilters = () => {
    fetchOrders();
  };
  
  const clearFilters = () => {
    setSearchTerm('');
    setFilterCustomer('');
    setFilterCook('');
    setFilterStatus('');
    fetchOrders();
  };
  
  useEffect(() => {
    fetchCooks();
  }, []);

  // Fetch orders when any filter changes
  useEffect(() => {
    fetchOrders();
  }, [searchTerm, filterCustomer, filterCook, filterStatus]);

  const fetchCooks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5005/api/admin/cooks?status=all&search=', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.cooks) {
        setCooks(data.cooks);
      }
    } catch (err) {
      console.error('Failed to fetch cooks:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let url = `http://localhost:5005/api/admin/orders?`;
      
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (filterCustomer) url += `customer=${encodeURIComponent(filterCustomer)}&`;
      if (filterCook) url += `cook=${encodeURIComponent(filterCook)}&`;
      if (filterStatus) url += `status=${encodeURIComponent(filterStatus)}&`;
      if (sortBy) url += `sortBy=${sortBy}&`;
      if (sortOrder) url += `sortOrder=${sortOrder}&`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setOrders(data.orders || []);
      } else {
        setError(data.message || 'Failed to fetch orders');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setTimeout(() => fetchOrders(), 0);
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ArrowUpIcon sx={{ fontSize: 14 }} /> : <ArrowDownIcon sx={{ fontSize: 14 }} />;
  };

  const handleOpenDialog = (order) => {
    setSelectedOrder(order);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedOrder(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'order_received': return 'warning';
      case 'preparing': return 'info';
      case 'ready': return 'success';
      case 'delivered': return 'primary';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // Helper to get cook name from order
  const getCookNames = (order) => {
    if (!order.subOrders || order.subOrders.length === 0) return 'N/A';
    return order.subOrders.map(s => s.cook?.storeName || s.cook?.name || 'Unknown').join(', ');
  };

  return (
    <Box sx={{ backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 56px)', width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '24px', mb: 0.5 }}>
          Order Management
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '13px' }}>
          Track and manage customer orders and delivery status
        </Typography>
      </Box>

      {/* Search and Filter Toggle */}
      <Card sx={{ mb: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: showFilters ? 2 : 0 }}>
            <TextField
              fullWidth
              label="Search by Order ID, Customer Name, or Email"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1 }}
            />
            <Button
              variant={showFilters ? "contained" : "outlined"}
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{ bgcolor: showFilters ? '#1976d2' : 'transparent', '&:hover': { bgcolor: showFilters ? '#1565c0' : '#f8fafc' } }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </Box>

          {/* Filters Panel */}
          {showFilters && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Customer Name"
                  variant="outlined"
                  size="small"
                  value={filterCustomer}
                  onChange={(e) => setFilterCustomer(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Autocomplete
                  freeSolo
                  options={cooks.map(c => ({ label: c.storeName || c.name, value: c._id }))}
                  value={filterCook}
                  onChange={(e, newValue) => setFilterCook(newValue ? newValue.label : '')}
                  onInputChange={(e, newInputValue) => setFilterCook(newInputValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Cook" variant="outlined" size="small" />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select 
                    label="Status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="order_received">Order Received</MenuItem>
                    <MenuItem value="preparing">Preparing</MenuItem>
                    <MenuItem value="ready">Ready</MenuItem>
                    <MenuItem value="delivered">Delivered</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  onClick={clearFilters}
                  sx={{ height: '100%' }}
                >
                  Clear All
                </Button>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Orders List */}
      <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', backgroundColor: '#f5f5f5' }}>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('orderNumber')}
                    >
                      Order ID {getSortIcon('orderNumber')}
                    </th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('customer')}
                    >
                      Customer {getSortIcon('customer')}
                    </th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('cook')}
                    >
                      Cook {getSortIcon('cook')}
                    </th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('createdAt')}
                    >
                      Date {getSortIcon('createdAt')}
                    </th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('totalAmount')}
                    >
                      Total {getSortIcon('totalAmount')}
                    </th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('status')}
                    >
                      Status {getSortIcon('status')}
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                        <Typography color="textSecondary">No orders found.</Typography>
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr 
                        key={order._id} 
                        style={{ 
                          borderBottom: '1px solid #eee',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>#{order.orderNumber || order._id.substring(0, 8)}</Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2" sx={{ color: '#4a4a4a' }}>{order.customer?.name || 'Unknown'}</Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2" sx={{ color: '#4a4a4a' }}>{getCookNames(order)}</Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>{new Date(order.createdAt).toLocaleDateString()}</Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>${order.totalAmount?.toFixed(2)}</Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Chip 
                            label={order.status?.replace('_', ' ')} 
                            size="small" 
                            color={getStatusColor(order.status)}
                            sx={{ textTransform: 'capitalize', fontWeight: 500 }}
                          />
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Button
                            size="small"
                            startIcon={<ViewIcon />}
                            onClick={() => handleOpenDialog(order)}
                            sx={{ color: '#1976d2' }}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          Order Details - #{selectedOrder?.orderNumber || selectedOrder?._id?.substring(0, 8)}
        </DialogTitle>
        <DialogContent dividers>
          {selectedOrder && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Customer Information</Typography>
                  <Typography><strong>Name:</strong> {selectedOrder.customer?.name || 'Unknown'}</Typography>
                  <Typography><strong>Email:</strong> {selectedOrder.customer?.email || 'N/A'}</Typography>
                  <Typography><strong>Phone:</strong> {selectedOrder.customer?.phone || 'N/A'}</Typography>
                  <Typography><strong>Address:</strong> {selectedOrder.shippingAddress || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Order Information</Typography>
                  <Typography><strong>Order ID:</strong> #{selectedOrder.orderNumber || selectedOrder._id}</Typography>
                  <Typography><strong>Date:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</Typography>
                  <Typography><strong>Status:</strong> 
                    <Chip 
                      label={selectedOrder.status?.replace('_', ' ')} 
                      size="small" 
                      color={getStatusColor(selectedOrder.status)}
                      sx={{ ml: 1, textTransform: 'capitalize' }}
                    />
                  </Typography>
                  <Typography><strong>Total:</strong> ${selectedOrder.totalAmount?.toFixed(2)}</Typography>
                </Grid>
              </Grid>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>Sub-Orders (by Cook)</Typography>
              {selectedOrder.subOrders?.map((sub, idx) => (
                <Box key={idx} sx={{ mb: 2, p: 2, border: '1px solid #e2e8f0', borderRadius: 1, bgcolor: '#f8fafc' }}>
                  <Typography variant="subtitle1" fontWeight="bold">Cook: {sub.cook?.storeName || sub.cook?.name}</Typography>
                  <Typography variant="body2" color="textSecondary">Status: {sub.status?.replace('_', ' ')}</Typography>
                  <Box sx={{ mt: 1 }}>
                    {sub.items?.map((item, iidx) => (
                      <Box key={iidx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography variant="body2">{item.product?.name} x {item.quantity}</Typography>
                        <Typography variant="body2">${(item.price * item.quantity)?.toFixed(2)}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          <Button variant="contained" sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}>Update Status</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Orders;