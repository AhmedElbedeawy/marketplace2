import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';

const HomeLoadingOverlay = ({ active }) => {
  const [isActive, setIsActive] = useState(true); // Always start active
  const [isFading, setIsFading] = useState(false);

  // Handle active prop changes
  useEffect(() => {
    if (!active && isActive && !isFading) {
      // Start fade out
      setIsFading(true);
      setTimeout(() => {
        setIsActive(false);
        setIsFading(false);
      }, 200);
    } else if (active && !isActive) {
      // Show immediately (no transition)
      setIsActive(true);
      setIsFading(false);
    }
  }, [active]);

  // Always render - opacity controls visibility
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        bgcolor: '#FAF5F3',
        opacity: isActive ? (isFading ? 0 : 1) : 0,
        visibility: isActive ? 'visible' : 'hidden',
        transition: isFading ? 'opacity 0.2s ease-out' : 'none',
      }}
    >
      {/* Hero Skeleton - matches existing hero area */}
      <Box sx={{ px: '52px', mb: '48px' }}>
        <Box
          sx={{
            width: '100%',
            height: '380px',
            bgcolor: '#e0e0e0',
            borderRadius: '16px',
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 },
            },
          }}
        />
      </Box>

      {/* Featured Dishes Skeleton */}
      <Box sx={{ px: '52px', mb: '48px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '8px' }}>
          <Box sx={{ width: 200, height: 36, bgcolor: '#e0e0e0', borderRadius: '4px' }} />
          <Box sx={{ width: 80, height: 24, bgcolor: '#e0e0e0', borderRadius: '4px' }} />
        </Box>
        <Box sx={{ display: 'flex', gap: '15px', overflowX: 'auto' }}>
          {[1, 2, 3, 4].map(i => (
            <Box key={i} sx={{ minWidth: 200, height: 220, bgcolor: '#e0e0e0', borderRadius: '8px' }} />
          ))}
        </Box>
      </Box>

      {/* Top Cooks Skeleton */}
      <Box sx={{ px: '52px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '8px' }}>
          <Box sx={{ width: 200, height: 36, bgcolor: '#e0e0e0', borderRadius: '4px' }} />
          <Box sx={{ width: 80, height: 24, bgcolor: '#e0e0e0', borderRadius: '4px' }} />
        </Box>
        <Box sx={{ display: 'flex', gap: '20px', overflowX: 'auto' }}>
          {[1, 2, 3, 4].map(i => (
            <Box key={i} sx={{ minWidth: 280, height: 180, bgcolor: '#e0e0e0', borderRadius: '8px' }} />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default HomeLoadingOverlay;
