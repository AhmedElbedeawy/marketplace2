import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import RedesignedHeader from './components/RedesignedHeader';
import PersistentSidebar from './components/PersistentSidebar';
import EnhancedDashboard from './pages/EnhancedDashboard';
import Users from './pages/Users';
import Products from './pages/Products';
import Cooks from './pages/Cooks';
import Orders from './pages/Orders';
import Categories from './pages/Categories';
import Campaigns from './pages/Campaigns';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Issues from './pages/Issues';
import IssueDetails from './pages/IssueDetails';
import './App.css';

function App() {
  const [selectedCountry, setSelectedCountry] = useState('SA');
  const [dateRange, setDateRange] = useState('last30days');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const token = localStorage.getItem('token');

  if (!token) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Box sx={{ display: 'flex', backgroundColor: '#f8f9fa', width: '100%' }}>
        <CssBaseline />
        <RedesignedHeader
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
        />
        <PersistentSidebar collapsed={sidebarCollapsed} onCollapseToggle={setSidebarCollapsed} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minHeight: '100vh',
            marginTop: '56px',
            paddingLeft: sidebarCollapsed ? '72px' : '24px',
            paddingRight: '24px',
            paddingTop: '24px',
            transition: 'padding-left 0.3s',
          }}
        >
          <Routes>
            <Route
              path="/"
              element={
                <EnhancedDashboard
                  selectedCountry={selectedCountry}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
              }
            />
            <Route path="/users" element={<Users />} />
            <Route path="/products" element={<Products />} />
            <Route path="/cooks" element={<Cooks />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/issues" element={<Issues />} />
            <Route path="/issues/:orderId" element={<IssueDetails />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}

export default App;