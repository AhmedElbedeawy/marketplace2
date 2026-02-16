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
  Switch,
  FormControlLabel,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  FilterList as FilterIcon,
  CloudUpload as UploadIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';

const API_URL = 'http://localhost:5005/api';

const Products = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Sorting states
  const [sortBy, setSortBy] = useState('nameEn');
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
    fetchDishes();
    fetchCategories();
  }, [searchTerm, filterCategory]);

  const fetchDishes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let url = `${API_URL}/admin-dishes?search=${searchTerm}`;
      if (filterCategory) url += `&category=${filterCategory}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setDishes(Array.isArray(data.dishes) ? data.dishes : data);
      } else {
        setError(data.message || 'Failed to fetch dishes');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (response.ok) {
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching categories');
    }
  };

  const handleOpenDialog = (dish = null) => {
    if (dish) {
      setEditingDish({ 
        ...dish, 
        // Extract category ID if it's an object from populate
        category: dish.category?._id || dish.category || '' 
      });
      setImagePreview(dish.imageUrl || '');
    } else {
      setEditingDish({
        nameEn: '',
        nameAr: '',
        descriptionEn: '',
        descriptionAr: '',
        longDescriptionEn: '',
        longDescriptionAr: '',
        category: '',
        isActive: true,
        isPopular: false,
      });
      setImagePreview('');
    }
    setSelectedFile(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDish(null);
    setImagePreview('');
    setSelectedFile(null);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDish = async () => {
    try {
      const token = localStorage.getItem('token');
      const method = editingDish?._id ? 'PUT' : 'POST';
      const url = editingDish?._id 
        ? `${API_URL}/admin-dishes/${editingDish._id}`
        : `${API_URL}/admin-dishes`;

      const formData = new FormData();
      formData.append('nameEn', editingDish.nameEn);
      formData.append('nameAr', editingDish.nameAr);
      formData.append('descriptionEn', editingDish.descriptionEn);
      formData.append('descriptionAr', editingDish.descriptionAr);
      formData.append('longDescriptionEn', editingDish.longDescriptionEn || '');
      formData.append('longDescriptionAr', editingDish.longDescriptionAr || '');
      formData.append('category', editingDish.category);
      formData.append('isActive', editingDish.isActive);
      formData.append('isPopular', editingDish.isPopular);
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        fetchDishes();
        handleCloseDialog();
      } else {
        const data = await response.json();
        alert(data.message || 'Operation failed');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleDeleteDish = async (id) => {
    if (!window.confirm('Are you sure you want to delete this dish?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin-dishes/${id}/hard`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchDishes();
      } else {
        alert('Failed to delete dish');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleTogglePopular = async (dishId) => {
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_URL}/admin-dishes/${dishId}/toggle-popular`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to toggle popular status');
      fetchDishes();
    } catch (error) {
      console.error('Error toggling popular:', error);
    }
  };

  // Sorting function
  const sortedDishes = [...dishes].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'nameEn':
        aVal = (a.nameEn || '').toLowerCase();
        bVal = (b.nameEn || '').toLowerCase();
        break;
      case 'nameAr':
        aVal = (a.nameAr || '').toLowerCase();
        bVal = (b.nameAr || '').toLowerCase();
        break;
      case 'category':
        aVal = (a.category?.nameEn || a.category?.name || '').toLowerCase();
        bVal = (b.category?.nameEn || b.category?.name || '').toLowerCase();
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '24px', mb: 0.5 }}>
            Master Dishes
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', fontSize: '13px' }}>
            Manage master dish catalog for cooks to create offers from
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: '#1976d2', textTransform: 'none', fontWeight: 600, fontSize: '13px', '&:hover': { bgcolor: '#1565c0' } }}
        >
          Add New Dish
        </Button>
      </Box>

      {/* Search and Filter Toggle */}
      <Card sx={{ mb: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: showFilters ? 2 : 0 }}>
            <TextField
              fullWidth
              label="Search Dishes"
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
                  <InputLabel>Category</InputLabel>
                  <Select
                    label="Category"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category._id} value={category._id}>
                        {category.nameEn} / {category.nameAr}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  onClick={() => { setSearchTerm(''); setFilterCategory(''); }}
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

      {/* Dishes List */}
      <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', backgroundColor: '#f5f5f5' }}>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Image</th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('nameEn')}
                    >
                      Name (EN/AR) {getSortIcon('nameEn')}
                    </th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('category')}
                    >
                      Category {getSortIcon('category')}
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Featured</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDishes.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                        <Typography color="textSecondary">No dishes found.</Typography>
                      </td>
                    </tr>
                  ) : (
                    sortedDishes.map((dish) => (
                      <tr 
                        key={dish._id} 
                        style={{ 
                          borderBottom: '1px solid #eee',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '12px' }}>
                          {dish.imageUrl ? (
                            <img 
                              src={`http://localhost:5005${dish.imageUrl}`}
                              alt={dish.nameEn}
                              style={{ width: 60, height: 45, objectFit: 'cover', borderRadius: 4 }}
                            />
                          ) : (
                            <Box sx={{ width: 60, height: 45, bgcolor: '#eee', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography variant="caption" color="textSecondary">No img</Typography>
                            </Box>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>{dish.nameEn}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>{dish.nameAr}</Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2" sx={{ color: '#4a4a4a' }}>
                            {dish.category?.nameEn || dish.category?.name || 'N/A'}
                          </Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Chip 
                            label={dish.isActive ? 'Active' : 'Inactive'} 
                            size="small" 
                            color={dish.isActive ? 'success' : 'default'}
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </td>
                        <td style={{ padding: '12px' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleTogglePopular(dish._id)}
                            color={dish.isPopular ? 'warning' : 'default'}
                          >
                            {dish.isPopular ? <StarIcon /> : <StarBorderIcon />}
                          </IconButton>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Button
                            size="small"
                            startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                            onClick={() => handleOpenDialog(dish)}
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
                            onClick={() => handleDeleteDish(dish._id)}
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

      {/* Add/Edit Dish Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDish?._id ? 'Edit Dish' : 'Add New Dish'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* Image Upload */}
            <Box sx={{ mb: 2 }}>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <Box 
                sx={{ 
                  border: '2px dashed #ccc', 
                  borderRadius: 1,
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { borderColor: '#1976d2', bgcolor: '#f8fafc' }
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
                  />
                ) : (
                  <Box>
                    <UploadIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                    <Typography variant="body2" color="textSecondary">
                      Click to upload dish image (4:3 ratio, 400×300)
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* English Name */}
            <TextField
              fullWidth
              label="Dish Name (English)"
              variant="outlined"
              margin="normal"
              value={editingDish?.nameEn || ''}
              onChange={(e) => setEditingDish({ ...editingDish, nameEn: e.target.value })}
              required
            />

            {/* Arabic Name */}
            <TextField
              fullWidth
              label="Dish Name (Arabic)"
              variant="outlined"
              margin="normal"
              value={editingDish?.nameAr || ''}
              onChange={(e) => setEditingDish({ ...editingDish, nameAr: e.target.value })}
              required
              dir="rtl"
            />

            {/* English Description */}
            <TextField
              fullWidth
              label="Description (English)"
              variant="outlined"
              margin="normal"
              multiline
              rows={3}
              value={editingDish?.descriptionEn || ''}
              onChange={(e) => setEditingDish({ ...editingDish, descriptionEn: e.target.value })}
              required
            />

            {/* Arabic Description */}
            <TextField
              fullWidth
              label="Description (Arabic)"
              variant="outlined"
              margin="normal"
              multiline
              rows={3}
              value={editingDish?.descriptionAr || ''}
              onChange={(e) => setEditingDish({ ...editingDish, descriptionAr: e.target.value })}
              required
              dir="rtl"
            />

            {/* English Long Description */}
            <TextField
              fullWidth
              label="Full Description (English)"
              variant="outlined"
              margin="normal"
              multiline
              rows={5}
              value={editingDish?.longDescriptionEn || ''}
              onChange={(e) => setEditingDish({ ...editingDish, longDescriptionEn: e.target.value })}
              placeholder="Enter detailed description of the dish..."
            />

            {/* Arabic Long Description */}
            <TextField
              fullWidth
              label="Full Description (Arabic)"
              variant="outlined"
              margin="normal"
              multiline
              rows={5}
              value={editingDish?.longDescriptionAr || ''}
              onChange={(e) => setEditingDish({ ...editingDish, longDescriptionAr: e.target.value })}
              placeholder="أدخل وصفاً تفصيلياً للطبق..."
              dir="rtl"
            />

            {/* Category Select */}
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={editingDish?.category?._id || editingDish?.category || ''}
                onChange={(e) => setEditingDish({ ...editingDish, category: e.target.value })}
              >
                {categories.map((category) => (
                  <MenuItem key={category._id} value={category._id}>
                    {category.nameEn} / {category.nameAr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Status Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={editingDish?.isActive !== false}
                  onChange={(e) => setEditingDish({ ...editingDish, isActive: e.target.checked })}
                />
              }
              label="Active"
            />

            {/* Popular Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={editingDish?.isPopular || false}
                  onChange={(e) => setEditingDish({ ...editingDish, isPopular: e.target.checked })}
                />
              }
              label="Featured (Popular)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveDish} variant="contained">
            {editingDish?._id ? 'Update' : 'Add'} Dish
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Products;
