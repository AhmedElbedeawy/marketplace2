import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Container, Button, IconButton, Grid, CircularProgress } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCountry } from '../../contexts/CountryContext';
import { formatCurrency as localeFormatCurrency } from '../../utils/localeFormatter';
import api from '../../utils/api';

const FeaturedDishes = () => {
  const { language, isRTL } = useLanguage();
  const { countryCode, currencyCode } = useCountry();
  const navigate = useNavigate();
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);

  // DESIGN TOKENS
  const COLORS = { primaryOrange: '#FF7A00', darkBrown: '#2B1E16', bodyGray: '#6B6B6B', white: '#FFFFFF' };

  useEffect(() => {
    const fetchDishes = async () => {
      try {
        setLoading(true);
        const response = await api.get('/products/popular?limit=20');
        if (Array.isArray(response.data)) {
          setDishes(response.data);
        }
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
                  onClick={() => navigate(`/foodie/offer/${item._id}`)}
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
                        {formatCurrency(item.price)}
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
    </Box>
  );
};

export default FeaturedDishes;
