import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
} from '@mui/material';
import {
  ShoppingCart as OrdersIcon,
  Fastfood as ProductsIcon,
  People as CustomersIcon,
  Star as ReviewsIcon,
  TrendingUp as RevenueIcon,
} from '@mui/icons-material';

const Dashboard = () => {
  // Mock data
  const stats = [
    { title: 'Total Orders', value: '128', icon: <OrdersIcon />, color: '#3f51b5' },
    { title: 'Active Products', value: '24', icon: <ProductsIcon />, color: '#4caf50' },
    { title: 'Customers', value: '86', icon: <CustomersIcon />, color: '#ff9800' },
    { title: 'Average Rating', value: '4.8', icon: <ReviewsIcon />, color: '#f44336' },
    { title: 'Monthly Revenue', value: '$2,450', icon: <RevenueIcon />, color: '#9c27b0' },
  ];

  const recentOrders = [
    { id: '1001', customer: 'John Doe', total: '$24.99', status: 'Preparing' },
    { id: '1002', customer: 'Jane Smith', total: '$18.50', status: 'Ready' },
    { id: '1003', customer: 'Robert Johnson', total: '$32.75', status: 'Delivered' },
    { id: '1004', customer: 'Emily Davis', total: '$15.25', status: 'Order Received' },
  ];

  const topProducts = [
    { name: 'Homemade Pizza', orders: 24, revenue: '$299.76' },
    { name: 'Chicken Biryani', orders: 18, revenue: '$199.80' },
    { name: 'Chocolate Cake', orders: 15, revenue: '$134.25' },
  ];

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Box 
                    sx={{ 
                      backgroundColor: stat.color, 
                      borderRadius: '50%', 
                      width: 50, 
                      height: 50, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    {React.cloneElement(stat.icon, { style: { color: 'white' } })}
                  </Box>
                  <Box>
                    <Typography variant="h6">{stat.value}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Recent Orders and Top Products */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Orders
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Order ID</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Customer</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Total</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>{order.id}</td>
                        <td style={{ padding: '10px' }}>{order.customer}</td>
                        <td style={{ padding: '10px' }}>{order.total}</td>
                        <td style={{ padding: '10px' }}>
                          <span 
                            style={{ 
                              backgroundColor: 
                                order.status === 'Preparing' ? '#ffeb3b' : 
                                order.status === 'Ready' ? '#4caf50' : 
                                order.status === 'Delivered' ? '#2196f3' : '#ff9800',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: 'black'
                            }}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Button variant="outlined">View All Orders</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Selling Products
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Product</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Orders</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>{product.name}</td>
                        <td style={{ padding: '10px' }}>{product.orders}</td>
                        <td style={{ padding: '10px' }}>{product.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Button variant="outlined">View All Products</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};

export default Dashboard;