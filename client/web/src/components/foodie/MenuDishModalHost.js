import React, { useState } from 'react';
import {
  Box, 
  Typography, 
  Grid, 
  Button, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  Rating,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Chip
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCountry } from '../../contexts/CountryContext';
import { useNotification } from '../../contexts/NotificationContext';
import { formatCurrency as localeFormatCurrency } from '../../utils/localeFormatter';
import { getNowInCookTimezone, getCookTimeMinutesFromMidnight, getCookToday, createCookTimeDate } from '../../utils/timezoneUtils';
import api, { getAbsoluteUrl } from '../../utils/api';

// DESIGN TOKENS (MATCHING FoodieMenu.js)
const COLORS = { 
  primaryOrange: '#FF7A00', 
  darkBrown: '#2B1E16', 
  warmBrown: '#5A3E2B', 
  bgCream: '#FAF5F3', 
  white: '#FFFFFF', 
  bodyGray: '#6B6B6B', 
  mutedGray: '#A6A6A6', 
  borderGray: '#E8E2DF' 
};

const MenuDishModalHost = React.forwardRef(({ onAddToCart }, ref) => {
  const { language, isRTL } = useLanguage();
  const { countryCode, cart } = useCountry();
  const { showNotification } = useNotification();
  
  // Modal state
  const [selectedDish, setSelectedDish] = useState(null);
  const [dishOffers, setDishOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedMainImage, setSelectedMainImage] = useState(null);
  const [selectedFulfillment, setSelectedFulfillment] = useState(null);
  const [fulfillmentError, setFulfillmentError] = useState(false);
  const [flyingItem, setFlyingItem] = useState(null);
  
  // Public API via ref
  React.useImperativeHandle(ref, () => ({
    openDish: (dish) => openDish(dish),
    closeAll: () => {
      setSelectedDish(null);
      setSelectedOffer(null);
      setDishOffers([]);
      setSelectedVariant(null);
      setQuantity(1);
    }
  }));

  // Compute cutoff times - uses cook's timezone for cutoff calculations
  const computeCutoffTimes = (cutoffTime, readyTime, lang, cookCountryCode) => {
    // Get current time in cook's timezone (as minutes from midnight)
    const nowMinutes = cookCountryCode ? getCookTimeMinutesFromMidnight(cookCountryCode) : new Date().getHours() * 60 + new Date().getMinutes();
    const { year, month, day } = cookCountryCode ? getCookToday(cookCountryCode) : { year: new Date().getFullYear(), month: new Date().getMonth(), day: new Date().getDate() };
    const now = new Date(year, month, day, 0, 0, 0);
    now.setMinutes(nowMinutes);
    const nowTime = now.getTime();
    
    const [cutoffHours, cutoffMinutes] = (cutoffTime || '23:59').split(':').map(Number);
    const [readyHours, readyMinutes] = (readyTime || '23:59').split(':').map(Number);
    
    // Calculate minutes-of-day for comparison
    const cutoffMins = cutoffHours * 60 + cutoffMinutes;
    const readyMins = readyHours * 60 + readyMinutes;
    
    // Determine mode: If readyTime < cutoffTime, it's NEXT-DAY MODE
    const isNextDayMode = readyMins < cutoffMins;
    
    // Create today@cutoff and today@ready using cook's timezone
    let todayCutoff, todayReady;
    
    if (cookCountryCode) {
      todayCutoff = createCookTimeDate(cutoffHours, cutoffMinutes, cookCountryCode, 0);
      todayReady = createCookTimeDate(readyHours, readyMinutes, cookCountryCode, 0);
    } else {
      todayCutoff = new Date(year, month, day, cutoffHours, cutoffMinutes, 0);
      todayReady = new Date(year, month, day, readyHours, readyMinutes, 0);
    }
    
    let readyAt;
    let isTomorrow = false;
    let cutoffDayText = '';
    let readyDayText = '';
    
    if (isNextDayMode) {
      // NEXT-DAY MODE: readyTime < cutoffTime
      // Always ready tomorrow regardless of when ordered
      readyAt = cookCountryCode ? createCookTimeDate(readyHours, readyMinutes, cookCountryCode, 1) : new Date(year, month, day + 1, readyHours, readyMinutes, 0);
      isTomorrow = true;
      cutoffDayText = lang === 'ar' ? ' اليوم' : ' today';
      readyDayText = lang === 'ar' ? ' غداً' : ' tomorrow';
    } else {
      // SAME-DAY MODE: readyTime >= cutoffTime
      if (nowTime <= todayCutoff.getTime()) {
        if (nowTime > todayReady.getTime()) {
          readyAt = cookCountryCode ? createCookTimeDate(readyHours, readyMinutes, cookCountryCode, 1) : new Date(year, month, day + 1, readyHours, readyMinutes, 0);
          isTomorrow = true;
          cutoffDayText = lang === 'ar' ? ' اليوم' : ' today';
          readyDayText = lang === 'ar' ? ' غداً' : ' tomorrow';
        } else {
          readyAt = todayReady;
          isTomorrow = false;
          cutoffDayText = lang === 'ar' ? ' اليوم' : ' today';
          readyDayText = lang === 'ar' ? ' اليوم' : ' today';
        }
      } else {
        readyAt = cookCountryCode ? createCookTimeDate(readyHours, readyMinutes, cookCountryCode, 1) : new Date(year, month, day + 1, readyHours, readyMinutes, 0);
        isTomorrow = true;
        cutoffDayText = lang === 'ar' ? ' اليوم' : ' today';
        readyDayText = lang === 'ar' ? ' غداً' : ' tomorrow';
      }
    }
    
    const diffMs = readyAt.getTime() - nowTime;
    const prepTimeMinutes = Math.max(0, Math.ceil(diffMs / 60000));
    
    const prepTimeText = lang === 'ar' 
      ? `اطلب قبل ${cutoffTime}${cutoffDayText}، استقبل بحلول ${readyTime}${readyDayText}`
      : `Order before ${cutoffTime}${cutoffDayText}, ready by ${readyTime}${readyDayText}`;
    
    // NOTE: readyAt is NOT sent to backend - backend computes it from prepReadyConfig
    // We only send prepTimeText for display purposes
    return { readyAt: null, prepTimeMinutes, prepTimeText };
  };

  const formatCurrency = (amount) => {
    return localeFormatCurrency(amount, language);
  };

  // Open dish - fetch offers
  const openDish = async (dish) => {
    setSelectedDish({ 
      name: dish.nameEn || dish.name, 
      nameAr: dish.nameAr, 
      _id: dish._id,
      longDescription: dish.longDescription,
      longDescriptionAr: dish.longDescriptionAr,
      description: dish.description,
      descriptionAr: dish.descriptionAr
    });
    setLoadingOffers(true);
    
    try {
      const response = await api.get(`/dish-offers/by-admin-dish/${dish._id}?country=${countryCode}`);
      const data = response.data;
      
      if (data.success && data.offers && data.offers.length > 0) {
        setDishOffers(data.offers);
      } else {
        setDishOffers([]);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      setDishOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  };

  // Handle offer click (View button) - WITH PREP TIME COMPUTATION
  const handleOfferClick = (offer) => {
    const fulfillmentOptions = [];
    if (offer.fulfillmentModes?.delivery) fulfillmentOptions.push('delivery');
    if (offer.fulfillmentModes?.pickup) fulfillmentOptions.push('pickup');
    
    const enrichedOffer = {
      ...offer,
      fulfillmentOptions,
      cook: offer.cook,
      images: offer.images || [],
      name: offer.adminDish?.nameEn || offer.name,
      nameAr: offer.adminDish?.nameAr || offer.nameAr,
      description: offer.adminDish?.descriptionEn || offer.adminDish?.longDescription || offer.description,
      descriptionAr: offer.adminDish?.descriptionAr || offer.adminDish?.longDescriptionAr,
      portionSize: offer.portionSize,
      prepReadyConfig: offer.prepReadyConfig,
      prepTime: offer.prepTime,
      deliveryFee: offer.deliveryFee
    };
    
    // Compute prep time for display during enrichment
    const config = enrichedOffer.prepReadyConfig || {};
    let computedPrepTimeMinutes = enrichedOffer.prepTime || 30;
    let computedPrepTimeText = null;
    if (config.optionType === 'cutoff') {
      const cutoffResult = computeCutoffTimes(config.cutoffTime, config.beforeCutoffReadyTime, language, enrichedOffer.cook?.countryCode);
      computedPrepTimeMinutes = cutoffResult.prepTimeMinutes;
      computedPrepTimeText = cutoffResult.prepTimeText;
    } else if (config.optionType === 'fixed') {
      computedPrepTimeMinutes = config.prepTimeMinutes || enrichedOffer.prepTime || 30;
    } else if (config.optionType === 'range') {
      computedPrepTimeMinutes = Math.round((config.prepTimeMinMinutes + config.prepTimeMaxMinutes) / 2) || enrichedOffer.prepTime || 30;
    }
    enrichedOffer.prepTimeMinutes = computedPrepTimeMinutes;
    enrichedOffer.prepTimeText = computedPrepTimeText;
    
    setSelectedOffer(enrichedOffer);
    setQuantity(1);
    
    // Initialize default variant
    const offerVariants = enrichedOffer.variants?.length > 0 ? enrichedOffer.variants : [{ portionKey: enrichedOffer.portionSize || 'medium', price: enrichedOffer.price, stock: enrichedOffer.stock ?? 99 }];
    const inStock = offerVariants.filter(v => (v.stock ?? 0) > 0);
    let defaultVariant;
    if (inStock.length > 0) {
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
    
    const cookImages = enrichedOffer.images;
    const hasCookImages = cookImages && cookImages.length > 0;
    setSelectedMainImage(hasCookImages ? cookImages[0] : (enrichedOffer?.adminDish?.imageUrl || null));
    setSelectedFulfillment(null);
    setFulfillmentError(false);
  };

  // Handle add to cart - WITH PORTION LABEL
  const handleAddToCart = (offer, event) => {
    const hasDelivery = offer.fulfillmentOptions?.includes('delivery');
    const hasPickup = offer.fulfillmentOptions?.includes('pickup');
    const hasBothOptions = hasDelivery && hasPickup;
    
    if (hasBothOptions && !selectedFulfillment) {
      setFulfillmentError(true);
      return;
    }
    
    const hasCookImages = offer.images && offer.images.length > 0;
    const selectedMode = hasBothOptions ? selectedFulfillment : (hasDelivery ? 'delivery' : 'pickup');
    const cookId = String(offer.cook?._id || offer.cook || 'unknown');
    
    const config = offer.prepReadyConfig || {};
    let prepTimeMinutes;
    let readyAt = null;
    let prepTimeText = null;
    
    if (config.optionType === 'cutoff') {
      const cutoffResult = computeCutoffTimes(config.cutoffTime, config.beforeCutoffReadyTime, language, offer.cook?.countryCode);
      prepTimeMinutes = cutoffResult.prepTimeMinutes;
      readyAt = cutoffResult.readyAt;
      prepTimeText = cutoffResult.prepTimeText;
    } else if (config.optionType === 'fixed') {
      prepTimeMinutes = config.prepTimeMinutes || 30;
    } else if (config.optionType === 'range') {
      prepTimeMinutes = Math.round((config.prepTimeMinMinutes + config.prepTimeMaxMinutes) / 2) || 30;
    } else {
      prepTimeMinutes = offer.prepTime || 30;
    }
    
    const variantPrice = selectedVariant?.price || offer.price;
    const variantPortion = selectedVariant?.portionKey || offer.portionSize || 'medium';
    
    const cartItem = {
      offerId: offer._id,
      dishId: offer.adminDishId || offer.adminDish?._id,
      cookId: cookId,
      kitchenId: cookId,
      kitchenName: offer.cook?.storeName || offer.cook?.name || 'Unknown Kitchen',
      name: offer.name,
      price: variantPrice,
      quantity,
      priceAtAdd: variantPrice,
      portionKey: variantPortion,
      portionLabel: selectedVariant?.portionLabel || '',
      photoUrl: getAbsoluteUrl(hasCookImages ? offer.images[0] : offer.adminDish?.imageUrl),
      prepTimeMinutes: prepTimeMinutes,
      readyAt: readyAt,
      prepTimeText: prepTimeText,
      fulfillmentMode: selectedMode,
      deliveryFee: offer.deliveryFee || 0,
      countryCode: countryCode,
    };
    
    console.log('[CART_ITEM_VARIANT]', { portionKey: variantPortion, portionLabel: selectedVariant?.portionLabel, variantId: selectedVariant?.variantId, price: variantPrice, quantity });
    
    // Trigger fly animation
    if (event && event.currentTarget) {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setFlyingItem({
        image: getAbsoluteUrl(hasCookImages ? offer.images[0] : offer.adminDish?.imageUrl),
        startX: buttonRect.left + buttonRect.width / 2,
        startY: buttonRect.top + buttonRect.height / 2,
      });
      setTimeout(() => setFlyingItem(null), 1000);
    }
    
    // Callback to parent
    if (onAddToCart) {
      onAddToCart(cartItem);
    }
    
    // Close dialogs
    setSelectedOffer(null);
    setSelectedDish(null);
    setDishOffers([]);
  };

  const handleBackToOfferList = () => {
    setSelectedOffer(null);
  };

  // ===== JSX RENDER =====
  
  return (
    <>
      {/* Dish Selection Dialog */}
      <Dialog 
        open={Boolean(selectedDish && !selectedOffer)} 
        onClose={() => {
          setSelectedDish(null);
          setDishOffers([]);
        }}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: '24px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: COLORS.darkBrown, pt: 3 }}>
          {selectedDish ? (language === 'ar' ? (selectedDish.nameAr || selectedDish.name) : selectedDish.name) : ''}
          <Typography variant="body2" sx={{ color: COLORS.bodyGray, mt: 0.5 }}>
            {language === 'ar' ? 'اختر المطبخ المفضل لديك' : 'Select your preferred kitchen'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          {loadingOffers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: COLORS.primaryOrange }} />
            </Box>
          ) : (
            <List sx={{ pt: 0 }}>
              {dishOffers
                .sort((a, b) => {
                  const aInCart = cart.some(item => item.kitchenId === a.cook?._id);
                  const bInCart = cart.some(item => item.kitchenId === b.cook?._id);
                  if (aInCart && !bInCart) return -1;
                  if (!aInCart && bInCart) return 1;
                  
                  const aRating = a.cook?.rating || 4.5;
                  const bRating = b.cook?.rating || 4.5;
                  if (aRating !== bRating) return bRating - aRating;
                  
                  return a.price - b.price;
                })
                .map((product) => (
                <Box
                  key={product._id}
                  sx={{ 
                    border: '1px solid #EEE',
                    borderRadius: '16px', 
                    mb: 1.5,
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    '&:hover': { bgcolor: '#FAFAFA' }
                  }}
                >
                  <Avatar 
                    src={getAbsoluteUrl(product?.cook?.profilePhoto)} 
                    sx={{ borderRadius: '8px', cursor: 'pointer', flexShrink: 0, width: 56, height: 56 }}
                  />
                  
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      {product.cook?.storeName || product.cook?.name}
                    </Typography>
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      <Rating value={product.cook?.rating || 4.5} readOnly size="small" />
                      <Typography component="span" variant="caption" sx={{ color: COLORS.bodyGray }}>
                        ({language === 'ar' ? '١٢٠+' : '120+'})
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 0.5, flexShrink: 0 }}>
                    <Typography sx={{ fontWeight: 700, color: COLORS.primaryOrange }}>
                      {formatCurrency(product.displayPrice || product.price)}
                    </Typography>
                    <Button 
                      size="small" 
                      variant="contained"
                      onClick={() => handleOfferClick(product)}
                      sx={{ 
                        bgcolor: COLORS.primaryOrange, 
                        borderRadius: '8px',
                        textTransform: 'none',
                        px: 2,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {language === 'ar' ? 'عرض' : 'View'}
                    </Button>
                  </Box>
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>

      {/* Offer Detail Dialog */}
      <Dialog 
        open={Boolean(selectedOffer)} 
        onClose={() => {
          setSelectedOffer(null);
          setSelectedVariant(null);
          setQuantity(1);
        }}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: '24px' } }}
      >
        {selectedOffer && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: '1px solid #EEE' }}>
              <IconButton onClick={handleBackToOfferList} sx={{ mr: 1 }}>
                <ArrowBackIcon sx={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
              </IconButton>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {selectedOffer ? (language === 'ar' ? (selectedOffer.nameAr || selectedOffer.name) : selectedOffer.name) : ''}
              </Typography>
            </Box>
            <DialogContent sx={{ p: 3 }}>
              <Grid container spacing={3}>
                {/* Image Gallery */}
                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      width: '100%',
                      height: '300px',
                      borderRadius: '16px',
                      backgroundImage: `url(${getAbsoluteUrl(selectedMainImage || selectedOffer?.adminDish?.imageUrl) || '/assets/dishes/placeholder.png'})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      mb: 2,
                    }}
                  />
                  {selectedOffer?.images && selectedOffer.images.length > 1 && (
                    <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
                      {selectedOffer.images.map((img, index) => (
                        <Box
                          key={index}
                          onClick={() => setSelectedMainImage(img)}
                          sx={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '8px',
                            backgroundImage: `url(${getAbsoluteUrl(img)})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: selectedMainImage === img ? '3px solid #FF7A00' : '2px solid #DDD',
                            flexShrink: 0,
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Grid>

                {/* Dish Info */}
                <Grid item xs={12} md={6}>
                  {/* Cook/Kitchen Header WITH CONTACT BUTTON */}
                  {selectedOffer.cook && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2, pb: 2, borderBottom: '1px solid #EEE' }}>
                      <Avatar 
                        src={getAbsoluteUrl(selectedOffer.cook?.profilePhoto)} 
                        sx={{ width: 56, height: 56, borderRadius: '8px', flexShrink: 0 }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 600, color: COLORS.darkBrown, mb: 0.5 }}>
                          {selectedOffer.cook?.storeName || selectedOffer.cook?.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Rating 
                            value={selectedOffer.cook?.ratings?.average || 0} 
                            readOnly 
                            size="small" 
                            precision={0.1}
                          />
                          <Typography variant="caption" sx={{ color: COLORS.bodyGray }}>
                            ({selectedOffer.cook?.ratings?.count || 0})
                          </Typography>
                        </Box>
                      </Box>
                      <Typography 
                        sx={{ 
                          color: COLORS.primaryOrange, 
                          textDecoration: 'underline', 
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 500
                        }}
                      >
                        Contact
                      </Typography>
                    </Box>
                  )}

                  {/* Dish Rating */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Rating 
                        value={selectedOffer.dishRatings?.average || 0} 
                        readOnly 
                        precision={0.1}
                        size="small"
                      />
                      <Typography variant="body2" sx={{ color: COLORS.bodyGray }}>
                        ({selectedOffer.dishRatings?.count || 0} {language === 'ar' ? 'تقييم' : 'ratings'})
                      </Typography>
                    </Box>
                  </Box>

                  {/* Description */}
                  {(selectedOffer.description || selectedOffer.descriptionAr) && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ color: COLORS.bodyGray, lineHeight: 1.6 }}>
                        {language === 'ar' 
                          ? (selectedOffer.descriptionAr || selectedOffer.description)
                          : (selectedOffer.description || selectedOffer.descriptionAr)
                        }
                      </Typography>
                    </Box>
                  )}

                  {/* Variant Portion Selector */}
                  {(() => {
                    const offerVariants = selectedOffer.variants?.length > 0 ? selectedOffer.variants : [{ portionKey: selectedOffer.portionSize || 'medium', price: selectedOffer.price, stock: selectedOffer.stock ?? 99 }];
                    const inStock = offerVariants.filter(v => (v.stock ?? 0) > 0);
                    if (inStock.length > 1) {
                      return (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, mb: 1.5 }}>
                            {language === 'ar' ? 'اختر الحجم:' : 'Select Portion:'}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {inStock.map((v) => (
                              <Chip
                                key={v.portionKey}
                                label={`${v.portionKey} - ${formatCurrency(v.price)}`}
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
                          {selectedVariant && (selectedVariant.stock ?? 0) > 0 && (
                            <Typography variant="caption" sx={{ color: COLORS.bodyGray, mt: 1, display: 'block' }}>
                              {language === 'ar' ? `المتبقي: ${selectedVariant.stock}` : `In stock: ${selectedVariant.stock}`}
                            </Typography>
                          )}
                        </Box>
                      );
                    }
                    if (selectedOffer.portionSize) {
                      return (
                        <Typography variant="body2" sx={{ color: COLORS.bodyGray, mb: 1 }}>
                          <strong>{language === 'ar' ? 'الحجم: ' : 'Portion: '}</strong>{selectedOffer.portionSize}
                        </Typography>
                      );
                    }
                    return null;
                  })()}

                  {/* Price */}
                  <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.primaryOrange, mb: 2 }}>
                    {formatCurrency(selectedVariant?.price || selectedOffer.price)}
                  </Typography>

                  {/* Prep Time Display - WITH FALLBACK CHAIN */}
                  {(selectedOffer.prepTimeText || selectedOffer.prepTimeMinutes || selectedOffer.prepTime) && (
                    <Typography variant="body2" sx={{ color: COLORS.bodyGray, mb: 2 }}>
                      {language === 'ar' ? 'الجهز: ' : 'Prep: '}
                      {selectedOffer.prepTimeText 
                        ? selectedOffer.prepTimeText 
                        : `${selectedOffer.prepTimeMinutes || selectedOffer.prepTime}${language === 'ar' ? ' دقيقة' : ' min'}`}
                    </Typography>
                  )}

                  {/* Quantity Selector */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {language === 'ar' ? 'الكمية' : 'Quantity'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button 
                        size="small"
                        variant="outlined"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        sx={{ minWidth: '32px', borderColor: '#FF7A00', color: '#FF7A00', '&:hover': { borderColor: '#E66A00', color: '#E66A00' } }}
                      >
                        -
                      </Button>
                      <Typography sx={{ minWidth: '40px', textAlign: 'center', fontWeight: 600 }}>
                        {quantity}
                      </Typography>
                      <Button 
                        size="small"
                        variant="outlined"
                        onClick={() => setQuantity(quantity + 1)}
                        sx={{ minWidth: '32px', borderColor: '#FF7A00', color: '#FF7A00', '&:hover': { borderColor: '#E66A00', color: '#E66A00' } }}
                      >
                        +
                      </Button>
                    </Box>
                  </Box>

                  {/* Fulfillment Selection */}
                  {(() => {
                    const hasDelivery = selectedOffer.fulfillmentOptions?.includes('delivery');
                    const hasPickup = selectedOffer.fulfillmentOptions?.includes('pickup');
                    const hasBothOptions = hasDelivery && hasPickup;
                    
                    if (hasBothOptions) {
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {language === 'ar' ? 'طريقة الاستلام' : 'Fulfillment'}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
                            <Chip
                              label={language === 'ar' ? 'توصيل' : 'Delivery'}
                              onClick={() => { setSelectedFulfillment('delivery'); setFulfillmentError(false); }}
                              sx={{
                                flex: 1,
                                bgcolor: selectedFulfillment === 'delivery' ? COLORS.primaryOrange : '#F5F5F5',
                                color: selectedFulfillment === 'delivery' ? 'white' : COLORS.bodyGray,
                                fontWeight: selectedFulfillment === 'delivery' ? 600 : 400,
                                cursor: 'pointer',
                              }}
                            />
                            <Chip
                              label={language === 'ar' ? 'استلام' : 'Pickup'}
                              onClick={() => { setSelectedFulfillment('pickup'); setFulfillmentError(false); }}
                              sx={{
                                flex: 1,
                                bgcolor: selectedFulfillment === 'pickup' ? COLORS.primaryOrange : '#F5F5F5',
                                color: selectedFulfillment === 'pickup' ? 'white' : COLORS.bodyGray,
                                fontWeight: selectedFulfillment === 'pickup' ? 600 : 400,
                                cursor: 'pointer',
                              }}
                            />
                          </Box>
                          {fulfillmentError && (
                            <Typography variant="caption" sx={{ color: 'error.main' }}>
                              {language === 'ar' ? 'الرجاء اختيار' : 'Required'}
                            </Typography>
                          )}
                        </Box>
                      );
                    }
                    return null;
                  })()}

                  <Divider sx={{ my: 2 }} />

                  {/* Add to Cart Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={(e) => handleAddToCart(selectedOffer, e)}
                    sx={{
                      bgcolor: '#595757',
                      color: COLORS.white,
                      py: 1.5,
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 600,
                      textTransform: 'none',
                      mb: 1.5,
                      '&:hover': { bgcolor: '#484646' }
                    }}
                  >
                    {language === 'ar' ? 'إضافة إلى السلة' : 'Add to Cart'}
                  </Button>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Flying Cart Animation */}
      {flyingItem && (
        <Box
          sx={{
            position: 'fixed',
            left: flyingItem.startX,
            top: flyingItem.startY,
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundImage: `url(${flyingItem.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 9999,
            pointerEvents: 'none',
            animation: 'flyToCart 1s ease-in-out forwards',
            '@keyframes flyToCart': {
              '0%': {
                transform: 'translate(0, 0) scale(1)',
                opacity: 1,
              },
              '100%': {
                transform: `translate(${(isRTL ? -1 : 1) * (window.innerWidth - flyingItem.startX - 30)}px, ${-flyingItem.startY}px) scale(0.2)`,
                opacity: 0,
              },
            },
          }}
        />
      )}
    </>
  );
});

MenuDishModalHost.displayName = 'MenuDishModalHost';

export default MenuDishModalHost;
