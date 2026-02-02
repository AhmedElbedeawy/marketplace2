import React from 'react';
import { Box, Typography, Rating as MuiRating } from '@mui/material';
import { useContext } from 'react';

const COLORS = {
  orange: '#FF7A00',
  darkBrown: '#2C2C2C',
  lightGray: '#f5f5f5',
};

/**
 * 5-Star Rating Component
 * Display and interact with star ratings
 */
export const StarRating = ({
  value = 0,
  count = 0,
  onRate = null,
  readOnly = true,
  size = 'medium',
  showLabel = true,
  precision = 0.5,
  sx = {}
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', ...sx }}>
      <MuiRating
        value={value}
        onChange={(event, newValue) => {
          if (onRate && !readOnly) {
            onRate(newValue);
          }
        }}
        readOnly={readOnly}
        size={size}
        precision={precision}
        sx={{
          color: COLORS.orange,
          '& .MuiRating-iconFilled': {
            color: COLORS.orange,
          },
          '& .MuiRating-iconHover': {
            color: COLORS.darkBrown,
          },
          '& .MuiRating-icon': {
            color: COLORS.lightGray,
          },
        }}
      />
      {showLabel && count > 0 && (
        <Typography
          sx={{
            fontSize: '12px',
            color: COLORS.darkBrown,
            fontWeight: 500,
          }}
        >
          ({count})
        </Typography>
      )}
    </Box>
  );
};

/**
 * Cook Rating Card Component
 * Shows rating with cook name and expertise
 */
export const CookRatingCard = ({
  rating = 0,
  ratingCount = 0,
  cookName = '',
  expertise = '',
  isLarge = false,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <StarRating value={rating} count={ratingCount} readOnly={true} size={isLarge ? 'medium' : 'small'} />
      {cookName && (
        <Typography
          sx={{
            fontSize: isLarge ? '16px' : '14px',
            fontWeight: 700,
            color: COLORS.darkBrown,
            margin: 0,
          }}
        >
          {cookName}
        </Typography>
      )}
      {expertise && (
        <Typography
          sx={{
            fontSize: isLarge ? '13px' : '12px',
            color: '#888',
            fontWeight: 500,
            margin: 0,
          }}
        >
          {expertise}
        </Typography>
      )}
    </Box>
  );
};

/**
 * Interactive Rating Dialog
 * For users to rate cooks
 */
export const RatingDialog = ({ onSubmit, onClose, cookName = '' }) => {
  const [rating, setRating] = React.useState(0);
  const [review, setReview] = React.useState('');

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit({ rating, review });
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          background: 'white',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '400px',
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography
          sx={{
            fontSize: '20px',
            fontWeight: 700,
            color: COLORS.darkBrown,
            marginBottom: '16px',
          }}
        >
          Rate {cookName}
        </Typography>

        <Box sx={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Box
              key={star}
              onClick={() => setRating(star)}
              sx={{
                cursor: 'pointer',
                fontSize: '32px',
                color: star <= rating ? COLORS.orange : COLORS.lightGray,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                  color: COLORS.orange,
                },
              }}
            >
              ★
            </Box>
          ))}
        </Box>

        <textarea
          placeholder="Add a review (optional)"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            borderRadius: '8px',
            border: `1px solid ${COLORS.lightGray}`,
            fontFamily: 'inherit',
            fontSize: '14px',
            marginBottom: '16px',
            boxSizing: 'border-box',
          }}
        />

        <Box sx={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${COLORS.orange}`,
              background: 'white',
              color: COLORS.orange,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: rating === 0 ? '#ccc' : COLORS.orange,
              color: 'white',
              fontWeight: 600,
              cursor: rating === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Submit
          </button>
        </Box>
      </Box>
    </Box>
  );
};

export default StarRating;
