import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Card, CardContent, FormControlLabel, Switch,
  Alert, CircularProgress, RadioGroup, Radio, FormGroup, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  FormControl, InputLabel, Select, OutlinedInput, Chip, MenuItem
} from '@mui/material';
import { Map as MapIcon, Close as CloseIcon, Search as SearchIcon } from '@mui/icons-material';
import { useJsApiLoader, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errorHandler';
import PhoneVerificationModal from '../../components/PhoneVerificationModal';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { firebaseAuth } from '../../utils/firebase';

const LIBRARIES = ['places'];
const MAP_CONTAINER_STYLE = { width: '100%', height: '400px', borderRadius: '12px' };

const COLORS = {
  orange: '#FF7A00',
  darkBrown: '#2C2C2C',
  lightGray: '#f5f5f5',
  white: '#ffffff',
};

const SectionHeader = ({ title }) => (
  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.orange, mb: 1.5 }}>
    {title}
  </Typography>
);

const Signup = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestCook, setRequestCook] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  // Phone signup OTP gate
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Maps state
  const [autocompleteInstance, setAutocompleteInstance] = useState(null);
  const [map, setMap] = useState(null);
  const pacObserverRef = useRef(null);

  // Categories for signature dishes
  const [categories, setCategories] = useState([]);

  const { isLoaded: mapsLoaded } = useJsApiLoader({
    id: 'signup-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const [formData, setFormData] = useState({
    name: '',
    emailOrPhone: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    expertise: '',
    bio: '',
    city: '',
    area: '',
    lat: 24.7136,
    lng: 46.6753,
  });

  const [questionnaire, setQuestionnaire] = useState({
    experienceLevel: '',
    totalOrders: '',
    dailyOrders: '',
    signatureDishes: [],
    fulfillmentMethods: [],
  });

  // ── Fetch categories for signature dishes ──────────────────────────────────
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
    fetchCategories();
  }, []);

  // ── Reparent .pac-container into the dialog (fix for MUI body-scroll lock) ─
  useEffect(() => {
    if (!mapDialogOpen) {
      const pac = document.querySelector('.pac-container');
      if (pac && pac.parentNode !== document.body) {
        document.body.appendChild(pac);
      }
      if (pacObserverRef.current) {
        pacObserverRef.current.disconnect();
        pacObserverRef.current = null;
      }
      return;
    }

    const applyPacStyles = (pac) => {
      pac.style.setProperty('position', 'absolute', 'important');
      pac.style.setProperty('top', '100%', 'important');
      pac.style.setProperty('left', '0', 'important');
      pac.style.setProperty('right', '0', 'important');
      pac.style.setProperty('width', '100%', 'important');
      pac.style.setProperty('z-index', '20000', 'important');
      pac.style.setProperty('margin-top', '2px', 'important');
      pac.style.setProperty('box-sizing', 'border-box', 'important');
    };

    const bodyObserver = new MutationObserver(() => {
      const pac = document.querySelector('.pac-container');
      if (!pac || pac.parentNode !== document.body) return;
      const anchor = document.querySelector('.cook-pac-anchor');
      if (!anchor) return;
      anchor.appendChild(pac);
      bodyObserver.disconnect();
      applyPacStyles(pac);
      const styleObserver = new MutationObserver(() => applyPacStyles(pac));
      styleObserver.observe(pac, { attributes: true, attributeFilter: ['style'] });
      pacObserverRef.current = styleObserver;
    });

    bodyObserver.observe(document.body, { childList: true });
    return () => bodyObserver.disconnect();
  }, [mapDialogOpen]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleQuestionnaireChange = (e) => {
    const { name, value } = e.target;
    setQuestionnaire((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignatureDishesChange = (event) => {
    const { target: { value } } = event;
    if (value.length <= 3) {
      setQuestionnaire((prev) => ({
        ...prev,
        signatureDishes: typeof value === 'string' ? value.split(',') : value,
      }));
    }
  };

  const handleCheckboxChange = (method) => {
    setQuestionnaire((prev) => {
      const current = prev.fulfillmentMethods;
      const updated = current.includes(method)
        ? current.filter((m) => m !== method)
        : [...current, method];
      return { ...prev, fulfillmentMethods: updated };
    });
  };

  const onAutocompleteLoad = (instance) => {
    setAutocompleteInstance(instance);
  };

  const onPlaceChanged = () => {
    if (autocompleteInstance) {
      const place = autocompleteInstance.getPlace();
      if (place.geometry) {
        const newLat = place.geometry.location.lat();
        const newLng = place.geometry.location.lng();

        let city = '';
        if (place.address_components) {
          const cityComp = place.address_components.find((c) =>
            c.types.includes('locality') ||
            c.types.includes('administrative_area_level_1') ||
            c.types.includes('administrative_area_level_2')
          );
          if (cityComp) city = cityComp.long_name;
        }

        setFormData((prev) => ({
          ...prev,
          lat: newLat,
          lng: newLng,
          city: city || prev.city,
          area: city || prev.area,
        }));

        if (map) {
          map.panTo({ lat: newLat, lng: newLng });
        }
      }
    }
  };

  const onMapClick = useCallback((e) => {
    setFormData((prev) => ({ ...prev, lat: e.latLng.lat(), lng: e.latLng.lng() }));
  }, []);

  const onMarkerDragEnd = (e) => {
    setFormData((prev) => ({ ...prev, lat: e.latLng.lat(), lng: e.latLng.lng() }));
  };

  // ── Google Sign-In ─────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const firebaseUser = result.user;
      const accessToken = await firebaseUser.getIdToken();

      const response = await api.post('/auth/social-login', {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email,
        email: firebaseUser.email,
        profileImage: firebaseUser.photoURL || '',
        provider: 'google',
        accessToken,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.dispatchEvent(new Event('authChange'));
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // User dismissed — not an error
      } else {
        setError(
          err.response?.data?.message ||
          err.message ||
          (language === 'ar' ? 'فشل تسجيل الدخول عبر Google' : 'Google Sign-In failed')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Helper: detect if the credential field is a phone number ──────────────
  const isPhoneCredential = (val) => {
    const cleaned = val.replace(/[\s\-()]/g, '');
    if (val.startsWith('+')) return /^\+\d{10,}$/.test(cleaned);
    return /^\d{7,15}$/.test(cleaned);
  };

  // ── Submit handlers ────────────────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    // Phone signup: require OTP verification first
    if (isPhoneCredential(formData.emailOrPhone) && !phoneVerified) {
      setPhoneModalOpen(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        email: formData.emailOrPhone,
        password: formData.password,
        requestCook,
        ...(requestCook && {
          storeName: formData.storeName,
          expertise: formData.expertise,
          bio: formData.bio,
          city: formData.city,
          area: formData.area,
          lat: formData.lat,
          lng: formData.lng,
          questionnaire: {
            experienceLevel: questionnaire.experienceLevel,
            totalOrders: questionnaire.totalOrders,
            dailyOrders: questionnaire.dailyOrders,
            signatureDishes: questionnaire.signatureDishes,
            fulfillmentMethods: questionnaire.fulfillmentMethods,
          },
        }),
      };

      const response = await api.post('/auth/register', payload);
      const data = response.data;

      if (response.status !== 201 && response.status !== 200) {
        throw new Error(data.message || 'Signup failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authChange'));

      // Upload kitchen photo if provided
      if (requestCook && photo && data.token) {
        try {
          const formPayload = new FormData();
          formPayload.append('photo', photo);
          await api.post('/cooks/upload-kitchen-photo', formPayload, {
            headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${data.token}` },
          });
        } catch (_) {
          // Non-blocking
        }
      }

      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email: formData.emailOrPhone,
        password: formData.password,
      });

      const data = response.data;

      if (response.status !== 200) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('storage'));
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err) || (language === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: COLORS.lightGray, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card sx={{ maxWidth: 560, width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, textAlign: 'center', color: COLORS.darkBrown }}>
            {isLoginMode
              ? (language === 'ar' ? 'تسجيل الدخول' : 'Login')
              : (language === 'ar' ? 'إنشاء حساب' : 'Create Account')
            }
          </Typography>
          <Typography variant="body2" sx={{ mb: 4, textAlign: 'center', color: '#666' }}>
            {isLoginMode
              ? (language === 'ar' ? 'مرحباً بعودتك!' : 'Welcome back!')
              : (language === 'ar' ? 'انضم إلى مجتمعنا اليوم' : 'Join our community today')
            }
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={isLoginMode ? handleLogin : handleSignup}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {!isLoginMode && (
                <TextField
                  label={language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  fullWidth
                />
              )}
              <TextField
                label={language === 'ar' ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or Phone Number'}
                name="emailOrPhone"
                value={formData.emailOrPhone}
                onChange={handleInputChange}
                required
                fullWidth
              />
              <TextField
                label={language === 'ar' ? 'كلمة المرور' : 'Password'}
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                fullWidth
              />
              {!isLoginMode && (
                <TextField
                  label={language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  fullWidth
                />
              )}

              {!isLoginMode && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={requestCook}
                      onChange={(e) => setRequestCook(e.target.checked)}
                      sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: COLORS.orange }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: COLORS.orange } }}
                    />
                  }
                  label={language === 'ar' ? 'طلب الانضمام كشيف' : 'Request to join as a Cook'}
                  sx={{ mt: 1 }}
                />
              )}

              {/* ── COOK SECTIONS ──────────────────────────────────── */}
              {!isLoginMode && requestCook && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>

                  {/* Section 1 – Kitchen Info */}
                  <Box sx={{ p: 2.5, bgcolor: '#fff9f2', borderRadius: 2, border: '1px solid #ffe8cc' }}>
                    <SectionHeader title={language === 'ar' ? '١. معلومات المطبخ' : '1. Kitchen Info'} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label={language === 'ar' ? 'اسم المطبخ' : 'Kitchen Name'}
                        name="storeName"
                        value={formData.storeName}
                        onChange={handleInputChange}
                        required={requestCook}
                        fullWidth
                      />
                      <TextField
                        label={language === 'ar' ? 'المدينة' : 'City'}
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required={requestCook}
                        fullWidth
                      />
                      <TextField
                        label={language === 'ar' ? 'الحي / المنطقة' : 'Neighborhood / Area'}
                        name="area"
                        value={formData.area}
                        onChange={handleInputChange}
                        fullWidth
                      />
                      <TextField
                        label={language === 'ar' ? 'التخصص' : 'Expertise'}
                        name="expertise"
                        value={formData.expertise}
                        onChange={handleInputChange}
                        placeholder={language === 'ar' ? 'مثال: مأكولات شرقية، حلويات...' : 'e.g. Eastern food, Desserts...'}
                        required={requestCook}
                        fullWidth
                      />
                      <TextField
                        label={language === 'ar' ? 'نبذة عن مطبخك' : 'About Your Kitchen'}
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        multiline
                        rows={3}
                        fullWidth
                      />
                      {/* Map Location Picker */}
                      <Box>
                        <Button
                          variant="outlined"
                          startIcon={<MapIcon />}
                          onClick={() => setMapDialogOpen(true)}
                          sx={{
                            borderColor: COLORS.orange,
                            color: COLORS.orange,
                            '&:hover': { borderColor: '#E66E00', bgcolor: '#fff9f2' },
                            textTransform: 'none',
                          }}
                        >
                          {language === 'ar' ? 'تحديد موقع المطبخ على الخريطة' : 'Pick Kitchen Location on Map'}
                        </Button>
                        {(formData.lat !== 24.7136 || formData.lng !== 46.6753) && (
                          <Typography variant="caption" sx={{ display: 'block', color: '#388e3c', mt: 0.5 }}>
                            {language === 'ar' ? '✓ تم تحديد الموقع' : '✓ Location selected'}&nbsp;
                            ({formData.lat.toFixed(4)}, {formData.lng.toFixed(4)})
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {/* Section 2 – Kitchen Image */}
                  <Box sx={{ p: 2.5, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                    <SectionHeader title={language === 'ar' ? '٢. صورة المطبخ' : '2. Kitchen Image'} />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handlePhotoChange}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      {photoPreview && (
                        <Box
                          component="img"
                          src={photoPreview}
                          sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'cover', border: '1px solid #e0e0e0' }}
                        />
                      )}
                      <Button
                        variant="outlined"
                        onClick={() => fileInputRef.current?.click()}
                        sx={{ textTransform: 'none', borderColor: '#bbb', color: '#555' }}
                      >
                        {photo
                          ? (language === 'ar' ? 'تغيير الصورة' : 'Change Photo')
                          : (language === 'ar' ? 'رفع صورة المطبخ' : 'Upload Kitchen Photo')
                        }
                      </Button>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#888', mt: 1, display: 'block' }}>
                      {language === 'ar' ? 'صورة توضح مطبخك أو طبق مميز' : 'A photo showing your kitchen or a signature dish'}
                    </Typography>
                  </Box>

                  {/* Section 3 – Questionnaire */}
                  <Box sx={{ p: 2.5, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                    <SectionHeader title={language === 'ar' ? '٣. استبيان إضافي' : '3. Questionnaire'} />
                    <Alert severity="info" sx={{ mb: 2 }}>
                      {language === 'ar'
                        ? 'الإجابة على هذه الأسئلة تزيد من فرصك في القبول.'
                        : 'Answering these questions increases your chances of being approved.'}
                    </Alert>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                      {/* Q1: Experience duration */}
                      <Box>
                        <Typography sx={{ fontWeight: 600, mb: 1 }}>
                          1️⃣ {language === 'ar' ? 'ما هي مدة خبرتك في بيع الطعام (عبر الإنترنت أو خارجه)؟' : 'How long have you been selling food (online or offline)?'}
                        </Typography>
                        <RadioGroup name="experienceLevel" value={questionnaire.experienceLevel} onChange={handleQuestionnaireChange}>
                          <FormControlLabel value="Just starting" control={<Radio size="small" />} label={language === 'ar' ? 'بدأت للتو' : 'Just starting'} />
                          <FormControlLabel value="Less than 1 year" control={<Radio size="small" />} label={language === 'ar' ? 'أقل من سنة' : 'Less than 1 year'} />
                          <FormControlLabel value="1-3 years" control={<Radio size="small" />} label={language === 'ar' ? '1-3 سنوات' : '1-3 years'} />
                          <FormControlLabel value="3+ years" control={<Radio size="small" />} label={language === 'ar' ? 'أكثر من 3 سنوات' : '3+ years'} />
                        </RadioGroup>
                      </Box>

                      {/* Q2a: Total orders fulfilled */}
                      <Box>
                        <Typography sx={{ fontWeight: 600, mb: 1 }}>
                          2️⃣ {language === 'ar' ? 'كم عدد الطلبات التي قمت بتنفيذها إجمالاً؟' : 'Approximately how many orders have you fulfilled in total?'}
                        </Typography>
                        <RadioGroup name="totalOrders" value={questionnaire.totalOrders} onChange={handleQuestionnaireChange}>
                          <FormControlLabel value="Less than 50" control={<Radio size="small" />} label={language === 'ar' ? 'أقل من 50' : 'Less than 50'} />
                          <FormControlLabel value="50-200" control={<Radio size="small" />} label="50-200" />
                          <FormControlLabel value="200-500" control={<Radio size="small" />} label="200-500" />
                          <FormControlLabel value="500+" control={<Radio size="small" />} label="500+" />
                        </RadioGroup>
                      </Box>

                      {/* Q2b: Daily orders planned */}
                      <Box>
                        <Typography sx={{ fontWeight: 600, mb: 1 }}>
                          {language === 'ar' ? 'كم عدد الطلبات التي تخطط لتنفيذها يومياً؟' : 'Approximately how many orders are you planning to fulfill daily?'}
                        </Typography>
                        <RadioGroup name="dailyOrders" value={questionnaire.dailyOrders} onChange={handleQuestionnaireChange}>
                          <FormControlLabel value="Less than 10" control={<Radio size="small" />} label={language === 'ar' ? 'أقل من 10' : 'Less than 10'} />
                          <FormControlLabel value="10-20" control={<Radio size="small" />} label="10-20" />
                          <FormControlLabel value="20-30" control={<Radio size="small" />} label="20-30" />
                          <FormControlLabel value="30+" control={<Radio size="small" />} label="30+" />
                        </RadioGroup>
                      </Box>

                      {/* Q3: Top 3 best-selling dishes */}
                      <Box>
                        <Typography sx={{ fontWeight: 600, mb: 1 }}>
                          3️⃣ {language === 'ar' ? 'ما هي أفضل 3 أطباق مبيعاً لديك؟' : 'What are your top 3 best-selling dishes?'}
                        </Typography>
                        <FormControl fullWidth>
                          <InputLabel id="signature-dishes-label">
                            {language === 'ar' ? 'اختر حتى 3 أطباق' : 'Select up to 3 dishes'}
                          </InputLabel>
                          <Select
                            labelId="signature-dishes-label"
                            multiple
                            value={questionnaire.signatureDishes}
                            onChange={handleSignatureDishesChange}
                            input={<OutlinedInput label={language === 'ar' ? 'اختر حتى 3 أطباق' : 'Select up to 3 dishes'} />}
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((value) => (
                                  <Chip key={value} label={value} size="small" />
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

                      {/* Q4: Delivery method */}
                      <Box>
                        <Typography sx={{ fontWeight: 600, mb: 1 }}>
                          4️⃣ {language === 'ar' ? 'كيف ستقوم بتوصيل الطلبات؟' : 'How will you deliver orders?'}
                        </Typography>
                        <FormGroup>
                          {[
                            { value: 'Platform delivery', labelEn: 'Platform delivery', labelAr: 'توصيل المنصة' },
                            { value: 'Self delivery',     labelEn: 'Self delivery',     labelAr: 'توصيل ذاتي' },
                            { value: 'Pickup only',       labelEn: 'Pickup only',       labelAr: 'استلام فقط' },
                            { value: 'Combination',       labelEn: 'Combination',       labelAr: 'مزيج' },
                          ].map((opt) => (
                            <FormControlLabel
                              key={opt.value}
                              control={
                                <Checkbox
                                  size="small"
                                  checked={questionnaire.fulfillmentMethods.includes(opt.value)}
                                  onChange={() => handleCheckboxChange(opt.value)}
                                  sx={{ color: COLORS.orange, '&.Mui-checked': { color: COLORS.orange } }}
                                />
                              }
                              label={language === 'ar' ? opt.labelAr : opt.labelEn}
                            />
                          ))}
                        </FormGroup>
                      </Box>

                    </Box>
                  </Box>

                </Box>
              )}
              {/* ─────────────────────────────────────────────────── */}

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 2,
                  py: 1.5,
                  bgcolor: COLORS.orange,
                  fontSize: '16px',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#E66E00' },
                }}
              >
                {loading
                  ? <CircularProgress size={24} color="inherit" />
                  : (isLoginMode
                    ? (language === 'ar' ? 'تسجيل الدخول' : 'Login')
                    : (language === 'ar' ? 'إنشاء حساب' : 'Sign Up')
                  )
                }
              </Button>

              {/* Google Sign-In */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
                <Box sx={{ flex: 1, height: '1px', bgcolor: '#e0e0e0' }} />
                <Typography variant="caption" color="text.secondary">
                  {language === 'ar' ? 'أو' : 'or'}
                </Typography>
                <Box sx={{ flex: 1, height: '1px', bgcolor: '#e0e0e0' }} />
              </Box>
              <Button
                variant="outlined"
                fullWidth
                disabled={loading}
                onClick={handleGoogleSignIn}
                sx={{
                  textTransform: 'none',
                  borderColor: '#E0E0E0',
                  color: '#444',
                  fontWeight: 600,
                  '&:hover': { borderColor: '#bbb', bgcolor: '#fafafa' },
                  display: 'flex',
                  gap: 1,
                }}
              >
                <Box
                  component="img"
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  sx={{ width: 20, height: 20 }}
                />
                {language === 'ar' ? 'المتابعة عبر Google' : 'Continue with Google'}
              </Button>

              <Button
                variant="text"
                onClick={() => setIsLoginMode(!isLoginMode)}
                sx={{ color: '#666', textTransform: 'none' }}
              >
                {isLoginMode
                  ? (language === 'ar' ? 'ليس لديك حساب؟ سجل الآن' : "Don't have an account? Sign up")
                  : (language === 'ar' ? 'لديك حساب بالفعل؟ سجل دخول' : 'Already have an account? Login')
                }
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* Phone OTP verification modal — shown for phone signups */}
      <PhoneVerificationModal
        open={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        onVerified={() => {
          setPhoneVerified(true);
          setPhoneModalOpen(false);
          // Re-trigger signup now that phone is verified
          setLoading(true);
          setError('');
          const payload = {
            name: formData.name,
            email: formData.emailOrPhone,
            password: formData.password,
            requestCook,
            ...(requestCook && {
              storeName: formData.storeName,
              expertise: formData.expertise,
              bio: formData.bio,
              city: formData.city,
              area: formData.area,
              lat: formData.lat,
              lng: formData.lng,
            }),
          };
          api.post('/auth/register', payload)
            .then(response => {
              localStorage.setItem('token', response.data.token);
              localStorage.setItem('user', JSON.stringify(response.data.user));
              window.dispatchEvent(new Event('authChange'));
              navigate('/');
            })
            .catch(err => setError(getErrorMessage(err)))
            .finally(() => setLoading(false));
        }}
        initialPhone={formData.emailOrPhone}
        language={language}
        title={language === 'ar' ? 'تحقق من رقمك للمتابعة' : 'Verify your number to continue'}
      />

      {/* Map Location Dialog — with autocomplete, identical to Cook Registration */}
      <Dialog open={mapDialogOpen} onClose={() => setMapDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {language === 'ar' ? 'اختر موقع المطبخ' : 'Pick Kitchen Location'}
          <IconButton onClick={() => setMapDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, position: 'relative' }}>
          {mapsLoaded ? (
            <Box sx={{ position: 'relative' }}>
              {/* Search bar overlay */}
              <Box sx={{
                position: 'absolute',
                top: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1,
                width: '90%',
                maxWidth: '400px',
              }}>
                {/* cook-pac-anchor: position:relative so reparented .pac-container
                    uses top:100% relative to this wrapper, not the document */}
                <Box className="cook-pac-anchor" sx={{ position: 'relative' }}>
                  <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                    <TextField
                      fullWidth
                      placeholder={language === 'ar' ? 'ابحث عن موقع المطبخ...' : 'Search for kitchen location...'}
                      variant="outlined"
                      size="small"
                      sx={{ bgcolor: 'white', borderRadius: '4px', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ color: 'gray', mr: 1 }} />,
                      }}
                    />
                  </Autocomplete>
                </Box>
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
                  fullscreenControl: false,
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

export default Signup;
