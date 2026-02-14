import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';

function MobileBlockerPage() {
  const { language, isRTL } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch settings on mount using centralized API client
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        if (response.data) {
          setSettings(response.data);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        // Silent fail - badges will be disabled, no warning shown
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const mainText = {
    en: ['For better experience...', 'please continue via mobile app.'],
    ar: ['لتجربة أفضل...', 'يُرجى المتابعة من خلال التطبيق.'],
  };

  const secondaryText = {
    en: 'The website is accessible via desktop version.',
    ar: 'يمكنكم الوصول إلى الموقع عبر نسخة الحاسب.',
  };

  // Default to Arabic if language is not set
  const currentLanguage = language || 'ar';
  const currentMainText = currentLanguage === 'ar' ? mainText.ar : mainText.en;
  const currentSecondaryText = currentLanguage === 'ar' ? secondaryText.ar : secondaryText.en;
  const isArabic = currentLanguage === 'ar';

  // Font sizes: Arabic larger than English
  const mainFontSize = isArabic ? '21px' : '19px';
  const secondaryFontSize = '13px';

  const handleBadgeClick = (url) => {
    if (url && url.trim()) {
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          height: '100vh',
          maxHeight: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          direction: isRTL ? 'rtl' : 'ltr',
          overflow: 'hidden',
          margin: 0,
          padding: 0,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        maxHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        direction: isRTL ? 'rtl' : 'ltr',
        position: 'relative',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
      }}
    >
      {/* Background Image Layer - Full viewport with cover behavior */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100vh',
          backgroundImage: 'url(/images/mobile-blocker/Background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          zIndex: 0,
        }}
      />

      {/* Content Overlay - Bottom-aligned, no-scroll layout */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          textAlign: 'center',
          maxWidth: '350px',
          width: '90%',
          position: 'relative',
          zIndex: 10,
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
      >
        {/* 1. Main Message - Two Lines - Bold */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {currentMainText.map((line, idx) => (
            <Typography
              key={idx}
              sx={{
                color: '#FFFFFF',
                fontSize: mainFontSize,
                fontWeight: 700,
                lineHeight: 1.3,
              }}
            >
              {line}
            </Typography>
          ))}
        </Box>

        {/* 2. Store Badges Container - Stacked Vertically */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            mt: 1,
          }}
        >
          {/* Google Play Badge */}
          <Box
            onClick={() => handleBadgeClick(settings?.googlePlayUrl)}
            sx={{
              cursor: settings?.googlePlayUrl ? 'pointer' : 'not-allowed',
              opacity: settings?.googlePlayUrl ? 1 : 0.5,
              transition: 'transform 0.2s',
              '&:hover': {
                transform: settings?.googlePlayUrl ? 'scale(1.05)' : 'scale(1)',
              },
            }}
          >
            <img
              src="/images/mobile-blocker/Google.png"
              alt="Google Play"
              style={{
                height: '50px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </Box>

          {/* Apple App Store Badge */}
          <Box
            onClick={() => handleBadgeClick(settings?.appStoreUrl)}
            sx={{
              cursor: settings?.appStoreUrl ? 'pointer' : 'not-allowed',
              opacity: settings?.appStoreUrl ? 1 : 0.5,
              transition: 'transform 0.2s',
              '&:hover': {
                transform: settings?.appStoreUrl ? 'scale(1.05)' : 'scale(1)',
              },
            }}
          >
            <img
              src="/images/mobile-blocker/Apple.png"
              alt="App Store"
              style={{
                height: '50px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </Box>
        </Box>

        {/* 3. Secondary Message */}
        <Typography
          sx={{
            color: '#FFFFFF',
            opacity: 0.8,
            fontSize: secondaryFontSize,
            fontWeight: 400,
            lineHeight: 1.5,
            mt: 1,
          }}
        >
          {currentSecondaryText}
        </Typography>
      </Box>
    </Box>
  );
}

export default MobileBlockerPage;
