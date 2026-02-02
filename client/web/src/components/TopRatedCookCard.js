import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { StarRating } from './StarRating';
import { useLanguage } from '../contexts/LanguageContext';
import CookDetailsDialog from './CookDetailsDialog';
import { getAbsoluteUrl } from '../utils/api';

const COLORS = {
  orange: '#FF7A00',
  darkBrown: '#2C2C2C',
  lightGray: '#f5f5f5',
  white: '#ffffff',
};

/**
 * Top-Rated Cook Card Component
 * Features:
 * - Hollow circular card frame (Ccard.png) overlay
 * - Cook image behind the frame
 * - 5-star rating
 * - Cook name and expertise
 * - Clickable to open CookDetailsDialog
 */
export const TopRatedCookCard = ({
  cookId,
  cookName,
  expertise,
  profilePhoto,
  rating = 0,
  ratingCount = 0,
  ordersCount = 0,
  onClick = null,
  onRate = null,
  showOrdersCount = true,
  cardOverlayImage = '/assets/cooks/Ccard.png',
  width = '180px',
  height = '214px',
}) => {
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { isRTL, t } = useLanguage();

  const handleCardClick = () => {
    setShowDetailsDialog(true);
    if (onClick) {
      onClick(cookId);
    }
  };

  // Get translated expertise title
  const renderExpertise = () => {
    if (Array.isArray(expertise)) {
      return expertise.map(e => {
        if (typeof e === 'object') {
          return isRTL && e.nameAr ? e.nameAr : (e.nameEn || e.name);
        }
        // Fallback for legacy strings
        const expertiseObj = t('expertise', { returnObjects: true }) || {};
        return expertiseObj[e]?.title || e;
      }).join(', ');
    }
    
    if (typeof expertise === 'object' && expertise !== null) {
      return isRTL && expertise.nameAr ? expertise.nameAr : expertise.name;
    }

    const expertiseObj = t('expertise', { returnObjects: true }) || {};
    return expertiseObj[expertise]?.title || expertise;
  };

  const expertiseTitle = renderExpertise();

  return (
    <>
      <Box
        onClick={handleCardClick}
        sx={{
          width,
          minWidth: width,
          height,
          flexShrink: 0,
          cursor: 'pointer',
          transition: 'transform 0.3s ease',
          '&:hover': { transform: 'translateY(-8px)' },
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          background: COLORS.lightGray,
        }}
      >
        {/* Cook Image Background */}
        {profilePhoto && (
          <Box
            component="img"
            src={getAbsoluteUrl(profilePhoto)}
            alt={cookName}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover', // Fill the card area for better frame fit
              zIndex: 0,
            }}
          />
        )}

        {/* Hollow Card Overlay (Ccard.png) */}
        <Box
          component="img"
          src={cardOverlayImage}
          alt="Card Frame"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain', // No stretching, fills container
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Cook Info Overlay */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '8px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 2,
            gap: '4px',
          }}
        >
          {/* Rating */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <StarRating
              value={rating}
              count={ratingCount}
              readOnly={true}
              size="small"
              showLabel={true}
              sx={{
                gap: '4px',
                '& .MuiRating-iconFilled': { color: '#CEA45A' },
                '& .MuiRating-icon': { color: 'rgba(255,255,255,0.3)' },
                '& > svg': { fontSize: '14px' },
                '& .MuiTypography-root': { color: '#CEA45A', fontSize: '10px', fontWeight: 600 }
              }}
            />
          </Box>

          {/* Cook Name */}
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 700,
              color: COLORS.white,
              textAlign: 'center',
              lineHeight: '1.2',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {cookName}
          </Typography>

          {/* Expertise with Gradient Lines */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            justifyContent: 'center',
          }}>
            {/* Left Gradient Line */}
            <Box sx={{
              width: '28px',
              height: '1px',
              background: 'linear-gradient(to left, #CEA45A 0%, #111211 100%)',
            }} />
            {/* Expertise Text */}
            <Typography
              sx={{
                fontSize: '10px',
                color: '#CEA45A',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {expertiseTitle}
            </Typography>
            {/* Right Gradient Line */}
            <Box sx={{
              width: '28px',
              height: '1px',
              background: 'linear-gradient(to right, #CEA45A 0%, #111211 100%)',
            }} />
          </Box>

          {/* Orders Count */}
          {showOrdersCount && ordersCount > 0 && (
            <Typography
              sx={{
                fontSize: '10px',
                color: '#CEA45A',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              {ordersCount} orders
            </Typography>
          )}
        </Box>
      </Box>

      {/* Cook Details Dialog */}
      <CookDetailsDialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        cook={{
          id: cookId,
          name: cookName,
          expertise: expertise,
          profilePhoto: profilePhoto
        }}
      />
    </>
  );
};

/**
 * Top-Rated Cooks Grid Component
 * Displays multiple cook cards in a responsive grid
 */
export const TopRatedCooksGrid = ({
  cooks = [],
  onCookClick = null,
  onRateCook = null,
  maxColumns = 5,
  gap = '20px',
  cardWidth = '180px',
  cardHeight = '214px',
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}, 1fr))`,
        gap,
        width: '100%',
      }}
    >
      {cooks.map((cook) => (
        <TopRatedCookCard
          key={cook._id || cook.id}
          cookId={cook._id || cook.id}
          cookName={cook.name}
          expertise={cook.expertise}
          profilePhoto={cook.profilePhoto}
          rating={cook.ratings?.average || cook.rating || 0}
          ratingCount={cook.ratings?.count || cook.reviewCount || 0}
          ordersCount={cook.ordersCount || 0}
          onClick={onCookClick}
          onRate={onRateCook}
          width="100%"
          height={cardHeight}
        />
      ))}
    </Box>
  );
};

export default TopRatedCookCard;
