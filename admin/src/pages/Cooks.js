import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
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
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Checkbox,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Block as SuspendIcon,
  TrendingUp as BoostIcon,
  Receipt as ReceiptIcon,
  Link as LinkIcon,
  CheckCircle,
  FilterList as FilterIcon,
} from '@mui/icons-material';
// import Expertise from './Expertise'; // Temporarily commented out to fix potential import issue

const Cooks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cooks, setCooks] = useState([]);
  const [stats, setStats] = useState({ pending: 0, active: 0, rejected: 0, suspended: 0 });
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Expertise Options
  const [expertiseOptions, setExpertiseOptions] = useState([]);
  
  // Dialogs
  const [selectedCook, setSelectedCook] = useState(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openBulkEditDialog, setOpenBulkEditDialog] = useState(false);
  const [openBulkDeleteDialog, setOpenBulkDeleteDialog] = useState(false);
  const [openAdminBoostDialog, setOpenAdminBoostDialog] = useState(false);
  const [openInvoiceDialog, setOpenInvoiceDialog] = useState(false);
  const [openPaymentLinkDialog, setOpenPaymentLinkDialog] = useState(false);
  const [openSuspendDialog, setOpenSuspendDialog] = useState(false);
  const [openGenerateInvoiceDialog, setOpenGenerateInvoiceDialog] = useState(false);
  
  const [rejectReason, setRejectReason] = useState('');
  const [editData, setEditData] = useState({ expertise: '', isTopRated: false });
  const [bulkData, setBulkData] = useState({ expertise: '', status: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [boostReason, setBoostReason] = useState('');
  const [invoiceData, setInvoiceData] = useState({ paymentLink: '', suspensionReason: 'unpaid_invoice', suspensionNotes: '' });
  const [generateInvoiceMonth, setGenerateInvoiceMonth] = useState(new Date().toISOString().slice(0, 7)); // Default to current month YYYY-MM

  const fetchCooks = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token') || '';
      if (!token) throw new Error('No authentication token found. Please login.');
      
      const response = await fetch(`http://localhost:5005/api/admin/cooks?status=${filterStatus}&search=${searchTerm}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch cooks');
      }
      const data = await response.json();
      setCooks(data.cooks);
      setStats(data.stats);
      setTotalPages(data.pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpertiseOptions = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/expertise');
      const data = await response.json();
      if (data.success) {
        setExpertiseOptions(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch expertise options:', err);
    }
  };

  useEffect(() => {
    fetchCooks();
    fetchExpertiseOptions();
    setSelectedIds([]); // Clear selection on filter change
  }, [filterStatus, searchTerm, page]);

  const handleStatusAction = async (cookId, action, extraData = {}) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token') || '';
      let url = '';
      let method = 'POST';

      switch (action) {
        case 'approve': url = `http://localhost:5005/api/admin/cook-requests/${cookId}/approve`; break;
        case 'reject': url = `http://localhost:5005/api/admin/cook-requests/${cookId}/reject`; break;
        case 'suspend': url = `http://localhost:5005/api/admin/cooks/${cookId}/suspend`; break;
        case 'unsuspend': url = `http://localhost:5005/api/admin/cooks/${cookId}/unsuspend`; break;
        case 'update': 
          url = `http://localhost:5005/api/admin/cooks/${cookId}`; 
          method = 'PUT';
          break;
        case 'delete':
          url = `http://localhost:5005/api/admin/cooks/${cookId}`;
          method = 'DELETE';
          break;
        case 'toggle-top-rated':
          url = `http://localhost:5005/api/admin/cooks/${cookId}/toggle-top-rated`;
          method = 'POST';
          break;
        default: return;
      }

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: method !== 'GET' ? JSON.stringify(extraData) : undefined
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Action failed');
      }

      fetchCooks();
      setOpenViewDialog(false);
      setOpenRejectDialog(false);
      setOpenEditDialog(false);
      setOpenDeleteDialog(false);
      setRejectReason('');
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async (action) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token') || '';
      let url = `http://localhost:5005/api/admin/cooks/bulk-${action}`;
      
      const body = { ids: selectedIds };
      if (action === 'update') {
        body.updates = {};
        if (bulkData.expertise) body.updates.expertise = bulkData.expertise;
        if (bulkData.isTopRated !== undefined) body.updates.isTopRated = bulkData.isTopRated;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Bulk action failed');
      }

      fetchCooks();
      setSelectedIds([]);
      setOpenBulkEditDialog(false);
      setOpenBulkDeleteDialog(false);
      setBulkData({ expertise: '', isTopRated: false, status: '' });
      alert(`Successfully performed ${action} on ${selectedIds.length} cooks`);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAdminBoost = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token') || '';
      
      const response = await fetch(
        `http://localhost:5005/api/admin/cooks/${selectedCook._id}/toggle-boost`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ reason: boostReason })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to toggle admin boost');
      }

      const data = await response.json();
      alert(data.message);
      fetchCooks();
      setOpenAdminBoostDialog(false);
      setBoostReason('');
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === cooks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cooks.map(c => c._id));
    }
  };

  const toggleTopRated = async (cookId, isTopRated) => {
    try {
      const token = localStorage.getItem('token') || '';
      
      const response = await fetch(
        `http://localhost:5005/api/admin/cooks/${cookId}/toggle-top-rated`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ isTopRated })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update top rated status');
      }

      fetchCooks();
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'suspended': return 'default';
      default: return 'default';
    }
  };

  const handleSetPaymentLink = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token') || '';
      
      if (!invoiceData.paymentLink.trim()) {
        alert('Please enter a payment link');
        return;
      }

      const response = await fetch(
        `http://localhost:5005/api/admin/invoices/${selectedCook.latestInvoice._id}/payment-link`,
        {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ paymentLink: invoiceData.paymentLink })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update payment link');
      }

      alert('Payment link updated successfully');
      fetchCooks();
      setOpenPaymentLinkDialog(false);
      setInvoiceData({ ...invoiceData, paymentLink: '' });
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkInvoicePaid = async (invoiceId, autoUnsuspend = false) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token') || '';

      const response = await fetch(
        `http://localhost:5005/api/admin/invoices/${invoiceId}/mark-paid`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ autoUnsuspend })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to mark invoice as paid');
      }

      const data = await response.json();
      alert(`Invoice marked as paid${data.data.cookUnsuspended ? ' and cook unsuspended' : ''}`);
      fetchCooks();
      setOpenInvoiceDialog(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token') || '';
      
      const response = await fetch(
        `http://localhost:5005/api/admin/invoices/generate`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ 
            cookId: selectedCook._id, 
            periodMonth: generateInvoiceMonth 
          })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to generate invoice');
      }

      alert('Invoice generated successfully');
      fetchCooks();
      setOpenGenerateInvoiceDialog(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendCook = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token') || '';

      if (!invoiceData.suspensionNotes.trim()) {
        alert('Please enter suspension notes');
        return;
      }

      const response = await fetch(
        `http://localhost:5005/api/admin/cooks/${selectedCook._id}/suspend`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({
            reason: invoiceData.suspensionNotes,
            suspensionReason: invoiceData.suspensionReason,
            suspensionNotes: invoiceData.suspensionNotes
          })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to suspend cook');
      }

      alert('Cook suspended successfully');
      fetchCooks();
      setOpenSuspendDialog(false);
      setInvoiceData({ paymentLink: '', suspensionReason: 'unpaid_invoice', suspensionNotes: '' });
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box sx={{ backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 56px)', width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '24px', mb: 0.5 }}>
            Cook Management
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', fontSize: '13px' }}>
            Manage cook accounts, approvals, and performance tracking
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          startIcon={<SettingsIcon />} 
          onClick={() => navigate('/admin/expertise')}
          sx={{ textTransform: 'none', fontWeight: 500 }}
        >
          Manage Expertise
        </Button>
      </Box>

      {process.env.NODE_ENV === 'development' && (
        <Button variant="outlined" size="small" onClick={async () => {
          const res = await fetch('http://localhost:5005/api/auth/demo-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'admin' })
          });
          const { token } = await res.json();
          localStorage.setItem('token', token);
          fetchCooks();
        }}>Demo: Fix Token</Button>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'All', count: stats.pending + stats.active + stats.rejected + stats.suspended, color: '#2196f3', value: 'all' },
          { label: 'Pending', count: stats.pending, color: '#ff9800', value: 'pending' },
          { label: 'Active', count: stats.active, color: '#4caf50', value: 'active' },
          { label: 'Rejected', count: stats.rejected, color: '#f44336', value: 'rejected' },
          { label: 'Suspended', count: stats.suspended, color: '#9e9e9e', value: 'suspended' },
        ].map((item) => (
          <Grid item xs={12} sm={6} md={2.4} key={item.label}>
            <Card 
              sx={{ 
                cursor: 'pointer', 
                borderBottom: filterStatus === item.value ? `4px solid ${item.color}` : 'none',
                bgcolor: filterStatus === item.value ? 'rgba(0,0,0,0.04)' : 'white'
              }}
              onClick={() => setFilterStatus(item.value)}
            >
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 600 }}>{item.label.toUpperCase()}</Typography>
                <Typography variant="h5" sx={{ color: item.color, fontWeight: 700 }}>{item.count}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, mb: 3, 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            bgcolor: '#f0f7ff', border: '1px solid #1976d2',
            position: 'sticky', top: 0, zIndex: 10
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" fontWeight="600" color="primary">
              {selectedIds.length} Cooks Selected
            </Typography>
            <Button size="small" onClick={() => setSelectedIds([])}>Clear</Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="contained" 
              size="small" 
              startIcon={<EditIcon />}
              onClick={() => setOpenBulkEditDialog(true)}
            >
              Bulk Edit
            </Button>
            <Button 
              variant="contained" 
              size="small" 
              color="error" 
              startIcon={<DeleteIcon />}
              onClick={() => setOpenBulkDeleteDialog(true)}
            >
              Bulk Delete
            </Button>
          </Box>
        </Paper>
      )}

      {/* Filters Row */}
      <Card sx={{ mb: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: showFilters ? 2 : 0 }}>
            <TextField
              fullWidth
              label="Search name, email, or store"
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
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status Filter</InputLabel>
                  <Select
                    label="Status Filter"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="all">All Cooks</MenuItem>
                    <MenuItem value="pending">Pending Requests</MenuItem>
                    <MenuItem value="active">Active Cooks</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
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

      {/* Unified Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', backgroundColor: '#f5f5f5' }}>
                    <th style={{ width: '40px', padding: '12px' }}>
                      <Checkbox 
                        size="small" 
                        indeterminate={selectedIds.length > 0 && selectedIds.length < cooks.length}
                        checked={cooks.length > 0 && selectedIds.length === cooks.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Name / Store</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Email / Phone</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Expertise</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Last Invoice</th>
                    <th style={{ textAlign: 'center', padding: '12px', fontWeight: 600 }}>Top Rated</th>
                    <th style={{ textAlign: 'center', padding: '12px', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cooks.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                        <Typography color="textSecondary">No cooks found.</Typography>
                      </td>
                    </tr>
                  ) : (
                    cooks.map((cook) => (
                      <tr 
                        key={cook._id} 
                        style={{ 
                          borderBottom: '1px solid #eee',
                          backgroundColor: selectedIds.includes(cook._id) ? '#f0f7ff' : 'transparent',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <td style={{ padding: '12px' }}>
                          <Checkbox 
                            size="small" 
                            checked={selectedIds.includes(cook._id)}
                            onChange={() => toggleSelect(cook._id)}
                          />
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{cook.name}</Typography>
                          <Typography variant="caption" color="textSecondary">{cook.storeName}</Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2">{cook.email}</Typography>
                          <Typography variant="caption" color="textSecondary">{cook.phone}</Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {Array.isArray(cook.expertise) ? (
                              cook.expertise.map((exp, i) => (
                                <Chip 
                                  key={i} 
                                  label={typeof exp === 'object' ? exp.name : exp} 
                                  size="small" 
                                  variant="outlined" 
                                />
                              ))
                            ) : (
                              <Typography variant="body2">{cook.expertise}</Typography>
                            )}
                          </Box>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Chip 
                            label={cook.role_cook_status} 
                            size="small" 
                            color={getStatusColor(cook.role_cook_status)}
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </td>
                        <td style={{ padding: '12px' }}>
                          {cook.latestInvoice ? (
                            <Box>
                              <Chip 
                                label={cook.latestInvoice.status.toUpperCase()} 
                                size="small" 
                                color={
                                  cook.latestInvoice.status === 'paid' ? 'success' :
                                  cook.latestInvoice.status === 'locked' ? 'error' :
                                  cook.latestInvoice.status === 'issued' ? 'warning' : 'default'
                                }
                              />
                              <Typography variant="caption" display="block" color="textSecondary">
                                {cook.latestInvoice.periodMonth}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="textSecondary">No invoices</Typography>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <Checkbox
                            size="small"
                            checked={!!cook.isTopRated}
                            onChange={() => toggleTopRated(cook._id, !cook.isTopRated)}
                            color="primary"
                          />
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <Box sx={{ 
                            display: 'flex', gap: 0.5, justifyContent: 'center',
                            opacity: 0.6,
                            transition: 'opacity 0.2s',
                            '&:hover': { opacity: 1 }
                          }}>
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={() => { setSelectedCook(cook); setOpenViewDialog(true); }}>
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            {cook.role_cook_status === 'pending' && (
                              <>
                                <Tooltip title="Approve">
                                  <IconButton 
                                    size="small" color="success"
                                    onClick={() => handleStatusAction(cook._id, 'approve')}
                                  >
                                    <ApproveIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                  <IconButton 
                                    size="small" color="error"
                                    onClick={() => { setSelectedCook(cook); setOpenRejectDialog(true); }}
                                  >
                                    <RejectIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}

                            {cook.role_cook_status === 'active' && (
                              <>
                                <Tooltip title="Generate Monthly Invoice">
                                  <IconButton 
                                    size="small" color="secondary"
                                    onClick={() => { setSelectedCook(cook); setOpenGenerateInvoiceDialog(true); }}
                                  >
                                    <ReceiptIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Suspend">
                                  <IconButton 
                                    size="small" color="warning"
                                    onClick={() => { setSelectedCook(cook); setOpenSuspendDialog(true); }}
                                  >
                                    <SuspendIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={cook.adminBoost ? 'Remove Admin Boost' : 'Add Admin Boost'}>
                                  <IconButton 
                                    size="small" 
                                    color={cook.adminBoost ? 'success' : 'default'}
                                    onClick={() => { setSelectedCook(cook); setOpenAdminBoostDialog(true); }}
                                  >
                                    <BoostIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}

                            {cook.role_cook_status === 'suspended' && (
                              <Tooltip title="Unsuspend">
                                <IconButton 
                                  size="small" color="success"
                                  onClick={() => handleStatusAction(cook._id, 'unsuspend')}
                                >
                                  <CheckCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            {/* Invoice Actions */}
                            {cook.latestInvoice && cook.latestInvoice.status !== 'paid' && (
                              <>
                                <Tooltip title="Set Payment Link">
                                  <IconButton 
                                    size="small" color="info"
                                    onClick={() => { setSelectedCook(cook); setOpenPaymentLinkDialog(true); }}
                                  >
                                    <LinkIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Mark Invoice Paid">
                                  <IconButton 
                                    size="small" color="primary"
                                    onClick={() => { setSelectedCook(cook); setOpenInvoiceDialog(true); }}
                                  >
                                    <ReceiptIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            
                            <Tooltip title="Edit Cook">
                              <IconButton 
                                size="small" color="primary"
                                onClick={() => { 
                                  setSelectedCook(cook); 
                                  setEditData({ expertise: cook.expertise });
                                  setOpenEditDialog(true); 
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Delete (Hard Delete)">
                              <IconButton 
                                size="small" color="error"
                                onClick={() => { setSelectedCook(cook); setOpenDeleteDialog(true); }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
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

      {/* --- Dialogs --- */}

      {/* View Modal */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cook Profile Details</DialogTitle>
        <DialogContent dividers>
          {selectedCook && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}><Typography variant="caption" color="textSecondary">Full Name</Typography><Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedCook.name}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="textSecondary">Store Name</Typography><Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedCook.storeName}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="textSecondary">Email</Typography><Typography variant="body1">{selectedCook.email}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="textSecondary">Phone</Typography><Typography variant="body1">{selectedCook.phone}</Typography></Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">Expertise</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {Array.isArray(selectedCook.expertise) ? (
                      selectedCook.expertise.map((exp, i) => (
                        <Chip 
                          key={i} 
                          label={typeof exp === 'object' ? exp.name : exp} 
                          size="small" 
                          variant="outlined" 
                        />
                      ))
                    ) : (
                      <Typography variant="body1">{selectedCook.expertise}</Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">Bio</Typography>
                  <Typography variant="body2" sx={{ bgcolor: '#f9f9f9', p: 1, borderRadius: 1 }}>{selectedCook.bio || 'No bio provided.'}</Typography>
                </Grid>
              </Grid>

              {/* Questionnaire Section */}
              {selectedCook.questionnaire && (
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>Registration Questionnaire</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="textSecondary">Experience Level</Typography>
                      <Typography variant="body2">{selectedCook.questionnaire.experienceLevel || 'Not answered'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Total Orders Fulfilled</Typography>
                      <Typography variant="body2">{selectedCook.questionnaire.totalOrders || 'Not answered'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Daily Target Orders</Typography>
                      <Typography variant="body2">{selectedCook.questionnaire.dailyOrders || 'Not answered'}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="textSecondary">Signature Dishes</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {selectedCook.questionnaire.signatureDishes?.length > 0 ? (
                          selectedCook.questionnaire.signatureDishes.map((dish, i) => (
                            <Chip key={i} label={dish} size="small" variant="outlined" />
                          ))
                        ) : 'None listed'}
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="textSecondary">Fulfillment Methods</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {selectedCook.questionnaire.fulfillmentMethods?.length > 0 ? (
                          selectedCook.questionnaire.fulfillmentMethods.map((method, i) => (
                            <Chip key={i} label={method} size="small" color="info" variant="outlined" />
                          ))
                        ) : 'None listed'}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}

              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                {selectedCook.role_cook_status === 'pending' && (
                  <>
                    <Button variant="contained" color="success" onClick={() => handleStatusAction(selectedCook._id, 'approve')}>Approve</Button>
                    <Button variant="outlined" color="error" onClick={() => setOpenRejectDialog(true)}>Reject</Button>
                  </>
                )}
                {selectedCook.role_cook_status === 'active' && (
                  <Button variant="outlined" color="warning" onClick={() => handleStatusAction(selectedCook._id, 'suspend', { reason: 'Admin suspended' })}>Suspend</Button>
                )}
                {selectedCook.role_cook_status === 'suspended' && (
                  <Button variant="contained" color="success" onClick={() => handleStatusAction(selectedCook._id, 'unsuspend')}>Unsuspend</Button>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenViewDialog(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Cook: {selectedCook?.name}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField label="Name" fullWidth disabled value={selectedCook?.name || ''} size="small" />
            <TextField label="Email" fullWidth disabled value={selectedCook?.email || ''} size="small" />
            
            <FormControl fullWidth>
              <InputLabel>Area of Expertise</InputLabel>
              <Select
                multiple
                value={Array.isArray(editData.expertise) ? editData.expertise.map(e => typeof e === 'object' ? e._id : e) : []}
                onChange={(e) => setEditData({ ...editData, expertise: e.target.value })}
                label="Area of Expertise"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((id) => {
                      const option = expertiseOptions.find(o => o._id === id);
                      return <Chip key={id} label={option ? option.name : id} size="small" />;
                    })}
                  </Box>
                )}
              >
                {expertiseOptions.map((option) => (
                  <MenuItem key={option._id} value={option._id}>
                    {option.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Checkbox
                checked={editData.isTopRated}
                onChange={(e) => setEditData({ ...editData, isTopRated: e.target.checked })}
                color="primary"
              />
              <Typography>Mark as Top-Rated Cook</Typography>
            </Box>

            <Alert severity="info" variant="outlined">Only 'Expertise' and 'Top-Rated' status are currently editable for live accounts.</Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => handleStatusAction(selectedCook._id, 'update', editData)}
            disabled={actionLoading}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Single Delete Confirmation */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle sx={{ color: 'error.main' }}>Delete Cook Account?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to delete <strong>{selectedCook?.name}</strong>?
          </Typography>
          <Alert severity="error" sx={{ mt: 2 }}>
            <strong>CRITICAL:</strong> This will permanently remove the cook's account, their store information, and ALL their products. This action is IRREVERSIBLE.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" color="error" 
            onClick={() => handleStatusAction(selectedCook._id, 'delete')}
            disabled={actionLoading}
          >
            Confirm Permanent Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Edit Modal */}
      <Dialog open={openBulkEditDialog} onClose={() => setOpenBulkEditDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Bulk Edit {selectedIds.length} Cooks</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="body2" color="textSecondary">Updates will be applied to all selected items.</Typography>
            
            <FormControl fullWidth size="small">
              <InputLabel>Expertise Update</InputLabel>
              <Select
                multiple
                label="Expertise Update"
                value={Array.isArray(bulkData.expertise) ? bulkData.expertise : []}
                onChange={(e) => setBulkData({ ...bulkData, expertise: e.target.value })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((id) => {
                      const option = expertiseOptions.find(o => o._id === id);
                      return <Chip key={id} label={option ? option.name : id} size="small" />;
                    })}
                  </Box>
                )}
              >
                {expertiseOptions.map((option) => (
                  <MenuItem key={option._id} value={option._id}>
                    {option.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Checkbox
                checked={!!bulkData.isTopRated}
                onChange={(e) => setBulkData({ ...bulkData, isTopRated: e.target.checked })}
                color="primary"
              />
              <Typography>Mark as Top-Rated Cooks</Typography>
            </Box>
            
            <Alert severity="info" variant="outlined">Both 'Expertise' and 'Top-Rated' status can be updated for selected cooks.</Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBulkEditDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => handleBulkAction('update')}
            disabled={actionLoading || !bulkData.expertise}
          >
            Apply to {selectedIds.length} Cooks
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <Dialog open={openBulkDeleteDialog} onClose={() => setOpenBulkDeleteDialog(false)}>
        <DialogTitle sx={{ color: 'error.main' }}>Bulk Delete {selectedIds.length} Cooks?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You are about to delete <strong>{selectedIds.length}</strong> cook accounts.
          </Typography>
          <Alert severity="error" sx={{ mt: 2 }}>
            This will permanently remove all selected accounts and their related data (stores, products). This cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBulkDeleteDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" color="error" 
            onClick={() => handleBulkAction('delete')}
            disabled={actionLoading}
          >
            Confirm Bulk Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate Invoice Dialog */}
      <Dialog open={openGenerateInvoiceDialog} onClose={() => setOpenGenerateInvoiceDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Generate Monthly Invoice</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" gutterBottom>
              Generate an invoice for <strong>{selectedCook?.name}</strong> for a specific month.
            </Typography>
            <TextField
              label="Select Month"
              type="month"
              fullWidth
              value={generateInvoiceMonth}
              onChange={(e) => setGenerateInvoiceMonth(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <Alert severity="info" sx={{ mt: 1 }}>
              This will aggregate all 'delivered' orders for the selected month and apply the current country's invoice VAT settings.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGenerateInvoiceDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="secondary"
            onClick={handleGenerateInvoice}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <ReceiptIcon />}
          >
            Generate Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={openRejectDialog} onClose={() => setOpenRejectDialog(false)}>
        <DialogTitle>Reject Cook Request</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>Please provide a reason for rejection (sent to user):</Typography>
          <TextField
            fullWidth multiline rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g., Missing documents"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRejectDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => handleStatusAction(selectedCook?._id, 'reject', { reason: rejectReason })} 
            color="error" variant="contained" 
            disabled={actionLoading || !rejectReason.trim()}
          >
            Confirm Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* Admin Boost Toggle Dialog */}
      <Dialog open={openAdminBoostDialog} onClose={() => setOpenAdminBoostDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BoostIcon color="primary" />
            {selectedCook?.adminBoost ? 'Remove Admin Boost' : 'Add Admin Boost'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Admin Boost is used for internal sorting priority only. It is never exposed in public APIs.
            </Alert>
            <Typography sx={{ mb: 2, fontWeight: 500 }}>
              Cook: <strong>{selectedCook?.storeName || selectedCook?.name}</strong>
            </Typography>
            <Typography sx={{ mb: 1, color: 'text.secondary', fontSize: '14px' }}>
              Current Status: {selectedCook?.adminBoost ? (
                <Chip label="Boosted" color="success" size="small" />
              ) : (
                <Chip label="Not Boosted" size="small" />
              )}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ mb: 1, fontWeight: 500 }}>Reason (optional but recommended):</Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={boostReason}
              onChange={(e) => setBoostReason(e.target.value)}
              placeholder="e.g., High-quality dishes, excellent customer feedback, strategic promotion"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenAdminBoostDialog(false); setBoostReason(''); }}>Cancel</Button>
          <Button 
            variant="contained"
            color={selectedCook?.adminBoost ? 'error' : 'success'}
            onClick={handleToggleAdminBoost}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <BoostIcon />}
          >
            {selectedCook?.adminBoost ? 'Remove Boost' : 'Apply Boost'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Set Payment Link Dialog */}
      <Dialog open={openPaymentLinkDialog} onClose={() => setOpenPaymentLinkDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Set Payment Link</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ mb: 2 }}>
              Invoice: <strong>{selectedCook?.latestInvoice?.invoiceNumber}</strong>
            </Typography>
            <Typography sx={{ mb: 1, color: 'text.secondary' }}>Period: {selectedCook?.latestInvoice?.periodMonth}</Typography>
            <Divider sx={{ my: 2 }} />
            <TextField
              fullWidth
              label="Payment Link (Payoneer)"
              value={invoiceData.paymentLink}
              onChange={(e) => setInvoiceData({ ...invoiceData, paymentLink: e.target.value })}
              placeholder="https://payoneer.com/..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenPaymentLinkDialog(false); setInvoiceData({ ...invoiceData, paymentLink: '' }); }}>Cancel</Button>
          <Button 
            variant="contained"
            onClick={handleSetPaymentLink}
            disabled={actionLoading || !invoiceData.paymentLink.trim()}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <LinkIcon />}
          >
            Set Link
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mark Invoice as Paid Dialog */}
      <Dialog open={openInvoiceDialog} onClose={() => setOpenInvoiceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mark Invoice as Paid</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This action will mark the invoice as paid. If the cook is suspended due to unpaid invoice, you can optionally unsuspend them.
            </Alert>
            <Typography sx={{ mb: 1 }}>
              Invoice: <strong>{selectedCook?.latestInvoice?.invoiceNumber}</strong>
            </Typography>
            <Typography sx={{ mb: 1 }}>Period: {selectedCook?.latestInvoice?.periodMonth}</Typography>
            <Typography sx={{ mb: 1 }}>Amount: {selectedCook?.latestInvoice?.netAmount} {selectedCook?.latestInvoice?.currency}</Typography>
            {selectedCook?.role_cook_status === 'suspended' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Cook is currently suspended. Auto-unsuspend will be applied if confirmed.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInvoiceDialog(false)}>Cancel</Button>
          <Button 
            variant="contained"
            color="success"
            onClick={() => handleMarkInvoicePaid(
              selectedCook?.latestInvoice?._id,
              selectedCook?.role_cook_status === 'suspended'
            )}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <ReceiptIcon />}
          >
            Mark as Paid
          </Button>
        </DialogActions>
      </Dialog>

      {/* Suspend Cook Dialog */}
      <Dialog open={openSuspendDialog} onClose={() => setOpenSuspendDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Suspend Cook</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ mb: 2 }}>
              Cook: <strong>{selectedCook?.name}</strong> ({selectedCook?.storeName})
            </Typography>
            <Divider sx={{ my: 2 }} />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Suspension Reason</InputLabel>
              <Select
                value={invoiceData.suspensionReason}
                onChange={(e) => setInvoiceData({ ...invoiceData, suspensionReason: e.target.value })}
                label="Suspension Reason"
              >
                <MenuItem value="unpaid_invoice">Unpaid Invoice</MenuItem>
                <MenuItem value="policy_violation">Policy Violation</MenuItem>
                <MenuItem value="quality_issues">Quality Issues</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Suspension Notes"
              value={invoiceData.suspensionNotes}
              onChange={(e) => setInvoiceData({ ...invoiceData, suspensionNotes: e.target.value })}
              placeholder="Provide detailed reason for suspension"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenSuspendDialog(false); setInvoiceData({ paymentLink: '', suspensionReason: 'unpaid_invoice', suspensionNotes: '' }); }}>Cancel</Button>
          <Button 
            variant="contained"
            color="warning"
            onClick={handleSuspendCook}
            disabled={actionLoading || !invoiceData.suspensionNotes.trim()}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <SuspendIcon />}
          >
            Suspend Cook
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Cooks;
