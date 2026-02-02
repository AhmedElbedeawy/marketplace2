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
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

const Expertise = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    isActive: true,
    sortOrder: 0
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

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

  useEffect(() => {
    fetchExpertise();
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  const fetchExpertise = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5005/api/admin/expertise', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      } else {
        setError(data.message || 'Failed to fetch expertise categories');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        nameAr: category.nameAr || '',
        isActive: category.isActive,
        sortOrder: category.sortOrder || 0
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        nameAr: '',
        isActive: true,
        sortOrder: categories.length + 1
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveExpertise = async () => {
    try {
      setSaving(true);
      setError('');
      const token = localStorage.getItem('token');
      const url = editingCategory 
        ? `http://localhost:5005/api/admin/expertise/${editingCategory._id}`
        : 'http://localhost:5005/api/admin/expertise';
      
      const response = await fetch(url, {
        method: editingCategory ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(editingCategory ? 'Expertise updated!' : 'Expertise created!');
        fetchExpertise();
        handleCloseDialog();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Operation failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this expertise? It will be hidden from new selections.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5005/api/admin/expertise/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(data.message);
        if (data.warning) alert(data.warning);
        fetchExpertise();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Deactivation failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (cat.nameAr && cat.nameAr.includes(searchQuery));
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && cat.isActive) || 
                         (statusFilter === 'inactive' && !cat.isActive);
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'nameAr':
        aVal = (a.nameAr || '').toLowerCase();
        bVal = (b.nameAr || '').toLowerCase();
        break;
      case 'sortOrder':
        aVal = a.sortOrder || 0;
        bVal = b.sortOrder || 0;
        break;
      case 'status':
        aVal = a.isActive ? 1 : 0;
        bVal = b.isActive ? 1 : 0;
        break;
      default:
        return 0;
    }
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <Box sx={{ backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 56px)', width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '24px', mb: 0.5 }}>
          Expertise Management
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '13px' }}>
          Define cooking specializations and culinary expertise categories
        </Typography>
      </Box>

      {/* Success/Error Alerts */}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {error && !openDialog && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters and Add Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Card sx={{ flex: 1, mr: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: showFilters ? 2 : 0 }}>
              <TextField
                fullWidth
                label="Search Expertise"
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
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' }, height: '42px' }}
        >
          Add Expertise
        </Button>
      </Box>

      {/* Success/Error Alerts */}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {error && !openDialog && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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
                      Name (EN) {getSortIcon('name')}
                    </th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('nameAr')}
                    >
                      Name (AR) {getSortIcon('nameAr')}
                    </th>
                    <th 
                      style={{ textAlign: 'center', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('sortOrder')}
                    >
                      Order {getSortIcon('sortOrder')}
                    </th>
                    <th 
                      style={{ textAlign: 'center', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('status')}
                    >
                      Status {getSortIcon('status')}
                    </th>
                    <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                        <Typography color="textSecondary">No expertise categories found.</Typography>
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((category) => (
                      <tr 
                        key={category._id} 
                        style={{ 
                          borderBottom: '1px solid #eee',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '12px', fontWeight: 500, color: '#1a1a1a', fontSize: '14px' }}>{category.name}</td>
                        <td style={{ padding: '12px', color: '#4a4a4a', fontSize: '14px' }}>{category.nameAr || '-'}</td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#4a4a4a', fontSize: '14px' }}>{category.sortOrder}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <Chip 
                            label={category.isActive ? 'Active' : 'Inactive'} 
                            size="small" 
                            sx={{ 
                              bgcolor: category.isActive ? '#e8f5e9' : '#fafafa',
                              color: category.isActive ? '#2e7d32' : '#9e9e9e',
                              fontWeight: 500,
                              fontSize: '11px',
                              height: '22px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <IconButton onClick={() => handleOpenDialog(category)} sx={{ color: '#1976d2', '&:hover': { bgcolor: '#1976d210' } }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          {category.isActive && (
                            <IconButton onClick={() => handleDeactivate(category._id)} sx={{ color: '#ef4444', '&:hover': { bgcolor: '#ef444410' } }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
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

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingCategory ? 'Edit Expertise' : 'Add New Expertise'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {error && <Alert severity="error">{error}</Alert>}
            
            <TextField
              fullWidth
              label="Expertise Name (English) *"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g. Pastry & Bakery"
            />
            <TextField
              fullWidth
              label="Expertise Name (Arabic)"
              name="nameAr"
              value={formData.nameAr}
              onChange={handleInputChange}
              placeholder="e.g. المخبوزات والمعجنات"
              dir="rtl"
            />
            <Box display="flex" gap={2}>
              <TextField
                type="number"
                label="Sort Order"
                name="sortOrder"
                value={formData.sortOrder}
                onChange={handleInputChange}
                sx={{ width: '120px' }}
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="isActive"
                  value={formData.isActive}
                  label="Status"
                  onChange={handleInputChange}
                >
                  <MenuItem value={true}>Active</MenuItem>
                  <MenuItem value={false}>Inactive</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseDialog} color="inherit">Cancel</Button>
          <Button 
            onClick={handleSaveExpertise} 
            variant="contained" 
            disabled={saving || !formData.name}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#FF9933' } }}
          >
            {editingCategory ? 'Update' : 'Create'} Expertise
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Expertise;
