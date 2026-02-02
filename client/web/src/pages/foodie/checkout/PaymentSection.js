import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip
} from '@mui/material';
import {
  Payment as PaymentIcon,
  MoneyOff as CashIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useLanguage } from '../../../contexts/LanguageContext';

const PaymentSection = ({ session, onUpdate, onComplete, disabled }) => {
  const { language, isRTL } = useLanguage();

  const [selectedPayment, setSelectedPayment] = useState('CASH');

  const handlePaymentChange = (event) => {
    setSelectedPayment(event.target.value);
    if (onComplete) onComplete();
  };

  return (
    <Card sx={{ borderRadius: '16px', opacity: disabled ? 0.6 : 1 }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PaymentIcon sx={{ color: '#FF7A00', fontSize: 28, mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C2C2C' }}>
              {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
            </Typography>
          </Box>
          {selectedPayment && !disabled && (
            <Chip
              icon={<CheckIcon />}
              label={language === 'ar' ? 'تم الاختيار' : 'Selected'}
              color="success"
              size="small"
            />
          )}
        </Box>

        {/* Payment Options */}
        <RadioGroup value={selectedPayment} onChange={handlePaymentChange}>
          <FormControlLabel
            value="CASH"
            disabled={disabled}
            control={<Radio sx={{ color: '#FF7A00', '&.Mui-checked': { color: '#FF7A00' } }} />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                <CashIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, color: '#4B5563' }} />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {language === 'ar' ? 'الدفع نقداً عند الاستلام' : 'Cash on Delivery'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {language === 'ar' 
                      ? 'ادفع نقداً عند استلام طلبك' 
                      : 'Pay with cash when you receive your order'}
                  </Typography>
                </Box>
              </Box>
            }
            sx={{
              border: selectedPayment === 'CASH' ? '2px solid #FF7A00' : '1px solid #E5E7EB',
              borderRadius: '8px',
              px: 2,
              py: 1,
              mb: 2,
              ml: 0,
              mr: 0,
              '&:hover': {
                bgcolor: disabled ? 'transparent' : '#FFF7ED'
              }
            }}
          />

          {/* Future: Card Payment Option */}
          <FormControlLabel
            value="CARD"
            disabled={true}
            control={<Radio />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                <PaymentIcon sx={{ mr: isRTL ? 0 : 1.5, ml: isRTL ? 1.5 : 0, color: '#9CA3AF' }} />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#9CA3AF' }}>
                    {language === 'ar' ? 'بطاقة ائتمان / مدى' : 'Credit / Debit Card'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {language === 'ar' ? 'قريباً' : 'Coming soon'}
                  </Typography>
                </Box>
              </Box>
            }
            sx={{
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              px: 2,
              py: 1,
              ml: 0,
              mr: 0,
              opacity: 0.5
            }}
          />
        </RadioGroup>

        {disabled && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            {language === 'ar' 
              ? 'يرجى إكمال قسم العنوان أولاً' 
              : 'Please complete the address section first'}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentSection;
