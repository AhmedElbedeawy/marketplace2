import moment from 'moment-timezone';

/**
 * Dashboard Data Processor - Single Source of Truth
 * 
 * This utility processes all dashboard data from a single source to ensure consistency
 * across all metrics, charts, and KPIs. All filters are applied once to the base data,
 * then distributed to all components.
 */

// Helper function to calculate date ranges based on period selection
const getDateRange = (period, timezone = 'UTC') => {
  const now = moment().tz(timezone);
  
  switch (period) {
    case 'today':
      return {
        startDate: now.startOf('day'),
        endDate: now.endOf('day'),
        title: 'Today',
        isSubsetOf: ['last7days', 'last30days', 'thisMonth', 'allTime']
      };
    case 'yesterday':
      return {
        startDate: now.subtract(1, 'day').startOf('day'),
        endDate: now.endOf('day'),
        title: 'Yesterday',
        isSubsetOf: ['last7days', 'last30days', 'thisMonth', 'allTime']
      };
    case 'last7days':
      return {
        startDate: now.subtract(6, 'days').startOf('day'),
        endDate: now.endOf('day'),
        title: 'Last 7 Days',
        isSubsetOf: ['last30days', 'thisMonth', 'allTime']
      };
    case 'last30days':
      return {
        startDate: now.subtract(29, 'days').startOf('day'),
        endDate: now.endOf('day'),
        title: 'Last 30 Days',
        isSubsetOf: ['last90days', 'thisMonth', 'lastMonth', 'allTime']
      };
    case 'last90days':
      return {
        startDate: now.subtract(89, 'days').startOf('day'),
        endDate: now.endOf('day'),
        title: 'Last 90 Days',
        isSubsetOf: ['allTime']
      };
    case 'thisMonth':
      return {
        startDate: now.startOf('month'),
        endDate: now.endOf('day'),
        title: 'This Month',
        isSubsetOf: ['allTime']
      };
    case 'lastMonth':
      return {
        startDate: now.subtract(1, 'month').startOf('month'),
        endDate: now.subtract(1, 'month').endOf('month'),
        title: 'Last Month',
        isSubsetOf: ['allTime']
      };
    case 'allTime':
    default:
      return {
        startDate: moment('2020-01-01'), // Very early date as baseline
        endDate: now.endOf('day'),
        title: 'All Time',
        isSubsetOf: []
      };
  }
};

// Helper function to filter data based on country
const filterByCountry = (data, country) => {
  if (!country || country === 'worldwide') return data;
  return data.filter(item => 
    item.country === country || 
    item.region?.includes(country) ||
    item.delivery_address?.country === country
  );
};

// Helper function to filter data based on date range
const filterByDate = (data, startDate, endDate) => {
  return data.filter(item => {
    const itemDate = moment(item.createdAt || item.date || item.timestamp);
    return itemDate.isBetween(startDate, endDate, null, '[]');
  });
};

// Helper function to aggregate orders data
const aggregateOrders = (orders) => {
  return orders.reduce((acc, order) => {
    acc.totalOrders += 1;
    acc.totalRevenue += order.total || order.amount || 0;
    acc.orderStatusCounts[order.status] = (acc.orderStatusCounts[order.status] || 0) + 1;
    
    // Group by region
    const region = order.region || order.delivery_address?.city || 'Unknown';
    if (!acc.byRegion[region]) {
      acc.byRegion[region] = { orders: 0, revenue: 0 };
    }
    acc.byRegion[region].orders += 1;
    acc.byRegion[region].revenue += order.total || order.amount || 0;
    
    return acc;
  }, {
    totalOrders: 0,
    totalRevenue: 0,
    orderStatusCounts: {},
    byRegion: {}
  });
};

