import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Container, Button, IconButton, CircularProgress } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCountry } from '../../contexts/CountryContext';
import { TopRatedCooksGrid } from '../../components/TopRatedCookCard';
import api from '../../utils/api';

const TopRatedCooks = () => {
  const { language, isRTL } = useLanguage();
  const { countryCode } = useCountry();
  const navigate = useNavigate();
  const [cooks, setCooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // DESIGN TOKENS
  const COLORS = { primaryOrange: '#FF7A00', darkBrown: '#2B1E16', bodyGray: '#6B6B6B' };

  useEffect(() => {
    const fetchCooks = async () => {
      try {
        setLoading(true);
        const response = await api.get('/cooks/top-rated?limit=20');
        if (response.data.success) {
          setCooks(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching top cooks:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCooks();
  }, [countryCode]);

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
              {language === 'ar' ? 'الطهاة الأعلى تقييماً' : 'Top-rated Cooks'}
            </Typography>
            <Typography sx={{ fontSize: isRTL ? '20px' : '16px', color: COLORS.bodyGray }}>
              {language === 'ar' ? 'الأعلى في معدلات إعادة الطلب' : 'Highest Repeat Order Rate'}
            </Typography>
          </Box>
        </Box>

        {/* Cooks Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: COLORS.primaryOrange }} />
          </Box>
        ) : (
          <TopRatedCooksGrid 
            cooks={cooks} 
            onCookClick={(id) => navigate(`/foodie/kitchen/${id}`)}
            onRateCook={(id, data) => console.log('Rate cook', id, data)}
            cardWidth="200px"
            cardHeight="238px" // Maintaining 84% ratio (200 / 0.84 = 238)
          />
        )}
      </Container>
    </Box>
  );
};

export default TopRatedCooks;
