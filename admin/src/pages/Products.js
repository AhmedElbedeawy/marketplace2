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
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const Products = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Mock data
  const products = [
    {
      id: 1,
      name: 'Homemade Pizza',
      cook: 'Maria\'s Kitchen',
      category: 'Main Course',
      price: 12.99,
      stock: 5,
      status: 'active',
    },
    {
      id: 2,
      name: 'Chicken Biryani',
      cook: 'Ahmed\'s Delights',
      category: 'Main Course',
      price: 10.99,
      stock: 8,
      status: 'active',
    },
    {
      id: 3,
      name: 'Chocolate Cake',
      cook: 'Sweet Tooth',
      category: 'Desserts',
      price: 8.99,
      stock: 3,
      status: 'inactive',
    },
  ];

  const categories = ['Main Course', 'Appetizers', 'Desserts', 'Beverages'];

  const handleOpenDialog = (product = null) => {
    setEditingProduct(product);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = () => {
    // In a real app, this would save the product to the backend
    console.log('Saving product:', editingProduct);
    handleCloseDialog();
  };

  return (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Product Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Product
        </Button>
      </Box>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Search Products"
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select label="Category">
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select label="Status">
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Products List */}
      <Card>
        <CardContent>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Product</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Cook</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Category</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Price</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Stock</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>{product.name}</td>
                    <td style={{ padding: '10px' }}>{product.cook}</td>
                    <td style={{ padding: '10px' }}>{product.category}</td>
                    <td style={{ padding: '10px' }}>${product.price}</td>
                    <td style={{ padding: '10px' }}>{product.stock}</td>
                    <td style={{ padding: '10px' }}>
                      <Chip 
                        label={product.status} 
                        size="small" 
                        color={product.status === 'active' ? 'success' : 'default'}
                      />
                    </td>
                    <td style={{ padding: '10px' }}>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenDialog(product)}
                        sx={{ mr: 1 }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </CardContent>
      </Card>

      {/* Add/Edit Product Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Product Name"
              variant="outlined"
              margin="normal"
              defaultValue={editingProduct?.name || ''}
            />
            <TextField
              fullWidth
              label="Cook"
              variant="outlined"
              margin="normal"
              defaultValue={editingProduct?.cook || ''}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                defaultValue={editingProduct?.category || ''}
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Price"
              variant="outlined"
              margin="normal"
              type="number"
              defaultValue={editingProduct?.price || ''}
            />
            <TextField
              fullWidth
              label="Stock"
              variant="outlined"
              margin="normal"
              type="number"
              defaultValue={editingProduct?.stock || ''}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                defaultValue={editingProduct?.status || 'active'}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveProduct} variant="contained">
            {editingProduct ? 'Update' : 'Add'} Product
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Products;