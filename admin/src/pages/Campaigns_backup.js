import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
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
  FormControlLabel
} from '@mui/material';
import { Add, Edit, Delete, Code, Visibility } from '@mui/icons-material';
import axios from 'axios';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
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
  }, []);

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get('http://localhost:5005/api/campaigns', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(response.data.data || []);
    } catch (err) {
      console.error('Fetch campaigns error:', err);
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Marketing Campaigns
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E56A00' } }}
        >
          Create Campaign
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F5F5F5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Discount %</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Dates</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Coupon Code</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Redeemed</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign._id}>
                <TableCell>{campaign.name}</TableCell>
                <TableCell>
                  <Chip label={campaign.type} size="small" color={campaign.type === 'COUPON' ? 'primary' : 'secondary'} />
                </TableCell>
                <TableCell>{campaign.discountPercent}%</TableCell>
                <TableCell>
                  <Chip label={campaign.status} size="small" color={getStatusColor(campaign.status)} />
                </TableCell>
                <TableCell sx={{ fontSize: '12px' }}>
                  {formatCampaignDates(campaign.startAt, campaign.endAt)}
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>{campaign.redemptionCount || 0}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleViewCampaign(campaign)}><Visibility /></IconButton>
                  <IconButton size="small" onClick={() => handleOpenDialog(campaign)}><Edit /></IconButton>
                  {campaign.type === 'COUPON' && (
                    <IconButton size="small" onClick={() => { setSelectedCampaign(campaign); setOpenCouponDialog(true); }}>
                      <Code />
                    </IconButton>
                  )}
                  <IconButton size="small" onClick={() => handleDelete(campaign._id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

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
                control={
                  <Checkbox 
                    checked={startNow} 
                    onChange={(e) => handleStartNowToggle(e.target.checked)}
                  />
                }
                label="Start Now (Set campaign to start at current time when clicking Create)"
              />
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
                helperText="Time will be rounded to nearest 30 minutes"
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
                helperText="Time will be rounded to nearest 30 minutes"
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
    </Container>
  );
};

export default Campaigns;
