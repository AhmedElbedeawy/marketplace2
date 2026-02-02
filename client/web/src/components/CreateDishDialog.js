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
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';

const steps = [
  'Select Dish',
  'Photos',
  'Price & Stock',
  'Prep Settings',
  'Review'
];

const portionSizes = [
  { value: 'single', label: 'Single Portion' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'family', label: 'Family Size' },
];

const prepTimePresets = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

const CreateDishDialog = ({ open, onClose, onSave, editMode, initialData }) => {
  const { showNotification } = useNotification();
  const [activeStep, setActiveStep] = useState(0);
  const [adminDishes, setAdminDishes] = useState([]);
  const [loadingDishes, setLoadingDishes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    adminDish: null,  // Selected AdminDish
    photos: [],
    price: '',
    stock: '',
    portionSize: 'medium',
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
  });
  const fileInputRef = useRef(null);

  // Load Admin Dishes on open
  useEffect(() => {
    if (open) {
      fetchAdminDishes();
      if (initialData) {
        setFormData({
          adminDish: initialData.adminDish || null,
          photos: initialData.photos || [],
          price: initialData.price || '',
          stock: initialData.stock || '',
          portionSize: initialData.portionSize || 'medium',
          prepReadyConfig: initialData.prepReadyConfig || {
            optionType: 'fixed',
            prepTimeMinutes: 45,
          },
          fulfillmentModes: initialData.fulfillmentModes || {
            pickup: true,
            delivery: false,
          },
        });
      } else {
        setFormData({
          adminDish: null,
          photos: [],
          price: '',
          stock: '',
          portionSize: 'medium',
          prepReadyConfig: {
            optionType: 'fixed',
            prepTimeMinutes: 45,
          },
          fulfillmentModes: {
            pickup: true,
            delivery: false,
          },
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

  const handleSave = async () => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('adminDishId', formData.adminDish._id);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('stock', formData.stock);
      formDataToSend.append('portionSize', formData.portionSize);
      formDataToSend.append('prepReadyConfig', JSON.stringify(formData.prepReadyConfig));
      formDataToSend.append('fulfillmentModes', JSON.stringify(formData.fulfillmentModes));
      
      formData.photos.forEach((photo) => {
        formDataToSend.append('images', photo.file);
      });

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
        return formData.price && parseFloat(formData.price) > 0 && formData.stock !== '';
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
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {formData.photos.map((photo, index) => (
                    <Card key={index} sx={{ position: 'relative', width: 120, height: 120 }}>
                      <CardMedia
                        component="img"
                        image={photo.preview}
                        alt={`Photo ${index + 1}`}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'rgba(255,255,255,0.9)',
                          '&:hover': { bgcolor: 'white' }
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
        // Step 3: Price & Stock
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Price & Stock
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Price"
                  type="number"
                  fullWidth
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  helperText="Set your selling price"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Stock (Portions)"
                  type="number"
                  fullWidth
                  required
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  helperText="How many portions available"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Portion Size</InputLabel>
                  <Select
                    value={formData.portionSize}
                    label="Portion Size"
                    onChange={(e) => setFormData({ ...formData, portionSize: e.target.value })}
                  >
                    {portionSizes.map((size) => (
                      <MenuItem key={size.value} value={size.value}>{size.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
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
                    ${formData.price || '0.00'}
                  </Typography>
                </Box>
              </Box>
              
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Stock</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{formData.stock} portions</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Portion Size</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {portionSizes.find(s => s.value === formData.portionSize)?.label}
                  </Typography>
                </Grid>
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
