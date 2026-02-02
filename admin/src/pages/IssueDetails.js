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
  TextField,
  Grid
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  Store as StoreIcon,
  CheckCircle as CheckIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const AdminIssueDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchIssueDetails();
  }, [orderId]);

  const fetchIssueDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/admin/issues/${orderId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setOrder(response.data.data);
        if (response.data.data.issue?.adminNotes) {
          setAdminNotes(response.data.data.issue.adminNotes);
        }
      }
    } catch (err) {
      console.error('Fetch issue details error:', err);
      setError(err.response?.data?.message || 'Failed to load issue details');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveIssue = async () => {
    try {
      setResolving(true);
      const token = localStorage.getItem('token');

      const response = await axios.patch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/admin/issues/${orderId}/resolve`,
        { adminNotes },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        navigate('/issues');
      }
    } catch (err) {
      console.error('Resolve issue error:', err);
      setError(err.response?.data?.message || 'Failed to resolve issue');
    } finally {
      setResolving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: '#FF7A00' }} />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box sx={{ p: 3, maxWidth: '1000px', mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Issue not found'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/issues')}>
          Back to Resolutions
        </Button>
      </Box>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'error';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: '1000px', mx: 'auto' }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/issues')} sx={{ bgcolor: '#FFFFFF' }}>
          <BackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Resolution Center
        </Typography>
        <Chip 
          label={order.issue?.status || 'unknown'} 
          color={getStatusColor(order.issue?.status)}
          size="small"
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Order Summary */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: '12px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <DescriptionIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Order #{order._id.toString().slice(-6)}
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Order Date</Typography>
                <Typography variant="body2">{formatDate(order.createdAt)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{order.totalAmount?.toFixed(2)} SAR</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Country</Typography>
                <Typography variant="body2">{order.deliveryAddress?.countryCode || 'N/A'}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Customer Info */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: '12px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PersonIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Customer Information
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Name</Typography>
                <Typography variant="body2">{order.customer?.name || 'N/A'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Email</Typography>
                <Typography variant="body2">{order.customer?.email || 'N/A'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Phone</Typography>
                <Typography variant="body2">{order.customer?.phone || 'N/A'}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Issue Details */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: '12px', border: '2px solid #ffebee' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WarningIcon color="error" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Issue Details
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">Reason</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {order.issue?.reason || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">Reported By</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, textTransform: 'capitalize' }}>
                    {order.issue?.reportedBy || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">Reported At</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {formatDate(order.issue?.reportedAt)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {order.issue?.description || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Cooks Involved */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: '12px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <StoreIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Cooks Involved in Order
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              
              {order.subOrders?.map((subOrder, index) => (
                <Box 
                  key={subOrder._id || index}
                  sx={{ 
                    p: 2, 
                    mb: index < order.subOrders.length - 1 ? 2 : 0,
                    bgcolor: '#f5f5f5',
                    borderRadius: '8px'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {subOrder.cook?.storeName || subOrder.cook?.name || 'Unknown Cook'}
                    </Typography>
                    <Chip 
                      label={subOrder.status} 
                      size="small"
                      color={subOrder.status === 'delivered' ? 'success' : 'default'}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Items: {subOrder.items?.map(item => item.product?.name).join(', ') || 'N/A'}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Resolution Section */}
        {order.issue?.status === 'open' && (
          <Grid item xs={12}>
            <Card sx={{ borderRadius: '12px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CheckIcon color="success" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Resolve Issue
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Admin Notes (Optional)"
                  placeholder="Add any notes about how this issue was resolved..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  sx={{ mb: 2 }}
                />
                
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => navigate('/issues')}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="contained"
                    onClick={handleResolveIssue}
                    disabled={resolving}
                    sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#43a047' } }}
                  >
                    {resolving ? 'Resolving...' : 'Mark as Resolved'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Resolved Info */}
        {order.issue?.status === 'resolved' && order.issue?.resolvedAt && (
          <Grid item xs={12}>
            <Alert severity="success" sx={{ borderRadius: '12px' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                This issue was resolved on {formatDate(order.issue.resolvedAt)}
              </Typography>
              {order.issue?.adminNotes && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Admin Notes:</strong> {order.issue.adminNotes}
                </Typography>
              )}
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AdminIssueDetails;
