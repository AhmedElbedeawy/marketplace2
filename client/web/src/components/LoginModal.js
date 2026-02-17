import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  Link,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errorHandler';

const LoginModal = ({ open, onClose, redirectPath = '/' }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { showNotification } = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      window.dispatchEvent(new Event('authChange')); // Notify cart to switch to user-specific storage
      
      showNotification(
        language === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Logged in successfully!',
        'success'
      );
      
      onClose();
      
      // Navigate to redirect path if provided
      if (redirectPath && redirectPath !== '/') {
        navigate(redirectPath);
      }
    } catch (err) {
      setError(getErrorMessage(err) || (language === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignupClick = () => {
    onClose();
    navigate('/signup');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <form onSubmit={handleLogin}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                  onClose();
                  navigate('/forgot-password');
                }}
              >
                {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
              </Link>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ flexDirection: 'column', gap: 1, px: 3, pb: 3 }}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{
              bgcolor: '#FF7A00',
              '&:hover': { bgcolor: '#E66E00' },
              textTransform: 'none',
              py: 1,
            }}
          >
            {loading 
              ? (language === 'ar' ? 'جاري...' : 'Loading...')
              : (language === 'ar' ? 'تسجيل الدخول' : 'Login')
            }
          </Button>
          
          <Typography variant="body2" sx={{ mt: 1 }}>
            {language === 'ar' ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={handleSignupClick}
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
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default LoginModal;
