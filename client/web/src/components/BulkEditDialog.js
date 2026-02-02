import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  InputAdornment,
} from '@mui/material';

const BulkEditDialog = ({ open, onClose, onSave, selectedCount }) => {
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');

  const handleSave = () => {
    const updates = {};
    if (price !== '') updates.price = parseFloat(price);
    if (quantity !== '') updates.quantity = parseInt(quantity);
    
    onSave(updates);
    setPrice('');
    setQuantity('');
  };

  const handleClose = () => {
    setPrice('');
    setQuantity('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Bulk Edit {selectedCount} Item{selectedCount > 1 ? 's' : ''}
        </Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Changes will be applied to all selected items. Leave fields empty to keep existing values.
        </Typography>
        
        <TextField
          label="Price"
          type="number"
          fullWidth
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          helperText="Set new price for all selected items"
          sx={{ mb: 3 }}
        />

        <TextField
          label="Available Quantity"
          type="number"
          fullWidth
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          helperText="Set new quantity for all selected items"
        />
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={price === '' && quantity === ''}
          sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
        >
          Apply Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkEditDialog;
