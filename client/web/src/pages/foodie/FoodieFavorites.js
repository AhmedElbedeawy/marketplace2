import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Avatar,
  Rating,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Button,
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  Restaurant as RestaurantIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../utils/localeFormatter';

const FoodieFavorites = () => {
  const { language, isRTL } = useLanguage();
  const [currentTab, setCurrentTab] = useState(0);
  const [favorites, setFavorites] = useState(new Set([1, 2, 3, 101, 102]));

  const favoriteDishes = [
    {
      id: 1,
      image: '/assets/dishes/d1.png',
      title: language === 'ar' ? 'كشري مصري' : 'Egyptian Koshari',
      cookName: language === 'ar' ? 'الشيف فاطمة' : 'Chef Fatima',
      price: 35.00,
      rating: 4.8,
      reviews: 124,
    },
    {
      id: 2,
      image: '/assets/dishes/d2.png',
      title: language === 'ar' ? 'محشي كرنب' : 'Stuffed Cabbage',
      cookName: language === 'ar' ? 'أم أحمد' : 'Um Ahmed',
      price: 45.00,
      rating: 4.9,
      reviews: 89,
    },
    {
      id: 3,
      image: '/assets/dishes/d3.png',
      title: language === 'ar' ? 'دجاج مشوي' : 'Grilled Chicken',
      cookName: language === 'ar' ? 'الشيف سارة' : 'Chef Sara',
      price: 55.00,
      rating: 4.7,
      reviews: 156,
    },
  ];

  const favoriteCooks = [
    {
      id: 101,
      name: language === 'ar' ? 'الشيف فاطمة' : 'Chef Fatima',
      photo: '/assets/cooks/K1.png',
      rating: 4.9,
      dishes: 28,
      specialty: language === 'ar' ? 'مصري تقليدي' : 'Traditional Egyptian',
    },
    {
      id: 102,
      name: language === 'ar' ? 'أم أحمد' : 'Um Ahmed',
      photo: '/assets/cooks/K2.png',
      rating: 4.8,
      dishes: 15,
      specialty: language === 'ar' ? 'محاشي ومقبلات' : 'Stuffed & Appetizers',
    },
  ];

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: '#FAF5F3',
      px: '52px',
      py: 3,
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      {/* Page Title */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            color: '#1E293B',
            mb: 0.5,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {language === 'ar' ? 'المفضلة' : 'Favorites'}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#6B7280',
            fontSize: '14px',
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {language === 'ar' 
            ? 'أطباقك وطهاتك المفضلين ❤️'
            : 'Your favorite dishes and cooks ❤️'}
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              '&.Mui-selected': {
                color: '#FF7A00',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#FF7A00',
            },
          }}
        >
          <Tab label={language === 'ar' ? 'أطباق مفضلة' : 'Favorite Dishes'} />
          <Tab label={language === 'ar' ? 'طهاة مفضلون' : 'Favorite Cooks'} />
        </Tabs>
      </Box>

      {/* Favorite Dishes Tab */}
      {currentTab === 0 && (
        <Grid container spacing={3}>
          {favoriteDishes.filter(dish => favorites.has(dish.id)).map((dish) => (
            <Grid item xs={12} sm={6} md={4} key={dish.id}>
              <Card
                sx={{
                  borderRadius: '12px',
                  overflow: 'visible',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
                  },
                }}
              >
                <Box sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={dish.image}
                    alt={dish.title}
                  />
                  <IconButton
                    onClick={() => toggleFavorite(dish.id)}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: isRTL ? 'auto' : 8,
                      left: isRTL ? 8 : 'auto',
                      bgcolor: 'white',
                      '&:hover': { bgcolor: '#FFF5F0' },
                    }}
                  >
                    <FavoriteIcon sx={{ color: '#FF7A00' }} />
                  </IconButton>
                </Box>
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: '#2C2C2C',
                      mb: 0.5,
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  >
                    {dish.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#6B7280',
                      mb: 1,
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  >
                    {language === 'ar' ? 'بواسطة' : 'by'} {dish.cookName}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 2,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    }}
                  >
                    <Rating value={dish.rating} precision={0.1} size="small" readOnly />
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                      ({dish.reviews})
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: '#FF7A00',
                      }}
                    >
                      {formatCurrency(dish.price, language)}
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<CartIcon />}
                      sx={{
                        bgcolor: '#FF7A00',
                        '&:hover': { bgcolor: '#FF9933' },
                      }}
                    >
                      {language === 'ar' ? 'أضف' : 'Add'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Favorite Cooks Tab */}
      {currentTab === 1 && (
        <Grid container spacing={3}>
          {favoriteCooks.filter(cook => favorites.has(cook.id)).map((cook) => (
            <Grid item xs={12} sm={6} md={3} key={cook.id}>
              <Card
                sx={{
                  textAlign: 'center',
                  p: 3,
                  borderRadius: '12px',
                  overflow: 'visible',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(255, 122, 0, 0.2)',
                  },
                }}
              >
                <IconButton
                  onClick={() => toggleFavorite(cook.id)}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: isRTL ? 'auto' : 8,
                    left: isRTL ? 8 : 'auto',
                  }}
                >
                  <FavoriteIcon sx={{ color: '#FF7A00' }} />
                </IconButton>
                
                <Avatar
                  src={cook.photo}
                  sx={{
                    width: 100,
                    height: 100,
                    margin: '0 auto 16px',
                    border: '3px solid #FF7A00',
                  }}
                >
                  <RestaurantIcon sx={{ fontSize: 50 }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C2C2C', mb: 1 }}>
                  {cook.name}
                </Typography>
                <Chip
                  label={cook.specialty}
                  size="small"
                  sx={{
                    bgcolor: '#FFF5F0',
                    color: '#FF7A00',
                    fontWeight: 600,
                    mb: 1,
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                  <Rating value={cook.rating} precision={0.1} size="small" readOnly />
                </Box>
                <Typography variant="body2" sx={{ color: '#6B7280', mb: 2 }}>
                  {cook.dishes} {language === 'ar' ? 'طبق' : 'Dishes'}
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#FF7A00',
                    color: '#FF7A00',
                    '&:hover': {
                      borderColor: '#FF9933',
                      bgcolor: '#FFF5F0',
                    },
                  }}
                >
                  {language === 'ar' ? 'عرض القائمة' : 'View Menu'}
                </Button>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default FoodieFavorites;
