import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import Sidebar from './Sidebar';
import FoodieHeader from './FoodieHeader';

/**
 * CookHubLayout - Layout for cook-authenticated routes
 * Includes sidebar navigation and cook header
 */
function CookHubLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleViewSwitch = () => {
    // When in Cook Hub, clicking the button should go to dashboard, not home
    navigate('/cook-dashboard');
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      width: '100%',
      direction: isRTL ? 'rtl' : 'ltr',
      bgcolor: '#F5F5F5',
    }}>
      {/* Cook Hub Header */}
      <Box sx={{ bgcolor: '#FFFFFF', mb: 0, width: '100%', p: 0, m: 0 }}>
        <FoodieHeader onViewSwitch={handleViewSwitch} />
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        flex: 1,
        bgcolor: '#F5F5F5',
      }}>
        {/* Cook Hub Sidebar */}
        <Sidebar 
          open={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          onViewSwitch={handleViewSwitch}
          isMobile={isMobile}
        />
        
        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: '100%',
            minHeight: 0,
            bgcolor: '#F5F5F5',
            px: 0,
            py: 0,
            position: 'relative',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default CookHubLayout;
