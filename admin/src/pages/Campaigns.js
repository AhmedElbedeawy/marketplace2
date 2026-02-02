import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Box,
  Alert,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { 
  Add, Edit, Delete, Code, Visibility,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import axios from 'axios';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCouponDialog, setOpenCouponDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openCouponPopup, setOpenCouponPopup] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [dropdownData, setDropdownData] = useState({ cooks: [], categories: [], dishes: [] });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [dialogSuccess, setDialogSuccess] = useState('');
  
  // Sorting states
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ArrowUpIcon sx={{ fontSize: 14 }} /> : <ArrowDownIcon sx={{ fontSize: 14 }} />;
  };
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'DISCOUNT',
    startAt: '',
    endAt: '',
    discountPercent: 10,
    maxDiscountAmount: '',
    minOrderValue: 0,
    scope: {
      applyToAll: true,
      cookIds: [],
      categoryIds: [],
      dishIds: []
    }
  });

  const [couponForm, setCouponForm] = useState({
    count: 10,
    prefix: 'SAVE'
  });

  const [generatedCouponCode, setGeneratedCouponCode] = useState(null);
  const [startNow, setStartNow] = useState(false);
  const [durationMode, setDurationMode] = useState('custom'); // 'custom', '1day', '3days', '7days'

  useEffect(() => {
    fetchCampaigns();
    fetchDropdownData();
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      
      let url = `http://localhost:5005/api/campaigns?search=${searchQuery || ''}&status=${statusFilter}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(response.data.data || []);
    } catch (err) {
      console.error('Fetch campaigns error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('http://localhost:5005/api/campaigns/dropdown-data', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDropdownData(response.data.data);
    } catch (err) {
      console.error('Fetch dropdown error:', err);
    }
  };

  const handleOpenDialog = (campaign = null) => {
    if (campaign) {
      // Format datetime for datetime-local input - preserve local timezone
      const formatDateTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setFormData({
        ...campaign,
        startAt: formatDateTime(campaign.startAt),
        endAt: formatDateTime(campaign.endAt)
      });
      setSelectedCampaign(campaign);
      setStartNow(false);
    } else {
      setFormData({
        name: '',
        type: 'DISCOUNT',
        startAt: '',
        endAt: '',
        discountPercent: 10,
        maxDiscountAmount: '',
        minOrderValue: 0,
        scope: {
          applyToAll: true,
          cookIds: [],
          categoryIds: [],
          dishIds: []
        }
      });
      setSelectedCampaign(null);
      setStartNow(false);
      setDurationMode('custom');
    }
    setOpenDialog(true);
    setGeneratedCouponCode(null);
    setDialogError('');
    setDialogSuccess('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDialogError('');
    setDialogSuccess('');
    setDurationMode('custom');
  };

  // Round time to nearest 30 minutes (in local timezone)
  const roundToHalfHour = (date) => {
    const d = new Date(date);
    const minutes = d.getMinutes();
    
    // Round to nearest 30 minutes
    if (minutes < 15) {
      d.setMinutes(0);
    } else if (minutes < 45) {
      d.setMinutes(30);
    } else {
      d.setMinutes(0);
      d.setHours(d.getHours() + 1);
    }
    d.setSeconds(0);
    d.setMilliseconds(0);
    
    return d;
  };

  // Format Date object to datetime-local input format (YYYY-MM-DDThh:mm)
  const formatToDateTimeLocal = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Handle duration mode change
  const handleDurationModeChange = (mode) => {
    setDurationMode(mode);
    // Clear end date when switching to preset durations
    if (mode !== 'custom') {
      setFormData({ ...formData, endAt: '' });
    }
  };

  // Handle Start Now toggle
  const handleStartNowToggle = (checked) => {
    setStartNow(checked);
    // Don't set time here - wait until actual submission
  };

  // Handle date-time change with rounding
  const handleDateTimeChange = (field, value) => {
    if (!value) {
      setFormData({ ...formData, [field]: '' });
      return;
    }
    
    // Parse the datetime-local value as local time
    const selectedDate = new Date(value);
    const rounded = roundToHalfHour(selectedDate);
    const formatted = formatToDateTimeLocal(rounded);
    
    setFormData({ ...formData, [field]: formatted });
  };

  const handleSubmit = async () => {
    try {
      setDialogError('');
      setDialogSuccess('');
      const token = localStorage.getItem('token');
      
      let finalStartAt = formData.startAt;
      let finalEndAt = formData.endAt;
      
      // If Start Now is checked, use current time at moment of submission
      if (startNow && !selectedCampaign) {
        const now = new Date();
        const rounded = roundToHalfHour(now);
        finalStartAt = formatToDateTimeLocal(rounded);
      }
      
      // Calculate end date based on duration mode
      if (durationMode !== 'custom' && !selectedCampaign) {
        const startDate = new Date(finalStartAt || new Date());
        const endDate = new Date(startDate);
        
        // Add days based on selected duration
        switch (durationMode) {
          case '1day':
            endDate.setDate(endDate.getDate() + 1);
            break;
          case '3days':
            endDate.setDate(endDate.getDate() + 3);
            break;
          case '7days':
            endDate.setDate(endDate.getDate() + 7);
            break;
        }
        
        finalEndAt = formatToDateTimeLocal(endDate);
      }
      
      // Convert datetime-local to ISO string preserving local timezone intent
      const submitData = {
        ...formData,
        startAt: finalStartAt ? new Date(finalStartAt).toISOString() : '',
        endAt: finalEndAt ? new Date(finalEndAt).toISOString() : ''
      };
      
      if (selectedCampaign) {
        await axios.put(`http://localhost:5005/api/campaigns/${selectedCampaign._id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDialogSuccess('Campaign updated successfully!');
        fetchCampaigns();
        setTimeout(() => handleCloseDialog(), 1500);
      } else {
        const response = await axios.post('http://localhost:5005/api/campaigns', submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Show generated coupon code if campaign type is COUPON
        if (response.data.coupon) {
          setGeneratedCouponCode(response.data.coupon);
          setOpenCouponPopup(true);
          handleCloseDialog();
        } else {
          setDialogSuccess('Campaign created successfully!');
          setTimeout(() => handleCloseDialog(), 1500);
        }
        
        fetchCampaigns();
      }
    } catch (err) {
      setDialogError(err.response?.data?.message || 'Failed to save campaign');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5005/api/campaigns/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCampaigns();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete campaign');
    }
  };

  const handleGenerateCoupons = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5005/api/campaigns/${selectedCampaign._id}/coupons`, couponForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(`${couponForm.count} coupons generated successfully!`);
      setOpenCouponDialog(false);
      fetchCampaigns();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate coupons');
    }
  };

  const handleViewCampaign = async (campaign) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5005/api/campaigns/${campaign._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedCampaign(response.data.data);
      setOpenViewDialog(true);
    } catch (err) {
      alert('Failed to load campaign details');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PAUSED': return 'warning';
      case 'ENDED': return 'default';
      default: return 'default';
    }
  };

  // Format date display for table: "12 Jan 2026 | Start: 10:00 | End: 18:30"
  const formatCampaignDates = (startAt, endAt) => {
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    
    // Format date (e.g., "12 Jan 2026")
    const dateStr = startDate.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    
    // Format times (e.g., "10:00")
    const startTime = startDate.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
    
    const endTime = endDate.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
    
    return `${dateStr} | Start: ${startTime} | End: ${endTime}`;
  };

  return (
    <Box sx={{ backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 56px)', width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '24px', mb: 0.5 }}>
            Marketing Campaigns
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', fontSize: '13px' }}>
            Create and manage promotional campaigns and discount codes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E56A00' }, textTransform: 'none', fontWeight: 600, fontSize: '13px' }}
        >
          Create Campaign
        </Button>
      </Box>

      {/* Search and Filter Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Card sx={{ flex: 1, mr: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: showFilters ? 2 : 0 }}>
              <TextField
                fullWidth
                label="Search Campaigns"
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                <Grid item xs={12} sm={6} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      label="Status"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Statuses</MenuItem>
                      <MenuItem value="ACTIVE">Active</MenuItem>
                      <MenuItem value="PAUSED">Paused</MenuItem>
                      <MenuItem value="ENDED">Ended</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                    sx={{ height: '100%' }}
                  >
                    Clear All
                  </Button>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

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
                      onClick={() => handleSort('name')}
                    >
                      Name {getSortIcon('name')}
                    </th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('type')}
                    >
                      Type {getSortIcon('type')}
                    </th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('discountPercent')}
                    >
                      Discount % {getSortIcon('discountPercent')}
                    </th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('status')}
                    >
                      Status {getSortIcon('status')}
                    </th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('startAt')}
                    >
                      Dates {getSortIcon('startAt')}
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Coupon Code</th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('redemptionCount')}
                    >
                      Redeemed {getSortIcon('redemptionCount')}
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                        <Typography color="textSecondary">No campaigns found.</Typography>
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((campaign) => (
                      <tr 
                        key={campaign._id} 
                        style={{ 
                          borderBottom: '1px solid #eee',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>{campaign.name}</Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Chip label={campaign.type} size="small" color={campaign.type === 'COUPON' ? 'primary' : 'secondary'} />
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2">{campaign.discountPercent}%</Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Chip label={campaign.status} size="small" color={getStatusColor(campaign.status)} />
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2" sx={{ fontSize: '12px', color: '#64748b' }}>
                            {formatCampaignDates(campaign.startAt, campaign.endAt)}
                          </Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {campaign.type === 'COUPON' && campaign.couponCount > 0 ? (
                            <Chip 
                              label={`${campaign.couponCount} code(s)`} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                              sx={{ cursor: 'pointer' }}
                              onClick={() => handleViewCampaign(campaign)}
                            />
                          ) : campaign.type === 'COUPON' ? (
                            <Typography variant="caption" color="text.secondary">No codes</Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">N/A</Typography>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2">{campaign.redemptionCount || 0}</Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" onClick={() => handleViewCampaign(campaign)}><Visibility fontSize="small" /></IconButton>
                            <IconButton size="small" onClick={() => handleOpenDialog(campaign)}><Edit fontSize="small" /></IconButton>
                            {campaign.type === 'COUPON' && (
                              <IconButton size="small" onClick={() => { setSelectedCampaign(campaign); setOpenCouponDialog(true); }}>
                                <Code fontSize="small" />
                              </IconButton>
                            )}
                            <IconButton size="small" onClick={() => handleDelete(campaign._id)} color="error"><Delete fontSize="small" /></IconButton>
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

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{selectedCampaign ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError('')}>{dialogError}</Alert>}
          {dialogSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setDialogSuccess('')}>{dialogSuccess}</Alert>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Campaign Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="DISCOUNT">Auto Discount %</MenuItem>
                  <MenuItem value="COUPON">Coupon Code</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Discount %"
                type="number"
                value={formData.discountPercent}
                onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Checkbox checked={startNow} onChange={(e) => handleStartNowToggle(e.target.checked)} />}
                label="Start Now (Set campaign to start at current time when clicking Create)"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Campaign Duration</Typography>
              <FormControl fullWidth>
                <InputLabel>Duration</InputLabel>
                <Select
                  value={durationMode}
                  onChange={(e) => handleDurationModeChange(e.target.value)}
                >
                  <MenuItem value="1day">1 Day</MenuItem>
                  <MenuItem value="3days">3 Days</MenuItem>
                  <MenuItem value="7days">7 Days</MenuItem>
                  <MenuItem value="custom">Custom (Select Dates)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Start Date & Time"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={formData.startAt}
                onChange={(e) => handleDateTimeChange('startAt', e.target.value)}
                disabled={startNow}
                helperText={durationMode === 'custom' ? "Time will be rounded to nearest 30 minutes" : "Auto-calculated from Start Now"}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="End Date & Time"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={formData.endAt}
                onChange={(e) => handleDateTimeChange('endAt', e.target.value)}
                disabled={durationMode !== 'custom'}
                helperText={durationMode === 'custom' ? "Time will be rounded to nearest 30 minutes" : `Auto-calculated (${durationMode.replace('day', ' day').replace('s', 's')})`}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Min Order Value"
                type="number"
                value={formData.minOrderValue}
                onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Max Discount Amount"
                type="number"
                value={formData.maxDiscountAmount}
                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Campaign Scope</Typography>
              <FormControl fullWidth>
                <InputLabel>Apply To</InputLabel>
                <Select
                  value={formData.scope.applyToAll ? 'all' : 'specific'}
                  onChange={(e) => setFormData({
                    ...formData,
                    scope: { ...formData.scope, applyToAll: e.target.value === 'all' }
                  })}
                >
                  <MenuItem value="all">Entire Platform</MenuItem>
                  <MenuItem value="specific">Specific Items</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Show multi-select when Specific Items is selected */}
            {!formData.scope.applyToAll && (
              <>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Select Kitchens (Optional)</InputLabel>
                    <Select
                      multiple
                      value={formData.scope.cookIds || []}
                      onChange={(e) => setFormData({
                        ...formData,
                        scope: { ...formData.scope, cookIds: e.target.value }
                      })}
                      renderValue={(selected) => `${selected.length} kitchen(s) selected`}
                    >
                      {dropdownData.cooks.map((cook) => (
                        <MenuItem key={cook._id} value={cook._id}>
                          <Checkbox checked={formData.scope.cookIds?.indexOf(cook._id) > -1} />
                          {cook.storeName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Select Categories (Optional)</InputLabel>
                    <Select
                      multiple
                      value={formData.scope.categoryIds || []}
                      onChange={(e) => setFormData({
                        ...formData,
                        scope: { ...formData.scope, categoryIds: e.target.value }
                      })}
                      renderValue={(selected) => `${selected.length} category(s) selected`}
                    >
                      {dropdownData.categories.map((category) => (
                        <MenuItem key={category._id} value={category._id}>
                          <Checkbox checked={formData.scope.categoryIds?.indexOf(category._id) > -1} />
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Select Dishes (Optional)</InputLabel>
                    <Select
                      multiple
                      value={formData.scope.dishIds || []}
                      onChange={(e) => setFormData({
                        ...formData,
                        scope: { ...formData.scope, dishIds: e.target.value }
                      })}
                      renderValue={(selected) => `${selected.length} dish(es) selected`}
                    >
                      {dropdownData.dishes.map((dish) => (
                        <MenuItem key={dish._id} value={dish._id}>
                          <Checkbox checked={formData.scope.dishIds?.indexOf(dish._id) > -1} />
                          {dish.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E56A00' } }}>
            {selectedCampaign ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate Coupons Dialog */}
      <Dialog open={openCouponDialog} onClose={() => setOpenCouponDialog(false)}>
        <DialogTitle>Generate Coupon Codes</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Number of Coupons"
            type="number"
            value={couponForm.count}
            onChange={(e) => setCouponForm({ ...couponForm, count: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Code Prefix"
            value={couponForm.prefix}
            onChange={(e) => setCouponForm({ ...couponForm, prefix: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCouponDialog(false)}>Cancel</Button>
          <Button onClick={handleGenerateCoupons} variant="contained" sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E56A00' } }}>
            Generate
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Campaign Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Campaign Details</DialogTitle>
        <DialogContent>
          {selectedCampaign && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>{selectedCampaign.name}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Type: {selectedCampaign.type}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Discount: {selectedCampaign.discountPercent}%
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Status: {selectedCampaign.status}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {formatCampaignDates(selectedCampaign.startAt, selectedCampaign.endAt)}
              </Typography>

              {selectedCampaign.type === 'COUPON' && selectedCampaign.coupons && selectedCampaign.coupons.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    Generated Coupon Codes:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedCampaign.coupons.map((coupon) => (
                      <Chip key={coupon._id} label={coupon.code} color="primary" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Coupon Code Generated Popup */}
      <Dialog 
        open={openCouponPopup} 
        onClose={() => setOpenCouponPopup(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 700, color: '#FF7A00' }}>
          🎉 Coupon Code Generated!
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" gutterBottom>
              Your coupon code has been created successfully:
            </Typography>
            <Chip 
              label={generatedCouponCode} 
              color="primary" 
              sx={{ 
                fontSize: '18px', 
                fontWeight: 700, 
                py: 3, 
                px: 2,
                mt: 2,
                bgcolor: '#FF7A00',
                color: 'white'
              }} 
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Share this code with your customers!
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenCouponPopup(false)} 
            variant="contained" 
            fullWidth
            sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E56A00' } }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Campaigns;
