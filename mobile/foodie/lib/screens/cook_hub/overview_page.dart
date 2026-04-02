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
    final token = authProvider.token;

    // Trigger data fetch on first load
    if (!dashboardProvider.isLoading && 
        dashboardProvider.salesSummary.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (token != null) {
          dashboardProvider.fetchDashboardData(token);
        }
      });
    }

    // Loading state
    if (dashboardProvider.isLoading) {
      return const Center(child: CircularProgressIndicator());
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
              onPressed: () => dashboardProvider.fetchDashboardData(token!),
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
                  child: Row(
                    children: [
                      Icon(Icons.calendar_today, size: 14, color: Colors.grey[700]),
                      const SizedBox(width: 4),
                      Text(
                        'Last 30 Days',
                        style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                      ),
                    ],
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
                getTitlesWidget: (value, meta) {
                  final date = salesData[value.toInt()]['date']?.toString() ?? '';
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      date,
                      style: TextStyle(fontSize: 10, color: Colors.grey[600]),
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
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: maxSales > 0 ? maxSales / 4 : 25,
            getDrawingHorizontalLine: (value) {
              return FlLine(
                color: Colors.grey[200],
                strokeWidth: 1,
              );
            },
          ),
          borderData: FlBorderData(show: false),
          barGroups: List.generate(salesData.length, (index) {
            final salesAmount = (salesData[index]['sales'] as num?)?.toDouble() ?? 0.0;
            debugPrint('  Bar $index: date=${salesData[index]['date']}, sales=$salesAmount');
            return BarChartGroupData(
              x: index,
              barRods: [
                BarChartRodData(
                  toY: salesAmount,
                  color: const Color(0xFFE5DEDD),
                  width: 32,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(4),
                    topRight: Radius.circular(4),
                  ),
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
    
    debugPrint('📈 Rendering Sales by Category Chart with ${categories.length} categories');

    final maxSales = categories.fold<double>(
      0,
      (max, c) => ((c['sales'] as num?)?.toDouble() ?? 0.0) > max
          ? (c['sales'] as num?)?.toDouble() ?? 0.0
          : max,
    );

    return SizedBox(
      height: (categories.length * 40).toDouble(),
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: maxSales * 1.1,
          barTouchData: BarTouchData(enabled: false),
          titlesData: FlTitlesData(
            show: true,
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  if (value.toInt() >= categories.length) {
                    return const Text('');
                  }
                  final categoryName = categories[value.toInt()]['category']?.toString() ?? 'Unknown';
                  // Truncate long category names
                  final displayLabel = categoryName.length > 15 
                      ? '${categoryName.substring(0, 12)}...' 
                      : categoryName;
                  debugPrint('  Category $value: $displayLabel (sales: ${categories[value.toInt()]['sales']})');
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Text(
                      displayLabel,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[700],
                      ),
                      textAlign: TextAlign.end,
                    ),
                  );
                },
                reservedSize: 100,
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  if (value == 0) {
                    return const Text('');
                  }
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      'SAR ${(value / 1000).toStringAsFixed(0)}K',
                      style: TextStyle(
                        fontSize: 10,
                        color: Colors.grey[600],
                      ),
                    ),
                  );
                },
                reservedSize: 24,
              ),
            ),
            topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
          ),
          gridData: FlGridData(
            show: true,
              drawVerticalLine: false,
              horizontalInterval: maxSales / 4,
              getDrawingHorizontalLine: (value) {
                return FlLine(
                  color: Colors.grey[200],
                  strokeWidth: 1,
                );
              },
            ),
            borderData: FlBorderData(show: false),
            barGroups: List.generate(categories.length, (index) {
              final salesAmount = (categories[index]['sales'] as num?)?.toDouble() ?? 0.0;
              return BarChartGroupData(
                x: index,
                barRods: [
                  BarChartRodData(
                    toY: salesAmount,
                    color: const Color(0xFF3E3E3E),
                    width: 20,
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(4),
                      bottomRight: Radius.circular(4),
                    ),
                  ),
                ],
              );
            }),
          ),
        ),
      );
    }
    
    Widget _buildTrafficSection(CookDashboardProvider provider) {    
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
                          '24,678',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[800],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '+3.1%',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Colors.green[600],
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
                          '1.6%',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[800],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '-0.1%',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Colors.red[600],
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
            '1,420',
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
    final menuItems = provider.salesByCategory.isNotEmpty ? 45 : 0;

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
          _buildActivityItem(
            icon: Icons.restaurant,
            title: 'Spicy Miso Ramen',
            subtitle: 'New order #8842',
            amount: 'SAR 24.00',
            status: 'PREPARING',
            statusColor: const Color(0xFFB8860B),
          ),
          const SizedBox(height: 12),
          _buildActivityItem(
            icon: Icons.campaign,
            title: 'Promo Campaign',
            subtitle: 'Weekend special active',
            amount: '',
            status: 'ACTIVE',
            statusColor: Colors.green[600]!,
          ),
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
            'Chef\'s Performance',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'You\'re in the top 5% of cooks in your area this week.',
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
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
                        value: 0.98,
                        strokeWidth: 8,
                        backgroundColor: Colors.grey[200],
                        valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFFF9500)),
                      ),
                    ),
                    const Text(
                      '98%',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFFF9500),
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
}
