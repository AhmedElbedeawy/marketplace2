import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Divider
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Store as StoreIcon,
  VerifiedUser as VerifiedIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../utils/api';

const CookAccountStatus = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [cookStatus, setCookStatus] = useState(null);

  useEffect(() => {
    fetchCookStatus();
  }, []);

  const fetchCookStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user || !user.role_cook) {
        setLoading(false);
        return;
      }

      const response = await api.get(`/cooks/${user.role_cook}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCookStatus(response.data);
    } catch (err) {
      console.error('Error fetching cook status:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStepperSteps = (status) => {
    const steps = [
      { label: language === 'ar' ? 'التسجيل' : 'Registration', icon: <AssignmentIcon /> },
      { label: language === 'ar' ? 'إنشاء المتجر' : 'Store Setup', icon: <StoreIcon /> },
      { label: language === 'ar' ? 'التحقق' : 'Verification', icon: <VerifiedIcon /> },
      { label: language === 'ar' ? 'الموافقة' : 'Approval', icon: <CheckIcon /> }
    ];

    switch (status) {
      case 'none':
        return { steps: [steps[0]], activeStep: 0, completed: false };
      case 'pending':
        return { steps: steps.slice(0, 3), activeStep: 2, completed: false };
      case 'active':
        return { steps, activeStep: 3, completed: true };
      case 'rejected':
        return { steps: steps.slice(0, 3), activeStep: 2, completed: false, rejected: true };
      case 'suspended':
        return { steps: steps.slice(0, 3), activeStep: 2, completed: true, suspended: true };
      default:
        return { steps: [steps[0]], activeStep: 0, completed: false };
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: '#FF7A00' }} />
      </Box>
    );
  }

  if (!cookStatus) {
    return (
      <Box sx={{ p: 3, maxWidth: '600px', mx: 'auto', textAlign: 'center' }}>
        <Card sx={{ borderRadius: '12px', p: 4 }}>
          <StoreIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {language === 'ar' ? 'لم يتم إنشاء متجر بعد' : 'No Cook Store Created'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {language === 'ar' 
              ? 'يجب إنشاء متجر شيف أولاً للوصول إلى هذه الصفحة' 
              : 'You need to create a cook store first to access this page'}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/foodie/cook-registration')}
            sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#FF9933' } }}
          >
            {language === 'ar' ? 'إنشاء متجر' : 'Create Store'}
          </Button>
        </Card>
      </Box>
    );
  }

  const statusInfo = getStatusStepperSteps(cookStatus.role_cook_status);

  const getStatusColor = () => {
    switch (cookStatus.role_cook_status) {
      case 'active':
        return { bg: '#e8f5e9', text: '#2e7d32', icon: <CheckIcon /> };
      case 'pending':
        return { bg: '#fff3e0', text: '#e65100', icon: <PendingIcon /> };
      case 'rejected':
        return { bg: '#ffebee', text: '#c62828', icon: <CancelIcon /> };
      case 'suspended':
        return { bg: '#fce4ec', text: '#c2185b', icon: <CancelIcon /> };
      default:
        return { bg: '#f5f5f5', text: '#616161', icon: <PendingIcon /> };
    }
  };

  const statusColor = getStatusColor();

  const getStatusText = () => {
    switch (cookStatus.role_cook_status) {
      case 'active':
        return language === 'ar' ? 'نشط' : 'Active';
      case 'pending':
        return language === 'ar' ? 'قيد المراجعة' : 'Pending Review';
      case 'rejected':
        return language === 'ar' ? 'مرفوض' : 'Rejected';
      case 'suspended':
        return language === 'ar' ? 'معلق' : 'Suspended';
      default:
        return language === 'ar' ? 'غير مسجل' : 'Not Registered';
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/')}>
          {language === 'ar' ? 'الرئيسية' : 'Home'}
        </Button>
      </Box>

      {/* Status Card */}
      <Card sx={{ borderRadius: '12px', mb: 3, overflow: 'hidden' }}>
        <Box sx={{ 
          bgcolor: statusColor.bg, 
          p: 3,
          display: 'flex', 
          alignItems: 'center', 
          gap: 2 
        }}>
          <Box sx={{ color: statusColor.text }}>
            {statusColor.icon}
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: statusColor.text }}>
              {cookStatus.storeName}
            </Typography>
            <Typography variant="body2" sx={{ color: statusColor.text, opacity: 0.8 }}>
              {getStatusText()}
            </Typography>
          </Box>
        </Box>

        <CardContent>
          {/* Stepper */}
          <Stepper 
            activeStep={statusInfo.activeStep} 
            alternativeLabel
            sx={{ my: 3 }}
          >
            {statusInfo.steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel 
                  StepIconComponent={() => (
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      bgcolor: index <= statusInfo.activeStep ? '#FF7A00' : '#e0e0e0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      {step.icon}
                    </Box>
                  )}
                >
                  <Typography variant="caption">{step.label}</Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Status Details */}
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f9f9f9', borderRadius: '8px' }}>
            <Typography variant="subtitle2" gutterBottom>
              {language === 'ar' ? 'تفاصيل الحالة' : 'Status Details'}
            </Typography>
            <Divider sx={{ my: 1 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {language === 'ar' ? 'حالة الحساب' : 'Account Status'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {getStatusText()}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {language === 'ar' ? 'اسم المتجر' : 'Store Name'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {cookStatus.storeName || '-'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {language === 'ar' ? 'رقم الهاتف' : 'Phone'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {cookStatus.phone || '-'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                {language === 'ar' ? 'تاريخ التسجيل' : 'Registration Date'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {cookStatus.createdAt 
                  ? new Date(cookStatus.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
                  : '-'}
              </Typography>
            </Box>
          </Box>

          {/* Actions */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
            {cookStatus.role_cook_status === 'none' && (
              <Button 
                variant="contained"
                onClick={() => navigate('/foodie/cook-registration')}
                sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#FF9933' } }}
              >
                {language === 'ar' ? 'إنشاء متجر الآن' : 'Create Store Now'}
              </Button>
            )}
            
            {cookStatus.role_cook_status === 'active' && (
              <Button 
                variant="contained"
                onClick={() => navigate('/cook-dashboard')}
                sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#FF9933' } }}
              >
                {language === 'ar' ? 'الذهاب إلى لوحة التحكم' : 'Go to Dashboard'}
              </Button>
            )}

            {cookStatus.role_cook_status === 'pending' && (
              <Alert severity="info" sx={{ width: '100%' }}>
                {language === 'ar' 
                  ? 'جاري مراجعة طلبك. سنقوم بإخطارك فور الموافقة.' 
                  : 'Your application is under review. We will notify you once approved.'}
              </Alert>
            )}

            {cookStatus.role_cook_status === 'rejected' && (
              <Box sx={{ textAlign: 'center', width: '100%' }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                  {language === 'ar' 
                    ? 'تم رفض طلبك. يرجى التواصل معنا للمزيد من المعلومات.' 
                    : 'Your application was rejected. Please contact us for more information.'}
                </Alert>
                <Button 
                  variant="outlined"
                  onClick={() => navigate('/foodie/messages')}
                >
                  {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
                </Button>
              </Box>
            )}

            {cookStatus.role_cook_status === 'suspended' && (
              <Box sx={{ textAlign: 'center', width: '100%' }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {language === 'ar' 
                    ? 'تم تعليق حسابك. يرجى مراجعة سبب التعليق.' 
                    : 'Your account has been suspended. Please review the suspension reason.'}
                </Alert>
                <Button 
                  variant="contained"
                  onClick={() => navigate('/foodie/suspended')}
                  sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#FF9933' } }}
                >
                  {language === 'ar' ? 'عرض تفاصيل التعليق' : 'View Suspension Details'}
                </Button>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CookAccountStatus;