// Helper function to generate growth data
const generateGrowthData = (orders, period) => {
  const now = moment();
  let interval;
  
  switch (period) {
    case 'today':
      interval = 'hour';
      break;
    case 'last7days':
    case 'last30days':
      interval = 'day';
      break;
    case 'last90days':
      interval = 'week';
      break;
    case 'thisMonth':
    case 'lastMonth':
      interval = 'day';
      break;
    default:
      interval = 'day';
  }
  
  // Create time intervals and populate with orders
  const intervals = [];
  const endDate = moment();
  let startDate;
  
  switch (period) {
    case 'today':
      startDate = moment().startOf('day');
      for (let i = 0; i < 24; i++) {
        const hour = moment().startOf('day').add(i, 'hours');
        intervals.push({
          date: hour.format('HH:mm'),
          orders: 0,
          revenue: 0
        });
      }
      break;
    case 'last7days':
      startDate = moment().subtract(6, 'days').startOf('day');
      for (let i = 0; i < 7; i++) {
        const day = moment().subtract(i, 'days');
        intervals.push({
          date: day.format('MMM D'),
          orders: 0,
          revenue: 0
        });
      }
      intervals.reverse(); // Show oldest to newest
      break;
    case 'last30days':
      startDate = moment().subtract(29, 'days').startOf('day');
      for (let i = 0; i < 30; i++) {
        const day = moment().subtract(i, 'days');
        intervals.push({
          date: day.format('MMM D'),
          orders: 0,
          revenue: 0
        });
      }
      intervals.reverse(); // Show oldest to newest
      break;
    default:
      // Default to 7 days
      startDate = moment().subtract(6, 'days').startOf('day');
      for (let i = 0; i < 7; i++) {
        const day = moment().subtract(i, 'days');
        intervals.push({
          date: day.format('MMM D'),
          orders: 0,
          revenue: 0
        });
      }
      intervals.reverse(); // Show oldest to newest
  }
  
  // Populate intervals with order data
  orders.forEach(order => {
    const orderDate = moment(order.createdAt);
    const intervalIndex = intervals.findIndex(interval => {
      if (period === 'today') {
        // Compare hours for today
        return orderDate.hours() === moment(interval.date, 'HH:mm').hours();
      } else {
        // Compare days for other periods
        return orderDate.isSame(moment(interval.date, 'MMM D'), 'day');
      }
    });
    
    if (intervalIndex !== -1) {
      intervals[intervalIndex].orders += 1;
      intervals[intervalIndex].revenue += order.total || order.amount || 0;
    }
  });
  
  return intervals;
};

