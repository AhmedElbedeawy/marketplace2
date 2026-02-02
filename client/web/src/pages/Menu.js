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
import { formatCurrency } from '../utils/localeFormatter';

const Menu = () => {
  const { t, isRTL, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
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
          photo: 'https://via.placeholder.com/60?text=Stuffed+Pigeon',
          title: 'حمام محشي',
          price: 15.99,
          discount: 10,
          quantity: 25,
          watchers: 48,
          sales: 156,
        },
        {
          id: 2,
          photo: 'https://via.placeholder.com/60',
          title: 'محشي كرنب',
          price: 18.50,
          discount: 0,
          quantity: 12,
          watchers: 32,
          sales: 89,
        },
        {
          id: 3,
          photo: 'https://via.placeholder.com/60',
          title: 'مكرونة بشاميل',
          price: 8.99,
          discount: 5,
          quantity: 40,
          watchers: 24,
          sales: 67,
        },
        {
          id: 4,
          photo: 'https://via.placeholder.com/60',
          title: 'بسبوسة',
          price: 6.50,
          discount: 0,
          quantity: 18,
          watchers: 56,
          sales: 203,
        },
        {
          id: 5,
          photo: 'https://via.placeholder.com/60',
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
          photo: 'https://via.placeholder.com/60?text=Stuffed+Pigeon',
          title: 'Stuffed Pigeon',
          price: 15.99,
          discount: 10,
          quantity: 25,
          watchers: 48,
          sales: 156,
        },
        {
          id: 2,
          photo: 'https://via.placeholder.com/60',
          title: 'Homemade Lasagna',
          price: 18.50,
          discount: 0,
          quantity: 12,
          watchers: 32,
          sales: 89,
        },
        {
          id: 3,
          photo: 'https://via.placeholder.com/60',
          title: 'Fresh Garden Salad',
          price: 8.99,
          discount: 5,
          quantity: 40,
          watchers: 24,
          sales: 67,
        },
        {
          id: 4,
          photo: 'https://via.placeholder.com/60',
          title: 'Chocolate Cake Slice',
          price: 6.50,
          discount: 0,
          quantity: 18,
          watchers: 56,
          sales: 203,
        },
        {
          id: 5,
          photo: 'https://via.placeholder.com/60',
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

  const [menuItems, setMenuItems] = useState(getSampleMenuItems());

  // Reload menu items when language changes
  React.useEffect(() => {
    setMenuItems(getSampleMenuItems());
  }, [language]);

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
    setEditData(currentItem);
    setCreateDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = () => {
    setMenuItems(menuItems.filter((item) => item.id !== currentItem.id));
    setDeleteDialogOpen(false);
    setCurrentItem(null);
  };

  const handleBulkEdit = () => {
    setBulkEditDialogOpen(true);
  };

  const handleListSimilar = () => {
    // Implement list similar logic
    handleMenuClose();
  };

  const handleSaveDish = (dishData) => {
    if (editMode) {
      setMenuItems(menuItems.map((item) => 
        item.id === currentItem.id ? { ...item, ...dishData } : item
      ));
    } else {
      const newDish = {
        ...dishData,
        id: menuItems.length + 1,
        watchers: 0,
        sales: 0,
      };
      setMenuItems([...menuItems, newDish]);
    }
    setCreateDialogOpen(false);
    setEditData(null);
  };

  const handleBulkUpdate = (updates) => {
    setMenuItems(menuItems.map((item) => 
      selected.includes(item.id) ? { ...item, ...updates } : item
    ));
    setSelected([]);
    setBulkEditDialogOpen(false);
  };

  const filteredItems = menuItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
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
                      src={item.photo}
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
