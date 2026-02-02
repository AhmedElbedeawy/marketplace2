import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Alert } from '@mui/material';
import { Close as CloseIcon, Star as StarIcon } from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';

const COLORS = {
  orange: '#FF7A00',
  dark: '#2C2C2C',
  white: '#FFFFFF',
  lightOrange: '#FFF4E6',
};

const RatingReminderBanner = ({ onRateNowClick }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [reminderOrder, setReminderOrder] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetchPendingReminders();
  }, []);

  const fetchPendingReminders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/api/ratings/pending-reminders`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success && response.data.data.length > 0) {
        // Show reminder for the first order only
        const order = response.data.data[0];
        
        // Check if reminder was already shown in this session
        const shownKey = `rating_reminder_shown_${order._id}`;
        const alreadyShown = sessionStorage.getItem(shownKey);
        
        if (!alreadyShown) {
          setReminderOrder(order);
          setVisible(true);
          
          // Mark as shown in session storage
          sessionStorage.setItem(shownKey, 'true');
          
          // Mark as shown on backend
          markReminderShown(order._id);
        }
      }
    } catch (err) {
      console.error('Error fetching pending reminders:', err);
    }
  };

  const markReminderShown = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/api/ratings/order/${orderId}/reminder-shown`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      console.error('Error marking reminder as shown:', err);
    }
  };

  const handleRateNow = () => {
    setVisible(false);
    if (onRateNowClick) {
      onRateNowClick(reminderOrder);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible || !reminderOrder) return null;

  const kitchenName =
    reminderOrder.subOrders?.[0]?.cook?.storeName ||
    reminderOrder.subOrders?.[0]?.cook?.name ||
    'Kitchen';

  return (
    <Box
      sx={{
        bgcolor: COLORS.lightOrange,
        border: `2px solid ${COLORS.orange}`,
        borderRadius: '12px',
        p: 2,
        mb: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <StarIcon sx={{ color: COLORS.orange, fontSize: 32, mr: isRTL ? 0 : 2, ml: isRTL ? 2 : 0 }} />
        <Box>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              color: COLORS.dark,
              mb: 0.5,
            }}
          >
            {language === 'ar'
              ? 'تذكير سريع'
              : 'Quick reminder'}
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.dark }}>
            {language === 'ar'
              ? `قيّم طلبك من ${kitchenName}`
              : `Rate your order from ${kitchenName}`}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          variant="contained"
          onClick={handleRateNow}
          sx={{
            bgcolor: COLORS.orange,
            color: COLORS.white,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            '&:hover': {
              bgcolor: '#E86D00',
            },
          }}
        >
          {language === 'ar' ? 'قيّم الآن' : 'Rate Now'}
        </Button>
        <IconButton
          onClick={handleDismiss}
          size="small"
          sx={{ color: COLORS.dark }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default RatingReminderBanner;
