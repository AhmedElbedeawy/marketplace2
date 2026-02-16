import React, { useState, useEffect, useRef } from 'react';
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
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  FilterList as FilterIcon,
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const API_URL = 'http://localhost:5005/api';

const Categories = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Sorting states
  const [sortBy, setSortBy] = useState('sortOrder');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Icon upload states
  const [iconWebFile, setIconWebFile] = useState(null);
  const [iconMobileFile, setIconMobileFile] = useState(null);
  const [iconWebPreview, setIconWebPreview] = useState('');
  const [iconMobilePreview, setIconMobilePreview] = useState('');
  
  const fileInputWebRef = useRef(null);
  const fileInputMobileRef = useRef(null);
  
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
    fetchCategories();
  }, [searchTerm, filterStatus, sortBy, sortOrder]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setCategories(Array.isArray(data) ? data : []);
      } else {
        setError(data.message || 'Failed to fetch categories');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category = null) => {
    if (category) {
      setEditingCategory({
        ...category,
        nameEn: category.nameEn || category.name,
        nameAr: category.nameAr || '',
        description: category.description || '',
        descriptionAr: category.descriptionAr || '',
        sortOrder: category.sortOrder || 0,
        color: category.color || ''
      });
      setIconWebPreview(category.icons?.web || '');
      setIconMobilePreview(category.icons?.mobile || '');
      setIconWebFile(null);
      setIconMobileFile(null);
    } else {
      setEditingCategory({
        nameEn: '',
        nameAr: '',
        description: '',
        descriptionAr: '',
        sortOrder: 0,
        color: '',
        isActive: true
      });
      setIconWebPreview('');
      setIconMobilePreview('');
      setIconWebFile(null);
      setIconMobileFile(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
    setIconWebFile(null);
    setIconMobileFile(null);
    setIconWebPreview('');
    setIconMobilePreview('');
  };

  const handleFileChange = (type, file) => {
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError('Only PNG and JPG images are allowed');
      return;
    }
    
    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'web') {
        setIconWebPreview(e.target.result);
        setIconWebFile(file);
      } else {
        setIconMobilePreview(e.target.result);
        setIconMobileFile(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveIcon = (type) => {
    if (type === 'web') {
      setIconWebFile(null);
      setIconWebPreview('');
    } else {
      setIconMobileFile(null);
      setIconMobilePreview('');
    }
  };

  const handleSaveCategory = async () => {
    if (!editingCategory.nameEn || !editingCategory.nameAr) {
      setError('Both English and Arabic names are required');
      return;
    }

    try {
      setError('');
      const token = localStorage.getItem('token');
      const method = editingCategory._id ? 'PUT' : 'POST';
      const url = editingCategory._id 
        ? `${API_URL}/admin/categories/${editingCategory._id}`
        : `${API_URL}/admin/categories`;

      console.log(`[Categories] ${method} ${url}`);
      console.log('[Categories] Icon Web File:', iconWebFile);
      console.log('[Categories] Icon Mobile File:', iconMobileFile);

      // Build form data for file uploads
      const formData = new FormData();
      formData.append('nameEn', editingCategory.nameEn);
      formData.append('nameAr', editingCategory.nameAr);
      if (editingCategory.description) formData.append('description', editingCategory.description);
      if (editingCategory.descriptionAr) formData.append('descriptionAr', editingCategory.descriptionAr);
      formData.append('sortOrder', editingCategory.sortOrder || 0);
      formData.append('color', editingCategory.color || '');
      formData.append('isActive', editingCategory.isActive);
      
      if (iconWebFile) {
        formData.append('iconWeb', iconWebFile);
      }
      if (iconMobileFile) {
        formData.append('iconMobile', iconMobileFile);
      }

      console.log('[Categories] Sending FormData to', url);
      const response = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('[Categories] Response Status:', response.status);
      const data = await response.json();
      console.log('[Categories] Response Data:', data);
      
      if (response.ok) {
        setSuccess(`Category ${editingCategory._id ? 'updated' : 'created'} successfully`);
        fetchCategories();
        handleCloseDialog();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Operation failed');
      }
    } catch (err) {
      console.error('[Categories] Error:', err);
      setError('Network error');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setSuccess('Category deleted successfully');
        fetchCategories();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Network error');
    }
  };

  // Sort categories
  const sortedCategories = [...categories].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = (a.nameEn || a.name).localeCompare(b.nameEn || b.name);
    } else if (sortBy === 'sortOrder') {
      comparison = (a.sortOrder || 0) - (b.sortOrder || 0);
    } else if (sortBy === 'isActive') {
      comparison = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <Box sx={{ backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 56px)', width: '100%' }}>
      {/* Success Alert */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Header with Add Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '24px', mb: 0.5 }}>
            Category Management
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', fontSize: '13px' }}>
            Organize products into categories for better navigation
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ 
            bgcolor: '#1976d2',
            '&:hover': { bgcolor: '#1565c0' }
          }}
        >
          Add Category
        </Button>
      </Box>

      {/* Search and Filter Toggle */}
      <Card sx={{ mb: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: showFilters ? 2 : 0 }}>
            <TextField
              fullWidth
              label="Search Categories"
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
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
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

      {/* Categories List */}
      <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', backgroundColor: '#f5f5f5' }}>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Sort</th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('name')}
                    >
                      Category {getSortIcon('name')}
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>English Name</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Arabic Name</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Icon</th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('isActive')}
                    >
                      Status {getSortIcon('isActive')}
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                        <Typography color="textSecondary">No categories found.</Typography>
                      </td>
                    </tr>
                  ) : (
                    sortedCategories
                      .filter(c => {
                        const searchLower = searchTerm.toLowerCase();
                        const matchesSearch = 
                          (c.name || '').toLowerCase().includes(searchLower) ||
                          (c.nameEn || '').toLowerCase().includes(searchLower) ||
                          (c.nameAr || '').toLowerCase().includes(searchLower);
                        const matchesStatus = filterStatus === 'all' || 
                                             (filterStatus === 'active' && c.isActive) || 
                                             (filterStatus === 'inactive' && !c.isActive);
                        return matchesSearch && matchesStatus;
                      })
                      .map((category) => (
                        <tr 
                          key={category._id} 
                          style={{ 
                            borderBottom: '1px solid #eee',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '12px' }}>
                            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '12px' }}>
                              {category.sortOrder || 0}
                            </Typography>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                              {category.name}
                            </Typography>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <Typography variant="body2">{category.nameEn || category.name}</Typography>
                          </td>
                          <td style={{ padding: '12px' }} dir="rtl">
                            <Typography variant="body2">{category.nameAr || '-'}</Typography>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {category.icons?.web || category.icon ? (
                              <Box 
                                component="img"
                                src={category.icons?.web || category.icon}
                                sx={{ width: 32, height: 32, borderRadius: 1, objectFit: 'cover' }}
                                onError={(e) => { e.target.style.display = 'none' }}
                              />
                            ) : (
                              <ImageIcon sx={{ fontSize: 24, color: '#ccc' }} />
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <Chip 
                              label={category.isActive ? 'active' : 'inactive'} 
                              size="small" 
                              color={category.isActive ? 'success' : 'default'}
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </td>
                          <td style={{ padding: '12px' }}>
                            <Button
                              size="small"
                              startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                              onClick={() => handleOpenDialog(category)}
                              sx={{
                                mr: 1,
                                fontSize: '12px',
                                color: '#1976d2',
                                '&:hover': { bgcolor: '#1976d210' }
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                              onClick={() => handleDeleteCategory(category._id)}
                              sx={{ fontSize: '12px' }}
                            >
                              Delete
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

      {/* Add/Edit Category Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory?._id ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* English Name */}
            <TextField
              fullWidth
              label="Category Name (English)"
              variant="outlined"
              margin="normal"
              value={editingCategory?.nameEn || ''}
              onChange={(e) => setEditingCategory({ ...editingCategory, nameEn: e.target.value })}
              required
              error={!editingCategory?.nameEn && editingCategory?.nameEn !== undefined}
              helperText={!editingCategory?.nameEn && editingCategory?.nameEn !== undefined ? 'English name is required' : ''}
            />
            
            {/* Arabic Name */}
            <TextField
              fullWidth
              label="Category Name (Arabic) / اسم الفئة"
              variant="outlined"
              margin="normal"
              value={editingCategory?.nameAr || ''}
              onChange={(e) => setEditingCategory({ ...editingCategory, nameAr: e.target.value })}
              required
              dir="rtl"
              error={!editingCategory?.nameAr && editingCategory?.nameAr !== undefined}
              helperText={!editingCategory?.nameAr && editingCategory?.nameAr !== undefined ? 'Arabic name is required' : ''}
            />
            
            {/* English Description */}
            <TextField
              fullWidth
              label="Description (English)"
              variant="outlined"
              margin="normal"
              multiline
              rows={2}
              value={editingCategory?.description || ''}
              onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
            />
            
            {/* Arabic Description */}
            <TextField
              fullWidth
              label="Description (Arabic) / الوصف"
              variant="outlined"
              margin="normal"
              multiline
              rows={2}
              value={editingCategory?.descriptionAr || ''}
              onChange={(e) => setEditingCategory({ ...editingCategory, descriptionAr: e.target.value })}
              dir="rtl"
            />
            
            {/* Sort Order */}
            <TextField
              fullWidth
              label="Sort Order"
              variant="outlined"
              margin="normal"
              type="number"
              value={editingCategory?.sortOrder || 0}
              onChange={(e) => setEditingCategory({ ...editingCategory, sortOrder: parseInt(e.target.value) || 0 })}
              InputProps={{ inputProps: { min: 0 } }}
            />
            
            {/* Color Picker */}
            <FormControl fullWidth margin="normal">
              <InputLabel>Display Color</InputLabel>
              <Select
                label="Display Color"
                value={editingCategory?.color || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
              >
                <MenuItem value="">Transparent</MenuItem>
                <MenuItem value="#FFB973">Orange</MenuItem>
                <MenuItem value="#4CAF50">Green</MenuItem>
                <MenuItem value="#2196F3">Blue</MenuItem>
                <MenuItem value="#E91E63">Pink</MenuItem>
                <MenuItem value="#9C27B0">Purple</MenuItem>
                <MenuItem value="#F44336">Red</MenuItem>
                <MenuItem value="#607D8B">Grey</MenuItem>
              </Select>
            </FormControl>
            
            {/* Status */}
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={editingCategory?.isActive !== undefined ? editingCategory.isActive : true}
                onChange={(e) => setEditingCategory({ ...editingCategory, isActive: e.target.value })}
              >
                <MenuItem value={true}>Active</MenuItem>
                <MenuItem value={false}>Inactive</MenuItem>
              </Select>
            </FormControl>
            
            {/* Web Icon Upload */}
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Web Icon (PNG/JPG, max 2MB)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box 
                  sx={{ 
                    width: 64, 
                    height: 64, 
                    border: '2px dashed #ddd', 
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    bgcolor: '#fafafa'
                  }}
                >
                  {iconWebPreview ? (
                    <Box sx={{ position: 'relative' }}>
                      <Box 
                        component="img"
                        src={iconWebPreview}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveIcon('web')}
                        sx={{ 
                          position: 'absolute', 
                          top: -8, 
                          right: -8,
                          bgcolor: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  ) : (
                    <ImageIcon sx={{ color: '#ccc' }} />
                  )}
                </Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                >
                  Upload Web Icon
                  <input
                    type="file"
                    hidden
                    accept="image/png,image/jpeg"
                    ref={fileInputWebRef}
                    onChange={(e) => handleFileChange('web', e.target.files[0])}
                  />
                </Button>
              </Box>
            </Box>
            
            {/* Mobile Icon Upload */}
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Mobile Icon (PNG/JPG, max 2MB)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box 
                  sx={{ 
                    width: 64, 
                    height: 64, 
                    border: '2px dashed #ddd', 
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    bgcolor: '#fafafa'
                  }}
                >
                  {iconMobilePreview ? (
                    <Box sx={{ position: 'relative' }}>
                      <Box 
                        component="img"
                        src={iconMobilePreview}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveIcon('mobile')}
                        sx={{ 
                          position: 'absolute', 
                          top: -8, 
                          right: -8,
                          bgcolor: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  ) : (
                    <ImageIcon sx={{ color: '#ccc' }} />
                  )}
                </Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                >
                  Upload Mobile Icon
                  <input
                    type="file"
                    hidden
                    accept="image/png,image/jpeg"
                    ref={fileInputMobileRef}
                    onChange={(e) => handleFileChange('mobile', e.target.files[0])}
                  />
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveCategory} variant="contained">
            {editingCategory?._id ? 'Update' : 'Add'} Category
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Categories;
