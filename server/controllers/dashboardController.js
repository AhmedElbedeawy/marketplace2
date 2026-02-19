const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const moment = require('moment-timezone');

// Helper function to get date range based on period
const getDateRange = (period) => {
  const now = moment().tz('Asia/Riyadh');
  let startDate, endDate;

  switch (period) {
    case 'today':
      startDate = now.clone().startOf('day');
      endDate = now.clone().endOf('day');
      break;
    case 'yesterday':
      startDate = now.clone().subtract(1, 'days').startOf('day');
      endDate = now.clone().subtract(1, 'days').endOf('day');
      break;
    case 'last7days':
      startDate = now.clone().subtract(7, 'days').startOf('day');
      endDate = now.clone().endOf('day');
      break;
    case 'last30days':
      startDate = now.clone().subtract(30, 'days').startOf('day');
      endDate = now.clone().endOf('day');
      break;
    case 'last90days':
      startDate = now.clone().subtract(90, 'days').startOf('day');
      endDate = now.clone().endOf('day');
      break;
    case 'thisMonth':
      startDate = now.clone().startOf('month');
      endDate = now.clone().endOf('month');
      break;
    case 'lastMonth':
      startDate = now.clone().subtract(1, 'months').startOf('month');
      endDate = now.clone().subtract(1, 'months').endOf('month');
      break;
    case 'allTime':
    default:
      startDate = moment('2020-01-01').tz('Asia/Riyadh');
      endDate = now.clone().endOf('day');
      break;
  }

  return { startDate: startDate.toDate(), endDate: endDate.toDate() };
};

