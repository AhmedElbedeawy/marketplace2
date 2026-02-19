import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Card, CardContent, FormControlLabel, Switch, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errorHandler';

const COLORS = {
  orange: '#FF7A00',
  darkBrown: '#2C2C2C',
  lightGray: '#f5f5f5',
  white: '#ffffff',
};

const Signup = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestCook, setRequestCook] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    emailOrPhone: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    expertise: '',
    bio: '',
  });



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/register', {
        name: formData.name,
        email: formData.emailOrPhone,
        password: formData.password,
        requestCook: requestCook,
        storeName: requestCook ? formData.storeName : undefined,
        expertise: requestCook ? formData.expertise : undefined,
        bio: requestCook ? formData.bio : undefined,
      });

      const data = response.data;

      if (response.status !== 201 && response.status !== 200) {
        throw new Error(data.message || 'Signup failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authChange')); // Notify cart to switch to user-specific storage

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



  return (
    <Box sx={{ minHeight: '100vh', bgcolor: COLORS.lightGray, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card sx={{ maxWidth: 500, width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
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

              {!isLoginMode && requestCook && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, p: 2, bgcolor: '#fff9f2', borderRadius: 2, border: '1px solid #ffe8cc' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: COLORS.orange }}>
                    {language === 'ar' ? 'تفاصيل الشيف' : 'Cook Details'}
                  </Typography>
                  <TextField
                    label={language === 'ar' ? 'اسم المتجر' : 'Store Name'}
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleInputChange}
                    required={requestCook}
                    fullWidth
                  />
                  <TextField
                    label={language === 'ar' ? 'التخصص' : 'Expertise'}
                    name="expertise"
                    value={formData.expertise}
                    onChange={handleInputChange}
                    required={requestCook}
                    fullWidth
                  />
                  <TextField
                    label={language === 'ar' ? 'نبذة' : 'Bio'}
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    multiline
                    rows={3}
                    fullWidth
                  />
                </Box>
              )}

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
                  '&:hover': { bgcolor: '#E66E00' }
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
    </Box>
  );
};

export default Signup;
