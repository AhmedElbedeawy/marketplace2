import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  Menu as MuiMenu,
  MenuItem,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as ContentCopyIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import CreateDishDialog from '../components/CreateDishDialog';
import BulkEditDialog from '../components/BulkEditDialog';
import { useLanguage } from '../contexts/LanguageContext';
import { useCountry } from '../contexts/CountryContext';
import { useNotification } from '../contexts/NotificationContext';
import { formatCurrency } from '../utils/localeFormatter';
import api, { normalizeImageUrl } from '../utils/api';

const Menu = () => {
  const { t, isRTL, language } = useLanguage();
  const { showNotification } = useNotification();
  const { countryCode } = useCountry();
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [currentOffer, setCurrentOffer] = useState(null); // Full offer data for edit
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Generate bilingual sample menu data
  const getSampleMenuItems = () => {
    if (language === 'ar') {
      return [
        {
          id: 1,
          photo: '/assets/dishes/placeholder.png?text=Stuffed+Pigeon',
          title: 'حمام محشي',
          price: 15.99,
          discount: 10,
          quantity: 25,
          watchers: 48,
          sales: 156,
        },
        {
          id: 2,
          photo: '/assets/dishes/placeholder.png',
          title: 'محشي كرنب',
          price: 18.50,
          discount: 0,
          quantity: 12,
          watchers: 32,
          sales: 89,
        },
        {
          id: 3,
          photo: '/assets/dishes/placeholder.png',
          title: 'مكرونة بشاميل',
          price: 8.99,
          discount: 5,
          quantity: 40,
          watchers: 24,
          sales: 67,
        },
        {
          id: 4,
          photo: '/assets/dishes/placeholder.png',
          title: 'بسبوسة',
          price: 6.50,
          discount: 0,
          quantity: 18,
          watchers: 56,
          sales: 203,
        },
        {
          id: 5,
          photo: '/assets/dishes/placeholder.png',
          title: 'فطير مشلتت',
          price: 12.99,
          discount: 15,
          quantity: 30,
          watchers: 41,
          sales: 112,
        },
      ];
    } else {
      return [
        {
          id: 1,
          photo: '/assets/dishes/placeholder.png?text=Stuffed+Pigeon',
          title: 'Stuffed Pigeon',
          price: 15.99,
          discount: 10,
          quantity: 25,
          watchers: 48,
          sales: 156,
        },
        {
          id: 2,
          photo: '/assets/dishes/placeholder.png',
          title: 'Homemade Lasagna',
          price: 18.50,
          discount: 0,
          quantity: 12,
          watchers: 32,
          sales: 89,
        },
        {
          id: 3,
          photo: '/assets/dishes/placeholder.png',
          title: 'Fresh Garden Salad',
          price: 8.99,
          discount: 5,
          quantity: 40,
          watchers: 24,
          sales: 67,
        },
        {
          id: 4,
          photo: '/assets/dishes/placeholder.png',
          title: 'Chocolate Cake Slice',
          price: 6.50,
          discount: 0,
          quantity: 18,
          watchers: 56,
          sales: 203,
        },
        {
          id: 5,
          photo: '/assets/dishes/placeholder.png',
          title: 'Beef Tacos (3 pieces)',
          price: 12.99,
          discount: 15,
          quantity: 30,
          watchers: 41,
          sales: 112,
        },
      ];
    }
  };

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch cook's dishes from API
  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dish-offers/my?active=true');
      const offers = response.data?.offers || response.data || [];
      
      // Store full offers for edit functionality
      setCurrentOffer(offers);
      
      // Map API data to menu items format
      const items = offers.map((offer, index) => ({
        id: offer._id || index,
        _id: offer._id,
        photo: offer.images?.[0] || offer.adminDish?.imageUrl || '/assets/dishes/placeholder.png',
        title: offer.adminDish?.nameEn || offer.name || 'Untitled',
        titleAr: offer.adminDish?.nameAr || offer.nameAr || '',
        price: offer.price || 0,
        discount: offer.discount || 0,
        quantity: offer.stock || 0,
        watchers: offer.watchers || 0,
        sales: offer.sales || 0,
        isActive: offer.isActive !== false,
        adminDish: offer.adminDish,
        prepReadyConfig: offer.prepReadyConfig,
        fulfillmentModes: offer.fulfillmentModes,
        deliveryFee: offer.deliveryFee || 0,
        // Store reference to full offer data
        _fullOffer: offer,
      }));
      
      setMenuItems(items);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      // Fallback to sample data on error
      setMenuItems(getSampleMenuItems());
    } finally {
      setLoading(false);
    }
  };

  // Fetch menu items on mount
  React.useEffect(() => {
    fetchMenuItems();
  }, []);

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelected(menuItems.map((item) => item.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
  };

  const handleMenuOpen = (event, item) => {
    setAnchorEl(event.currentTarget);
    setCurrentItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCreateDish = () => {
    setEditMode(false);
    setEditData(null);
    setCreateDialogOpen(true);
  };

  const handleEdit = () => {
    setEditMode(true);
    // Use full offer data if available, fallback to currentItem
    const fullOffer = currentItem?._fullOffer || currentItem;
    
    // Transform API data to CreateDishDialog format
    const editData = {
      ...fullOffer,
      // Map images to photos for CreateDishDialog
      photos: (fullOffer.images || []).map((url, index) => ({
        id: `img-${index}`,
        url: url,
        file: null, // Existing images don't have file objects
        isExisting: true
      })),
      // Ensure adminDish is properly set
      adminDish: fullOffer.adminDish || fullOffer.adminDishId,
    };
    
    setEditData(editData);
    setCreateDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = async () => {
    try {
      if (currentItem?._id) {
        await api.delete(`/dish-offers/${currentItem._id}`);
        showNotification(t('dishDeleted') || 'Dish deleted successfully', 'success');
      }
      setMenuItems(menuItems.filter((item) => item.id !== currentItem.id));
      setDeleteDialogOpen(false);
      setCurrentItem(null);
    } catch (error) {
      console.error('Error deleting dish:', error);
      showNotification(error.response?.data?.message || 'Failed to delete dish', 'error');
    }
  };

  const handleBulkEdit = () => {
    setBulkEditDialogOpen(true);
  };

  const handleListSimilar = () => {
    // Implement list similar logic
    handleMenuClose();
  };

  const handleSaveDish = async (dishData) => {
    try {
      // Add countryCode to dishData for country scoping
      const dishDataWithCountry = new FormData();
      for (let [key, value] of dishData.entries()) {
        dishDataWithCountry.append(key, value);
      }
      dishDataWithCountry.append('countryCode', countryCode);
      console.log('Creating dish with countryCode:', countryCode);
      
      if (editMode && currentItem?._id) {
        // Update existing dish
        await api.put(`/dish-offers/${currentItem._id}`, dishDataWithCountry);
        showNotification('Dish updated successfully', 'success');
      } else {
        // Create new dish
        await api.post('/dish-offers', dishDataWithCountry);
        showNotification('Dish created successfully', 'success');
      }
      
      // Refresh menu items from API
      await fetchMenuItems();
      
      setCreateDialogOpen(false);
      setEditData(null);
      setCurrentItem(null);
    } catch (error) {
      console.error('Error saving dish:', error);
      showNotification(error.response?.data?.message || 'Error saving dish', 'error');
    }
  };

  const handleBulkUpdate = (updates) => {
    setMenuItems(menuItems.map((item) => 
      selected.includes(item.id) ? { ...item, ...updates } : item
    ));
    setSelected([]);
    setBulkEditDialogOpen(false);
  };

  const filteredItems = menuItems.filter((item) =>
    item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: '#FAF5F3', 
      px: '52px',
      py: 3,
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            color: '#1E293B',
            mb: 0.5,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {language === 'ar' ? 'القائمة' : 'Menu'}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#6B7280',
            fontSize: '14px',
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {language === 'ar' 
            ? 'إدارة قائمتك وعرض جميع الأطباق المتاحة 📋'
            : 'Manage your menu and view all available dishes 📋'}
        </Typography>
      </Box>

      {/* Search and Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <TextField
            placeholder={t('searchMenuItems')}
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 250, bgcolor: 'white' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position={isRTL ? "end" : "start"}>
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            sx={{ 
              borderColor: '#ddd',
              color: '#666',
              '&:hover': { borderColor: '#999', bgcolor: '#f5f5f5' }
            }}
          >
            {t('filter')}
          </Button>
        </Box>

      {/* Bulk Edit and Create Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleBulkEdit}
            disabled={selected.length === 0}
            sx={{ 
              borderColor: '#3b82f6',
              color: '#3b82f6',
              '&:hover': { borderColor: '#2563eb', bgcolor: '#eff6ff' }
            }}
          >
            {t('bulkEdit')} ({selected.length})
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateDish}
            sx={{ 
              bgcolor: '#3b82f6',
              '&:hover': { bgcolor: '#2563eb' }
            }}
          >
            {t('createNewDish')}
          </Button>
        </Box>
      {/* Menu Table */}
      <Card sx={{ mt: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell padding="checkbox" sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < menuItems.length}
                    checked={menuItems.length > 0 && selected.length === menuItems.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{t('itemPhoto')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{t('title')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{t('currentPrice')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{t('deliveryFee')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{t('discount')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{t('availableQuantity')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{t('watchers')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{t('salesCount')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                  selected={selected.indexOf(item.id) !== -1}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.indexOf(item.id) !== -1}
                      onChange={() => handleSelectOne(item.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Avatar
                      src={normalizeImageUrl(item.photo)}
                      variant="rounded"
                      sx={{ width: 60, height: 60 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {item.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatCurrency(item.price, language)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {item.fulfillmentModes?.delivery ? (
                      <Typography variant="body2">
                        {item.deliveryFee > 0 
                          ? formatCurrency(item.deliveryFee, language)
                          : (language === 'ar' ? 'مجاني' : 'Free')
                        }
                      </Typography>
                    ) : (
                      <Chip
                        label={language === 'ar' ? 'استلام فقط' : 'Pickup Only'}
                        size="small"
                        sx={{ fontSize: '0.75rem', bgcolor: '#E5E7EB', color: '#6B7280' }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {item.discount > 0 ? (
                      <Chip
                        label={`${item.discount}% OFF`}
                        size="small"
                        color="error"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.quantity}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.watchers}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#3b82f6' }}>
                      {item.sales}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, item)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Action Menu */}
      <MuiMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit} sx={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <EditIcon sx={{ mr: isRTL ? 0 : 1, ml: isRTL ? 1 : 0, fontSize: 18 }} />
          {t('edit')}
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <DeleteIcon sx={{ mr: isRTL ? 0 : 1, ml: isRTL ? 1 : 0, fontSize: 18 }} />
          {t('delete')}
        </MenuItem>
        <MenuItem onClick={handleListSimilar} sx={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <ContentCopyIcon sx={{ mr: isRTL ? 0 : 1, ml: isRTL ? 1 : 0, fontSize: 18 }} />
          {t('listSimilar')}
        </MenuItem>
      </MuiMenu>

      {/* Create/Edit Dish Dialog */}
      <CreateDishDialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditData(null);
        }}
        onSave={handleSaveDish}
        editMode={editMode}
        initialData={editData}
      />

      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        open={bulkEditDialogOpen}
        onClose={() => setBulkEditDialogOpen(false)}
        onSave={handleBulkUpdate}
        selectedCount={selected.length}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{currentItem?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Menu;
