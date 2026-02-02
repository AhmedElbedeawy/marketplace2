import React from 'react';
import { Box, Typography, Dialog, DialogContent, IconButton, Button, Avatar, Rating } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import { useLanguage } from '../contexts/LanguageContext';
import { getAbsoluteUrl } from '../utils/api';

const COLORS = {
  orange: '#FF7A00',
  darkBrown: '#2C2C2C',
  lightGray: '#f5f5f5',
  white: '#ffffff',
};

const CookDetailsDialog = ({ open, onClose, cook }) => {
  const { t, language, isRTL } = useLanguage();

  if (!cook) return null;

  // Get expertise details
  const renderExpertise = () => {
    if (Array.isArray(cook.expertise)) {
      return {
        title: cook.expertise.map(e => {
          if (typeof e === 'object') return isRTL && e.nameAr ? e.nameAr : e.name;
          const expertiseObj = t('expertise', { returnObjects: true }) || {};
          return expertiseObj[e]?.title || e;
        }).join(', '),
        description: '' // Descriptions are harder to join, maybe just omit for arrays
      };
    }
    
    if (typeof cook.expertise === 'object' && cook.expertise !== null) {
      return {
        title: isRTL && cook.expertise.nameAr ? cook.expertise.nameAr : cook.expertise.name,
        description: '' // DB model doesn't have description yet, or we can add it later
      };
    }

    const expertiseObj = t('expertise', { returnObjects: true }) || {};
    return expertiseObj[cook.expertise] || { title: cook.expertise, description: '' };
  };

  const expertiseDetail = renderExpertise();

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
          direction: isRTL ? 'rtl' : 'ltr'
        }
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: isRTL ? 'auto' : 8,
            left: isRTL ? 8 : 'auto',
            top: 8,
            color: 'white',
            zIndex: 10,
            bgcolor: 'rgba(0,0,0,0.3)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' }
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box
          sx={{
            height: '240px',
            position: 'relative',
            background: COLORS.lightGray,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {cook.profilePhoto ? (
            <img
              src={getAbsoluteUrl(cook.profilePhoto)}
              alt={cook.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <Avatar sx={{ width: 120, height: 120, bgcolor: COLORS.orange, fontSize: '48px' }}>
              {cook.name?.charAt(0)}
            </Avatar>
          )}
          
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '50%',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              p: 3
            }}
          >
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>
              {cook.name}
            </Typography>
            
            {/* Rating Display */}
            {(cook.cookRatingAvg > 0 || cook.rating > 0) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StarIcon sx={{ color: '#CEA45A', fontSize: '16px' }} />
                <Typography sx={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
                  {(cook.cookRatingAvg || cook.rating || 0).toFixed(1)}
                </Typography>
                {(cook.cookRatingCount > 0 || cook.ratingCount > 0) && (
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', ml: 0.5 }}>
                    ({cook.cookRatingCount || cook.ratingCount || 0} {language === 'ar' ? 'تقييم' : 'reviews'})
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>

        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: COLORS.orange, 
                fontWeight: 600, 
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1
              }}
            >
              {expertiseDetail.title}
            </Typography>
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.6 }}>
              {expertiseDetail.description}
            </Typography>
          </Box>

          {cook.bio && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: COLORS.darkBrown }}>
                {language === 'ar' ? 'نبذة عن الشيف' : 'About the Chef'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.6 }}>
                {cook.bio}
              </Typography>
            </Box>
          )}

          <Button
            fullWidth
            variant="contained"
            sx={{ 
              bgcolor: COLORS.orange, 
              '&:hover': { bgcolor: '#E66A00' },
              py: 1.5,
              borderRadius: '12px',
              fontWeight: 600,
              textTransform: 'none'
            }}
            onClick={onClose}
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </Button>
        </DialogContent>
      </Box>
    </Dialog>
  );
};

export default CookDetailsDialog;
