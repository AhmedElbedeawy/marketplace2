import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  People as UsersIcon,
  Fastfood as ProductsIcon,
  ShoppingCart as OrdersIcon,
  Store as CooksIcon,
  TrendingUp as RevenueIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    stats: { users: 0, cooks: 0, products: 0, orders: 0 },
    recentOrders: [],
    topCooks: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await fetch('http://localhost:5005/api/admin/dashboard-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.ok) {
        setData(result);
      } else {
        setError(result.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { title: 'Total Users', value: data.stats.users, icon: <UsersIcon />, color: '#3f51b5' },
    { title: 'Total Cooks', value: data.stats.cooks, icon: <CooksIcon />, color: '#4caf50' },
    { title: 'Active Products', value: data.stats.products, icon: <ProductsIcon />, color: '#ff9800' },
    { title: 'Total Orders', value: data.stats.orders, icon: <OrdersIcon />, color: '#f44336' },
    { title: 'Revenue', value: 'N/A', icon: <RevenueIcon />, color: '#9c27b0' },
  ];

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh"><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

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
                    {data.recentOrders.map((order) => (
                      <tr key={order._id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>{order.orderId || order._id.substring(0, 8)}</td>
                        <td style={{ padding: '10px' }}>{order.customer?.name || 'Guest'}</td>
                        <td style={{ padding: '10px' }}>${order.totalAmount}</td>
                        <td style={{ padding: '10px' }}>
                          <span 
                            style={{ 
                              backgroundColor: 
                                order.status === 'preparing' ? '#ffeb3b' : 
                                order.status === 'ready' ? '#4caf50' : 
                                order.status === 'delivered' ? '#2196f3' : '#ff9800',
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
                <Button variant="outlined" onClick={() => navigate('/orders')}>View All Orders</Button>
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
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCooks.map((cook, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>{cook.storeName || cook.name}</td>
                        <td style={{ padding: '10px' }}>{cook.orderCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Button variant="outlined" onClick={() => navigate('/cooks')}>View All Cooks</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};

export default Dashboard;