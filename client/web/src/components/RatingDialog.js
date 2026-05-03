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

  // cookGroups: [{ cookUserId, cookName, dishes: [{productId, dishOfferId, productName, rating}], review }]
  const [cookGroups, setCookGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editWindowInfo, setEditWindowInfo] = useState(null);

  // Build cook groups from order subOrders
  useEffect(() => {
    if (order && order.subOrders && open) {
      const groups = order.subOrders.map((subOrder) => ({
        cookUserId: subOrder.cook?._id || subOrder.cook,
        cookName: subOrder.cookName || subOrder.cook?.storeName || subOrder.cook?.name || 'Kitchen',
        dishes: subOrder.items.map((item) => ({
          productId: item.product?._id || item.product,
          dishOfferId: item.dishOffer || null,
          productName: item.product?.name || item.product?.title || 'Dish',
          rating: 0,
        })),
        review: '',
      }));
      setCookGroups(groups);
      fetchExistingRating(groups);
    }
  }, [order, open]);

  const fetchExistingRating = async (currentGroups) => {
    if (!order) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/api/ratings/order/${order._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success && response.data.data) {
        const existing = response.data.data;
        setCookGroups(
          currentGroups.map((group) => ({
            ...group,
            review: existing.overallReview || group.review,
            dishes: group.dishes.map((dish) => {
              const existingDish = existing.dishRatings?.find(
                (dr) => dr.product?.toString() === dish.productId?.toString()
              );
              return existingDish ? { ...dish, rating: existingDish.rating } : dish;
            }),
          }))
        );
        setEditWindowInfo(existing.editWindowInfo);
      }
    } catch (err) {
      // No existing rating, that's fine
    }
  };

  const handleRatingChange = (cookIndex, dishIndex, value) => {
    setCookGroups((prev) =>
      prev.map((g, ci) =>
        ci === cookIndex
          ? {
              ...g,
              dishes: g.dishes.map((d, di) =>
                di === dishIndex ? { ...d, rating: value } : d
              ),
            }
          : g
      )
    );
  };

  const handleReviewChange = (cookIndex, value) => {
    setCookGroups((prev) =>
      prev.map((g, ci) => (ci === cookIndex ? { ...g, review: value } : g))
    );
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    for (const group of cookGroups) {
      const unrated = group.dishes.filter((d) => d.rating === 0);
      if (unrated.length > 0) {
        setError(language === 'ar' ? 'يرجى تقييم جميع الأطباق' : 'Please rate all dishes');
        return;
      }
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        dishRatings: cookGroups.flatMap((g) =>
          g.dishes.map((d) => ({
            product: d.productId,
            dishOffer: d.dishOfferId || null,
            rating: d.rating,
            review: '',
          }))
        ),
        cookReviews: cookGroups.map((g) => ({
          cookUserId: g.cookUserId,
          overallReview: g.review,
        })),
        overallReview: cookGroups[0]?.review || '',
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/api/ratings/order/${order._id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSuccess(language === 'ar' ? 'تم إرسال التقييم بنجاح!' : 'Rating submitted successfully!');
        setEditWindowInfo(response.data.data.editWindowInfo);
        setTimeout(() => {
          if (onRatingSubmitted) onRatingSubmitted();
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (language === 'ar' ? 'حدث خطأ أثناء إرسال التقييم' : 'Error submitting rating')
      );
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  const isSingleCook = cookGroups.length === 1;
  const dialogTitle = isSingleCook
    ? language === 'ar'
      ? `كيف كان طلبك من ${cookGroups[0]?.cookName}؟`
      : `How was your order from ${cookGroups[0]?.cookName}?`
    : language === 'ar'
    ? 'قيّم طلبك'
    : 'Review Your Order';

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
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.dark }}>
          {dialogTitle}
        </Typography>
        {editWindowInfo && (
          <Typography
            variant="caption"
            sx={{ color: COLORS.mediumGray, mt: 0.5, display: 'block' }}
          >
            {language === 'ar'
              ? `يمكنك التعديل ${editWindowInfo.editsRemaining} مرات أخرى (خلال ${editWindowInfo.daysRemaining} أيام)`
              : `You can edit ${editWindowInfo.editsRemaining} more times (within ${editWindowInfo.daysRemaining} days)`}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
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

        {cookGroups.map((group, cookIndex) => (
          <Box key={group.cookUserId || cookIndex}>
            {/* Cook header — only for multi-cook orders */}
            {!isSingleCook && (
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: COLORS.orange,
                  mb: 1.5,
                  mt: cookIndex > 0 ? 3 : 0,
                  pb: 0.5,
                  borderBottom: `2px solid ${COLORS.orange}`,
                  display: 'inline-block',
                }}
              >
                {group.cookName}
              </Typography>
            )}

            {/* Dish rows — star rating only, no per-dish review */}
            {group.dishes.map((dish, dishIndex) => (
              <Box key={dishIndex} sx={{ mb: 2 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, mb: 0.5, color: COLORS.dark }}
                >
                  {dish.productName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Rating
                    value={dish.rating}
                    onChange={(e, v) => handleRatingChange(cookIndex, dishIndex, v)}
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
                {dishIndex < group.dishes.length - 1 && <Divider sx={{ mt: 1.5 }} />}
              </Box>
            ))}

            {/* One written review box per cook group */}
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, color: COLORS.dark }}
              >
                {isSingleCook
                  ? language === 'ar'
                    ? 'اكتب تقييمك'
                    : 'Write Your Review'
                  : language === 'ar'
                  ? `تقييم ${group.cookName}`
                  : `Review for ${group.cookName}`}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                inputProps={{ maxLength: 500 }}
                placeholder={language === 'ar' ? 'شارك تجربتك...' : 'Share your experience...'}
                value={group.review}
                onChange={(e) => handleReviewChange(cookIndex, e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />
            </Box>

            {cookIndex < cookGroups.length - 1 && <Divider sx={{ mt: 3 }} />}
          </Box>
        ))}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          sx={{ color: COLORS.mediumGray, textTransform: 'none', fontWeight: 600 }}
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
            '&:hover': { bgcolor: '#E86D00' },
            '&:disabled': { bgcolor: COLORS.lightGray },
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
