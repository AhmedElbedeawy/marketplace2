import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../providers/cook_dashboard_provider.dart';
import '../../providers/auth_provider.dart';

class OverviewPage extends StatelessWidget {
  const OverviewPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final dashboardProvider = context.watch<CookDashboardProvider>();
    final authProvider = context.watch<AuthProvider>();

    // Trigger data fetch on first load only
    // Uses hasLoaded flag to prevent loops after successful fetch
    if (!dashboardProvider.isLoading && 
        !dashboardProvider.hasLoaded) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (authProvider.user?.id != null) {
          dashboardProvider.fetchDashboardData(cookId: authProvider.user!.id);
        }
      });
    }

    // Loading skeleton — matches the overview card layout
    if (dashboardProvider.isLoading) {
      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Sales summary card skeleton
            Container(
              height: 180,
              decoration: BoxDecoration(
                color: const Color(0xFFE7E7E7),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            const SizedBox(height: 12),
            // Two KPI row skeletons
            Row(children: [
              Expanded(child: Container(
                height: 90,
                decoration: BoxDecoration(color: const Color(0xFFE7E7E7), borderRadius: BorderRadius.circular(12)),
              )),
              const SizedBox(width: 12),
              Expanded(child: Container(
                height: 90,
                decoration: BoxDecoration(color: const Color(0xFFE7E7E7), borderRadius: BorderRadius.circular(12)),
              )),
            ]),
            const SizedBox(height: 12),
            // Chart section skeleton
            Container(
              height: 140,
              decoration: BoxDecoration(
                color: const Color(0xFFE7E7E7),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            const SizedBox(height: 12),
            // List skeleton rows
            ...List.generate(3, (_) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Container(
                height: 64,
                decoration: BoxDecoration(color: const Color(0xFFE7E7E7), borderRadius: BorderRadius.circular(12)),
              ),
            )),
          ],
        ),
      );
    }

    // Error state
    if (dashboardProvider.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.grey[600]),
            const SizedBox(height: 16),
            Text(
              dashboardProvider.error!,
              style: TextStyle(color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => dashboardProvider.refresh(cookId: authProvider.user?.id),
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    // Display real data - matches reference design
    return SingleChildScrollView(
      padding: const EdgeInsets.all(0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sales Summary Card (big top card with chart)
          _buildSalesSummaryCard(dashboardProvider),
          
          const SizedBox(height: 12),
          
          // Sales by Category
          _buildSalesByCategorySection(dashboardProvider),
          
          const SizedBox(height: 12),
          
          // Traffic Section
          _buildTrafficSection(dashboardProvider),
          
          const SizedBox(height: 12),
          
          // KPI Cards (Orders & Listings)
          _buildKpiCardsRow(dashboardProvider),
          
          const SizedBox(height: 12),
          
          // Recent Activity
          _buildRecentActivitySection(dashboardProvider),
          
          const SizedBox(height: 12),
          
          // Chef's Performance
          _buildChefPerformanceSection(dashboardProvider),
          
          const SizedBox(height: 80), // Bottom nav spacing
        ],
      ),
    );
  }

  Widget _buildSalesSummaryCard(CookDashboardProvider provider) {
    // Calculate total sales from all periods
    final totalSales = provider.salesSummary.fold<num>(
      0,
      (sum, item) => sum + ((item['sales'] as num?)?.toDouble() ?? 0.0),
    );

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEBEBEB), width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Sales',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF3E3E3E),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5F5F5),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: PopupMenuButton<String>(
                    onSelected: (period) {
                      provider.changePeriod(period);
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(value: 'today', child: Text('Today')),
                      const PopupMenuItem(value: 'last7', child: Text('Last 7 Days')),
                      const PopupMenuItem(value: 'last30', child: Text('Last 30 Days')),
                      const PopupMenuItem(value: 'last90', child: Text('Last 90 Days')),
                    ],
                    child: Row(
                      children: [
                        Icon(Icons.calendar_today, size: 14, color: Colors.grey[700]),
                        const SizedBox(width: 4),
                        Text(
                          _getPeriodLabel(provider.selectedPeriod),
                          style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            // Total Sales Amount
            Text(
              'SAR ${totalSales.toStringAsFixed(2)}',
              style: const TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Color(0xFF3E3E3E),
              ),
            ),
            const SizedBox(height: 24),
            // Sales Bar Chart - ALWAYS render (show placeholder if no data)
            _buildSalesBarChart(provider.salesSummary),
          ],
        ),
      ),
    );
  }

  Widget _buildSalesBarChart(List<dynamic> salesData) {
    // Always show something - either real chart or placeholder
    if (salesData.isEmpty) {
      return _buildPlaceholderChart();
    }

    // Find max sales for Y-axis scaling
    final maxSales = salesData.fold<num>(
      0,
      (max, item) {
        final sales = (item['sales'] as num?)?.toDouble() ?? 0.0;
        return sales > max ? sales : max;
      },
    );

    debugPrint('📊 Rendering Sales Chart with ${salesData.length} bars, maxSales: $maxSales');

    final lastIndex = salesData.length - 1;

    return SizedBox(
      height: 120,
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: maxSales > 0 ? maxSales * 1.1 : 100,
          barTouchData: BarTouchData(enabled: false),
          titlesData: FlTitlesData(
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 20,
                getTitlesWidget: (value, meta) {
                  final index = value.toInt();
                  if (index != 0 && index != lastIndex) return const Text('');
                  final date = salesData[index]['date']?.toString() ?? '';
                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      date,
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xFF9A9A9A),
                      ),
                    ),
                  );
                },
              ),
            ),
            leftTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
          ),
          gridData: const FlGridData(show: false),
          borderData: FlBorderData(show: false),
          barGroups: List.generate(salesData.length, (index) {
            final salesAmount = (salesData[index]['sales'] as num?)?.toDouble() ?? 0.0;
            return BarChartGroupData(
              x: index,
              barRods: [
                BarChartRodData(
                  toY: salesAmount,
                  color: const Color(0xFFE3E3E3),
                  width: 30,
                  borderRadius: BorderRadius.circular(6),
                ),
              ],
            );
          }),
        ),
      ),
    );
  }

  Widget _buildPlaceholderChart() {
    return Container(
      height: 120,
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: List.generate(7, (index) {
          final heights = [0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.3];
          return Container(
            width: 24,
            height: 100 * heights[index],
            decoration: BoxDecoration(
              color: const Color(0xFFE5DEDD),
              borderRadius: BorderRadius.circular(4),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildSalesByCategorySection(CookDashboardProvider provider) {
    final categories = provider.salesByCategory;
    
    // Always render the section - chart will handle empty state
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Sales by Category',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
              Text(
                '30 DAYS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[500],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Horizontal bar chart - ALWAYS render (shows placeholder if empty)
          _buildHorizontalBarChart(categories),
        ],
      ),
    );
  }

  Widget _buildHorizontalBarChart(List<Map<String, dynamic>> categories) {
    // Show placeholder if no data
    if (categories.isEmpty) {
      debugPrint('📈 Sales by Category: No data, showing placeholder');
      return SizedBox(
        height: 120,
        child: Center(
          child: Text(
            'No category data available',
            style: TextStyle(color: Colors.grey[400], fontSize: 14),
          ),
        ),
      );
    }
    
    final maxSales = categories.fold<double>(
      0,
      (max, c) => ((c['sales'] as num?)?.toDouble() ?? 0.0) > max
          ? (c['sales'] as num?)?.toDouble() ?? 0.0
          : max,
    );

    return Column(
      children: categories.map((cat) {
        final categoryName = cat['category']?.toString() ?? 'Unknown';
        final sales = (cat['sales'] as num?)?.toDouble() ?? 0.0;
        final fraction = maxSales > 0 ? sales / maxSales : 0.0;
        return Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    categoryName,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey[800],
                    ),
                  ),
                  Text(
                    'SAR ${sales.toStringAsFixed(0)}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[700],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              LayoutBuilder(
                builder: (context, constraints) {
                  return Stack(
                    children: [
                      Container(
                        height: 6,
                        width: constraints.maxWidth,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFEFEF),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      Container(
                        height: 6,
                        width: constraints.maxWidth * fraction,
                        decoration: BoxDecoration(
                          color: const Color(0xFF4A4A4A),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
    
    Widget _buildTrafficSection(CookDashboardProvider provider) {
      final traffic = provider.trafficStats;
      final impressions = traffic?['listingImpressions'] ?? 0;
      final impressionsChange = traffic?['impressionsChange'] ?? 0;
      final ctr = traffic?['clickThroughRate'] ?? 0.0;
      final ctrChange = traffic?['ctrChange'] ?? 0.0;
      final storeViews = traffic?['storeViews'] ?? 0;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Traffic',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
              Text(
                'VS PRIOR 30 DAYS',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[500],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'LISTING IMPRESSIONS',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[500],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          _formatNumber(impressions),
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[800],
                          ),
                        ),
                        if (impressionsChange != 0)
                          const SizedBox(width: 8),
                        if (impressionsChange != 0)
                          Text(
                            '${impressionsChange > 0 ? '+' : ''}${impressionsChange.toStringAsFixed(1)}%',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: impressionsChange > 0 ? Colors.green[600] : Colors.red[600],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'CLICK-THROUGH RATE',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[500],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          '${ctr.toStringAsFixed(1)}%',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[800],
                          ),
                        ),
                        if (ctrChange != 0)
                          const SizedBox(width: 8),
                        if (ctrChange != 0)
                          Text(
                            '${ctrChange > 0 ? '+' : ''}${ctrChange.toStringAsFixed(1)}%',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: ctrChange > 0 ? Colors.green[600] : Colors.red[600],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'STORE VIEWS',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: Colors.grey[500],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _formatNumber(storeViews),
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 12),
          // Placeholder for store views mini chart
          _buildMiniChart(),
        ],
      ),
    );
  }

    Widget _buildMiniChart() {
    return SizedBox(
      height: 40,
      width: double.infinity,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: List.generate(10, (index) {
          final heights = [0.3, 0.4, 0.3, 0.5, 0.4, 0.6, 0.7, 0.6, 0.8, 0.7];
          return Container(
            width: 20,
            height: 40 * heights[index],
            decoration: BoxDecoration(
              color: const Color(0xFFE5DEDD),
              borderRadius: BorderRadius.circular(2),
            ),
          );
        }),
      ),
    );
  }

    Widget _buildKpiCardsRow(CookDashboardProvider provider) {
    final orderStats = provider.orderStats;
    final allOrders = orderStats?['allOrders'] ?? 0;
    final menuItems = provider.activeListings;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: _buildKpiCard(
              icon: Icons.receipt_long,
              title: 'Total Orders',
              value: allOrders.toString(),
              seeAllLabel: 'seeAll',
              onTap: () {
                // TODO: Navigate to orders
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildKpiCard(
              icon: Icons.restaurant_menu,
              title: 'Active Listings',
              value: menuItems.toString(),
              seeAllLabel: 'seeAll',
              onTap: () {
                // TODO: Navigate to menu
              },
            ),
          ),
        ],
      ),
    );
  }

    Widget _buildKpiCard({
    required IconData icon,
    required String title,
    required String value,
    required String seeAllLabel,
    required VoidCallback onTap,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: Colors.grey[600],
                  size: 20,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: onTap,
                child: Row(
                  children: [
                    Text(
                      seeAllLabel,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.orange[700],
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward_ios,
                      size: 10,
                      color: Colors.orange[700],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
        ],
      ),
    );
  }

    Widget _buildRecentActivitySection(CookDashboardProvider provider) {
    final activities = provider.recentActivity;
    
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Recent Activity',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
              GestureDetector(
                onTap: () {
                  // TODO: View all activity
                },
                child: Text(
                  'See All',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.orange[700],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (activities.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Center(
                child: Text(
                  'No recent activity',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[500],
                  ),
                ),
              ),
            )
          else
            ...activities.take(5).map((activity) {
              final statusColors = {
                'order_received': Colors.blue,
                'preparing': const Color(0xFFB8860B),
                'ready': Colors.green,
                'delivered': Colors.green,
                'pickedup': Colors.green,
                'cancelled': Colors.red,
              };
              
              final statusLabels = {
                'order_received': 'RECEIVED',
                'preparing': 'PREPARING',
                'ready': 'READY',
                'delivered': 'DELIVERED',
                'pickedup': 'PICKED UP',
                'cancelled': 'CANCELLED',
              };
              
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _buildActivityItem(
                  icon: activity['type'] == 'order' ? Icons.restaurant : Icons.campaign,
                  title: activity['title'] ?? 'Activity',
                  subtitle: activity['subtitle'] ?? '',
                  amount: activity['amount'] != null ? 'SAR ${activity['amount'].toStringAsFixed(2)}' : '',
                  status: statusLabels[activity['status']] ?? activity['status']?.toUpperCase() ?? 'UNKNOWN',
                  statusColor: statusColors[activity['status']] ?? Colors.grey,
                ),
              );
            }).toList(),
        ],
      ),
    );
  }

    Widget _buildActivityItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required String amount,
    required String status,
    required Color statusColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: Colors.grey[600],
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[800],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey[500],
                  ),
                ),
              ],
            ),
          ),
          if (amount.isNotEmpty)
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  amount,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[800],
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF8E1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    status,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: statusColor, width: 1),
              ),
              child: Text(
                status,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: statusColor,
                ),
              ),
            ),
        ],
      ),
    );
  }

    Widget _buildChefPerformanceSection(CookDashboardProvider provider) {
    final performance = provider.performanceStats;
    final performanceScore = performance?['performanceScore'] ?? 0;
    final completionRate = performance?['completionRate'] ?? '0.0';
    final avgRating = performance?['averageRating'] ?? '0.0';
    final finalOrders = performance?['finalOrders'] ?? 0;
    final totalRatings = performance?['totalRatings'] ?? 0;
    
    // Check if we have enough data to show meaningful stats
    final hasEnoughData = finalOrders > 0 || totalRatings > 0;
    
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Cook Performance',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 8),
          if (hasEnoughData)
            Text(
              'Based on your completed orders and ratings.',
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey[600],
              ),
            )
          else
            Text(
              'Complete more orders to see your performance metrics.',
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey[600],
              ),
            ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Completion Rate',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$completionRate%',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF3E3E3E),
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Average Rating',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    avgRating,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF3E3E3E),
                    ),
                  ),
                ],
              ),
              SizedBox(
                width: 80,
                height: 80,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 80,
                      height: 80,
                      child: CircularProgressIndicator(
                        value: performanceScore > 0 ? performanceScore / 100 : 0,
                        strokeWidth: 8,
                        backgroundColor: Colors.grey[200],
                        valueColor: const AlwaysStoppedAnimation<Color>(
                          Color(0xFFFF7A00),
                        ),
                      ),
                    ),
                    Text(
                      '$performanceScore%',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF3E3E3E),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  /// Helper: Get human-readable period label
  String _getPeriodLabel(String period) {
    switch (period) {
      case 'today':
        return 'Today';
      case 'last7':
        return 'Last 7 Days';
      case 'last30':
        return 'Last 30 Days';
      case 'last90':
        return 'Last 90 Days';
      default:
        return 'Last 30 Days';
    }
  }
  
  /// Helper: Format number with commas
  String _formatNumber(int number) {
    return number.toString().replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    );
  }
}
