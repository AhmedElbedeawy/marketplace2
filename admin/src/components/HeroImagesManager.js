import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardMedia,
  CardActions,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import axios from 'axios';

const HeroImagesManager = () => {
  const [heroImages, setHeroImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newImageFile, setNewImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch hero images
  useEffect(() => {
    fetchHeroImages();
  }, []);

  const fetchHeroImages = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5005/api/settings/hero-images');
      setHeroImages(response.data.heroImages || []);
    } catch (err) {
      console.error('Error fetching hero images:', err);
      setError('Failed to load hero images');
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = () => {
    setSelectedImage(null);
    setIsEditing(false);
    setNewImageFile(null);
    setImagePreview('');
    setIsActive(true);
    setOpenDialog(true);
  };

  const handleEditImage = (image) => {
    setSelectedImage(image);
    setIsEditing(true);
    setNewImageFile(null);
    setImagePreview(image.imageUrl);
    setIsActive(image.isActive);
    setOpenDialog(true);
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Are you sure you want to delete this hero image?')) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      await axios.delete(`http://localhost:5005/api/settings/hero-images/${imageId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setSuccess('Hero image deleted successfully');
      fetchHeroImages();
    } catch (err) {
      console.error('Error deleting hero image:', err);
      setError(err.response?.data?.message || 'Failed to delete hero image');
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (imageId, direction) => {
    const currentIndex = heroImages.findIndex(img => img.id === imageId);
    if (currentIndex === -1) return;

    let newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= heroImages.length) return;

    // Swap positions
    const newImages = [...heroImages];
    [newImages[currentIndex], newImages[newIndex]] = [newImages[newIndex], newImages[currentIndex]];
    
    // Update order indices
    const reorderedIds = newImages.map(img => img.id);

    try {
      setSaving(true);
      setError('');
      await axios.put(
        'http://localhost:5005/api/settings/hero-images/reorder',
        { imageIds: reorderedIds },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      setSuccess('Hero images reordered successfully');
      fetchHeroImages();
    } catch (err) {
      console.error('Error reordering hero images:', err);
      setError(err.response?.data?.message || 'Failed to reorder hero images');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setNewImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!newImageFile && !isEditing) {
      setError('Please select an image file');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      if (newImageFile) {
        formData.append('image', newImageFile);
      }
      
      formData.append('isActive', isActive.toString());

      if (isEditing && selectedImage) {
        // Update existing image
        await axios.put(
          `http://localhost:5005/api/settings/hero-images/${selectedImage.id}`,
          formData,
          {
            headers: { 
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`
            }
          }
        );
        setSuccess('Hero image updated successfully');
      } else {
        // Add new image
        await axios.post(
          'http://localhost:5005/api/settings/hero-images',
          formData,
          {
            headers: { 
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`
            }
          }
        );
        setSuccess('Hero image added successfully');
      }

      setOpenDialog(false);
      fetchHeroImages();
    } catch (err) {
      console.error('Error saving hero image:', err);
      setError(err.response?.data?.message || 'Failed to save hero image');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedImage(null);
    setNewImageFile(null);
    setImagePreview('');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '15px', color: '#1a1a1a' }}>
          Hero Images Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddImage}
          sx={{
            bgcolor: '#1976d2',
            color: '#FFFFFF',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '13px',
            '&:hover': { bgcolor: '#1565c0' }
          }}
        >
          Add Hero Image
        </Button>
      </Box>

      {heroImages.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ fontSize: '14px' }}>
            No hero images yet. Click "Add Hero Image" to get started.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {heroImages.map((image, index) => (
            <Grid item xs={12} sm={6} md={4} key={image.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  border: image.isActive ? '2px solid #1976d2' : '1px solid #e0e0e0',
                  position: 'relative'
                }}
              >
                {!image.isActive && (
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8, 
                    bgcolor: 'rgba(0,0,0,0.7)', 
                    color: 'white', 
                    px: 1, 
                    py: 0.5, 
                    borderRadius: 1,
                    zIndex: 10
                  }}>
                    <Typography variant="caption">Inactive</Typography>
                  </Box>
                )}
                
                <CardMedia
                  component="img"
                  height="200"
                  image={image.imageUrl.startsWith('http') ? image.imageUrl : `http://localhost:5005${image.imageUrl}`}
                  alt={`Hero ${index + 1}`}
                  sx={{ objectFit: 'cover' }}
                />
                
                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Position: {index + 1}
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={image.isActive}
                          onChange={async (e) => {
                            try {
                              setSaving(true);
                              await axios.put(
                                `http://localhost:5005/api/settings/hero-images/${image.id}`,
                                { isActive: e.target.checked },
                                {
                                  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                }
                              );
                              fetchHeroImages();
                            } catch (err) {
                              console.error('Error updating image status:', err);
                              setError('Failed to update image status');
                            } finally {
                              setSaving(false);
                            }
                          }}
                          size="small"
                          disabled={saving}
                        />
                      }
                      label={<Typography variant="caption">Active</Typography>}
                      sx={{ ml: 1 }}
                    />
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {new Date(image.updatedAt).toLocaleDateString()}
                  </Typography>
                </Box>
                
                <CardActions sx={{ mt: 'auto', p: 2 }}>
                  <Tooltip title="Move Up">
                    <span>
                      <IconButton 
                        size="small" 
                        onClick={() => handleReorder(image.id, 'up')}
                        disabled={index === 0 || saving}
                      >
                        <UpIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  
                  <Tooltip title="Move Down">
                    <span>
                      <IconButton 
                        size="small" 
                        onClick={() => handleReorder(image.id, 'down')}
                        disabled={index === heroImages.length - 1 || saving}
                      >
                        <DownIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  
                  <Box sx={{ flexGrow: 1 }} />
                  
                  <Tooltip title="Edit">
                    <IconButton 
                      size="small" 
                      onClick={() => handleEditImage(image)}
                      disabled={saving}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Delete">
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteImage(image.id)}
                      disabled={saving}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Hero Image' : 'Add New Hero Image'}
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            {imagePreview ? (
              <Box sx={{ mb: 2 }}>
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '200px', 
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                  }} 
                />
              </Box>
            ) : (
              <Box sx={{ 
                border: '2px dashed #ccc', 
                borderRadius: '8px', 
                p: 4, 
                textAlign: 'center',
                mb: 2
              }}>
                <UploadIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                <Typography color="text.secondary">
                  No image selected
                </Typography>
              </Box>
            )}
            
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="image-upload"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="image-upload">
              <Button 
                variant="outlined" 
                component="span"
                startIcon={<UploadIcon />}
              >
                {newImageFile ? 'Change Image' : 'Select Image'}
              </Button>
            </label>
            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
              JPG or PNG, max 5MB
            </Typography>
          </Box>
          
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
            }
            label="Active"
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={saving || (!newImageFile && !isEditing)}
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            {saving ? 'Saving...' : (isEditing ? 'Update' : 'Add')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HeroImagesManager;