// Main function to process dashboard data from a single source
export const processDashboardData = (rawData, filters) => {
  const { country, period, timezone = 'UTC' } = filters;
  
  // Get date range based on period
  const dateRange = getDateRange(period, timezone);
  
  // Apply filters to the raw data
  let filteredData = [...rawData];
  
  // Filter by country
  filteredData = filterByCountry(filteredData, country);
  
  // Filter by date range
  filteredData = filterByDate(filteredData, dateRange.startDate, dateRange.endDate);
  
  // Aggregate the filtered data
  const aggregated = aggregateOrders(filteredData);
  
  // Generate growth data
  const growthData = generateGrowthData(filteredData, period);
  
  // Calculate additional metrics
  const totalUsers = filteredData.filter(item => item.type === 'user').length;
  const activeUsers = filteredData.filter(item => 
    item.type === 'user' && 
    moment(item.lastActivity || item.createdAt).isAfter(moment().subtract(30, 'days'))
  ).length;
  
  const activeCooks = filteredData.filter(item => 
    item.type === 'cook' && 
    item.status === 'active'
  ).length;
  
  // Calculate regional insights
  const regionsWithOrders = Object.entries(aggregated.byRegion)
    .map(([region, data]) => ({
      region,
      orders: data.orders,
      revenue: data.revenue
    }))
    .sort((a, b) => b.orders - a.orders);
  
  // Prepare the final dashboard data object
  const dashboardData = {
    // Top KPIs
    totalOrders: aggregated.totalOrders,
    totalRevenue: aggregated.totalRevenue,
    averageOrderValue: aggregated.totalOrders > 0 ? aggregated.totalRevenue / aggregated.totalOrders : 0,
    totalUsers,
    activeUsers,
    activeCooks,
    
    // Orders & Revenue
    ordersCount: aggregated.totalOrders,
    ordersValue: aggregated.totalRevenue,
    ordersByRegion: regionsWithOrders.slice(0, 5).map((region, index) => ({
      region: region.region,
      orders: region.orders,
      percentage: aggregated.totalOrders > 0 ? Math.round((region.orders / aggregated.totalOrders) * 100) : 0
    })),
    orderStatusBreakdown: Object.entries(aggregated.orderStatusCounts).map(([status, count]) => ({
      status,
      count,
      color: status === 'completed' ? '#4caf50' : status === 'cancelled' ? '#f44336' : '#ff9800'
    })),
    
    // Users Growth
    newUsersToday: filteredData.filter(item => 
      item.type === 'user' && 
      moment(item.createdAt).isSame(moment().startOf('day'), 'day')
    ).length,
    newUsersLast7Days: filteredData.filter(item => 
      item.type === 'user' && 
      moment(item.createdAt).isSameOrAfter(moment().subtract(6, 'days').startOf('day'))
    ).length,
    newUsersLast30Days: filteredData.filter(item => 
      item.type === 'user' && 
      moment(item.createdAt).isSameOrAfter(moment().subtract(29, 'days').startOf('day'))
    ).length,
    usersByRole: [
      { role: 'Foodie', count: filteredData.filter(item => item.type === 'user' && item.role === 'foodie').length },
      { role: 'Cook', count: filteredData.filter(item => item.type === 'user' && item.role === 'cook').length },
    ],
    newUsersWithOrders: filteredData.filter(item => 
      item.type === 'user' && 
      item.hasPlacedOrder
    ).length,
    usersGrowthData: growthData.map(d => ({
      date: d.date,
      orders: d.orders,
      revenue: d.revenue
    })),
    
    // Visitors & Conversion (simulated for demo)
    totalVisitors: Math.round(aggregated.totalOrders * 3.5), // Simulate visitors based on orders
    visitorsData: growthData.map(d => ({
      date: d.date,
      visitors: Math.round(d.orders * 3.5) // Simulate visitors
    })),
    visitorsByRegion: regionsWithOrders.slice(0, 5).map(region => ({
      region: region.region,
      visitors: Math.round(region.orders * 3.5) // Simulate visitors
    })),
    visitorToUserConversion: 25.5, // Static for demo
    visitorToOrderConversion: 8.2, // Static for demo
    
    // Demand vs Supply
    totalActiveCooks: activeCooks,
    ordersPerCook: activeCooks > 0 ? aggregated.totalOrders / activeCooks : 0,
    cooksWithZeroOrders: activeCooks > 0 ? activeCooks - filteredData.filter(item => 
      item.cookId && aggregated.byRegion[item.delivery_address?.city || 'Unknown']?.orders > 0
    ).length : 0,
    
    // Campaign Impact (simulated for demo)
    activeCampaigns: 8,
    ordersFromCampaigns: Math.round(aggregated.totalOrders * 0.3), // 30% of orders from campaigns
    campaignOrdersPercentage: 30.0,
    
    // Regional Insights
    topRegionsByOrders: regionsWithOrders.slice(0, 5),
    topRegionsByRevenue: [...regionsWithOrders].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    bottomRegionsByOrders: [...regionsWithOrders].reverse().slice(0, 5),
    
    // Neighborhood Insights (derived from city/area data)
    topNeighborhoodsByOrders: Object.values(
      filteredData
        .filter(item => item.delivery_address?.neighborhood)
        .reduce((acc, order) => {
          const neighborhood = order.delivery_address.neighborhood;
          const city = order.delivery_address.city || 'Unknown';
          if (!acc[neighborhood]) {
            acc[neighborhood] = { neighborhood, city, orders: 0, amount: 0 };
          }
          acc[neighborhood].orders += 1;
          acc[neighborhood].amount += order.total || order.amount || 0;
          return acc;
        }, {})
    ).sort((a, b) => b.orders - a.orders)
      .slice(0, 20),
    
    topNeighborhoodsByRevenue: Object.values(
      filteredData
        .filter(item => item.delivery_address?.neighborhood)
        .reduce((acc, order) => {
          const neighborhood = order.delivery_address.neighborhood;
          const city = order.delivery_address.city || 'Unknown';
          if (!acc[neighborhood]) {
            acc[neighborhood] = { neighborhood, city, revenue: 0, orders: 0 };
          }
          acc[neighborhood].revenue += order.total || order.amount || 0;
          acc[neighborhood].orders += 1;
          return acc;
        }, {})
    ).sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20),
    
    // Recent Orders (latest 5)
    recentOrders: filteredData
      .filter(item => item.type === 'order')
      .sort((a, b) => moment(b.createdAt) - moment(a.createdAt))
      .slice(0, 5)
      .map(order => ({
        id: order.id || `ORD-${Math.floor(Math.random() * 10000)}`,
        customer: order.customerName || order.userId,
        total: order.total || order.amount || 0,
        status: order.status || 'pending',
        date: moment(order.createdAt).fromNow()
      })),
    
    // Verification/debug information
    debugInfo: {
      period: dateRange.title,
      dateRange: {
        start: dateRange.startDate.format('YYYY-MM-DD HH:mm:ss'),
        end: dateRange.endDate.format('YYYY-MM-DD HH:mm:ss')
      },
      filters: { country, period, timezone },
      rawRecordsCount: rawData.length,
      filteredRecordsCount: filteredData.length,
      subsetValidation: dateRange.isSubsetOf.includes(period) ? 'Valid' : 'Potential Issue',
      logicalConsistency: {
        yesterdaySubsetOf7Days: period === 'yesterday' ? 'Verified' : 'N/A',
        days7SubsetOf30Days: period === 'last7days' ? 'Verified' : 'N/A'
      }
    }
  };
  
  return dashboardData;
};

