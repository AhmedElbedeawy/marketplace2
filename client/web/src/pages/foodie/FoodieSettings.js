import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  Switch,
  FormControlLabel,
  Divider,
  Grid,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Checkbox,
  FormGroup
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Language as LanguageIcon,
  Edit as EditIcon,
  Restaurant as RestaurantIcon,
  Map as MapIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errorHandler';
import AddressBook from '../../components/AddressBook';

const FoodieSettings = () => {
  const { language, isRTL, t } = useLanguage();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Cook Profile State
  const [openCookEdit, setOpenCookEdit] = useState(false);
  const [cookFormData, setCookEditData] = useState({
    storeName: '',
    expertise: [],
    fulfillmentMethods: [],
    city: '',
    lat: 24.7136,
    lng: 46.6753
  });
  const [cookMapOpen, setCookMapOpen] = useState(false);
  const [checkingName, setCheckingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [categories, setCategories] = useState([]);
  const [expertiseOptions, setExpertiseOptions] = useState([]);

  useEffect(() => {
    fetchProfile();
    fetchCategories();
    fetchExpertiseOptions();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/profile');
      const data = response.data;
      setUser(data);
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
      });
      if (data.role_cook_status !== 'none') {
        setCookEditData({
          storeName: data.storeName || '',
          expertise: Array.isArray(data.expertise) ? data.expertise : (data.expertise ? [data.expertise] : []),
          fulfillmentMethods: data.questionnaire?.fulfillmentMethods || [],
          city: data.city || '',
          lat: data.location?.lat || 24.7136,
          lng: data.location?.lng || 46.6753
        });
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      const data = response.data;
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchExpertiseOptions = async () => {
    try {
      const response = await api.get('/expertise');
      const data = response.data;
      if (data.success) {
        setExpertiseOptions(data.data);
      }
    } catch (err) {
      console.error('Error fetching expertise:', err);
    }
  };

  const handleInputChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleCookInputChange = (e) => {
    const { name, value } = e.target;
    setCookEditData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'storeName') {
      setNameError('');
      if (value.trim().length > 2 && value !== user.storeName) {
        debouncedCheckName(value.trim());
      }
    }
  };

  const nameCheckTimeout = useRef(null);
  const debouncedCheckName = (name) => {
    if (nameCheckTimeout.current) clearTimeout(nameCheckTimeout.current);
    nameCheckTimeout.current = setTimeout(async () => {
      setCheckingName(true);
      try {
        const response = await api.get(`/cooks/check-kitchen-name?name=${encodeURIComponent(name)}`);
        const data = response.data;
        if (data.success && !data.available) {
          setNameError(language === 'ar' ? 'اسم المطبخ مستخدم بالفعل' : 'Kitchen name already exists');
        }
      } catch (err) {
        console.error('Name check error:', err);
      } finally {
        setCheckingName(false);
      }
    }, 500);
  };

  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: true,
    newDishes: false,
  });

  const handleNotificationChange = (field) => (event) => {
    setNotifications({ ...notifications, [field]: event.target.checked });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const response = await api.put('/users/profile', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      });
      
      const data = response.data;
      if (response.status !== 200) throw new Error(data.message || 'Update failed');
      
      setUser(data);
      setEditMode(false);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCookSave = async () => {
    try {
      if (nameError) return;
      setSaving(true);
      setError('');
      setSuccess('');
      const response = await api.put('/cooks/profile', {
        storeName: cookFormData.storeName,
        expertise: cookFormData.expertise,
        city: cookFormData.city,
        location: {
          lat: cookFormData.lat,
          lng: cookFormData.lng
        },
        questionnaire: {
          fulfillmentMethods: cookFormData.fulfillmentMethods
        }
      });
      
      const data = response.data;
      if (response.status !== 200) throw new Error(data.message || 'Update failed');
      
      fetchProfile(); // Refresh profile
      setOpenCookEdit(false);
      setSuccess('Cook profile updated successfully');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCheckboxChange = (method) => {
    setCookEditData(prev => {
      const current = prev.fulfillmentMethods;
      const updated = current.includes(method) 
        ? current.filter(m => m !== method)
        : [...current, method];
      return { ...prev, fulfillmentMethods: updated };
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: '#FAF5F3',
      px: '52px',
      py: 3,
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      {/* Header */}
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: '#2C2C2C',
          mb: 3,
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        {language === 'ar' ? 'الحساب' : 'Account'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: '12px', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 3,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C2C2C' }}>
                  {language === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
                </Typography>
                <Button
                  startIcon={<EditIcon />}
                  onClick={() => setEditMode(!editMode)}
                  sx={{
                    color: '#FF7A00',
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  {editMode 
                    ? (language === 'ar' ? 'إلغاء' : 'Cancel')
                    : (language === 'ar' ? 'تعديل' : 'Edit')
                  }
                </Button>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={user?.profilePhoto}
                    sx={{
                      width: 120,
                      height: 120,
                      bgcolor: '#FF7A00',
                      fontSize: 48,
                      fontWeight: 700,
                    }}
                  >
                    {!user?.profilePhoto && formData.name.charAt(0).toUpperCase()}
                  </Avatar>
                  {editMode && (
                    <IconButton
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: isRTL ? 'auto' : 0,
                        left: isRTL ? 0 : 'auto',
                        bgcolor: 'white',
                        boxShadow: 2,
                        '&:hover': { bgcolor: '#F3F4F6' },
                      }}
                    >
                      <EditIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  )}
                </Box>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: <PersonIcon sx={{ color: '#9CA3AF', mr: 1, ml: isRTL ? 1 : 0 }} />,
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: <EmailIcon sx={{ color: '#9CA3AF', mr: 1, ml: isRTL ? 1 : 0 }} />,
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                    value={formData.phone}
                    onChange={handleInputChange('phone')}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: <PhoneIcon sx={{ color: '#9CA3AF', mr: 1, ml: isRTL ? 1 : 0 }} />,
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                </Grid>
                {/* Default Address Read-only Display */}
                <Grid item xs={12}>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: '#F9FAFB', 
                    borderRadius: '8px', 
                    border: '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5
                  }}>
                    <LocationIcon sx={{ color: '#FF7A00', mt: 0.5 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {language === 'ar' ? 'عنوان التوصيل الافتراضي' : 'Default Delivery Address'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#374151', mt: 0.5 }}>
                        {user?.defaultAddress ? 
                          `${user.defaultAddress.label}: ${user.defaultAddress.addressLine1}, ${user.defaultAddress.city}` : 
                          (language === 'ar' ? 'لا يوجد عنوان افتراضي محدد' : 'No default address set')
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {editMode && (
                <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setEditMode(false)}
                    sx={{
                      borderColor: '#E5E7EB',
                      color: '#6B7280',
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: '8px',
                    }}
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    sx={{
                      bgcolor: '#FF7A00',
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: '8px',
                      '&:hover': { bgcolor: '#FF9933' },
                    }}
                  >
                    {saving ? <CircularProgress size={24} /> : (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Cook Profile Section */}
          {user?.role_cook_status && user?.role_cook_status !== 'none' && (
            <Card sx={{
              borderRadius: '12px',
              mb: 3,
              border: user?.role_cook_status === 'active' ? '1px solid #FF7A00' : '1px solid #E5E7EB'
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RestaurantIcon sx={{ color: '#FF7A00' }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C2C2C' }}>
                        {language === 'ar' ? 'ملف الشيف' : 'Cook Profile'}
                      </Typography>
                    </Box>
                    <Chip
                      label={
                        user?.role_cook_status === 'pending' ? (language === 'ar' ? 'قيد المراجعة' : 'Pending Review') :
                        user?.role_cook_status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') :
                        user?.role_cook_status === 'rejected' ? (language === 'ar' ? 'مرفوض' : 'Rejected') :
                        user?.role_cook_status === 'suspended' ? (language === 'ar' ? 'موقوف' : 'Suspended') :
                        user?.role_cook_status
                      }
                      color={
                        user?.role_cook_status === 'active' ? 'success' :
                        user?.role_cook_status === 'pending' ? 'warning' : 'error'
                      }
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                  {user?.role_cook_status === 'active' && (
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => setOpenCookEdit(true)}
                      sx={{
                        color: '#FF7A00',
                        borderColor: '#FF7A00',
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: '8px',
                      }}
                    >
                      {language === 'ar' ? 'تعديل ملف الشيف' : 'Edit Cook Profile'}
                    </Button>
                  )}
                </Box>

                {user?.role_cook_status === 'rejected' && user?.rejectionReason && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {language === 'ar' ? 'سبب الرفض: ' : 'Rejection Reason: '} {user.rejectionReason}
                  </Alert>
                )}

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">{language === 'ar' ? 'اسم المطبخ' : 'Kitchen Name'}</Typography>
                    <Typography variant="body1" fontWeight={600}>{user.storeName}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">{language === 'ar' ? 'التخصص' : 'Expertise'}</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {(Array.isArray(user.expertise) ? user.expertise : [user.expertise]).filter(Boolean).map((e, i) => {
                        const expertise = typeof e === 'object' ? e : expertiseOptions.find(opt => opt._id === e || opt.name === e);
                        const label = expertise ? (language === 'ar' && expertise.nameAr ? expertise.nameAr : expertise.name) : e;
                        const isActive = expertise ? expertise.isActive : true;
                        return (
                          <Chip
                            key={i}
                            label={label + (!isActive ? ` (${language === 'ar' ? 'غير نشط' : 'Inactive'})` : '')}
                            size="small"
                            variant={isActive ? 'filled' : 'outlined'}
                          />
                        );
                      })}
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">{language === 'ar' ? 'طرق التوصيل' : 'Fulfillment Methods'}</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {user.questionnaire?.fulfillmentMethods?.map((m, i) => (
                        <Chip key={i} label={m} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Address Book Section */}
          <Card sx={{ borderRadius: '12px', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 3,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                gap: 1,
              }}>
                <LocationIcon sx={{ color: '#FF7A00' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C2C2C' }}>
                  {language === 'ar' ? 'سجل العناوين' : 'Address Book'}
                </Typography>
              </Box>
              <AddressBook />
            </CardContent>
          </Card>

          {/* Notifications Settings */}
          <Card sx={{ borderRadius: '12px' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 3,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                gap: 1,
              }}>
                <NotificationsIcon sx={{ color: '#FF7A00' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C2C2C' }}>
                  {language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
                </Typography>
              </Box>

              <Box>
                <FormControlLabel
                  control={<Switch checked={notifications.orderUpdates} onChange={handleNotificationChange('orderUpdates')} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#FF7A00' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#FF7A00' } }} />}
                  label={language === 'ar' ? 'تحديثات الطلبات' : 'Order Updates'}
                  sx={{ width: '100%', mb: 2, justifyContent: 'space-between', ml: 0, mr: 0, flexDirection: isRTL ? 'row-reverse' : 'row', '& .MuiFormControlLabel-label': { flex: 1, textAlign: isRTL ? 'right' : 'left' } }}
                />
                <Divider sx={{ my: 2 }} />
                <FormControlLabel
                  control={<Switch checked={notifications.promotions} onChange={handleNotificationChange('promotions')} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#FF7A00' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#FF7A00' } }} />}
                  label={language === 'ar' ? 'العروض والخصومات' : 'Promotions & Offers'}
                  sx={{ width: '100%', mb: 2, justifyContent: 'space-between', ml: 0, mr: 0, flexDirection: isRTL ? 'row-reverse' : 'row', '& .MuiFormControlLabel-label': { flex: 1, textAlign: isRTL ? 'right' : 'left' } }}
                />
                <Divider sx={{ my: 2 }} />
                <FormControlLabel
                  control={<Switch checked={notifications.newDishes} onChange={handleNotificationChange('newDishes')} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#FF7A00' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#FF7A00' } }} />}
                  label={language === 'ar' ? 'أطباق جديدة' : 'New Dishes'}
                  sx={{ width: '100%', justifyContent: 'space-between', ml: 0, mr: 0, flexDirection: isRTL ? 'row-reverse' : 'row', '& .MuiFormControlLabel-label': { flex: 1, textAlign: isRTL ? 'right' : 'left' } }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ borderRadius: '12px', p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C2C2C', mb: 2 }}>
              {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
            </Typography>
            <Button fullWidth variant="outlined" startIcon={<SecurityIcon />} sx={{ mb: 2, borderColor: '#E5E7EB', color: '#2C2C2C', textTransform: 'none', justifyContent: 'flex-start', borderRadius: '8px', '&:hover': { borderColor: '#FF7A00', bgcolor: '#FFF5F0' } }}>
              {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
            </Button>
            <Button fullWidth variant="outlined" startIcon={<LanguageIcon />} sx={{ mb: 2, borderColor: '#E5E7EB', color: '#2C2C2C', textTransform: 'none', justifyContent: 'flex-start', borderRadius: '8px', '&:hover': { borderColor: '#FF7A00', bgcolor: '#FFF5F0' } }}>
              {language === 'ar' ? 'تفضيلات اللغة' : 'Language Preferences'}
            </Button>
          </Paper>

          <Paper sx={{ borderRadius: '12px', p: 3, bgcolor: '#FFF5F0' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C2C2C', mb: 1 }}>
              {language === 'ar' ? 'احتاج مساعدة؟' : 'Need Help?'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', mb: 2 }}>
              {language === 'ar' ? 'تواصل مع فريق الدعم لدينا' : 'Contact our support team'}
            </Typography>
            <Button fullWidth variant="contained" sx={{ bgcolor: '#FF7A00', textTransform: 'none', fontWeight: 600, borderRadius: '8px', '&:hover': { bgcolor: '#FF9933' } }}>
              {language === 'ar' ? 'تواصل مع الدعم' : 'Contact Support'}
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Cook Profile Dialog */}
      <Dialog open={openCookEdit} onClose={() => setOpenCookEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{language === 'ar' ? 'تعديل ملف الشيف' : 'Edit Cook Profile'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField
              label={language === 'ar' ? 'اسم المطبخ / المتجر *' : 'Kitchen / Store Name *'}
              name="storeName"
              value={cookFormData.storeName}
              onChange={handleCookInputChange}
              fullWidth
              error={!!nameError}
              helperText={nameError || (language === 'ar' ? 'يجب أن يكون فريداً.' : 'It must be unique.')}
              InputProps={{ endAdornment: checkingName && <CircularProgress size={20} /> }}
            />
            <FormControl fullWidth>
              <InputLabel id="edit-expertise-label">{language === 'ar' ? 'مجال التخصص *' : 'Area of Expertise *'}</InputLabel>
              <Select
                labelId="edit-expertise-label"
                name="expertise"
                multiple
                value={cookFormData.expertise.map(e => typeof e === 'object' ? e._id : e)}
                label={language === 'ar' ? 'مجال التخصص *' : 'Area of Expertise *'}
                onChange={handleCookInputChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((id) => {
                      const expertise = expertiseOptions.find(opt => opt._id === id);
                      const label = expertise ? (language === 'ar' && expertise.nameAr ? expertise.nameAr : expertise.name) : id;
                      return (
                        <Chip key={id} label={label} size="small" />
                      );
                    })}
                  </Box>
                )}
              >
                {expertiseOptions.map((exp) => (
                  <MenuItem key={exp._id} value={exp._id}>
                    {language === 'ar' && exp.nameAr ? exp.nameAr : exp.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label={language === 'ar' ? 'المدينة *' : 'City *'}
              name="city"
              value={cookFormData.city}
              onChange={handleCookInputChange}
              fullWidth
              required
            />

            <Box>
              <Button
                startIcon={<MapIcon />}
                onClick={() => setCookMapOpen(true)}
                sx={{ textTransform: 'none', color: '#FF7A00' }}
              >
                {language === 'ar' ? 'تحديد الموقع على الخريطة' : 'Pick Kitchen Location on Map'}
              </Button>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                Lat: {cookFormData.lat.toFixed(4)}, Lng: {cookFormData.lng.toFixed(4)}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>{language === 'ar' ? 'طرق التوصيل' : 'Fulfillment Methods'}</Typography>
              <FormGroup>
                {['Platform delivery', 'Self delivery', 'Pickup only', 'Combination'].map((method) => (
                  <FormControlLabel key={method} control={<Checkbox checked={cookFormData.fulfillmentMethods.includes(method)} onChange={() => handleCheckboxChange(method)} />} label={method} />
                ))}
              </FormGroup>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCookEdit(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={handleCookSave} variant="contained" disabled={saving || !!nameError} sx={{ bgcolor: '#FF7A00' }}>
            {saving ? <CircularProgress size={24} /> : (language === 'ar' ? 'حفظ' : 'Save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cook Map Picker Simulation */}
      <Dialog open={cookMapOpen} onClose={() => setCookMapOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {language === 'ar' ? 'اختر موقع المطبخ' : 'Pick Kitchen Location'}
          <IconButton onClick={() => setCookMapOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ height: 400, bgcolor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
            <Typography>{language === 'ar' ? 'محاكاة اختيار موقع المطبخ من الخريطة' : 'Kitchen Map Pin Selection Simulator'}</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => setCookEditData(prev => ({ ...prev, lat: 24.7136, lng: 46.6753, city: 'Riyadh' }))}>Riyadh (24.7, 46.6)</Button>
              <Button variant="outlined" onClick={() => setCookEditData(prev => ({ ...prev, lat: 30.0444, lng: 31.2357, city: 'Cairo' }))}>Cairo (30.0, 31.2)</Button>
            </Box>
            <Typography variant="caption">Lat: {cookFormData.lat.toFixed(4)}, Lng: {cookFormData.lng.toFixed(4)}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCookMapOpen(false)} variant="contained" sx={{ bgcolor: '#FF7A00' }}>
            {language === 'ar' ? 'تأكيد الموقع' : 'Confirm Location'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FoodieSettings;
