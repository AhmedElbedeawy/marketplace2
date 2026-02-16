import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Autocomplete,
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  FormGroup,
  InputAdornment,
  Card,
  CardMedia,
  Grid,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  DragIndicator as DragIndicatorIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import { useCountry } from '../contexts/CountryContext';

const steps = [
  'Select Dish',
  'Photos',
  'Price & Stock',
  'Prep Settings',
  'Review'
];

const portionSizes = [
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large (1-2)' },
  { value: 'family', label: 'Family (2-4)' },
];

const prepTimePresets = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

const CreateDishDialog = ({ open, onClose, onSave, editMode, initialData }) => {
  const { showNotification } = useNotification();
  const { currencyCode } = useCountry();
  const [activeStep, setActiveStep] = useState(0);
  const [adminDishes, setAdminDishes] = useState([]);
  const [loadingDishes, setLoadingDishes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    adminDish: null,
    photos: [],
    variants: [
      { portionKey: 'medium', portionLabel: 'Medium', price: '', stock: '' }
    ],
    prepReadyConfig: {
      optionType: 'fixed',
      prepTimeMinutes: 45,
      prepTimeMinMinutes: 30,
      prepTimeMaxMinutes: 60,
      cutoffTime: '11:00',
      beforeCutoffReadyTime: '12:00',
      afterCutoffDayOffset: 1,
    },
    fulfillmentModes: {
      pickup: true,
      delivery: false,
    },
    deliveryFee: '',
  });
  const fileInputRef = useRef(null);

  // Load Admin Dishes on open
  useEffect(() => {
    if (open) {
      fetchAdminDishes();
      if (initialData) {
        // Normalize variants from initialData
        let variants = [{ portionKey: 'medium', portionLabel: 'Medium', price: '', stock: '' }];
        if (initialData.variants && initialData.variants.length > 0) {
          variants = initialData.variants;
        } else if (initialData.price !== undefined || initialData.stock !== undefined) {
          variants = [{
            portionKey: initialData.portionSize || 'medium',
            portionLabel: initialData.portionSize || 'Medium',
            price: initialData.price !== undefined ? initialData.price : '',
            stock: initialData.stock !== undefined ? initialData.stock : ''
          }];
        }
        
        setFormData({
          adminDish: initialData.adminDish || null,
          photos: initialData.photos || [],
          variants,
          prepReadyConfig: initialData.prepReadyConfig || {
            optionType: 'fixed',
            prepTimeMinutes: 45,
            prepTimeMinMinutes: 30,
            prepTimeMaxMinutes: 60,
            cutoffTime: '11:00',
            beforeCutoffReadyTime: '12:00',
            afterCutoffDayOffset: 1,
          },
          fulfillmentModes: initialData.fulfillmentModes || {
            pickup: true,
            delivery: false,
          },
          deliveryFee: initialData.deliveryFee !== undefined ? initialData.deliveryFee : '',
        });
      } else {
        setFormData({
          adminDish: null,
          photos: [],
          variants: [{ portionKey: 'medium', portionLabel: 'Medium', price: '', stock: '' }],
          prepReadyConfig: {
            optionType: 'fixed',
            prepTimeMinutes: 45,
            prepTimeMinMinutes: 30,
            prepTimeMaxMinutes: 60,
            cutoffTime: '11:00',
            beforeCutoffReadyTime: '12:00',
            afterCutoffDayOffset: 1,
          },
          fulfillmentModes: {
            pickup: true,
            delivery: false,
          },
          deliveryFee: '',
        });
      }
      setActiveStep(0);
    }
  }, [initialData, open]);

  const fetchAdminDishes = async () => {
    try {
      setLoadingDishes(true);
      const response = await api.get('/admin-dishes?active=true');
      const dishes = Array.isArray(response.data.dishes) ? response.data.dishes : response.data;
      setAdminDishes(dishes);
    } catch (error) {
      console.error('Error fetching admin dishes:', error);
    } finally {
      setLoadingDishes(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const maxFiles = 5;
    const remainingSlots = maxFiles - formData.photos.length;
    
    if (remainingSlots <= 0) {
      showNotification('Maximum 5 photos allowed', 'error');
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    const newPhotos = filesToProcess.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setFormData({ ...formData, photos: [...formData.photos, ...newPhotos] });
  };

  const handleRemovePhoto = (index) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    setFormData({ ...formData, photos: newPhotos });
  };

  // Drag and drop handlers for photo reordering
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const newPhotos = [...formData.photos];
      const [removed] = newPhotos.splice(draggedIndex, 1);
      newPhotos.splice(dropIndex, 0, removed);
      setFormData({ ...formData, photos: newPhotos });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleAddVariant = () => {
    setFormData({
      ...formData,
      variants: [...formData.variants, { portionKey: '', portionLabel: '', price: '', stock: '' }]
    });
  };

  const handleRemoveVariant = (index) => {
    if (formData.variants.length > 1) {
      setFormData({
        ...formData,
        variants: formData.variants.filter((_, i) => i !== index)
      });
    } else {
      showNotification('At least one variant is required', 'error');
    }
  };

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData({ ...formData, variants: newVariants });
  };

  // Get used portion keys for dropdown filtering
  const getAvailablePortionKeys = (currentIndex) => {
    const usedKeys = formData.variants
      .filter((_, i) => i !== currentIndex)
      .map(v => v.portionKey);
    return portionSizes.filter(size => !usedKeys.includes(size.value));
  };

  const handleSave = async () => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('adminDishId', formData.adminDish._id);
      formDataToSend.append('variants', JSON.stringify(formData.variants));
      // Legacy fields from first variant for backward compatibility
      formDataToSend.append('price', formData.variants[0].price);
      formDataToSend.append('stock', formData.variants[0].stock);
      formDataToSend.append('portionSize', formData.variants[0].portionKey);
      formDataToSend.append('prepReadyConfig', JSON.stringify(formData.prepReadyConfig));
      formDataToSend.append('fulfillmentModes', JSON.stringify(formData.fulfillmentModes));
      formDataToSend.append('deliveryFee', formData.deliveryFee || 0);
      
      console.log('📤 CreateDishDialog - Photos to send:', formData.photos.map(p => ({ 
        hasFile: !!p.file, 
        hasUrl: !!p.url,
        isExisting: p.isExisting 
      })));
      
      let imageCount = 0;
      formData.photos.forEach((photo, index) => {
        if (photo.file) {
          formDataToSend.append('images', photo.file);
          imageCount++;
          console.log(`  📎 Appending new image ${index}:`, photo.file.name);
        } else if (photo.url && photo.isExisting) {
          // For existing images, we need to handle differently
          // The backend should keep existing images if not modified
          console.log(`  🖼️  Keeping existing image ${index}:`, photo.url);
        }
      });
      console.log(`📤 Total images appended: ${imageCount}`);

      onSave(formDataToSend);
    } catch (error) {
      console.error('Error preparing data:', error);
    }
  };

  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return formData.adminDish !== null;
      case 1:
        return formData.photos.length > 0;
      case 2:
        // All variants must have price and stock
        return formData.variants.every(v => 
          v.portionKey && parseFloat(v.price) > 0 && v.stock !== '' && parseFloat(v.stock) >= 0
        );
      case 3:
        const config = formData.prepReadyConfig;
        if (config.optionType === 'fixed') return config.prepTimeMinutes >= 5;
        if (config.optionType === 'range') return config.prepTimeMinMinutes >= 5 && config.prepTimeMaxMinutes > config.prepTimeMinMinutes;
        if (config.optionType === 'cutoff') return config.cutoffTime && config.beforeCutoffReadyTime;
        return true;
      default:
        return true;
    }
  };

  const filteredDishes = adminDishes.filter(dish => {
    const query = searchQuery.toLowerCase();
    return (dish.nameEn || '').toLowerCase().includes(query) ||
           (dish.nameAr || '').toLowerCase().includes(query) ||
           (dish.descriptionEn || '').toLowerCase().includes(query);
  });

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        // Step 1: Select AdminDish
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Select Master Dish
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Choose from the master dish catalog. Your offer will be based on this template.
            </Typography>
            
            <TextField
              fullWidth
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              }}
              sx={{ mb: 2 }}
            />

            {loadingDishes ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography>Loading dishes...</Typography>
              </Box>
            ) : (
              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {filteredDishes.map((dish) => (
                  <Card
                    key={dish._id}
                    sx={{
                      p: 2,
                      mb: 2,
                      cursor: 'pointer',
                      border: formData.adminDish?._id === dish._id ? '2px solid #3b82f6' : '1px solid #eee',
                      bgcolor: formData.adminDish?._id === dish._id ? '#f0f7ff' : 'transparent',
                      '&:hover': { borderColor: '#3b82f6' }
                    }}
                    onClick={() => setFormData({ ...formData, adminDish: dish })}
                  >
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      {dish.imageUrl && (
                        <CardMedia
                          component="img"
                          image={`http://localhost:5005${dish.imageUrl}`}
                          alt={dish.nameEn}
                          sx={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 1 }}
                        />
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {dish.nameEn}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                          {dish.nameAr}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {dish.descriptionEn?.substring(0, 100)}...
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                ))}
                {filteredDishes.length === 0 && (
                  <Alert severity="info">No dishes found. Try a different search.</Alert>
                )}
              </Box>
            )}
          </Box>
        );

      case 1:
        // Step 2: Photos
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Upload Your Photos
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Upload photos of your actual dish (max 5). These will be shown to customers.
            </Typography>
            
            <Box
              sx={{
                border: '2px dashed #ccc',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                bgcolor: '#f9f9f9',
                cursor: 'pointer',
                mb: 3,
                '&:hover': { borderColor: '#3b82f6', bgcolor: '#f0f7ff' }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <CloudUploadIcon sx={{ fontSize: 48, color: '#999', mb: 1 }} />
              <Typography variant="body1" sx={{ mb: 1 }}>
                Drag and drop photos here
              </Typography>
              <Typography variant="body2" color="textSecondary">
                or click to browse from your device
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                hidden
                onChange={handleFileUpload}
              />
            </Box>

            {formData.photos.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Uploaded Photos ({formData.photos.length}/5)
                  <Typography component="span" variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                    (Drag to reorder - 1st image is default)
                  </Typography>
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {formData.photos.map((photo, index) => (
                    <Card 
                      key={index} 
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      sx={{ 
                        position: 'relative', 
                        width: 120, 
                        height: 120,
                        cursor: 'move',
                        opacity: draggedIndex === index ? 0.5 : 1,
                        border: dragOverIndex === index ? '2px dashed #3b82f6' : index === 0 ? '2px solid #FF7A00' : '1px solid #eee',
                        boxShadow: index === 0 ? '0 0 8px rgba(255, 122, 0, 0.5)' : undefined,
                        transform: dragOverIndex === index ? 'scale(1.05)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: '#3b82f6' }
                      }}
                    >
                      {/* Default badge for first image */}
                      {index === 0 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            bgcolor: '#FF7A00',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            zIndex: 2,
                          }}
                        >
                          DEFAULT
                        </Box>
                      )}
                      {/* Order number badge */}
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 4,
                          left: 4,
                          bgcolor: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 2,
                        }}
                      >
                        {index + 1}
                      </Box>
                      {/* Drag handle */}
                      <Tooltip title="Drag to reorder">
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            bgcolor: 'rgba(255,255,255,0.9)',
                            '&:hover': { bgcolor: 'white' },
                            zIndex: 2,
                            cursor: 'move',
                          }}
                        >
                          <DragIndicatorIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <CardMedia
                        component="img"
                        image={photo.preview}
                        alt={`Photo ${index + 1}`}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {/* Delete button */}
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute',
                          bottom: 4,
                          right: 4,
                          bgcolor: 'rgba(255,255,255,0.9)',
                          '&:hover': { bgcolor: 'white' },
                          zIndex: 2,
                        }}
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Card>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        );

      case 2:
        // Step 3: Price & Stock - Multi-variant UI
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Price & Stock Variants
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Add multiple portions with different prices and stock levels
            </Typography>
            
            {formData.variants.map((variant, index) => (
              <Card key={index} sx={{ p: 2, mb: 2, bgcolor: '#f9f9f9' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Portion {index + 1}
                  </Typography>
                  {formData.variants.length > 1 && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleRemoveVariant(index)}
                    >
                      Remove
                    </Button>
                  )}
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Portion Type</InputLabel>
                      <Select
                        value={variant.portionKey}
                        label="Portion Type"
                        onChange={(e) => handleVariantChange(index, 'portionKey', e.target.value)}
                      >
                        {getAvailablePortionKeys(index).map((size) => (
                          <MenuItem key={size.value} value={size.value}>{size.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Price"
                      type="number"
                      fullWidth
                      value={variant.price}
                      onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">{currencyCode}</InputAdornment>,
                      }}
                      helperText="Selling price for this portion"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Stock (Portions)"
                      type="number"
                      fullWidth
                      value={variant.stock}
                      onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                      helperText="Available portions"
                    />
                  </Grid>
                </Grid>
              </Card>
            ))}
            
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddVariant}
              sx={{ mb: 2 }}
            >
              + Add another portion
            </Button>
          </Box>
        );

      case 3:
        // Step 4: Prep Settings
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Preparation Settings
            </Typography>
            
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              How long does it take to prepare?
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Option Type</InputLabel>
              <Select
                value={formData.prepReadyConfig.optionType}
                label="Option Type"
                onChange={(e) => setFormData({
                  ...formData,
                  prepReadyConfig: { ...formData.prepReadyConfig, optionType: e.target.value }
                })}
              >
                <MenuItem value="fixed">Fixed Time (always ready in X minutes)</MenuItem>
                <MenuItem value="range">Time Range (min to max minutes)</MenuItem>
                <MenuItem value="cutoff">Cutoff Rule (orders before X, ready by Y)</MenuItem>
              </Select>
            </FormControl>

            {formData.prepReadyConfig.optionType === 'fixed' && (
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Prep Time</InputLabel>
                  <Select
                    value={formData.prepReadyConfig.prepTimeMinutes}
                    label="Prep Time"
                    onChange={(e) => setFormData({
                      ...formData,
                      prepReadyConfig: { ...formData.prepReadyConfig, prepTimeMinutes: e.target.value }
                    })}
                  >
                    {prepTimePresets.map((preset) => (
                      <MenuItem key={preset.value} value={preset.value}>{preset.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {formData.prepReadyConfig.optionType === 'range' && (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Min Time (minutes)"
                    type="number"
                    fullWidth
                    value={formData.prepReadyConfig.prepTimeMinMinutes}
                    onChange={(e) => setFormData({
                      ...formData,
                      prepReadyConfig: { ...formData.prepReadyConfig, prepTimeMinMinutes: parseInt(e.target.value) }
                    })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Max Time (minutes)"
                    type="number"
                    fullWidth
                    value={formData.prepReadyConfig.prepTimeMaxMinutes}
                    onChange={(e) => setFormData({
                      ...formData,
                      prepReadyConfig: { ...formData.prepReadyConfig, prepTimeMaxMinutes: parseInt(e.target.value) }
                    })}
                  />
                </Grid>
              </Grid>
            )}

            {formData.prepReadyConfig.optionType === 'cutoff' && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Orders placed after cutoff will be prepared for the next day.
                </Alert>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Cutoff Time"
                      type="time"
                      fullWidth
                      value={formData.prepReadyConfig.cutoffTime}
                      onChange={(e) => setFormData({
                        ...formData,
                        prepReadyConfig: { ...formData.prepReadyConfig, cutoffTime: e.target.value }
                      })}
                      InputLabelProps={{ shrink: true }}
                      helperText="Last time for same-day orders"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Ready By"
                      type="time"
                      fullWidth
                      value={formData.prepReadyConfig.beforeCutoffReadyTime}
                      onChange={(e) => setFormData({
                        ...formData,
                        prepReadyConfig: { ...formData.prepReadyConfig, beforeCutoffReadyTime: e.target.value }
                      })}
                      InputLabelProps={{ shrink: true }}
                      helperText="Ready time for same-day"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            <Typography variant="subtitle2" sx={{ mt: 4, mb: 2 }}>
              Fulfillment Options
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.fulfillmentModes.pickup}
                    onChange={(e) => setFormData({
                      ...formData,
                      fulfillmentModes: { ...formData.fulfillmentModes, pickup: e.target.checked }
                    })}
                  />
                }
                label="Pickup Available"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.fulfillmentModes.delivery}
                    onChange={(e) => setFormData({
                      ...formData,
                      fulfillmentModes: { ...formData.fulfillmentModes, delivery: e.target.checked }
                    })}
                  />
                }
                label="Delivery Available"
              />
            </FormGroup>

            {/* Delivery Fee Field - Only show if delivery is enabled */}
            {formData.fulfillmentModes.delivery && (
              <Box sx={{ mt: 2, pl: 4 }}>
                <TextField
                  label={`Delivery Fee (${currencyCode})`}
                  type="number"
                  size="small"
                  value={formData.deliveryFee}
                  onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">{currencyCode}</InputAdornment>,
                  }}
                  helperText="Set delivery fee for this dish"
                  sx={{ maxWidth: 200 }}
                />
              </Box>
            )}
          </Box>
        );

      case 4:
        // Step 5: Review
        const prepDisplay = () => {
          const config = formData.prepReadyConfig;
          if (config.optionType === 'fixed') return `${config.prepTimeMinutes} minutes`;
          if (config.optionType === 'range') return `${config.prepTimeMinMinutes}-${config.prepTimeMaxMinutes} minutes`;
          if (config.optionType === 'cutoff') return `Ready by ${config.beforeCutoffReadyTime} (orders before ${config.cutoffTime})`;
          return '';
        };
        
        // Get min price from variants
        const minPrice = formData.variants && formData.variants.length > 0 
          ? Math.min(...formData.variants.map(v => parseFloat(v.price) || 0))
          : 0;

        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Review Your Offer
            </Typography>
            
            <Card sx={{ p: 2, bgcolor: '#f9f9f9' }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                {formData.photos[0] && (
                  <CardMedia
                    component="img"
                    image={formData.photos[0].preview}
                    alt="Dish preview"
                    sx={{ width: 120, height: 120, borderRadius: 1, objectFit: 'cover' }}
                  />
                )}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {formData.adminDish?.nameEn || 'Untitled Dish'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {formData.adminDish?.nameAr}
                  </Typography>
                  <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                    {minPrice > 0 ? `Starting from ${currencyCode} ${minPrice.toFixed(2)}` : 'Variants: See below'}
                  </Typography>
                </Box>
              </Box>
              
              {/* Variants Summary */}
              {formData.variants && formData.variants.length > 0 && (
                <Box sx={{ mb: 2, p: 1.5, bgcolor: '#fff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Variants</Typography>
                  {formData.variants.map((variant, idx) => (
                    <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: idx < formData.variants.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                      <Typography variant="body2">{variant.portionLabel || variant.portionKey}</Typography>
                      <Box sx={{ display: 'flex', gap: 3 }}>
                        <Typography variant="body2">{currencyCode} {parseFloat(variant.price || 0).toFixed(2)}</Typography>
                        <Typography variant="body2">Stock: {variant.stock}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Prep Time</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{prepDisplay()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Fulfillment</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {(formData.fulfillmentModes.pickup ? 'Pickup' : '') + 
                     (formData.fulfillmentModes.pickup && formData.fulfillmentModes.delivery ? ', ' : '') +
                     (formData.fulfillmentModes.delivery ? 'Delivery' : '')}
                  </Typography>
                </Grid>
                {formData.fulfillmentModes.delivery && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Delivery Fee</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {currencyCode} {formData.deliveryFee || 0}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Photos</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{formData.photos.length}</Typography>
                </Grid>
              </Grid>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {editMode ? 'Edit Offer' : 'Create New Dish Offer'}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 300 }}>
          {renderStepContent()}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Box>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Back
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSave}
              sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
            >
              {editMode ? 'Update Offer' : 'Create Offer'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!isStepValid()}
              sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
            >
              Next
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CreateDishDialog;
