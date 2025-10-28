import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

const Orders = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Mock data
  const orders = [
    {
      id: '1001',
      customer: 'John Doe',
      total: 24.99,
      status: 'delivered',
      date: '2023-06-15',
      items: 3,
    },
    {
      id: '1002',
      customer: 'Jane Smith',
      total: 18.50,
      status: 'preparing',
      date: '2023-06-15',
      items: 2,
    },
    {
      id: '1003',
      customer: 'Robert Johnson',
      total: 32.75,
      status: 'ready',
      date: '2023-06-14',
      items: 4,
    },
    {
      id: '1004',
      customer: 'Emily Davis',
      total: 15.25,
      status: 'order_received',
      date: '2023-06-14',
      items: 1,
    },
  ];

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

  return (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Order Management</Typography>
      </Box>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Search Orders"
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select label="Status">
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="order_received">Order Received</MenuItem>
              <MenuItem value="preparing">Preparing</MenuItem>
              <MenuItem value="ready">Ready</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Date Range"
            variant="outlined"
            type="date"
          />
        </Grid>
      </Grid>

      {/* Orders List */}
      <Card>
        <CardContent>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Order ID</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Customer</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Items</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Total</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>#{order.id}</td>
                    <td style={{ padding: '10px' }}>{order.customer}</td>
                    <td style={{ padding: '10px' }}>{order.date}</td>
                    <td style={{ padding: '10px' }}>{order.items}</td>
                    <td style={{ padding: '10px' }}>${order.total}</td>
                    <td style={{ padding: '10px' }}>
                      <Chip 
                        label={order.status.replace('_', ' ')} 
                        size="small" 
                        color={getStatusColor(order.status)}
                      />
                    </td>
                    <td style={{ padding: '10px' }}>
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleOpenDialog(order)}
                        sx={{ mr: 1 }}
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Order Details - #{selectedOrder?.id}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Customer Information</Typography>
                  <Typography><strong>Name:</strong> {selectedOrder.customer}</Typography>
                  <Typography><strong>Email:</strong> customer@example.com</Typography>
                  <Typography><strong>Phone:</strong> +1 234 567 8900</Typography>
                  <Typography><strong>Address:</strong> 123 Main St, City, State 12345</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Order Information</Typography>
                  <Typography><strong>Order ID:</strong> #{selectedOrder.id}</Typography>
                  <Typography><strong>Date:</strong> {selectedOrder.date}</Typography>
                  <Typography><strong>Status:</strong> 
                    <Chip 
                      label={selectedOrder.status.replace('_', ' ')} 
                      size="small" 
                      color={getStatusColor(selectedOrder.status)}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography><strong>Total:</strong> ${selectedOrder.total}</Typography>
                </Grid>
              </Grid>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Order Items</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Item</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Cook</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Quantity</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Price</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>Homemade Pizza</td>
                      <td style={{ padding: '10px' }}>Maria's Kitchen</td>
                      <td style={{ padding: '10px' }}>2</td>
                      <td style={{ padding: '10px' }}>$12.99</td>
                      <td style={{ padding: '10px' }}>$25.98</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>Garlic Bread</td>
                      <td style={{ padding: '10px' }}>Maria's Kitchen</td>
                      <td style={{ padding: '10px' }}>1</td>
                      <td style={{ padding: '10px' }}>$4.99</td>
                      <td style={{ padding: '10px' }}>$4.99</td>
                    </tr>
                  </tbody>
                </table>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          <Button variant="contained">Update Status</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Orders;