import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Rating,
  TextField,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Star as StarIcon } from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';

const COLORS = {
  orange: '#FF7A00',
  dark: '#2C2C2C',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  mediumGray: '#9E9E9E',
};

const RatingDialog = ({ open, onClose, order, onRatingSubmitted }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [dishRatings, setDishRatings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editWindowInfo, setEditWindowInfo] = useState(null);

  // Initialize dish ratings from order items
  useEffect(() => {
    if (order && order.subOrders && open) {
      const dishes = [];
      order.subOrders.forEach((subOrder) => {
        subOrder.items.forEach((item) => {
          dishes.push({
            productId: item.product._id || item.product,
            productName: item.product.name || item.product.title || 'Dish',
            rating: 0,
            review: '',
          });
        });
      });
      setDishRatings(dishes);
      
      // Fetch existing rating if any
      fetchExistingRating();
    }
  }, [order, open]);

  const fetchExistingRating = async () => {
    if (!order) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/api/ratings/order/${order._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success && response.data.data) {
        const existingRating = response.data.data;
        
        // Populate existing ratings
        const updatedDishRatings = dishRatings.map((dish) => {
          const existingDish = existingRating.dishRatings.find(
            (dr) => dr.product.toString() === dish.productId.toString()
          );
          return existingDish
            ? { ...dish, rating: existingDish.rating, review: existingDish.review || '' }
            : dish;
        });
        
        setDishRatings(updatedDishRatings);
        setEditWindowInfo(existingRating.editWindowInfo);
      }
    } catch (err) {
      // No existing rating, that's fine
      console.log('No existing rating found');
    }
  };

  const handleRatingChange = (index, value) => {
    const updated = [...dishRatings];
    updated[index].rating = value;
    setDishRatings(updated);
  };

  const handleReviewChange = (index, value) => {
    const updated = [...dishRatings];
    updated[index].review = value;
    setDishRatings(updated);
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    // Validate that all dishes have ratings
    const unratedDishes = dishRatings.filter((d) => d.rating === 0);
    if (unratedDishes.length > 0) {
      setError(
        language === 'ar'
          ? 'يرجى تقييم جميع الأطباق'
          : 'Please rate all dishes'
      );
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        dishRatings: dishRatings.map((d) => ({
          product: d.productId,
          rating: d.rating,
          review: d.review,
        })),
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/api/ratings/order/${order._id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setSuccess(
          language === 'ar'
            ? 'تم إرسال التقييم بنجاح!'
            : 'Rating submitted successfully!'
        );
        setEditWindowInfo(response.data.data.editWindowInfo);
        
        setTimeout(() => {
          if (onRatingSubmitted) onRatingSubmitted();
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
      setError(
        err.response?.data?.message ||
          (language === 'ar'
            ? 'حدث خطأ أثناء إرسال التقييم'
            : 'Error submitting rating')
      );
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  const kitchenName = order.subOrders?.[0]?.cook?.storeName || order.subOrders?.[0]?.cook?.name || 'Kitchen';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          direction: isRTL ? 'rtl' : 'ltr',
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: COLORS.dark,
          color: COLORS.white,
          textAlign: 'center',
          pb: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {language === 'ar'
            ? `كيف كان طلبك من ${kitchenName}؟`
            : `How was your order from ${kitchenName}?`}
        </Typography>
        {editWindowInfo && (
          <Typography variant="caption" sx={{ color: COLORS.mediumGray, mt: 1 }}>
            {language === 'ar'
              ? `يمكنك التعديل ${editWindowInfo.editsRemaining} مرات أخرى (خلال ${editWindowInfo.daysRemaining} أيام)`
              : `You can edit ${editWindowInfo.editsRemaining} more times (within ${editWindowInfo.daysRemaining} days)`}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box>
          {dishRatings.map((dish, index) => (
            <Box key={index} sx={{ mb: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 1, color: COLORS.dark }}
              >
                {dish.productName}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Rating
                  value={dish.rating}
                  onChange={(e, newValue) => handleRatingChange(index, newValue)}
                  size="large"
                  icon={<StarIcon sx={{ color: COLORS.orange }} fontSize="inherit" />}
                  emptyIcon={<StarIcon sx={{ color: COLORS.lightGray }} fontSize="inherit" />}
                />
                <Typography
                  variant="body2"
                  sx={{ ml: isRTL ? 0 : 1, mr: isRTL ? 1 : 0, color: COLORS.mediumGray }}
                >
                  {dish.rating > 0
                    ? `${dish.rating}/5`
                    : language === 'ar'
                    ? 'انقر للتقييم'
                    : 'Click to rate'}
                </Typography>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder={
                  language === 'ar'
                    ? 'أضف مراجعة (اختياري)'
                    : 'Add a review (optional)'
                }
                value={dish.review}
                onChange={(e) => handleReviewChange(index, e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  },
                }}
              />

              {index < dishRatings.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          sx={{
            color: COLORS.mediumGray,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {language === 'ar' ? 'تخطي' : 'Skip'}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          variant="contained"
          sx={{
            bgcolor: COLORS.orange,
            color: COLORS.white,
            textTransform: 'none',
            fontWeight: 600,
            px: 4,
            '&:hover': {
              bgcolor: '#E86D00',
            },
            '&:disabled': {
              bgcolor: COLORS.lightGray,
            },
          }}
        >
          {loading ? (
            <CircularProgress size={20} sx={{ color: COLORS.white }} />
          ) : language === 'ar' ? (
            'إرسال'
          ) : (
            'Submit'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RatingDialog;