const getComprehensiveDashboardData = async (req, res) => {
  try {
    const { country = 'SA', period = 'last30days' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Base filter for date range
    const dateFilter = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    // Country filter (if not worldwide)
    const countryFilter = country === 'worldwide' ? {} : { 'delivery_address.country': country };

    // Combined filter for orders
    const orderFilter = { ...dateFilter, ...countryFilter };

    // 1. Basic Stats
    const totalOrders = await Order.countDocuments(orderFilter);
    const orderStats = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalRevenue = orderStats[0]?.totalRevenue || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // 2. User Stats
    const totalUsers = await User.countDocuments(dateFilter);
    const activeUsers = await User.countDocuments({ ...dateFilter, lastActive: { $gte: moment().subtract(30, 'days').toDate() } });
    
    // Count active cooks from Cook collection (consistent with hero stats)
    const cookFilter = { ...dateFilter, status: 'active' };
    const activeCooks = await Cook.countDocuments(cookFilter);

    // 3. Orders by Region
    const ordersByRegion = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: '$delivery_address.city',
          orders: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { orders: -1 } },
      {
        $project: {
          _id: 0,
          region: '$_id',
          orders: 1,
          revenue: 1
        }
      }
    ]);

    // Calculate percentages for regions
    const ordersWithPercentage = ordersByRegion.map(item => ({
      ...item,
      percentage: totalOrders > 0 ? Math.round((item.orders / totalOrders) * 100) : 0
    }));

    // 4. Order Status Breakdown
    const orderStatusBreakdown = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          status: { $concat: [{ $toUpper: { $substrCP: ['$_id', 0, 1] } }, { $substrCP: ['$_id', 1, { $strLenCP: '$_id' }] }] },
          count: 1
        }
      }
    ]);

    // 5. Top Regions by Orders and Revenue
    const topRegionsByOrders = ordersByRegion.slice(0, 5);
    const topRegionsByRevenue = [...ordersByRegion].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // 6. Top Neighborhoods
    const topNeighborhoodsByOrders = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: {
            neighborhood: '$delivery_address.neighborhood',
            city: '$delivery_address.city'
          },
          orders: { $sum: 1 },
          amount: { $sum: '$total' }
        }
      },
      { $sort: { orders: -1 } },
      { $limit: 20 },
      {
        $project: {
          _id: 0,
          neighborhood: '$_id.neighborhood',
          city: '$_id.city',
          orders: 1,
          amount: 1
        }
      }
    ]);

    // 7. Recent Orders
    const recentOrders = await Order.find(orderFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('_id customer total status createdAt')
      .populate('customer', 'name')
      .lean();

    const formattedRecentOrders = recentOrders.map(order => ({
      id: order._id.toString().substring(0, 8).toUpperCase(),
      customer: order.customer?.name || 'Guest',
      total: order.total,
      status: order.status,
      date: moment(order.createdAt).fromNow()
    }));

    // 8. TOP SELLING COOKS - By Orders Count and Amount
    const topCooksByOrders = await Order.aggregate([
      { $match: orderFilter },
      { $unwind: '$subOrders' },
      {
        $group: {
          _id: '$subOrders.cook',
          orders: { $sum: 1 },
          amount: { $sum: '$subOrders.total' }
        }
      },
      { $sort: { orders: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'cookInfo'
        }
      },
      { $unwind: '$cookInfo' },
      {
        $project: {
          _id: 0,
          cookId: '$_id',
          cookName: '$cookInfo.name',
          storeName: '$cookInfo.storeName',
          orders: 1,
          amount: 1
        }
      }
    ]);

    const topCooksByAmount = [...topCooksByOrders].sort((a, b) => b.amount - a.amount).slice(0, 20);

    // 9. User Growth Data (last 7 days for chart)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days').tz('Asia/Riyadh');
      const dayStart = date.clone().startOf('day').toDate();
      const dayEnd = date.clone().endOf('day').toDate();

      const dayOrders = await Order.countDocuments({
        createdAt: { $gte: dayStart, $lte: dayEnd },
        ...countryFilter
      });

      const dayRevenue = await Order.aggregate([
        { $match: { createdAt: { $gte: dayStart, $lte: dayEnd }, ...countryFilter } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);

      last7Days.push({
        date: date.format('MMM DD'),
        orders: dayOrders,
        revenue: dayRevenue[0]?.total || 0
      });
    }

    // 10. Additional Stats
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: moment().startOf('day').toDate(), $lte: moment().endOf('day').toDate() }
    });

    const newUsersLast7Days = await User.countDocuments({
      createdAt: { $gte: moment().subtract(7, 'days').toDate() }
    });

    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: moment().subtract(30, 'days').toDate() }
    });

    // Response
    res.status(200).json({
      success: true,
      data: {
        // Basic KPIs
        totalOrders,
        totalRevenue: Math.round(totalRevenue),
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        totalUsers,
        activeUsers,
        activeCooks,

        // Regional Data
        ordersByRegion: ordersWithPercentage.slice(0, 3),
        topRegionsByOrders,
        topRegionsByRevenue,
        
        // Status
        orderStatusBreakdown,
        
        // Neighborhoods
        topNeighborhoodsByOrders,
        
        // Recent Orders
        recentOrders: formattedRecentOrders,
        
        // NEW: Top Selling Cooks
        topCooksByOrders,
        topCooksByAmount,
        
        // Growth Data
        usersGrowthData: last7Days,
        newUsersToday,
        newUsersLast7Days,
        newUsersLast30Days,
        newUsersWithOrders: await User.countDocuments({
          createdAt: { $gte: moment().subtract(30, 'days').toDate() },
          'orders.0': { $exists: true }
        }),

        // Additional metrics
        totalVisitors: totalUsers * 12, // Estimate
        visitorToUserConversion: totalUsers > 0 ? Math.round((totalUsers / (totalUsers * 12)) * 1000) / 10 : 0,
        visitorToOrderConversion: totalOrders > 0 ? Math.round((totalOrders / (totalUsers * 12)) * 1000) / 10 : 0,
        totalActiveCooks: activeCooks,
        ordersPerCook: activeCooks > 0 ? Math.round((totalOrders / activeCooks) * 10) / 10 : 0,
        cooksWithZeroOrders: await User.countDocuments({ role_cook_status: 'active', 'orders.0': { $exists: false } }),
        activeCampaigns: 0, // Placeholder
        ordersFromCampaigns: 0, // Placeholder
        campaignOrdersPercentage: 0, // Placeholder

        // Debug info
        debugInfo: {
          period,
          dateRange: {
            start: moment(startDate).format('YYYY-MM-DD'),
            end: moment(endDate).format('YYYY-MM-DD')
          },
          filters: { country, period },
          rawRecordsCount: totalOrders,
          filteredRecordsCount: totalOrders
        }
      }
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getComprehensiveDashboardData
};
