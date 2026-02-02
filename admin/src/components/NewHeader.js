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
