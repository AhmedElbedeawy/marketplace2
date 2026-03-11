import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Rating,
  Chip,
  IconButton,
  Avatar,
  Divider,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AccessTime as AccessTimeIcon,
  LocalDining as PortionIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
} from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCountry } from '../../contexts/CountryContext';
import { useNotification } from '../../contexts/NotificationContext';
import { formatCurrency as localeFormatCurrency } from '../../utils/localeFormatter';
import { getCookImageUrl, getCookDisplayName } from '../../utils/imageHelper';
import api, { getAbsoluteUrl } from '../../utils/api';

const DishDetail = () => {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const { countryCode, currencyCode, cart, addToCart, clearCart } = useCountry();
  const { showNotification } = useNotification();
  
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [kitchenDialogOpen, setKitchenDialogOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const formatCurrency = (amount) => {
    return localeFormatCurrency(amount, language, currencyCode);
  };

  // Normalize variants from offer
  const getVariants = () => {
    if (!offer) return [];
    if (offer.variants && offer.variants.length > 0) return offer.variants;
    return [{ portionKey: offer.portionSize || 'medium', portionLabel: offer.portionSize || 'Medium', price: offer.price, stock: offer.stock ?? 99 }];
  };
  const variants = offer ? getVariants() : [];
  const inStockVariants = variants.filter(v => (v.stock ?? 0) > 0);
  const isOutOfStock = inStockVariants.length === 0 && offer;
  const currentPrice = selectedVariant?.price ?? offer?.price ?? 0;
  const currentStock = selectedVariant?.stock ?? offer?.stock ?? 0;

  const COLORS = {
    primaryOrange: '#FF7A00',
    darkBrown: '#2B1E16',
    bodyGray: '#6B6B6B',
    bgCream: '#FAF5F3',
    white: '#FFFFFF',
  };

  useEffect(() => {
    fetchOfferDetails();
    checkFavoriteStatus();
  }, [offerId]);

  const checkFavoriteStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await api.get('/favorites/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.favorites) {
        const isFav = response.data.favorites.some(f => f._id === offerId || f.productId?._id === offerId);
        setIsFavorite(isFav);
      }
    } catch (err) {
      console.error('Error checking favorite status:', err);
    }
  };

  const fetchOfferDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products/offers/${offerId}`);
      const data = response.data;
      
      if (!data.success) {
        setError(data.message || 'Failed to load offer');
        return;
      }
      
      setOffer(data.offer);
      // Auto-select cheapest in-stock variant (or first if all out of stock)
      const offerVariants = data.offer.variants?.length > 0 ? data.offer.variants : [{ portionKey: data.offer.portionSize || 'medium', price: data.offer.price, stock: data.offer.stock ?? 99 }];
      const inStock = offerVariants.filter(v => (v.stock ?? 0) > 0);
      let defaultVariant;
      if (inStock.length > 0) {
        // Sort by price, then by portion order (medium < large < family)
        const portionOrder = { 'medium': 1, 'large': 2, 'family': 3 };
        defaultVariant = inStock.sort((a, b) => {
          const priceDiff = (a.price ?? 0) - (b.price ?? 0);
          if (priceDiff !== 0) return priceDiff;
          return (portionOrder[a.portionKey] ?? 99) - (portionOrder[b.portionKey] ?? 99);
        })[0];
      } else {
        defaultVariant = offerVariants[0];
      }
      setSelectedVariant(defaultVariant);
      setError('');
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error fetching offer:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    const differentKitchen = cart.some(item => item.kitchenId !== offer.cook._id);
    
    if (differentKitchen && cart.length > 0) {
      setKitchenDialogOpen(true);
      return;
    }
    
    const cartItem = {
      offerId: offer._id,
      dishId: offer._id,
      cookId: offer.cook._id,
      kitchenId: offer.cook._id,
      kitchenName: offer.cook.storeName || offer.cook.name,
      name: offer.name,
      price: currentPrice,
      quantity,
      priceAtAdd: currentPrice,
      photoUrl: offer.images?.[0] || offer.photoUrl,
      prepTimeMinutes: offer.prepTime || offer.prepReadyConfig?.prepTimeMinutes || 30,
      fulfillmentMode: offer.fulfillmentMode || 'pickup',
      deliveryFee: offer.deliveryFee || 0,
      countryCode: countryCode,
      portionKey: selectedVariant?.portionKey || offer.portionSize || 'medium',
    };
    
    addToCart(cartItem);
    navigate('/foodie/cart');
  };

  const handleKitchenDialogConfirm = () => {
    setKitchenDialogOpen(false);
    clearCart();
    
    const cartItem = {
      offerId: offer._id,
      dishId: offer._id,
      cookId: offer.cook._id,
      kitchenId: offer.cook._id,
      kitchenName: offer.cook.storeName || offer.cook.name,
      name: offer.name,
      price: currentPrice,
      quantity,
      priceAtAdd: currentPrice,
      photoUrl: offer.images?.[0] || offer.photoUrl,
      prepTimeMinutes: offer.prepTime || offer.prepReadyConfig?.prepTimeMinutes || 30,
      fulfillmentMode: offer.fulfillmentMode || 'pickup',
      deliveryFee: offer.deliveryFee || 0,
      countryCode: countryCode,
      portionKey: selectedVariant?.portionKey || offer.portionSize || 'medium',
    };
    
    addToCart(cartItem);
    showNotification(
      language === 'ar' 
        ? 'تمت إضافة الصنف إلى السلة بعد مسح السلة السابقة' 
        : 'Item added to cart after clearing previous items',
      'success'
    );
    navigate('/foodie/cart');
  };

  const handleKitchenClick = () => {
    const kitchenId = offer.cook?._id || offer.cook;
    navigate('/foodie/menu', { state: { viewMode: 'kitchen', selectedKitchenId: kitchenId } });
  };

  const handleToggleFavorite = async () => {
    if (favoriteLoading) return;
    
    try {
      setFavoriteLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        showNotification(
          language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first',
          'warning'
        );
        navigate('/login');
        return;
      }

      const response = await api.post('/favorites/product', 
        { productId: offerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const newStatus = !isFavorite;
        setIsFavorite(newStatus);
        showNotification(
          newStatus
            ? (language === 'ar' ? 'تمت الإضافة إلى المفضلة' : 'Added to favorites')
            : (language === 'ar' ? 'تمت الإزالة من المفضلة' : 'Removed from favorites'),
          'success'
        );
      }
    } catch (err) {
      console.error('Favorite error:', err);
      showNotification(
        language === 'ar' ? 'حدث خطأ' : 'An error occurred',
        'error'
      );
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <CircularProgress sx={{ color: COLORS.primaryOrange }} />
      </Box>
    );
  }

  if (error || !offer) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>
          {error || (language === 'ar' ? 'لم يتم العثور على العرض' : 'Offer not found')}
        </Typography>
        <Button
          startIcon={<ArrowBackIcon sx={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />}
          component={Link} to="/foodie/menu"
          sx={{ mt: 2 }}
        >
          {language === 'ar' ? 'العودة إلى القائمة' : 'Back to Menu'}
        </Button>
      </Container>
    );
  }

  const images = offer.images && offer.images.length > 0 ? offer.images : [offer.photoUrl];

  return (
    <>
      {process.env.NODE_ENV !== 'production' && (
        <Box sx={{ position: 'fixed', top: 0, right: 0, bgcolor: '#FF7A00', color: 'white', px: 2, py: 0.5, zIndex: 9999, fontSize: '12px', fontWeight: 'bold' }}>BUILD_STAMP: FEB04_A1</Box>
      )}
      <Box sx={{ bgcolor: COLORS.bgCream, minHeight: '100vh', py: 3, px: '52px', direction: isRTL ? 'rtl' : 'ltr' }}>
        <Container maxWidth="lg" disableGutters>
          {/* Back Button */}
        <IconButton 
          onClick={() => navigate(-1)} 
          sx={{ mb: 2, color: COLORS.darkBrown }}
        >
          <ArrowBackIcon sx={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
        </IconButton>

        <Grid container spacing={4}>
          {/* Image Gallery */}
          <Grid item xs={12} md={6}>
            <Box sx={{ position: 'relative' }}>
              {/* Main Image */}
              <Box
                sx={{
                  width: '100%',
                  height: '400px',
                  borderRadius: '24px',
                  backgroundImage: `url(${images[selectedImage] || '/assets/dishes/placeholder.png'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  mb: 2,
                }}
              >
                {/* Favorite Button - Top Right Corner */}
                <IconButton
                  onClick={handleToggleFavorite}
                  disabled={favoriteLoading}
                  sx={{
                    position: 'absolute',
                    top: 12,
                    right: isRTL ? 'auto' : 12,
                    left: isRTL ? 12 : 'auto',
                    width: 48,
                    height: 48,
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s',
                    '&:hover': { 
                      bgcolor: 'rgba(255, 255, 255, 1)',
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  {favoriteLoading ? (
                    <CircularProgress size={24} sx={{ color: COLORS.primaryOrange }} />
                  ) : (
                    isFavorite ? (
                      <FavoriteIcon sx={{ color: '#FF0000', fontSize: 28 }} />
                    ) : (
                      <FavoriteBorderIcon sx={{ color: '#FFFFFF', fontSize: 28, filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }} />
                    )
                  )}
                </IconButton>
              </Box>
              
              {/* Thumbnail Gallery */}
              {images.length > 1 && (
                <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
                  {images.map((img, index) => (
                    <Box
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      sx={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '12px',
                        backgroundImage: `url(${img})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        cursor: 'pointer',
                        border: selectedImage === index ? `3px solid ${COLORS.primaryOrange}` : '1px solid #DDD',
                        opacity: selectedImage === index ? 1 : 0.6,
                        transition: 'all 0.2s',
                        '&:hover': { opacity: 1 },
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Grid>

          {/* Dish Info */}
          <Grid item xs={12} md={6}>
            <Box sx={{ bgcolor: COLORS.white, borderRadius: '24px', p: 4 }}>
              {/* Dish Name */}
              <Typography 
                variant="h4" 
                sx={{ fontWeight: 700, color: COLORS.darkBrown, mb: 1 }}
              >
                {offer.name}
              </Typography>

              {/* Category */}
              <Chip 
                label={offer.category?.name || ''}
                size="small"
                sx={{ mb: 2, bgcolor: COLORS.bgCream }}
              />

              {/* Cook/Kitchen Info - Clickable */}
              <Box 
                onClick={handleKitchenClick}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2, 
                  mb: 3, 
                  p: 2, 
                  bgcolor: COLORS.bgCream,
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: '#F0EBE8' }
                }}
              >
              <Avatar 
                src={getAbsoluteUrl(getCookImageUrl(offer.cook))} 
                sx={{ width: 56, height: 56, borderRadius: '12px' }}
              />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 600, color: COLORS.darkBrown }}>
                    {getCookDisplayName(offer.cook)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Rating 
                      value={offer.cook.ratings?.average || 0} 
                      readOnly 
                      size="small" 
                      precision={0.1}
                    />
                    <Typography variant="caption" sx={{ color: COLORS.bodyGray }}>
                      ({offer.cook.ratings?.count || 0})
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Dish Rating */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: COLORS.bodyGray, mb: 0.5 }}>
                  {language === 'ar' ? 'تقييم الطبق' : 'Dish Rating'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rating 
                    value={offer.dishRatings?.average || 0} 
                    readOnly 
                    precision={0.1}
                  />
                  <Typography sx={{ fontWeight: 600 }}>
                    {(offer.dishRatings?.average || 0).toFixed(1)} ({offer.dishRatings?.count || 0})
                  </Typography>
                </Box>
              </Box>

              {/* Prep Time & Portion */}
              <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon sx={{ color: COLORS.primaryOrange }} />
                  <Typography variant="body2">
                    {offer.prepTime} {language === 'ar' ? 'دقيقة' : 'min'}
                  </Typography>
                </Box>
                {offer.portionSize && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PortionIcon sx={{ color: COLORS.primaryOrange }} />
                    <Typography variant="body2">{offer.portionSize}</Typography>
                  </Box>
                )}
              </Box>

              {/* Full Description */}
              <Typography 
                variant="body1" 
                sx={{ color: COLORS.bodyGray, mb: 3, lineHeight: 1.8 }}
              >
                {language === 'ar' 
                  ? (offer.adminDish?.longDescriptionAr || offer.adminDish?.descriptionAr || offer.description)
                  : (offer.adminDish?.longDescriptionEn || offer.adminDish?.descriptionEn || offer.description)
                }
              </Typography>

              <Divider sx={{ my: 3 }} />

              {/* Portion Selector - Only show if multiple in-stock variants */}
              {inStockVariants.length > 1 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 1.5 }}>
                    {language === 'ar' ? 'اختر الحجم:' : 'Select Portion:'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {inStockVariants.map((v) => (
                      <Chip
                        key={v.portionKey}
                        label={`${v.portionLabel || v.portionKey} - ${formatCurrency(v.price)}`}
                        onClick={() => setSelectedVariant(v)}
                        sx={{
                          bgcolor: selectedVariant?.portionKey === v.portionKey ? COLORS.primaryOrange : '#F5F5F5',
                          color: selectedVariant?.portionKey === v.portionKey ? 'white' : COLORS.darkBrown,
                          fontWeight: 500,
                          '&:hover': { bgcolor: selectedVariant?.portionKey === v.portionKey ? '#E66A00' : '#EEE' },
                        }}
                      />
                    ))}
                  </Box>
                  {currentStock > 0 && (
                    <Typography variant="caption" sx={{ color: COLORS.bodyGray, mt: 1, display: 'block' }}>
                      {language === 'ar' ? `المتبقي: ${currentStock}` : `In stock: ${currentStock}`}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Price */}
              <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.primaryOrange, mb: 3 }}>
                {formatCurrency(currentPrice, language)}
              </Typography>

              {/* Quantity Selector */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {language === 'ar' ? 'الكمية:' : 'Quantity:'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    sx={{ 
                      border: '1px solid #DDD',
                      width: 36,
                      height: 36,
                    }}
                  >
                    <RemoveIcon />
                  </IconButton>
                  <Typography sx={{ minWidth: '40px', textAlign: 'center', fontWeight: 600 }}>
                    {quantity}
                  </Typography>
                  <IconButton 
                    onClick={() => setQuantity(quantity + 1)}
                    sx={{ 
                      border: '1px solid #DDD',
                      width: 36,
                      height: 36,
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* Add to Cart Button & Favorite */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  sx={{
                    bgcolor: isOutOfStock ? '#CCC' : COLORS.primaryOrange,
                    borderRadius: '12px',
                    py: 1.5,
                    fontSize: '18px',
                    fontWeight: 600,
                    textTransform: 'none',
                    flex: 1,
                    '&:hover': { bgcolor: isOutOfStock ? '#CCC' : '#E66A00' },
                  }}
                >
                  {isOutOfStock 
                    ? (language === 'ar' ? 'غير متوفر' : 'Out of Stock')
                    : `${language === 'ar' ? 'أضف إلى السلة' : 'Add to Cart'} • ${formatCurrency(currentPrice * quantity, language)}`
                  }
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Multi-Kitchen Warning Dialog */}
      <Dialog 
        open={kitchenDialogOpen} 
        onClose={() => setKitchenDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: isRTL ? 'right' : 'left' }}>
          {language === 'ar' ? 'تنبيه!' : 'Warning!'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ textAlign: isRTL ? 'right' : 'left' }}>
            {language === 'ar' 
              ? 'أنت تقوم بإضافة أصناف من مطابخ مختلفة. سيتم مسح سلة التسوق الحالية. هل تريد المتابعة؟'
              : 'You are adding items from a different kitchen. Your current cart will be cleared. Continue?'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button 
            onClick={() => setKitchenDialogOpen(false)}
            sx={{ color: 'text.secondary' }}
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleKitchenDialogConfirm}
            variant="contained"
            sx={{ bgcolor: COLORS.primaryOrange, '&:hover': { bgcolor: '#E66A00' } }}
          >
            {language === 'ar' ? 'تأكيد' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </>
  );
};

export default DishDetail;
