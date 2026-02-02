import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, Typography, TextField, Button, Card, CardContent, CircularProgress, 
  Alert, Stepper, Step, StepLabel, MenuItem, Select, FormControl, InputLabel,
  RadioGroup, FormControlLabel, Radio, Checkbox, FormGroup, Chip, OutlinedInput,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Map as MapIcon,
  Close as CloseIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useJsApiLoader, Autocomplete, GoogleMap, Marker } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import CircularCropUtils from '../../utils/circularCropUtils';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../utils/api';

const LIBRARIES = ['places'];

const COLORS = {
  orange: '#FF7A00',
  darkBrown: '#2C2C2C',
  lightGray: '#f5f5f5',
  white: '#ffffff',
  error: '#d32f2f',
  success: '#388e3c',
};

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '400px',
  borderRadius: '12px'
};


const CookRegistration = () => {
  const { language, t } = useLanguage();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // New fields for Kitchen Name and Questionnaire
  const [checkingName, setCheckingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [categories, setCategories] = useState([]);
  const [expertiseCategories, setExpertiseCategories] = useState([]);

  const [autocomplete, setAutocomplete] = useState(null);
  const [map, setMap] = useState(null);

  // Fetch categories for signature dishes
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        const data = response.data;
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    const fetchExpertise = async () => {
      try {
        const response = await api.get('/expertise');
        const data = response.data;
        if (data.success) {
          setExpertiseCategories(data.data);
        }
      } catch (err) {
        console.error('Error fetching expertise:', err);
      }
    };
    fetchCategories();
    fetchExpertise();
  }, []);

  // Fetch rejection reason if any
  useEffect(() => {
    const checkRejection = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await api.get('/users/profile');
        const data = response.data;
        
        if (data.role_cook_status === 'none' && data.rejectionReason) {
          setRejectionReason(data.rejectionReason);
        }
        
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userObj = JSON.parse(userStr);
          if (userObj.role_cook_status !== data.role_cook_status) {
            userObj.role_cook_status = data.role_cook_status;
            localStorage.setItem('user', JSON.stringify(userObj));
          }
        }
      } catch (err) {
        console.error('Error checking status:', err);
      }
    };
    checkRejection();
  }, []);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const [formData, setFormData] = useState({
    area: '',
    expertise: [],
    bio: '',
    storeName: '',
    city: '',
    lat: 24.7136,
    lng: 46.6753
  });
  const [mapDialogOpen, setMapDialogOpen] = useState(false);

  const [questionnaire, setQuestionnaire] = useState({
    experienceLevel: '',
    totalOrders: '',
    dailyOrders: '',
    signatureDishes: [],
    fulfillmentMethods: []
  });

  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [croppedPhotoData, setCroppedPhotoData] = useState(null);
  const [cropperInstance, setCropperInstance] = useState(null);

  const steps = [
    language === 'ar' ? 'معلومات المطبخ' : 'Kitchen Info',
    language === 'ar' ? 'صور المطبخ' : 'Kitchen Photos',
    language === 'ar' ? 'استبيان إضافي' : 'Questionnaire'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: typeof value === 'string' ? value : value 
    }));
    
    if (name === 'storeName') {
      setNameError('');
      if (value.trim().length > 2) {
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

  const handleQuestionnaireChange = (e) => {
    const { name, value } = e.target;
    setQuestionnaire(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (method) => {
    setQuestionnaire(prev => {
      const current = prev.fulfillmentMethods;
      const updated = current.includes(method) 
        ? current.filter(m => m !== method)
        : [...current, method];
      return { ...prev, fulfillmentMethods: updated };
    });
  };

  const handleSignatureDishesChange = (event) => {
    const { target: { value } } = event;
    // Limit to 3
    if (value.length <= 3) {
      setQuestionnaire(prev => ({
        ...prev,
        signatureDishes: typeof value === 'string' ? value.split(',') : value,
      }));
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (cropperInstance) {
      cropperInstance.cleanup();
      setCropperInstance(null);
    }
    setPhoto(file);
    setCroppedPhotoData(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      setPhotoPreview(event.target?.result);
      setTimeout(async () => {
        if (canvasRef.current) {
          try {
            const instance = await CircularCropUtils.createCookCardCropper(file, canvasRef.current);
            setCropperInstance(instance);
          } catch (err) {
            setError('Failed to initialize cropper');
          }
        }
      }, 100);
    };
    reader.readAsDataURL(file);
  };

  const handleCropPhoto = () => {
    if (!cropperInstance) return;
    try {
      setLoading(true);
      const croppedData = cropperInstance.getCroppedImage();
      setCroppedPhotoData(croppedData);
      setError('');
    } catch (err) {
      setError('Failed to crop photo');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!formData.expertise.length || !formData.storeName || !formData.city) {
        setError(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields (Kitchen Name, Expertise, City)');
        return;
      }
      if (nameError) {
        setError(nameError);
        return;
      }
      setError('');
    }
    if (activeStep === 1) {
      if (!croppedPhotoData) {
        setError(language === 'ar' ? 'يرجى رفع وصص صورة المطبخ' : 'Please upload and crop your kitchen photo');
        return;
      }
      setError('');
    }
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const submitData = {
        ...formData,
        location: {
          lat: formData.lat,
          lng: formData.lng
        },
        profilePhoto: croppedPhotoData,
        questionnaire
      };

      const response = await api.post('/cooks/register', submitData);

      if (response.status !== 201 && response.status !== 200) {
        throw new Error(response.data.message || 'Registration failed');
      }

      const updatedUser = { ...user, role_cook_status: 'pending' };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setSuccessMessage(language === 'ar' ? 'تم تقديم الطلب بنجاح! جاري التوجيه...' : 'Application submitted successfully! Redirecting...');
      setTimeout(() => navigate('/foodie/cook-status'), 2000);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const onLoad = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const newLat = place.geometry.location.lat();
        const newLng = place.geometry.location.lng();
        
        let city = '';
        if (place.address_components) {
          const cityComp = place.address_components.find(c => 
            c.types.includes('locality') || c.types.includes('administrative_area_level_1') || c.types.includes('administrative_area_level_2')
          );
          if (cityComp) city = cityComp.long_name;
        }

        setFormData(prev => ({
          ...prev,
          lat: newLat,
          lng: newLng,
          city: city || prev.city,
          area: city || prev.area
        }));

        if (map) {
          map.panTo({ lat: newLat, lng: newLng });
        }
      }
    }
  };

  const onMapClick = (e) => {
    const newLat = e.latLng.lat();
    const newLng = e.latLng.lng();
    setFormData(prev => ({
      ...prev,
      lat: newLat,
      lng: newLng
    }));
  };

  const onMarkerDragEnd = (e) => {
    const newLat = e.latLng.lat();
    const newLng = e.latLng.lng();
    setFormData(prev => ({
      ...prev,
      lat: newLat,
      lng: newLng
    }));
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.lightGray, py: 4, px: 2 }}>
      <Box sx={{ maxWidth: '600px', margin: '0 auto' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: COLORS.darkBrown, mb: 1 }}>
            {language === 'ar' ? 'سجل كشيف' : 'Become a Cook'}
          </Typography>
          <Typography sx={{ fontSize: '14px', color: '#888', mb: 3 }}>
            {language === 'ar' ? 'انضم إلى مجتمع خبراء الطهي لدينا' : 'Join our community of culinary experts'}
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {rejectionReason && (
          <Alert severity="error" sx={{ mb: 2, border: '1px solid #d32f2f' }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              {language === 'ar' ? 'تم رفض طلبك السابق:' : 'Your previous request was rejected:'}
            </Typography>
            <Typography variant="body2">{rejectionReason}</Typography>
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

        <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <CardContent sx={{ p: 4 }}>
            {/* Step 1: Basic Info */}
            {activeStep === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label={language === 'ar' ? 'اسم المطبخ / المتجر *' : 'Kitchen / Store Name *'}
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleInputChange}
                  fullWidth
                  error={!!nameError}
                  helperText={nameError || (language === 'ar' ? 'هذا الاسم سيظهر للعملاء. يجب أن يكون فريداً.' : 'This name will appear to customers. It must be unique.')}
                  InputProps={{
                    endAdornment: checkingName && <CircularProgress size={20} />
                  }}
                />
                <FormControl fullWidth>
                  <InputLabel id="expertise-label">{language === 'ar' ? 'مجال التخصص *' : 'Area of Expertise *'}</InputLabel>
                  <Select
                    labelId="expertise-label"
                    name="expertise"
                    multiple
                    value={formData.expertise}
                    label={language === 'ar' ? 'مجال التخصص *' : 'Area of Expertise *'}
                    onChange={handleInputChange}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((id) => {
                          const expertise = expertiseCategories.find(e => e._id === id);
                          return (
                            <Chip 
                              key={id} 
                              label={expertise ? (language === 'ar' && expertise.nameAr ? expertise.nameAr : expertise.name) : id} 
                              size="small" 
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {expertiseCategories.map((exp) => (
                      <MenuItem key={exp._id} value={exp._id}>
                        {language === 'ar' && exp.nameAr ? exp.nameAr : exp.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label={language === 'ar' ? 'المدينة *' : 'City *'}
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  fullWidth
                  placeholder="e.g., Riyadh, Cairo"
                  required
                />
                <Box>
                  <Button
                    startIcon={<MapIcon />}
                    onClick={() => setMapDialogOpen(true)}
                    sx={{ textTransform: 'none', color: COLORS.orange }}
                  >
                    {language === 'ar' ? 'تحديد موقع المطبخ على الخريطة' : 'Pick Kitchen Location on Map'}
                  </Button>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#888' }}>
                    Lat: {formData.lat.toFixed(4)}, Lng: {formData.lng.toFixed(4)}
                  </Typography>
                </Box>
                <TextField
                  label={language === 'ar' ? 'نبذة (اختياري)' : 'Bio (Optional)'}
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder={language === 'ar' ? 'أخبرنا عن نفسك وعن أسلوبك في الطبخ...' : 'Tell us about yourself and your cooking style...'}
                />
              </Box>
            )}

            {/* Step 2: Photos */}
            {activeStep === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                <Typography sx={{ fontSize: '14px', color: '#888', textAlign: 'center' }}>
                  {language === 'ar' 
                    ? 'ارفع صورة لمطبخك أو صورة تعبر عن عملك.'
                    : 'Upload a photo of your kitchen or a representative image.'}
                </Typography>
                <Box sx={{ display: photoPreview && !croppedPhotoData ? 'block' : 'none', border: `1px solid ${COLORS.lightGray}`, borderRadius: '12px', overflow: 'hidden', cursor: 'move' }}>
                  <canvas ref={canvasRef} style={{ display: 'block' }} />
                </Box>
                {croppedPhotoData && (
                  <Box sx={{ width: '180px', height: '214px', position: 'relative', borderRadius: '12px', overflow: 'hidden', background: COLORS.lightGray }}>
                    <img src={croppedPhotoData} alt="Cropped" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                )}
                {!photoPreview && (
                  <Box sx={{ width: '180px', height: '214px', bgcolor: '#f0f0f0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${COLORS.orange}`, flexDirection: 'column', p: 2, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '12px', color: '#888' }}>{language === 'ar' ? 'لم يتم اختيار صورة' : 'No photo selected'}</Typography>
                  </Box>
                )}
                <Box sx={{ width: '100%', display: 'flex', gap: 1, flexDirection: 'column', mt: 2 }}>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                  <Button variant="outlined" onClick={() => fileInputRef.current?.click()} sx={{ color: COLORS.orange, borderColor: COLORS.orange }}>
                    {photo ? (language === 'ar' ? 'تغيير الصورة' : 'Change Photo') : (language === 'ar' ? 'رفع صورة' : 'Upload Photo')}
                  </Button>
                  {photo && !croppedPhotoData && (
                    <Button variant="contained" onClick={handleCropPhoto} disabled={loading} sx={{ backgroundColor: COLORS.orange }}>
                      {loading ? <CircularProgress size={24} /> : (language === 'ar' ? 'تطبيق' : 'Apply')}
                    </Button>
                  )}
                </Box>
              </Box>
            )}

            {/* Step 3: Questionnaire */}
            {activeStep === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Alert severity="info">
                  {language === 'ar' 
                    ? 'الإجابة على هذه الأسئلة تزيد من فرصك في القبول.' 
                    : 'Answering these questions increases your chances of being approved.'}
                </Alert>

                <Box>
                  <Typography sx={{ fontWeight: 600, mb: 1 }}>
                    1️⃣ {language === 'ar' ? 'ما هي مدة خبرتك في بيع الطعام (عبر الإنترنت أو خارجه)؟' : 'How long have you been selling food (online or offline)?'}
                  </Typography>
                  <RadioGroup name="experienceLevel" value={questionnaire.experienceLevel} onChange={handleQuestionnaireChange}>
                    <FormControlLabel value="Just starting" control={<Radio />} label={language === 'ar' ? 'بدأت للتو' : 'Just starting'} />
                    <FormControlLabel value="Less than 1 year" control={<Radio />} label={language === 'ar' ? 'أقل من سنة' : 'Less than 1 year'} />
                    <FormControlLabel value="1-3 years" control={<Radio />} label={language === 'ar' ? '1-3 سنوات' : '1-3 years'} />
                    <FormControlLabel value="3+ years" control={<Radio />} label={language === 'ar' ? 'أكثر من 3 سنوات' : '3+ years'} />
                  </RadioGroup>
                </Box>

                <Box>
                  <Typography sx={{ fontWeight: 600, mb: 1 }}>
                    2️⃣ {language === 'ar' ? 'كم عدد الطلبات التي قمت بتنفيذها إجمالاً؟' : 'Approximately how many orders have you fulfilled in total?'}
                  </Typography>
                  <RadioGroup name="totalOrders" value={questionnaire.totalOrders} onChange={handleQuestionnaireChange}>
                    <FormControlLabel value="Less than 50" control={<Radio />} label={language === 'ar' ? 'أقل من 50' : 'Less than 50'} />
                    <FormControlLabel value="50-200" control={<Radio />} label={language === 'ar' ? '50-200' : '50-200'} />
                    <FormControlLabel value="200-500" control={<Radio />} label={language === 'ar' ? '200-500' : '200-500'} />
                    <FormControlLabel value="500+" control={<Radio />} label={language === 'ar' ? '500+' : '500+'} />
                  </RadioGroup>
                </Box>

                <Box>
                  <Typography sx={{ fontWeight: 600, mb: 1 }}>
                    {language === 'ar' ? 'كم عدد الطلبات التي تخطط لتنفيذها يومياً؟' : 'Approximately how many orders are you planning to fulfill daily?'}
                  </Typography>
                  <RadioGroup name="dailyOrders" value={questionnaire.dailyOrders} onChange={handleQuestionnaireChange}>
                    <FormControlLabel value="Less than 10" control={<Radio />} label={language === 'ar' ? 'أقل من 10' : 'Less than 10'} />
                    <FormControlLabel value="10-20" control={<Radio />} label={language === 'ar' ? '10-20' : '10-20'} />
                    <FormControlLabel value="20-30" control={<Radio />} label={language === 'ar' ? '20-30' : '20-30'} />
                    <FormControlLabel value="30+" control={<Radio />} label={language === 'ar' ? '30+' : '30+'} />
                  </RadioGroup>
                </Box>

                <Box>
                  <Typography sx={{ fontWeight: 600, mb: 1 }}>
                    3️⃣ {language === 'ar' ? 'ما هي أفضل 3 أطباق مبيعاً لديك؟' : 'What are your top 3 best-selling dishes?'}
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel id="signature-dishes-label">{language === 'ar' ? 'اختر حتى 3 أطباق' : 'Select up to 3 dishes'}</InputLabel>
                    <Select
                      labelId="signature-dishes-label"
                      multiple
                      value={questionnaire.signatureDishes}
                      onChange={handleSignatureDishesChange}
                      input={<OutlinedInput label={language === 'ar' ? 'اختر حتى 3 أطباق' : 'Select up to 3 dishes'} />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} />
                          ))}
                        </Box>
                      )}
                    >
                      {categories.map((cat) => (
                        <MenuItem key={cat._id} value={language === 'ar' ? cat.nameAr : cat.name}>
                          {language === 'ar' ? cat.nameAr : cat.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box>
                  <Typography sx={{ fontWeight: 600, mb: 1 }}>
                    4️⃣ {language === 'ar' ? 'كيف ستقوم بتوصيل الطلبات؟' : 'How will you deliver orders?'}
                  </Typography>
                  <FormGroup>
                    <FormControlLabel control={<Checkbox checked={questionnaire.fulfillmentMethods.includes('Platform delivery')} onChange={() => handleCheckboxChange('Platform delivery')} />} label={language === 'ar' ? 'توصيل المنصة' : 'Platform delivery'} />
                    <FormControlLabel control={<Checkbox checked={questionnaire.fulfillmentMethods.includes('Self delivery')} onChange={() => handleCheckboxChange('Self delivery')} />} label={language === 'ar' ? 'توصيل ذاتي' : 'Self delivery'} />
                    <FormControlLabel control={<Checkbox checked={questionnaire.fulfillmentMethods.includes('Pickup only')} onChange={() => handleCheckboxChange('Pickup only')} />} label={language === 'ar' ? 'استلام فقط' : 'Pickup only'} />
                    <FormControlLabel control={<Checkbox checked={questionnaire.fulfillmentMethods.includes('Combination')} onChange={() => handleCheckboxChange('Combination')} />} label={language === 'ar' ? 'مزيج' : 'Combination'} />
                  </FormGroup>
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'space-between' }}>
              <Button onClick={handleBack} disabled={activeStep === 0} sx={{ color: COLORS.orange }}>
                {language === 'ar' ? 'رجوع' : 'Back'}
              </Button>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {process.env.NODE_ENV === 'development' && (
                  <Button 
                    onClick={async () => {
                      try {
                        // ALWAYS clear and get fresh token
                        localStorage.clear();
                        
                        // Create fresh demo cook login
                        const response = await axios.post('http://localhost:5005/api/auth/demo-login', {
                          role: 'cook'
                        });
                        const { token, user } = response.data;
                        localStorage.setItem('token', token);
                        localStorage.setItem('user', JSON.stringify(user));
                        
                        // Small delay to ensure localStorage is written
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        // Force reload to apply new token
                        window.location.href = '/cook-dashboard';
                      } catch (err) {
                        console.error('Demo login failed:', err);
                        showNotification('Failed to skip to Cook Hub: ' + (err.response?.data?.message || err.message), 'error');
                      }
                    }}
                    sx={{ color: '#888', textTransform: 'none', fontSize: '12px' }}
                  >
                    Demo: Skip to Cook Hub
                  </Button>
                )}
                <Button onClick={() => navigate('/')} variant="outlined" sx={{ borderColor: '#ccc', color: '#888' }}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                {activeStep === steps.length - 1 ? (
                  <Button onClick={handleSubmit} disabled={loading} variant="contained" sx={{ backgroundColor: COLORS.orange, minWidth: '120px' }}>
                    {loading ? <CircularProgress size={24} /> : (language === 'ar' ? 'تقديم الطلب' : 'Submit Application')}
                  </Button>
                ) : (
                  <Button onClick={handleNext} variant="contained" sx={{ backgroundColor: COLORS.orange }}>
                    {language === 'ar' ? 'التالي' : 'Next'}
                  </Button>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Map Picker Dialog */}
      <Dialog open={mapDialogOpen} onClose={() => setMapDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {language === 'ar' ? 'اختر موقع المطبخ' : 'Pick Kitchen Location'}
          <IconButton onClick={() => setMapDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, position: 'relative' }}>
          {isLoaded ? (
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ 
                position: 'absolute', 
                top: 10, 
                left: '50%', 
                transform: 'translateX(-50%)', 
                zIndex: 1, 
                width: '90%',
                maxWidth: '400px'
              }}>
                <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                  <TextField
                    fullWidth
                    placeholder={language === 'ar' ? 'ابحث عن موقع المطبخ...' : 'Search for kitchen location...'}
                    variant="outlined"
                    size="small"
                    sx={{ bgcolor: 'white', borderRadius: '4px' }}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ color: 'gray', mr: 1 }} />
                    }}
                  />
                </Autocomplete>
              </Box>
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={{ lat: formData.lat, lng: formData.lng }}
                zoom={15}
                onLoad={setMap}
                onClick={onMapClick}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false
                }}
              >
                <Marker 
                  position={{ lat: formData.lat, lng: formData.lng }} 
                  draggable={true}
                  onDragEnd={onMarkerDragEnd}
                />
              </GoogleMap>
              <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderTop: '1px solid #eee' }}>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  Lat: {formData.lat.toFixed(6)}, Lng: {formData.lng.toFixed(6)}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMapDialogOpen(false)} variant="contained" sx={{ bgcolor: COLORS.orange }}>
            {language === 'ar' ? 'تأكيد الموقع' : 'Confirm Location'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CookRegistration;
