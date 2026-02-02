import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Typography, Card, CardContent, Button, CircularProgress, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { ErrorOutline as ErrorIcon, HourglassEmpty as PendingIcon } from '@mui/icons-material';
import api from '../../utils/api';

const CookStatusPage = () => {
  const { language } = useLanguage();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [rejectionReason, setRejectionReason] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get('/users/profile');
        const data = response.data;
        
        // Update local storage status
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.role_cook_status = data.role_cook_status;
          localStorage.setItem('user', JSON.stringify(user));
        }

        setStatus(data.role_cook_status);
        setRejectionReason(data.rejectionReason);
        
        if (data.role_cook_status === 'active') {
          navigate('/cook-dashboard');
        } else if (data.role_cook_status === 'none' && data.rejectionReason) {
          // If rejected, go back to registration page where the reason will be shown
          navigate('/foodie/cook-registration');
        }
      } catch (err) {
        console.error('Error fetching status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [navigate]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F5F5' }}>
        <CircularProgress sx={{ color: '#FF7A00' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F5F5', p: 3 }}>
      <Card sx={{ maxWidth: 500, width: '100%', textAlign: 'center', p: 2 }}>
        <CardContent>
          {status === 'none' && rejectionReason ? (
            <>
              <ErrorIcon sx={{ fontSize: 80, color: '#d32f2f', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#d32f2f' }}>
                {language === 'ar' ? 'تم رفض طلبك' : 'Request Rejected'}
              </Typography>
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {language === 'ar' ? 'سبب الرفض:' : 'Reason for rejection:'}
                </Typography>
                <Typography variant="body2">
                  {rejectionReason}
                </Typography>
              </Alert>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                {language === 'ar' 
                  ? 'للأسف، لم تتم الموافقة على طلبك للانضمام كشيف. يمكنك تعديل بياناتك وإعادة المحاولة.'
                  : 'Unfortunately, your request to join as a cook was not approved. You can update your details and try again.'}
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => navigate('/foodie/cook-registration')}
                sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E66E00' }, mr: 2 }}
              >
                {language === 'ar' ? 'إعادة التسجيل' : 'Re-register'}
              </Button>
            </>
          ) : (
            <>
              <PendingIcon sx={{ fontSize: 80, color: '#FF7A00', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                {language === 'ar' ? 'طلبك قيد المراجعة' : 'Your Request is Pending'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                {language === 'ar' 
                  ? 'شكراً لاهتمامك بالانضمام إلينا كشيف. فريقنا يقوم بمراجعة طلبك حالياً وسنخطرك بمجرد اتخاذ قرار.'
                  : 'Thank you for your interest in joining as a cook. Our team is currently reviewing your request and we will notify you once a decision is made.'}
              </Typography>
            </>
          )}
          
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mb: 2 }}>
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
            </Box>
          )}
          
          <Button 
            variant="outlined" 
            onClick={() => navigate('/')}
            sx={{ borderColor: '#ccc', color: '#666', '&:hover': { borderColor: '#999' } }}
          >
            {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CookStatusPage;
