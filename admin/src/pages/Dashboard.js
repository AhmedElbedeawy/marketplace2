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
  People as UsersIcon,
  Fastfood as ProductsIcon,
  ShoppingCart as OrdersIcon,
  Store as CooksIcon,
  TrendingUp as RevenueIcon,
} from '@mui/icons-material';

const Dashboard = () => {
  // Mock data
  const stats = [
    { title: 'Total Users', value: '1,248', icon: <UsersIcon />, color: '#3f51b5' },
    { title: 'Total Cooks', value: '86', icon: <CooksIcon />, color: '#4caf50' },
    { title: 'Active Products', value: '342', icon: <ProductsIcon />, color: '#ff9800' },
    { title: 'Total Orders', value: '1,876', icon: <OrdersIcon />, color: '#f44336' },
    { title: 'Revenue', value: '$42,560', icon: <RevenueIcon />, color: '#9c27b0' },
  ];

  const recentOrders = [
    { id: '1001', customer: 'John Doe', total: '$24.99', status: 'Delivered' },
    { id: '1002', customer: 'Jane Smith', total: '$18.50', status: 'Preparing' },
    { id: '1003', customer: 'Robert Johnson', total: '$32.75', status: 'Ready' },
    { id: '1004', customer: 'Emily Davis', total: '$15.25', status: 'Order Received' },
    { id: '1005', customer: 'Michael Brown', total: '$28.60', status: 'Delivered' },
  ];

  const topCooks = [
    { name: 'Maria\'s Kitchen', orders: 124, rating: 4.8 },
    { name: 'Ahmed\'s Delights', orders: 98, rating: 4.9 },
    { name: 'Sweet Tooth', orders: 87, rating: 4.7 },
    { name: 'Green Kitchen', orders: 76, rating: 4.6 },
    { name: 'Spice Garden', orders: 65, rating: 4.5 },
  ];

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
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
      
      {/* Recent Orders and Top Cooks */}
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
                Top Cooks
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Cook</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Orders</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCooks.map((cook, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>{cook.name}</td>
                        <td style={{ padding: '10px' }}>{cook.orders}</td>
                        <td style={{ padding: '10px' }}>⭐ {cook.rating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Button variant="outlined">View All Cooks</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};

export default Dashboard;