import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  ToggleButton,
  ToggleButtonGroup,
  Button,
} from '@mui/material';
import {
  People,
  Restaurant,
  ShoppingCart,
  AttachMoney,
  TrendingUp,
  LocalOffer,
  Visibility,
  Info,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { processDashboardData, generateMockRawData } from '../utils/dashboardDataProcessor';

const EnhancedDashboard = ({ selectedCountry = 'WORLDWIDE', dateRange = 'last30days', onDateRangeChange }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [showVerification, setShowVerification] = useState(false);
  const [regionMetric, setRegionMetric] = useState('orders'); // 'orders' or 'amount'
  const [selectedCity, setSelectedCity] = useState('all');
  const [neighborhoodTopCount, setNeighborhoodTopCount] = useState(10);
  const [demoMode, setDemoMode] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ArrowUpIcon sx={{ fontSize: 14 }} /> : <ArrowDownIcon sx={{ fontSize: 14 }} />;
  };

  // Get sorted recent orders
  const generateCountryDummyData = (country) => {
    const countryData = {
      SA: {
        totalOrders: 12458,
        totalRevenue: 186750,
        averageOrderValue: 15.0,
        totalUsers: 8542,
        activeUsers: 3250,
        activeCooks: 428,
        totalVisitors: 43500,
        visitorToUserConversion: 28.5,
        visitorToOrderConversion: 9.2,
        ordersPerCook: 29.1,
        cooksWithZeroOrders: 45,
        activeCampaigns: 5,
        ordersFromCampaigns: 1875,
        campaignOrdersPercentage: 15,
        newUsersToday: 45,
        newUsersLast7Days: 312,
        newUsersLast30Days: 1250,
        newUsersWithOrders: 890,
      },
      AE: {
        totalOrders: 8925,
        totalRevenue: 156420,
        averageOrderValue: 17.5,
        totalUsers: 6240,
        activeUsers: 2890,
        activeCooks: 312,
        totalVisitors: 31200,
        visitorToUserConversion: 31.2,
        visitorToOrderConversion: 10.5,
        ordersPerCook: 28.6,
        cooksWithZeroOrders: 28,
        activeCampaigns: 4,
        ordersFromCampaigns: 1245,
        campaignOrdersPercentage: 14,
        newUsersToday: 32,
        newUsersLast7Days: 224,
        newUsersLast30Days: 890,
        newUsersWithOrders: 625,
      },
      EG: {
        totalOrders: 6890,
        totalRevenue: 82750,
        averageOrderValue: 12.0,
        totalUsers: 4890,
        activeUsers: 1850,
        activeCooks: 245,
        totalVisitors: 24100,
        visitorToUserConversion: 24.5,
        visitorToOrderConversion: 7.8,
        ordersPerCook: 28.1,
        cooksWithZeroOrders: 35,
        activeCampaigns: 3,
        ordersFromCampaigns: 850,
        campaignOrdersPercentage: 12.3,
        newUsersToday: 28,
        newUsersLast7Days: 196,
        newUsersLast30Days: 720,
        newUsersWithOrders: 480,
      },
      KW: {
        totalOrders: 4580,
        totalRevenue: 68500,
        averageOrderValue: 15.0,
        totalUsers: 3150,
        activeUsers: 1220,
        activeCooks: 156,
        totalVisitors: 16000,
        visitorToUserConversion: 26.8,
        visitorToOrderConversion: 8.9,
        ordersPerCook: 29.4,
        cooksWithZeroOrders: 18,
        activeCampaigns: 2,
        ordersFromCampaigns: 520,
        campaignOrdersPercentage: 11.4,
        newUsersToday: 18,
        newUsersLast7Days: 126,
        newUsersLast30Days: 485,
        newUsersWithOrders: 325,
      },
      QA: {
        totalOrders: 3890,
        totalRevenue: 58400,
        averageOrderValue: 15.0,
        totalUsers: 2680,
        activeUsers: 1050,
        activeCooks: 128,
        totalVisitors: 13600,
        visitorToUserConversion: 27.5,
        visitorToOrderConversion: 9.1,
        ordersPerCook: 30.4,
        cooksWithZeroOrders: 12,
        activeCampaigns: 2,
        ordersFromCampaigns: 445,
        campaignOrdersPercentage: 11.4,
        newUsersToday: 15,
        newUsersLast7Days: 105,
        newUsersLast30Days: 410,
        newUsersWithOrders: 275,
      },
      WORLDWIDE: {
        totalOrders: 36743,
        totalRevenue: 494820,
        averageOrderValue: 13.5,
        totalUsers: 25502,
        activeUsers: 9260,
        activeCooks: 1269,
        totalVisitors: 128400,
        visitorToUserConversion: 27.5,
        visitorToOrderConversion: 8.9,
        ordersPerCook: 29.0,
        cooksWithZeroOrders: 138,
        activeCampaigns: 16,
        ordersFromCampaigns: 4935,
        campaignOrdersPercentage: 13.4,
        newUsersToday: 138,
        newUsersLast7Days: 963,
        newUsersLast30Days: 3755,
        newUsersWithOrders: 2595,
      },
    };

    const data = countryData[country] || countryData.WORLDWIDE;
    
    // Generate country-specific regions
    const regions = {
      SA: [
        { region: 'Riyadh', orders: 5200, revenue: 78000, percentage: 41.8 },
        { region: 'Jeddah', orders: 3450, revenue: 51750, percentage: 27.7 },
        { region: 'Dammam', orders: 1850, revenue: 27750, percentage: 14.9 },
        { region: 'Mecca', orders: 1150, revenue: 17250, percentage: 9.2 },
        { region: 'Medina', orders: 808, revenue: 12000, percentage: 6.4 },
      ],
      AE: [
        { region: 'Dubai', orders: 4200, revenue: 73500, percentage: 47.1 },
        { region: 'Abu Dhabi', orders: 2450, revenue: 42875, percentage: 27.5 },
        { region: 'Sharjah', orders: 1275, revenue: 22312, percentage: 14.3 },
        { region: 'Ajman', orders: 1000, revenue: 17500, percentage: 11.1 },
      ],
      EG: [
        { region: 'Cairo', orders: 3200, revenue: 38400, percentage: 46.4 },
        { region: 'Alexandria', orders: 1890, revenue: 22680, percentage: 27.4 },
        { region: 'Giza', orders: 1150, revenue: 13800, percentage: 16.7 },
        { region: 'Mansoura', orders: 650, revenue: 7800, percentage: 9.5 },
      ],
      KW: [
        { region: 'Kuwait City', orders: 2800, revenue: 42000, percentage: 61.1 },
        { region: 'Al Ahmadi', orders: 890, revenue: 13350, percentage: 19.4 },
        { region: 'Al Farwaniyah', orders: 520, revenue: 7800, percentage: 11.4 },
        { region: 'Hawally', orders: 370, revenue: 5550, percentage: 8.1 },
      ],
      QA: [
        { region: 'Doha', orders: 2450, revenue: 36750, percentage: 63.0 },
        { region: 'Al Rayyan', orders: 620, revenue: 9300, percentage: 15.9 },
        { region: 'Umm Salal', orders: 445, revenue: 6675, percentage: 11.4 },
        { region: 'Al Wakrah', orders: 375, revenue: 5625, percentage: 9.6 },
      ],
      WORLDWIDE: [
        { region: 'Saudi Arabia', orders: 12458, revenue: 186750, percentage: 33.9 },
        { region: 'UAE', orders: 8925, revenue: 156420, percentage: 24.3 },
        { region: 'Egypt', orders: 6890, revenue: 82750, percentage: 18.8 },
        { region: 'Kuwait', orders: 4580, revenue: 68500, percentage: 12.5 },
        { region: 'Qatar', orders: 3890, revenue: 58400, percentage: 10.6 },
      ],
    };

    const countryRegions = regions[country] || regions.WORLDWIDE;

    // Generate order status breakdown
    const completedRatio = 0.72;
    const cancelledRatio = 0.15;
    const failedRatio = 0.13;

    const orders = data.totalOrders;

    // Generate user growth data (last 30 days)
    const usersGrowthData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const baseOrders = Math.floor(orders / 30);
      const randomVariance = Math.floor(Math.random() * 100) - 50;
      usersGrowthData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        orders: Math.max(100, baseOrders + randomVariance + Math.floor(i * 2)),
        revenue: Math.max(1500, (baseOrders + randomVariance) * 13.5 + (i * 50)),
      });
    }

    // Generate recent orders
    const recentOrders = [];
    const orderStatuses = ['Completed', 'Preparing', 'Pending', 'Cancelled'];
    const customerNames = ['Ahmed Ali', 'Mohammed Hassan', 'Omar Khalid', 'Abdulrahman', 'Faisal', 'Saleh', 'Tariq', 'Khalid', 'Yousef', 'Ibrahim'];
    
    for (let i = 0; i < 10; i++) {
      const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const statusLower = status.toLowerCase();
      recentOrders.push({
        id: `ORD-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        customer: customerNames[Math.floor(Math.random() * customerNames.length)],
        total: Math.floor(Math.random() * 50) + 10,
        status: statusLower,
        date: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toLocaleString(),
      });
    }

    // Generate top cooks
    const topCooks = [
      { _id: '1', storeName: 'Al Riyadh Kitchen', name: 'Chef Abdullah', orderCount: Math.floor(orders * 0.08) },
      { _id: '2', storeName: 'Seafood Palace', name: 'Chef Mohammed', orderCount: Math.floor(orders * 0.06) },
      { _id: '3', storeName: 'Grill House', name: 'Chef Khalid', orderCount: Math.floor(orders * 0.05) },
      { _id: '4', storeName: 'Sweet Treats', name: 'Chef Omar', orderCount: Math.floor(orders * 0.04) },
      { _id: '5', storeName: 'Family Recipes', name: 'Chef Hassan', orderCount: Math.floor(orders * 0.035) },
    ];

    return {
      ...data,
      ordersByRegion: countryRegions,
      orderStatusBreakdown: [
        { status: 'Completed', count: Math.floor(orders * completedRatio) },
        { status: 'Cancelled', count: Math.floor(orders * cancelledRatio) },
        { status: 'Failed', count: Math.floor(orders * failedRatio) },
      ],
      usersGrowthData,
      recentOrders,
      topCooks,
      topNeighborhoodsByOrders: [],
      topRegionsByOrders: countryRegions.map(r => ({ region: r.region, orders: r.orders })),
      topRegionsByRevenue: countryRegions.map(r => ({ region: r.region, revenue: r.revenue })),
    };
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedCountry, dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Use dummy data if demo mode is enabled
      if (demoMode) {
        const dummyData = generateCountryDummyData(selectedCountry);
        setDashboardData(dummyData);
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not logged in');
        return;
      }

      const response = await fetch(`http://localhost:5005/api/admin/dashboard-stats?country=${selectedCountry}&dateRange=${dateRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (response.ok) {
        // Map backend data to dashboard structure
        setDashboardData({
          totalOrders: data.stats.orders,
          totalRevenue: data.stats.revenue,
          averageOrderValue: data.stats.avgOrderValue,
          totalUsers: data.stats.users,
          activeUsers: data.stats.activeUsers,
          activeCooks: data.stats.cooks,
          ordersByRegion: data.ordersByRegion || [],
          orderStatusBreakdown: data.orderStatusBreakdown || [],
          usersGrowthData: data.usersGrowthData || [],
          recentOrders: data.recentOrders.map(o => ({
            id: o._id.substring(o._id.length - 8).toUpperCase(),
            customer: o.customer?.name || 'Unknown',
            cook: o.subOrders && o.subOrders.length > 0 
              ? o.subOrders.map(s => s.cook?.storeName || s.cook?.name || 'Unknown').join(', ')
              : 'Unknown',
            total: o.totalAmount,
            status: o.status,
            date: new Date(o.createdAt).toLocaleString()
          })),
          topCooks: data.topCooks,
          // Simulated/Placeholder for missing fields in backend
          newUsersToday: 0,
          newUsersLast7Days: 0,
          newUsersLast30Days: data.stats.users,
          newUsersWithOrders: 0,
          totalVisitors: Math.round(data.stats.orders * 3.5),
          visitorToUserConversion: 25.5,
          visitorToOrderConversion: 8.2,
          totalActiveCooks: data.stats.cooks,
          ordersPerCook: data.stats.cooks > 0 ? data.stats.orders / data.stats.cooks : 0,
          cooksWithZeroOrders: 0,
          activeCampaigns: 0,
          ordersFromCampaigns: 0,
          campaignOrdersPercentage: 0,
          topNeighborhoodsByOrders: [],
          topRegionsByOrders: (data.ordersByRegion || []).map(r => ({ region: r.region, orders: r.orders })),
          topRegionsByRevenue: (data.ordersByRegion || []).map(r => ({ region: r.region, revenue: r.revenue })),
        });
      } else {
        setError(data.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Dashboard Fetch Error:', err);
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const KPICard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
          </Typography>
          <Box
            sx={{
              backgroundColor: color + '10',
              borderRadius: '6px',
              p: 0.75,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {React.cloneElement(icon, { sx: { fontSize: 18, color: color + 'CC' } })}
          </Box>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '28px', lineHeight: 1.2 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '11px', mt: 0.5, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (loading || !dashboardData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 56px)', width: '100%' }}>
      {/* Dashboard Controls */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px', color: '#1a1a1a' }}>
                  Dashboard Controls
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  {/* Period Selector */}
                  <FormControl variant="outlined" size="small" sx={{ minWidth: 140 }}>
                    <Select
                      value={dateRange}
                      onChange={(e) => onDateRangeChange(e.target.value)}
                      sx={{
                        backgroundColor: '#f8fafc',
                        '& .MuiOutlinedInput-notchedOutline': {
                          border: '1px solid #e2e8f0',
                        },
                        '&:hover': {
                          backgroundColor: '#f1f5f9',
                        },
                        fontSize: '13px',
                        height: '34px',
                      }}
                    >
                      <MenuItem value="today">Today</MenuItem>
                      <MenuItem value="yesterday">Yesterday</MenuItem>
                      <MenuItem value="last7days">Last 7 Days</MenuItem>
                      <MenuItem value="last30days">Last 30 Days</MenuItem>
                      <MenuItem value="last90days">Last 90 Days</MenuItem>
                      <MenuItem value="thisMonth">This Month</MenuItem>
                      <MenuItem value="lastMonth">Last Month</MenuItem>
                      <MenuItem value="allTime">All Time</MenuItem>
                    </Select>
                  </FormControl>
                  
                  {/* Country Display */}
                  <Box sx={{ 
                    backgroundColor: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '4px', 
                    px: 1.5, 
                    py: 0.75, 
                    display: 'flex', 
                    alignItems: 'center',
                    height: '34px'
                  }}>
                    <Typography variant="body2" sx={{ fontSize: '13px', color: '#64748b' }}>
                      Country: {selectedCountry === 'SA' ? 'Saudi Arabia' : selectedCountry}
                    </Typography>
                  </Box>
                  
                  {/* Demo Mode Toggle */}
                  <Button
                    variant={demoMode ? "contained" : "outlined"}
                    size="small"
                    onClick={() => {
                      setDemoMode(!demoMode);
                      if (!demoMode) {
                        // When enabling demo mode, fetch dummy data immediately
                        const dummyData = generateCountryDummyData(selectedCountry);
                        setDashboardData(dummyData);
                      }
                    }}
                    sx={{
                      fontSize: '12px',
                      height: '34px',
                      borderColor: demoMode ? '#1976d2' : '#e2e8f0',
                      bgcolor: demoMode ? '#1976d2' : 'transparent',
                      color: demoMode ? '#fff' : '#64748b',
                      '&:hover': {
                        bgcolor: demoMode ? '#1565c0' : '#f8fafc',
                        borderColor: demoMode ? '#1565c0' : '#1976d2',
                      }
                    }}
                  >
                    {demoMode ? 'Demo Mode ON' : 'Demo Mode'}
                  </Button>
                  
                  {/* Verification Toggle */}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Info />}
                    onClick={() => setShowVerification(!showVerification)}
                    sx={{
                      fontSize: '12px',
                      height: '34px',
                      borderColor: showVerification ? '#1976d2' : '#e2e8f0',
                      color: showVerification ? '#1976d2' : '#64748b',
                      '&:hover': {
                        backgroundColor: showVerification ? '#1976d210' : '#f8fafc',
                        borderColor: showVerification ? '#1976d2' : '#cbd5e1',
                      }
                    }}
                  >
                    {showVerification ? 'Hide' : 'Show'} Verification
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px', color: '#1a1a1a' }}>
                  Quick Stats
                </Typography>
                <Box sx={{ display: 'flex', gap: 3 }}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontSize: '13px', color: '#64748b' }}>Orders</Typography>
                    <Typography variant="body2" sx={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>
                      {dashboardData.totalOrders.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontSize: '13px', color: '#64748b' }}>Revenue</Typography>
                    <Typography variant="body2" sx={{ fontSize: '14px', color: '#10b981', fontWeight: 600 }}>
                      ${dashboardData.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Verification Panel */}
      {showVerification && dashboardData.debugInfo && (
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={12}>
            <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px', backgroundColor: '#f0f9ff' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px', color: '#1a1a1a', mb: 1.5 }}>
                  Data Verification & Debug Info
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: '13px', color: '#64748b', mb: 0.5 }}>Period</Typography>
                    <Typography variant="body2" sx={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>{dashboardData.debugInfo.period}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: '13px', color: '#64748b', mb: 0.5 }}>Date Range</Typography>
                    <Typography variant="body2" sx={{ fontSize: '12px', color: '#1a1a1a' }}>{dashboardData.debugInfo.dateRange.start} to {dashboardData.debugInfo.dateRange.end}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: '13px', color: '#64748b', mb: 0.5 }}>Filters Applied</Typography>
                    <Typography variant="body2" sx={{ fontSize: '12px', color: '#1a1a1a' }}>Country: {dashboardData.debugInfo.filters.country}, Period: {dashboardData.debugInfo.filters.period}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: '13px', color: '#64748b', mb: 0.5 }}>Data Records</Typography>
                    <Typography variant="body2" sx={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>{dashboardData.debugInfo.rawRecordsCount} → {dashboardData.debugInfo.filteredRecordsCount}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Page Title */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '24px', mb: 0.5 }}>
          Dashboard Overview
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '13px' }}>
          {selectedCountry === 'SA' ? 'Saudi Arabia' : selectedCountry === 'WORLDWIDE' ? 'Worldwide' : selectedCountry} • {dateRange.replace(/([A-Z])/g, ' $1').trim()}
        </Typography>
      </Box>

      {/* Top KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="Total Orders"
            value={dashboardData.totalOrders}
            icon={<ShoppingCart />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="Total Revenue"
            value={`$${dashboardData.totalRevenue.toLocaleString()}`}
            icon={<AttachMoney />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="Avg Order Value"
            value={`$${dashboardData.averageOrderValue.toFixed(2)}`}
            icon={<TrendingUp />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="Total Users"
            value={dashboardData.totalUsers}
            icon={<People />}
            color="#64748b"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="Active Users"
            value={dashboardData.activeUsers}
            icon={<People />}
            color="#64748b"
            subtitle="Last 30 days"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="Active Cooks"
            value={dashboardData.activeCooks}
            icon={<Restaurant />}
            color="#64748b"
            subtitle="Last 30 days"
          />
        </Grid>
      </Grid>

      {/* Orders & Revenue Section */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2.5, fontSize: '16px', color: '#1a1a1a' }}>
                Orders by Region
              </Typography>
              <Box>
                {dashboardData.ordersByRegion.map((row, index) => (
                  <Box
                    key={row.region}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1.5,
                      borderBottom: index < dashboardData.ordersByRegion.length - 1 ? '1px solid #f0f0f0' : 'none',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: index === 0 ? 600 : 500, color: index === 0 ? '#1a1a1a' : '#4a4a4a', fontSize: '14px' }}>
                        {row.region}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, mx: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            flex: 1,
                            height: '8px',
                            backgroundColor: '#f0f0f0',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              width: `${row.percentage}%`,
                              height: '100%',
                              backgroundColor: index === 0 ? '#1976d2' : '#94a3b8',
                              borderRadius: '4px',
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '12px', minWidth: '40px', textAlign: 'right' }}>
                          {row.percentage}%
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ minWidth: '60px', textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a1a', fontSize: '14px' }}>
                        {row.orders.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2.5, fontSize: '16px', color: '#1a1a1a' }}>
                Order Status
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { status: 'Completed', count: dashboardData.orderStatusBreakdown.find(s => s.status === 'Completed')?.count || 0 },
                      { status: 'Cancelled', count: dashboardData.orderStatusBreakdown.find(s => s.status === 'Cancelled')?.count || 0 },
                      { status: 'Failed', count: dashboardData.orderStatusBreakdown.find(s => s.status === 'Failed')?.count || 0 },
                    ]}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={40}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                    <Cell fill="#94a3b8" />
                  </Pie>
                  <RechartsTooltip />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value, entry) => (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {value}: {entry.payload.count}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Orders by Cooks */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12}>
          <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2.5, fontSize: '16px', color: '#1a1a1a' }}>
                Orders by Cooks
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={dashboardData.topCooks?.map(cook => ({
                    name: cook.storeName || cook.name,
                    orders: cook.orderCount || 0
                  })) || []}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Bar dataKey="orders" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Users Growth */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12}>
          <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px', color: '#1a1a1a' }}>
                  User Growth
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Chip
                    label={`Today: ${dashboardData.newUsersToday}`}
                    size="small"
                    sx={{ backgroundColor: '#1976d210', color: '#1976d2', fontSize: '11px', fontWeight: 500 }}
                  />
                  <Chip
                    label={`7 Days: ${dashboardData.newUsersLast7Days}`}
                    size="small"
                    sx={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: 500, border: '1px solid #e2e8f0' }}
                  />
                  <Chip
                    label={`30 Days: ${dashboardData.newUsersLast30Days}`}
                    size="small"
                    sx={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: 500, border: '1px solid #e2e8f0' }}
                  />
                </Box>
              </Box>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dashboardData.usersGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                  <Line type="monotone" dataKey="orders" stroke="#1976d2" strokeWidth={2.5} name="Orders" dot={{ fill: '#1976d2', r: 4 }} />
                  <Line type="monotone" dataKey="revenue" stroke="#64748b" strokeWidth={2.5} name="Revenue" dot={{ fill: '#64748b', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #f0f0f0' }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '12px' }}>
                  <strong style={{ color: '#1a1a1a' }}>New users with orders:</strong> {dashboardData.newUsersWithOrders} <span style={{ color: '#94a3b8' }}>({((dashboardData.newUsersWithOrders / dashboardData.newUsersLast30Days) * 100).toFixed(1)}%)</span>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Visitors & Demand/Supply & Campaigns */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2.5, fontSize: '16px', color: '#1a1a1a' }}>
                Visitors & Conversion
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '32px' }}>
                  {dashboardData.totalVisitors.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '12px', mt: 0.5 }}>Total Visitors</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontSize: '13px', color: '#64748b' }}>Visitor → User</Typography>
                  <Typography variant="body2" sx={{ fontSize: '14px', color: '#1976d2', fontWeight: 600 }}>
                    {dashboardData.visitorToUserConversion}%
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontSize: '13px', color: '#64748b' }}>Visitor → Order</Typography>
                  <Typography variant="body2" sx={{ fontSize: '14px', color: '#10b981', fontWeight: 600 }}>
                    {dashboardData.visitorToOrderConversion}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2.5, fontSize: '16px', color: '#1a1a1a' }}>
                Demand vs Supply
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '32px' }}>
                  {dashboardData.totalActiveCooks}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '12px', mt: 0.5 }}>Active Cooks</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontSize: '13px', color: '#64748b' }}>Avg Orders/Cook</Typography>
                  <Typography variant="body2" sx={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>
                    {dashboardData.ordersPerCook.toFixed(1)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontSize: '13px', color: '#64748b' }}>Cooks with 0 Orders</Typography>
                  <Typography variant="body2" sx={{ fontSize: '14px', color: '#ef4444', fontWeight: 600 }}>
                    {dashboardData.cooksWithZeroOrders}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2.5, fontSize: '16px', color: '#1a1a1a' }}>
                Campaign Impact
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '32px' }}>
                  {dashboardData.activeCampaigns}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '12px', mt: 0.5 }}>Active Campaigns</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontSize: '13px', color: '#64748b' }}>Orders from Campaigns</Typography>
                  <Typography variant="body2" sx={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>
                    {dashboardData.ordersFromCampaigns}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontSize: '13px', color: '#64748b' }}>% of Total Orders</Typography>
                  <Typography variant="body2" sx={{ fontSize: '14px', color: '#1976d2', fontWeight: 600 }}>
                    {dashboardData.campaignOrdersPercentage}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Regional Insights */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px', color: '#1a1a1a' }}>
                  Top 5 Regions
                </Typography>
                <ToggleButtonGroup
                  value={regionMetric}
                  exclusive
                  onChange={(e, newValue) => newValue && setRegionMetric(newValue)}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      fontSize: '11px',
                      fontWeight: 500,
                      textTransform: 'none',
                      border: '1px solid #e2e8f0',
                      '&.Mui-selected': {
                        backgroundColor: '#1976d2',
                        color: '#fff',
                        borderColor: '#1976d2',
                      },
                      '&:not(.Mui-selected)': {
                        backgroundColor: '#f8fafc',
                        color: '#64748b',
                      }
                    }
                  }}
                >
                  <ToggleButton value="orders">Orders</ToggleButton>
                  <ToggleButton value="amount">Amount</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={regionMetric === 'orders' ? dashboardData.topRegionsByOrders : dashboardData.topRegionsByRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="region" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Bar 
                    dataKey={regionMetric === 'orders' ? 'orders' : 'revenue'} 
                    fill="#1976d2" 
                    radius={[6, 6, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px', color: '#1a1a1a' }}>
                  Orders by Neighborhood
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <ToggleButtonGroup
                    value={neighborhoodTopCount}
                    exclusive
                    onChange={(e, newValue) => newValue && setNeighborhoodTopCount(newValue)}
                    size="small"
                    sx={{
                      '& .MuiToggleButton-root': {
                        fontSize: '11px',
                        fontWeight: 500,
                        textTransform: 'none',
                        border: '1px solid #e2e8f0',
                        minWidth: '40px',
                        '&.Mui-selected': {
                          backgroundColor: '#1976d2',
                          color: '#fff',
                          borderColor: '#1976d2',
                        },
                        '&:not(.Mui-selected)': {
                          backgroundColor: '#f8fafc',
                          color: '#64748b',
                        }
                      }
                    }}
                  >
                    <ToggleButton value={10}>10</ToggleButton>
                    <ToggleButton value={20}>20</ToggleButton>
                  </ToggleButtonGroup>
                  <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      displayEmpty
                      sx={{
                        fontSize: '12px',
                        height: '30px',
                        '& .MuiOutlinedInput-notchedOutline': {
                          border: '1px solid #e2e8f0',
                        }
                      }}
                    >
                      <MenuItem value="all">All Cities</MenuItem>
                      <MenuItem value="Riyadh">Riyadh</MenuItem>
                      <MenuItem value="Jeddah">Jeddah</MenuItem>
                      <MenuItem value="Dammam">Dammam</MenuItem>
                      <MenuItem value="Mecca">Mecca</MenuItem>
                      <MenuItem value="Medina">Medina</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart 
                  data={dashboardData.topNeighborhoodsByOrders
                    .filter(item => selectedCity === 'all' || item.city === selectedCity)
                    .slice(0, neighborhoodTopCount)
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="neighborhood" 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(value, name) => [
                      name === 'orders' ? `${value} orders` : `$${value}`, 
                      name === 'orders' ? 'Orders' : 'Amount'
                    ]}
                  />
                  <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Orders and Top Cooks */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2.5, fontSize: '16px', color: '#1a1a1a' }}>
                Recent Orders
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eee', backgroundColor: '#f5f5f5' }}>
                      <th 
                        style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => handleSort('id')}
                      >
                        Order ID {getSortIcon('id')}
                      </th>
                      <th 
                        style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => handleSort('customer')}
                      >
                        Customer {getSortIcon('customer')}
                      </th>
                      <th 
                        style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => handleSort('cook')}
                      >
                        Cook {getSortIcon('cook')}
                      </th>
                      <th 
                        style={{ textAlign: 'right', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => handleSort('total')}
                      >
                        Total {getSortIcon('total')}
                      </th>
                      <th 
                        style={{ textAlign: 'center', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => handleSort('status')}
                      >
                        Status {getSortIcon('status')}
                      </th>
                      <th 
                        style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => handleSort('date')}
                      >
                        Time {getSortIcon('date')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recentOrders.map((order) => (
                      <tr 
                        key={order.id} 
                        style={{ 
                          borderBottom: '1px solid #eee',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '12px', fontWeight: 500, color: '#1a1a1a', fontSize: '14px' }}>{order.id}</td>
                        <td style={{ padding: '12px', color: '#4a4a4a', fontSize: '14px' }}>{order.customer}</td>
                        <td style={{ padding: '12px', color: '#4a4a4a', fontSize: '14px' }}>{order.cook}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#1a1a1a', fontSize: '14px' }}>${order.total.toFixed(2)}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <Chip
                            label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            size="small"
                            sx={{
                              fontSize: '11px',
                              fontWeight: 500,
                              height: '22px',
                              bgcolor:
                                order.status === 'completed' || order.status === 'Completed' ? '#e8f5e9' :
                                order.status === 'preparing' ? '#fff3e0' :
                                '#ffebee',
                              color:
                                order.status === 'completed' || order.status === 'Completed' ? '#2e7d32' :
                                order.status === 'preparing' ? '#e65100' :
                                '#c62828',
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px', color: '#94a3b8', fontSize: '12px' }}>{order.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2.5, fontSize: '16px', color: '#1a1a1a' }}>
                Top 5 Cooks
              </Typography>
              <Box>
                {dashboardData.topCooks && dashboardData.topCooks.map((cook, index) => (
                  <Box
                    key={cook._id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1.5,
                      borderBottom: index < dashboardData.topCooks.length - 1 ? '1px solid #f0f0f0' : 'none',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a1a', fontSize: '14px' }}>
                        {cook.storeName || cook.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        {cook.name}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2', fontSize: '14px' }}>
                        {cook.orderCount} orders
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
  
export default EnhancedDashboard;