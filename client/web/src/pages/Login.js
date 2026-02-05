import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import api from '../utils/api';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const { showNotification } = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get redirect path from URL query params
  const redirectPath = searchParams.get('redirect') || '/';

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate(redirectPath);
    }
  }, [navigate, redirectPath]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const data = response.data;

      if (response.status !== 200) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('storage'));
      
      showNotification(
        language === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Logged in successfully!',
        'success'
      );
      
      // Navigate to redirect path
      navigate(redirectPath);
    } catch (err) {
      setError(err.message || (language === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F5F5F5',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 450, width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
            {language === 'ar' ? 'تسجيل الدخول' : 'Welcome Back'}
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 4, textAlign: 'center', color: '#666' }}>
            {language === 'ar' ? 'سجل دخولك للمتابعة' : 'Sign in to continue'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleLogin}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label={language === 'ar' ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or Phone Number'}
                type="text"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              
              <TextField
                label={language === 'ar' ? 'كلمة المرور' : 'Password'}
                type="password"
                fullWidth
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              
              <Box sx={{ textAlign: 'right' }}>
                <Link 
                  href="#" 
                  variant="body2"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/forgot-password');
                  }}
                >
                  {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                </Link>
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{
                  mt: 1,
                  bgcolor: '#FF7A00',
                  '&:hover': { bgcolor: '#E66E00' },
                  textTransform: 'none',
                  py: 1.5,
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                {loading 
                  ? (language === 'ar' ? 'جاري...' : 'Loading...')
                  : (language === 'ar' ? 'تسجيل الدخول' : 'Login')
                }
              </Button>
            </Box>
          </form>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2">
              {language === 'ar' ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={() => navigate('/signup')}
                sx={{ 
                  color: '#FF7A00',
                  fontWeight: 600,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                {language === 'ar' ? 'سجل الآن' : 'Sign up'}
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
