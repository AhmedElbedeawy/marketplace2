import React from 'react';
import {
  Typography,
  Box,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';

const Analytics = () => {
  const { isRTL } = useLanguage();
  return (
    <Box sx={{ px: '52px', py: 3, direction: isRTL ? 'rtl' : 'ltr', bgcolor: '#FAF5F3', minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom>
        Analytics Dashboard
      </Typography>
      <Typography variant="body1">
        This page will display analytics and insights for cooks.
      </Typography>
    </Box>
  );
};

export default Analytics;
