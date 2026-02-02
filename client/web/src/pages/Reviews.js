import React from 'react';
import {
  Typography,
  Box,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';

const Reviews = () => {
  const { isRTL } = useLanguage();
  return (
    <Box sx={{ px: '52px', py: 3, direction: isRTL ? 'rtl' : 'ltr', bgcolor: '#FAF5F3', minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom>
        Reviews Management
      </Typography>
      <Typography variant="body1">
        This page will display reviews management functionality for cooks.
      </Typography>
    </Box>
  );
};

export default Reviews;
