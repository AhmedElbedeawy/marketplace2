import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Container, Button, IconButton, Grid, CircularProgress, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemAvatar, Avatar, ListItemText, Rating } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCountry } from '../../contexts/CountryContext';
import { formatCurrency as localeFormatCurrency } from '../../utils/localeFormatter';
import api, { getAbsoluteUrl } from '../../utils/api';

const FeaturedDishes = () => {
  const { language, isRTL } = useLanguage();
  const { countryCode, currencyCode } = useCountry();
  const navigate = useNavigate();
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Popup state - same as FoodieHome
  const [selectedDish, setSelectedDish] = useState(null);
  const [dishOffers, setDishOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  // DESIGN TOKENS
  const COLORS = { primaryOrange: '#FF7A00', darkBrown: '#2B1E16', bodyGray: '#6B6B6B', white: '#FFFFFF' };

  useEffect(() => {
    const fetchDishes = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/public/admin-dishes/with-stats?country=${countryCode}&limit=10&sort=popular`);
        const dishes = response.data?.dishes || (Array.isArray(response.data) ? response.data : []);
        const popularDishes = dishes.filter(d => d.isPopular === true);
        const dishesToShow = popularDishes.length > 0 ? popularDishes : dishes;
        setDishes(dishesToShow);
      } catch (error) {
        console.error('Error fetching featured dishes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDishes();
  }, [countryCode]);

  const formatCurrency = (amount) => {
    return localeFormatCurrency(amount, language, currencyCode);
  };

  // Handle dish click - open popup with offers (same as FoodieHome)
  const handleDishClick = async (dish) => {
    console.log('[FEATURED_CLICK] card clicked', { dishId: dish._id, source: 'featured' });
    console.log('[FEATURED_CLICK] about to OPEN OFFERS MODAL');
    console.log('[OFFERS_MODAL] open', { dishId: dish._id, source: 'featured' });
    // Store the AdminDish for display
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
    setDishOffers([]);
    
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

  // Handle offer selection - navigate to Menu to reuse Menu's offer dialog
  const handleOfferClick = (offer) => {
    console.log('[FEATURED] navigating to Menu with state');
    setSelectedDish(null);
    setDishOffers([]);
    navigate('/foodie/menu', { 
      state: { 
        viewMode: 'dish',
        selectedDishId: selectedDish._id,
        selectedOfferId: offer._id,
        selectedKitchenId: offer.cook?._id
      }
    });
  };

  // Handle kitchen click - go to Menu filtered by kitchen
  const handleKitchenClick = (kitchenId) => {
    navigate('/foodie/menu', { state: { viewMode: 'kitchen', selectedKitchenId: kitchenId } });
    setSelectedDish(null);
  };

  return (
    <Box sx={{ direction: isRTL ? 'rtl' : 'ltr', minHeight: '100vh', bgcolor: '#FFFFFF', pt: 4, pb: 8 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: COLORS.darkBrown }}>
            <ArrowBackIcon sx={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          </IconButton>
          <Box>
            <Typography sx={{ fontFamily: 'Inter', fontSize: isRTL ? '32px' : '28px', fontWeight: 700, color: COLORS.darkBrown }}>
              {language === 'ar' ? 'الأطباق المميزة' : 'Featured Dishes'}
            </Typography>
            <Typography sx={{ fontSize: isRTL ? '20px' : '16px', color: COLORS.bodyGray }}>
              {language === 'ar' ? 'أطباق اختارناها بعناية بناءً على ترشيحات المستخدمين' : 'Carefully selected based on user recommendations'}
            </Typography>
          </Box>
        </Box>

        {/* Dishes Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: COLORS.primaryOrange }} />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {dishes.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item._id}>
                <Box 
                  onClick={() => { console.log('[FEATURED_CLICK] card clicked', { dishId: item._id, source: 'featured' }); console.log('[FEATURED_CLICK] about to OPEN OFFERS MODAL'); handleDishClick(item); }}
                  sx={{ 
                    width: '100%', 
                    height: '240px', 
                    bgcolor: '#FAF6F5', 
                    borderRadius: '28px', 
                    overflow: 'hidden', 
                    boxShadow: 'none', 
                    border: '1px solid #E8E2DF',
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'transform 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': { transform: 'translateY(-8px)' }
                  }}
                >
                  <Box sx={{ 
                    width: '100%', 
                    height: '140px', 
                    bgcolor: '#E8DACC', 
                    backgroundImage: `url(${item.photoUrl || `/assets/dishes/${item.img || 'placeholder.png'}`})`, 
                    backgroundSize: 'cover', 
                    backgroundRepeat: 'no-repeat', 
                    backgroundPosition: 'center', 
                    flexShrink: 0 
                  }} />
                  <Box sx={{ flex: 1, p: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ fontSize: isRTL ? '20px' : '18px', fontWeight: 700, color: COLORS.darkBrown, lineHeight: '1.2', textAlign: 'center', mb: '2px' }}>
                        {language === 'ar' ? item.nameAr || item.name : item.name}
                      </Typography>
                      <Typography sx={{ fontSize: isRTL ? '18px' : '15px', color: COLORS.bodyGray, lineHeight: '1.2', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {language === 'ar' ? item.descriptionAr || item.description : item.description}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '14px', fontWeight: 700, color: COLORS.darkBrown }}>
                        From {formatCurrency(item.lowestOfferPrice || item.minPrice || item.price || item.basePrice || item.offerPrice || 0)}
                      </Typography>
                      <Button sx={{ background: COLORS.primaryOrange, color: COLORS.white, padding: '6px 16px', fontSize: '12px', fontWeight: 600, textTransform: 'none', borderRadius: '8px', '&:hover': { background: '#E66A00' } }}>
                        {language === 'ar' ? 'اضف' : 'Add'}
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Dish Selection Dialog - shows cook offers */}
      <Dialog 
        open={Boolean(selectedDish)}
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
          ) : dishOffers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ color: COLORS.bodyGray }}>
                {language === 'ar' ? 'لا توجد عروض متاحة' : 'No offers available'}
              </Typography>
            </Box>
          ) : (
            <List sx={{ pt: 0 }}>
              {dishOffers.map((offer) => (
                <ListItem 
                  key={offer._id}
                  sx={{ 
                    border: '1px solid #EEE', 
                    borderRadius: '16px', 
                    mb: 1.5,
                    '&:hover': { bgcolor: '#FAFAFA' },
                    gap: '14px',
                  }}
                >
                  <ListItemAvatar onClick={() => handleKitchenClick(offer.cook?._id || offer.cook)} sx={{ cursor: 'pointer' }}>
                    <Avatar src={getAbsoluteUrl(offer.cook?.profilePhoto)} sx={{ borderRadius: '8px' }} />
                  </ListItemAvatar>
                  <ListItemText 
                    primary={
                      <Typography 
                        sx={{ 
                          fontWeight: 600, 
                          cursor: 'pointer',
                          '&:hover': { color: COLORS.primaryOrange, textDecoration: 'underline' }
                        }}
                        onClick={() => handleKitchenClick(offer.cook?._id || offer.cook)}
                      >
                        {offer.cook?.storeName || offer.cook?.name}
                      </Typography>
                    }
                    secondary={
                      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Rating value={offer.cook?.rating || 4.5} readOnly size="small" />
                        <Typography component="span" variant="caption" sx={{ color: COLORS.bodyGray }}>
                          (120+)
                        </Typography>
                      </Box>
                    }
                  />
                  <Box sx={{ textAlign: isRTL ? 'left' : 'right' }}>
                    <Typography sx={{ fontWeight: 700, color: COLORS.primaryOrange, mb: 1 }}>
                      {formatCurrency(offer.price || offer.displayPrice || 0)}
                    </Typography>
                    <Button 
                      size="small" 
                      variant="contained"
                      onClick={(e) => { e.stopPropagation(); console.log('VIEW BUTTON CLICKED'); handleOfferClick(offer); }}
                      sx={{ 
                        bgcolor: COLORS.primaryOrange, 
                        borderRadius: '8px',
                        textTransform: 'none',
                        px: 2
                      }}
                    >
                      {language === 'ar' ? 'عرض' : 'View'}
                    </Button>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FeaturedDishes;
