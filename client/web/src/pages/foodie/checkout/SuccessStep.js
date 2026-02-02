import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { CheckCircleOutline as SuccessIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';

const SuccessStep = ({ orderId }) => {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        direction: isRTL ? 'rtl' : 'ltr'
      }}
    >
      <Card sx={{ maxWidth: 500, textAlign: 'center', borderRadius: '16px', p: 3 }}>
        <CardContent>
          <SuccessIcon
            sx={{
              fontSize: 100,
              color: '#10B981',
              mb: 2
            }}
          />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#2C2C2C' }}>
            {language === 'ar' ? 'تم تأكيد طلبك!' : 'Order Confirmed!'}
          </Typography>
          <Typography variant="body1" sx={{ mb: 1, color: '#6B7280' }}>
            {language === 'ar' 
              ? 'شكراً لك! تم استلام طلبك بنجاح.' 
              : 'Thank you! Your order has been placed successfully.'}
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: '#9CA3AF' }}>
            {language === 'ar' ? 'رقم الطلب' : 'Order ID'}: #{orderId?.slice(-8)}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="contained"
              onClick={() => navigate(`/foodie/orders`)}
              sx={{
                bgcolor: '#FF7A00',
                color: '#FFFFFF',
                py: 1.5,
                fontSize: '16px',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '12px',
                '&:hover': { bgcolor: '#E56A00' }
              }}
            >
              {language === 'ar' ? 'عرض طلباتي' : 'View My Orders'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/foodie/home')}
              sx={{
                borderColor: '#D1D5DB',
                color: '#6B7280',
                py: 1.5,
                fontSize: '16px',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '12px'
              }}
            >
              {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SuccessStep;
