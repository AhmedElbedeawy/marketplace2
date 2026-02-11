import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * PublicLayout - Minimal layout for auth pages (login/signup)
 * No sidebar, no cook-specific elements
 */
function PublicLayout() {
  const { isRTL } = useLanguage();

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      width: '100%',
      direction: isRTL ? 'rtl' : 'ltr',
      bgcolor: '#FFFFFF',
    }}>
      <Outlet />
    </Box>
  );
}

export default PublicLayout;
