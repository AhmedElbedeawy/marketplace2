# Admin Dashboard Enhancement Implementation Guide

## Status: IN PROGRESS
This document contains the complete implementation guide for the Admin Dashboard redesign.

## PART 1: Components Created ✅

### 1. NewSidebar.js - CREATED
Location: `/admin/src/components/NewSidebar.js`
- Persistent left sidebar with collapse functionality
- Active route highlighting
- Orange brand color (#FF7A00)

## PART 2: Components to Create

### 2. NewHeader.js
Create at: `/admin/src/components/NewHeader.js`

```jsx
import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Box,
  IconButton,
  Menu,
  MenuItem as MenuOption
} from '@mui/material';
import { AccountCircle, DateRange } from '@mui/icons-material';

const NewHeader = ({ country, onCountryChange, dateRange, onDateRangeChange }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const countries = [
    { value: 'SA', label: 'Saudi Arabia' },
    { value: 'AE', label: 'United Arab Emirates' },
    { value: 'KW', label: 'Kuwait' },
    { value: 'WORLDWIDE', label: 'Worldwide' }
  ];

  const dateRanges = [
    { value: 'today', label: 'Today' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' }
  ];

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#fff',
        color: '#333',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        height: 56
      }}
    >
      <Toolbar sx={{ minHeight: '56px !important', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#FF7A00' }}>
          Marketplace Admin
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select
              value={country}
              onChange={(e) => onCountryChange(e.target.value)}
              displayEmpty
            >
              {countries.map(c => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={dateRange}
              onChange={(e) => onDateRangeChange(e.target.value)}
              startAdornment={<DateRange sx={{ mr: 1, color: '#999' }} />}
            >
              {dateRanges.map(dr => (
                <MenuItem key={dr.value} value={dr.value}>{dr.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <AccountCircle />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuOption onClick={() => {
              localStorage.removeItem('token');
              window.location.reload();
            }}>
              Logout
            </MenuOption>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NewHeader;
```

### 3. Enhanced Dashboard.js
Update `/admin/src/pages/Dashboard.js` with comprehensive KPIs and charts.

Key sections to add:
1. Top KPI Cards (Total Orders, Revenue, AOV, Users, Active Users, Active Cooks)
2. Orders & Revenue Chart (using recharts)
3. Users Growth Chart
4. Regional Insights Table
5. Demand vs Supply Cards
6. Campaign Impact Summary

### 4. Update App.js
Replace old header/sidebar with new components:

```jsx
import NewSidebar from './components/NewSidebar';
import NewHeader from './components/NewHeader';

function App() {
  const [country, setCountry] = useState('SA');
  const [dateRange, setDateRange] = useState('30days');
  
  return (
    <Router>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <NewHeader 
          country={country}
          onCountryChange={setCountry}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
        <NewSidebar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minHeight: '100vh',
            marginTop: '56px',
            marginLeft: '240px', // Adjust based on sidebar state
            padding: 3,
            backgroundColor: '#f8f9fa'
          }}
        >
          <Routes>
            {/* Pass country and dateRange as props to Dashboard */}
            <Route path="/" element={<Dashboard country={country} dateRange={dateRange} />} />
            {/* ... other routes */}
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}
```

## PART 3: Backend Enhancement (NO MODEL CHANGES)

The existing `/api/admin/dashboard-stats` endpoint needs query parameter support for country and date range filtering.

Update `adminController.js` getDashboardStats:

```javascript
const getDashboardStats = async (req, res) => {
  try {
    const { country, dateRange } = req.query;
    
    // Build date filter
    let dateFilter = {};
    if (dateRange) {
      const now = new Date();
      let startDate;
      switch(dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0,0,0,0));
          break;
        case '7days':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case '30days':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case '90days':
          startDate = new Date(now.setDate(now.getDate() - 90));
          break;
      }
      if (startDate) {
        dateFilter.createdAt = { $gte: startDate };
      }
    }
    
    // Build country filter (if needed in future)
    let countryFilter = {};
    if (country && country !== 'WORLDWIDE') {
      // Add country filtering logic when country field exists
    }
    
    // Use filters in queries
    const userCount = await User.countDocuments(dateFilter);
    const cookCount = await User.countDocuments({ 
      ...dateFilter,
      role_cook_status: 'active' 
    });
    const orderCount = await Order.countDocuments(dateFilter);
    
    // Calculate revenue
    const orders = await Order.find(dateFilter);
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
    
    // Active users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await User.countDocuments({
      lastLoginAt: { $gte: thirtyDaysAgo }
    });
    
    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const statusBreakdown = {};
    ordersByStatus.forEach(item => {
      statusBreakdown[item._id] = item.count;
    });
    
    // Recent orders
    const recentOrders = await Order.find(dateFilter)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Top cooks
    const topCooks = await User.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'subOrders.cook',
          as: 'orders'
        }
      },
      {
        $match: {
          role_cook_status: 'active',
          'orders.createdAt': { $gte: dateFilter.createdAt || new Date(0) }
        }
      },
      {
        $project: {
          name: 1,
          storeName: 1,
          orderCount: { $size: '$orders' }
        }
      },
      {
        $sort: { orderCount: -1 }
      },
      {
        $limit: 5
      }
    ]);
    
    res.status(200).json({
      stats: {
        users: userCount,
        cooks: cookCount,
        products: await Product.countDocuments(),
        orders: orderCount,
        revenue: totalRevenue,
        avgOrderValue,
        activeUsers
      },
      ordersByStatus: statusBreakdown,
      recentOrders,
      topCooks
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

## PART 4: Visual System

Apply these styles globally:

1. **Card Style**:
```jsx
sx={{
  borderRadius: 2,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  backgroundColor: '#fff',
  p: 3
}}
```

2. **Page Background**: `#f8f9fa`

3. **Primary Color**: `#FF7A00`

4. **Typography**:
   - Headings: fontWeight 600-700
   - Body: fontWeight 400

## Next Steps

1. Create NewHeader.js component
2. Update App.js to use new components
3. Enhance Dashboard.js with full KPIs and charts
4. Update backend controller with filters
5. Test all features

## Notes
- NO backend model changes required
- Uses existing API with query parameters
- Recharts library installed for charts
- date-fns installed for date manipulation
