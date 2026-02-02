import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Link,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  ArrowForward as ArrowForwardIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCurrency, formatNumber } from '../utils/localeFormatter';
import { Alert } from '@mui/material';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, isRTL } = useLanguage();
  const [salesPeriod, setSalesPeriod] = useState('last7');
  
  const isDemoMode = location.state?.isDemoMode || false;
  
  // Helper function to format Arabic thousands
  const formatArabicThousands = (value) => {
    if (language !== 'ar') {
      // English: use K notation
      return value >= 1000 ? (value / 1000).toFixed(0) + 'K' : value;
    }
    
    // Arabic: use Arabic words for thousands
    if (value < 1000) {
      return new Intl.NumberFormat('ar-EG').format(value);
    }
    
    const thousands = Math.round(value / 1000);
    const arabicNumber = new Intl.NumberFormat('ar-EG').format(thousands);
    
    if (thousands === 1) return '٢ ألف'; // ٢ ألف
    if (thousands === 2) return '٢ ألف'; // ٢ ألف
    if (thousands >= 3 && thousands <= 10) return `${arabicNumber} آلاف`; // آلاف
    return `${arabicNumber} ألفًا`; // ألفًا
  };
  
  // Sample data for Main Sales Graph
  const sampleSalesData = {
    today: [
      { date: "9AM", sales: 120 },
      { date: "10AM", sales: 340 },
      { date: "11AM", sales: 290 },
      { date: "12PM", sales: 410 },
      { date: "1PM", sales: 180 },
      { date: "2PM", sales: 370 },
      { date: "3PM", sales: 520 },
      { date: "4PM", sales: 450 },
      { date: "5PM", sales: 680 },
      { date: "6PM", sales: 920 }
    ],
    last7: [
      { date: "Oct 24", sales: 1200 },
      { date: "Oct 25", sales: 3400 },
      { date: "Oct 26", sales: 2900 },
      { date: "Oct 27", sales: 4100 },
      { date: "Oct 28", sales: 1800 },
      { date: "Oct 29", sales: 3700 },
      { date: "Oct 30", sales: 5200 }
    ],
    last30: [
      { date: "Week 1", sales: 12000 },
      { date: "Week 2", sales: 18000 },
      { date: "Week 3", sales: 15000 },
      { date: "Week 4", sales: 22000 }
    ],
    last90: [
      { date: "Aug", sales: 45000 },
      { date: "Sep", sales: 58000 },
      { date: "Oct", sales: 67000 }
    ]
  };

  // Category name translations
  const getCategoryName = (englishName) => {
    const categoryMap = {
      'Traditional Egyptian Dishes': language === 'ar' ? 'أكلات مصرية أصيلة' : 'Traditional Egyptian Dishes',
      'Grilled': language === 'ar' ? 'مشويات' : 'Grilled',
      'Fried': language === 'ar' ? 'مقليات' : 'Fried',
      'Casseroles': language === 'ar' ? 'طواجن' : 'Casseroles',
      'Oven Dishes': language === 'ar' ? 'أكلات بالفرن' : 'Oven Dishes',
      'Rice': language === 'ar' ? 'أرز' : 'Rice',
      'Pasta': language === 'ar' ? 'مكرونة' : 'Pasta',
      'Salads': language === 'ar' ? 'سلطات' : 'Salads',
      'Appetizers': language === 'ar' ? 'مقبلات' : 'Appetizers',
      'Smoked Herring & Fermented Salted Mullet': language === 'ar' ? 'رنجة و فسيخ' : 'Smoked Herring & Fermented Salted Mullet',
      'Bread & Pastries': language === 'ar' ? 'مخبوزات ومعجنات' : 'Bread & Pastries',
      'Desserts': language === 'ar' ? 'حلويات' : 'Desserts',
      'Drinks & Juices': language === 'ar' ? 'مشروبات وعصائر' : 'Drinks & Juices',
      'Baked': language === 'ar' ? 'أكلات بالفرن' : 'Baked',
    };
    return categoryMap[englishName] || englishName;
  };

  // Sample data for Category Sales Graph
  const sampleCategoryData = [
    { category: getCategoryName('Grilled'), sales: 3200 },
    { category: getCategoryName('Fried'), sales: 2800 },
    { category: getCategoryName('Oven Dishes'), sales: 1500 },
    { category: getCategoryName('Salads'), sales: 2000 },
    { category: getCategoryName('Desserts'), sales: 1000 }
  ];
  
  // State for graphs
  const [salesData, setSalesData] = useState(sampleSalesData.last7);
  const [categoryData, setCategoryData] = useState(sampleCategoryData);
  
  // Update sales data when period changes
  const handlePeriodChange = (event, newPeriod) => {
    setSalesPeriod(newPeriod);
    setSalesData(sampleSalesData[newPeriod]);
  };
  
  // Calculate total sales
  const getTotalSales = () => {
    return salesData.reduce((sum, item) => sum + item.sales, 0);
  };
  
  const getPeriodLabel = () => {
    switch (salesPeriod) {
      case 'today': return t('today');
      case 'last7': return t('last7Days');
      case 'last30': return t('last30Days');
      case 'last90': return t('last90Days');
      default: return t('last7Days');
    }
  };

  // Order stats
  const orderStats = {
    allOrders: 1247,
    dispatched: 856,
    awaitingPickup: 142,
    inKitchen: 98,
    cancellations: 151,
  };
  
  // Active Menu stats with bilingual data
  const getActiveMenuStats = () => {
    if (language === 'ar') {
      return {
        allListings: 45,
        byCategory: [
          { name: 'أكلات مصرية أصيلة — كشري، محشي ورق عنب، ملوخية', count: 18, price: 120 },
          { name: 'مشويات — كباب، كفتة، شيش طاووق', count: 12, price: 150 },
          { name: 'طواجن — طاجن بامية، طاجن سي فود', count: 8, price: 95 },
          { name: 'مقليات — سمك مقلي، بطاطس مقلية', count: 7, price: 80 },
          { name: 'سلطات — تبولة، سلطة بلدي', count: 6, price: 45 },
          { name: 'حلويات — بسبوسة، كنافة، أم علي', count: 10, price: 65 },
          { name: 'مشروبات وعصائر — عصير مانجو، سوبيا، تمر هندي', count: 5, price: 25 },
        ],
      };
    } else {
      return {
        allListings: 45,
        byCategory: [
          { name: 'Traditional Egyptian — Koshari, Stuffed Grape Leaves, Molokhia', count: 18, price: 120 },
          { name: 'Grilled — Kebab, Kofta, Shish Tawook', count: 12, price: 150 },
          { name: 'Casseroles — Okra Casserole, Seafood Casserole', count: 8, price: 95 },
          { name: 'Fried — Fried Fish, French Fries', count: 7, price: 80 },
          { name: 'Salads — Tabbouleh, Traditional Salad', count: 6, price: 45 },
          { name: 'Desserts — Basbousa, Kunafa, Om Ali', count: 10, price: 65 },
          { name: 'Drinks & Juices — Mango Juice, Sobia, Tamarind', count: 5, price: 25 },
        ],
      };
    }
  };

  const listingStats = getActiveMenuStats();

  const trafficStats = {
    impressions: 24678,
    ctr: 1.6,
    storeViews: 2246,
  };

  return (
    <Box sx={{ 
      flexGrow: 1, 
      bgcolor: '#FAF5F3', 
      minHeight: '100vh',
      px: '52px',
      py: 3,
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      {/* Performance Overview title and subtitle removed */}
      {/* Dashboard content starts directly with Sales KPIs */}

      <Box sx={{ 
        width: '100%', 
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        {/* Top Section: Sales and Sales by Category (Equal Height) */}
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: 2,
          minHeight: '400px',
        }}>
          {/* Main Sales Graph */}
          <Card sx={{ 
            height: '100%',
            borderRadius: '12px',
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
            bgcolor: '#FFFFFF',
            border: 'none',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.1)',
            },
          }}>
            <CardContent sx={{ p: 2.5, pb: '20px !important', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1E1E1E', fontSize: '1.2rem' }}>
                  {t('sales')}
                </Typography>
                <Tabs 
                  value={salesPeriod} 
                  onChange={handlePeriodChange} 
                  sx={{ 
                    minHeight: 36,
                    '& .MuiTab-root': {
                      color: '#666666',
                      '&.Mui-selected': {
                        color: '#FF7A00',
                      },
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#FF7A00',
                    },
                  }}
                >
                  <Tab label={t('today')} value="today" sx={{ minWidth: 70, minHeight: 36, py: 0.5, fontSize: '0.85rem' }} />
                  <Tab label={t('last7Days')} value="last7" sx={{ minWidth: 70, minHeight: 36, py: 0.5, fontSize: '0.85rem' }} />
                  <Tab label={t('last30Days')} value="last30" sx={{ minWidth: 70, minHeight: 36, py: 0.5, fontSize: '0.85rem' }} />
                  <Tab label={t('last90Days')} value="last90" sx={{ minWidth: 70, minHeight: 36, py: 0.5, fontSize: '0.85rem' }} />
                </Tabs>
              </Box>
              <Box sx={{ mb: 1.5, textAlign: isRTL ? 'right' : 'left' }}>
                <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.9rem', color: '#3E3E3E' }}>
                  {getPeriodLabel()}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: '2rem', color: '#FF7A00' }}>
                  {formatCurrency(getTotalSales(), language)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={isRTL ? [...salesData].reverse() : salesData} 
                    margin={{ top: 10, right: isRTL ? 10 : 30, left: isRTL ? 30 : 10, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E5DEDD" stopOpacity={1} />
                        <stop offset="100%" stopColor="#E5DEDD" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="salesGradientHover" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFB973" stopOpacity={1} />
                        <stop offset="100%" stopColor="#FF7A00" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" strokeOpacity={1} />
                    <XAxis 
                      dataKey="date"
                      tick={{ fontSize: 12, fill: '#3E3E3E' }}
                      stroke="#F0F0F0"
                      strokeWidth={1}
                      reversed={isRTL}
                    />
                    <YAxis 
                      orientation={isRTL ? 'right' : 'left'}
                      tick={{ 
                        fontSize: 12, 
                        fill: '#3E3E3E',
                        dx: isRTL ? 10 : -10,
                      }}
                      stroke="#F0F0F0"
                      strokeWidth={1}
                      width={80}
                      tickFormatter={(value) => {
                        const formattedNumber = formatArabicThousands(value);
                        return language === 'ar' ? `${formattedNumber} ﷼` : `${formattedNumber}`;
                      }}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value, language), t('sales')]}
                      contentStyle={{ 
                        fontSize: '0.9rem', 
                        borderRadius: '8px', 
                        border: '1px solid #FF7A00',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        direction: isRTL ? 'rtl' : 'ltr'
                      }}
                    />
                    <Bar 
                      dataKey="sales" 
                      fill="url(#salesGradient)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={50}
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>

          {/* Sales by Category Graph */}
          <Card sx={{ 
            height: '100%',
            borderRadius: '12px',
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
            bgcolor: '#FFFFFF',
            border: 'none',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.1)',
            },
          }}>
            <CardContent sx={{ p: 2.5, pb: '20px !important', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1E1E1E', fontSize: '1.1rem', mb: 1, textAlign: isRTL ? 'right' : 'left' }}>
                {language === 'ar' ? 'المبيعات طبقاً للفئة' : t('salesByCategory')}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.85rem', mb: 1.5, textAlign: isRTL ? 'right' : 'left', color: '#3E3E3E' }}>
                {t('last30Days')}
              </Typography>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={isRTL ? [...categoryData].reverse() : categoryData} 
                    layout="vertical" 
                    margin={{ top: 5, right: isRTL ? 10 : 30, left: isRTL ? 30 : 10, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient id="categoryGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#E5DEDD" stopOpacity={1} />
                        <stop offset="100%" stopColor="#E5DEDD" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" strokeOpacity={1} />
                    <XAxis 
                      type="number" 
                      tick={{ fontSize: 11, fill: '#3E3E3E' }}
                      stroke="#F0F0F0"
                      strokeWidth={1}
                      reversed={isRTL}
                      tickFormatter={(value) => {
                        const formattedNumber = formatArabicThousands(value);
                        return language === 'ar' ? `${formattedNumber}` : `${formattedNumber}`;
                      }}
                    />
                    <YAxis 
                      dataKey="category" 
                      type="category" 
                      orientation={isRTL ? 'right' : 'left'}
                      width={100} 
                      tick={{ 
                        fontSize: 10, 
                        fill: '#3E3E3E', 
                        textAnchor: isRTL ? 'start' : 'end',
                        dx: isRTL ? 10 : -5
                      }} 
                      stroke="#F0F0F0"
                      strokeWidth={1}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value, language), t('sales')]}
                      contentStyle={{ 
                        fontSize: '0.85rem', 
                        borderRadius: '8px',
                        border: '1px solid #FF7A00',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        direction: isRTL ? 'rtl' : 'ltr'
                      }}
                    />
                    <Bar 
                      dataKey="sales" 
                      fill="url(#categoryGradient)"
                      radius={isRTL ? [4, 0, 0, 4] : [0, 4, 4, 0]}
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Bottom Row: 3 Summary Cards (Orders, Active Menu, Traffic) */}
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}>
          {/* Column 1: Orders Summary */}
          <Card sx={{ 
            borderRadius: '12px',
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
            bgcolor: '#FFFFFF',
            border: 'none',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.1)',
            },
          }}>
            <CardContent sx={{ p: 2.5, pb: '20px !important' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1E1E1E', fontSize: '1.1rem' }}>
                  {t('orders')}
                </Typography>
                <Link 
                  component="button" 
                  variant="body2" 
                  onClick={() => navigate('/orders')}
                  sx={{ textDecoration: 'none', color: '#FF7A00', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  {t('seeAll')}
                  <ArrowForwardIcon sx={{ fontSize: 14, ml: isRTL ? 0 : 0.5, mr: isRTL ? 0.5 : 0, verticalAlign: 'middle', transform: isRTL ? 'scaleX(-1)' : 'none' }} />
                </Link>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.9rem', color: '#3E3E3E' }}>{t('allOrders')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#FF7A00', fontSize: '1rem' }}>
                    {formatNumber(orderStats.allOrders, language)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 0.2, bgcolor: '#E0E0E0' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.85rem', color: '#3E3E3E' }}>{t('dispatched')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#757575', fontSize: '0.85rem' }}>
                    {formatNumber(orderStats.dispatched, language)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.85rem', color: '#3E3E3E' }}>{t('awaitingPickup')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#FF7A00', fontSize: '0.85rem' }}>
                    {formatNumber(orderStats.awaitingPickup, language)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.85rem', color: '#3E3E3E' }}>{t('inKitchen')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#FF7A00', fontSize: '0.85rem' }}>
                    {formatNumber(orderStats.inKitchen, language)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.85rem', color: '#3E3E3E' }}>{t('cancellations')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#757575', fontSize: '0.85rem' }}>
                    {formatNumber(orderStats.cancellations, language)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Column 2: Active Menu Summary */}
          <Card sx={{ 
            borderRadius: '12px',
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
            bgcolor: '#FFFFFF',
            border: 'none',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.1)',
            },
          }}>
            <CardContent sx={{ p: 2.5, pb: '20px !important' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1E1E1E', fontSize: '1.1rem' }}>
                  {t('activeListings')}
                </Typography>
                <Link 
                  component="button" 
                  variant="body2" 
                  onClick={() => navigate('/menu')}
                  sx={{ textDecoration: 'none', color: '#FF7A00', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  {t('seeAll')}
                  <ArrowForwardIcon sx={{ fontSize: 14, ml: isRTL ? 0 : 0.5, mr: isRTL ? 0.5 : 0, verticalAlign: 'middle', transform: isRTL ? 'scaleX(-1)' : 'none' }} />
                </Link>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.9rem', color: '#3E3E3E' }}>{t('allListings')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#FF7A00', fontSize: '1rem' }}>
                    {formatNumber(listingStats.allListings, language)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 0.2, bgcolor: '#E0E0E0' }} />
                {listingStats.byCategory.slice(0, 3).map((cat, index) => (
                  <Box key={index} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem', textAlign: isRTL ? 'right' : 'left', lineHeight: 1.4, color: '#3E3E3E' }}>
                      {cat.name}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#757575', fontSize: '0.8rem' }}>
                        {formatNumber(cat.count, language)} {language === 'ar' ? 'طبق' : 'items'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#FF7A00', fontSize: '0.8rem' }}>
                        {formatCurrency(cat.price, language)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Column 3: Traffic Summary */}
          <Card sx={{ 
            borderRadius: '12px',
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
            bgcolor: '#FFFFFF',
            border: 'none',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.1)',
            },
          }}>
            <CardContent sx={{ p: 2.5, pb: '20px !important' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1E1E1E', mb: 1.5, fontSize: '1.1rem', textAlign: isRTL ? 'right' : 'left' }}>
                {t('traffic')}
                <ArrowForwardIcon sx={{ fontSize: 16, ml: isRTL ? 0 : 0.5, mr: isRTL ? 0.5 : 0, verticalAlign: 'middle', transform: isRTL ? 'scaleX(-1)' : 'none' }} />
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2, fontSize: '0.8rem', textAlign: isRTL ? 'right' : 'left', color: '#3E3E3E' }}>
                {t('comparedToPrior30Days')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.85rem', color: '#3E3E3E' }}>{t('listingImpressions')}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#1E1E1E' }}>
                      {formatNumber(trafficStats.impressions, language)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#2e7d32', fontSize: '0.8rem' }}>
                      <TrendingUpIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} /> 3.1%
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.85rem', color: '#3E3E3E' }}>{t('clickThroughRate')}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#1E1E1E' }}>
                      {trafficStats.ctr}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#2e7d32', fontSize: '0.8rem' }}>
                      <TrendingUpIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} /> 0.1%
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.85rem', color: '#3E3E3E' }}>
                    <VisibilityIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: isRTL ? 0 : 0.5, ml: isRTL ? 0.5 : 0 }} />
                    {t('storeViews')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#1E1E1E' }}>
                      {formatNumber(trafficStats.storeViews, language)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#2e7d32', fontSize: '0.8rem' }}>
                      <TrendingUpIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} /> 3.1%
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