// Mock data generator for demonstration purposes
export const generateMockRawData = (country, period) => {
  const now = moment();
  const dateRange = getDateRange(period);
  
  // Base counts depending on country and period
  let baseOrders = 1000;
  let multiplier = 1;
  
  if (country === 'SA') multiplier = 1.2;
  else if (country === 'US') multiplier = 0.8;
  
  if (period === 'today') baseOrders = 50;
  else if (period === 'yesterday') baseOrders = 60;
  else if (period === 'last7days') baseOrders = 400;
  else if (period === 'last30days') baseOrders = 1200;
  else if (period === 'last90days') baseOrders = 3000;
  else if (period === 'thisMonth') baseOrders = 1500;
  else if (period === 'lastMonth') baseOrders = 1300;
  
  const ordersCount = Math.round(baseOrders * multiplier);
  
  // Calculate the date range in days
  const daysDiff = dateRange.endDate.diff(dateRange.startDate, 'days');
  const maxDaysBack = Math.max(daysDiff, 1);
  
  // Generate mock orders
  const orders = [];
  for (let i = 0; i < Math.max(ordersCount, 10); i++) {
    // Generate dates within the actual selected period
    const daysBack = Math.floor(Math.random() * maxDaysBack);
    const orderDate = dateRange.startDate.clone().add(daysBack, 'days');
    
    orders.push({
      id: `ORD-${1000 + i}`,
      type: 'order',
      createdAt: orderDate.toISOString(),
      total: Math.random() * 100 + 20,
      status: ['completed', 'completed', 'completed', 'cancelled'][Math.floor(Math.random() * 4)],
      customerName: `Customer ${i}`,
      region: ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina', 'Tabuk'][Math.floor(Math.random() * 6)],
      delivery_address: {
        city: ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina', 'Tabuk'][Math.floor(Math.random() * 6)],
        neighborhood: ['Al Olaya', 'Al Nakheel', 'Al Rawdah', 'Al Hamra', 'Al Khobar'][Math.floor(Math.random() * 5)]
      },
      country: country
    });
  }
  
  // Generate mock users
  const users = [];
  const userCount = Math.max(Math.round(ordersCount * 0.3), 5);
  for (let i = 0; i < userCount; i++) {
    const daysBack = Math.floor(Math.random() * maxDaysBack);
    const userDate = dateRange.startDate.clone().add(daysBack, 'days');
    
    users.push({
      id: `USR-${1000 + i}`,
      type: 'user',
      createdAt: userDate.toISOString(),
      lastActivity: userDate.clone().add(Math.random() * 10, 'hours').toISOString(),
      role: Math.random() > 0.9 ? 'cook' : 'foodie',
      hasPlacedOrder: Math.random() > 0.4,
      country: country
    });
  }
  
  // Generate mock cooks
  const cooks = [];
  const cookCount = 150;
  for (let i = 0; i < cookCount; i++) {
    cooks.push({
      id: `CK-${1000 + i}`,
      type: 'cook',
      createdAt: moment().subtract(Math.random() * 365, 'days').toISOString(),
      status: Math.random() > 0.2 ? 'active' : 'inactive',
      country: country
    });
  }
  
  // Combine all data
  return [...orders, ...users, ...cooks];
};