import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Box,
  Menu,
  Divider,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  Person,
  Logout,
  Public,
} from '@mui/icons-material';

const RedesignedHeader = ({ selectedCountry, onCountryChange }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
    window.location.reload();
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#fff',
        color: '#333',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        height: '52px',
      }}
    >
      <Toolbar sx={{ minHeight: '52px !important', px: 2.5 }}>
        {/* Logo */}
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{
            fontWeight: 700,
            color: '#1976d2',
            mr: 3,
            fontSize: '18px',
          }}
        >
          Dashboard
        </Typography>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Country Selector */}
        <FormControl variant="outlined" size="small" sx={{ mr: 1.5, minWidth: 140 }}>
          <Select
            value={selectedCountry}
            onChange={(e) => onCountryChange(e.target.value)}
            startAdornment={
              <Public sx={{ fontSize: 16, mr: 0.5, color: '#666' }} />
            }
            sx={{
              backgroundColor: '#f8fafc',
              '& .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #e2e8f0',
              },
              '&:hover': {
                backgroundColor: '#f1f5f9',
              },
              fontSize: '13px',
              height: '34px',
            }}
          >
            <MenuItem value="worldwide">Worldwide</MenuItem>
            <MenuItem value="SA">Saudi Arabia</MenuItem>
            <MenuItem value="AE">UAE</MenuItem>
            <MenuItem value="EG">Egypt</MenuItem>
            <MenuItem value="JO">Jordan</MenuItem>
            <MenuItem value="KW">Kuwait</MenuItem>
            <MenuItem value="BH">Bahrain</MenuItem>
            <MenuItem value="OM">Oman</MenuItem>
            <MenuItem value="QA">Qatar</MenuItem>
          </Select>
        </FormControl>

        {/* Profile Menu */}
        <IconButton
          onClick={handleProfileMenuOpen}
          size="small"
          sx={{
            ml: 0.5,
            backgroundColor: '#f8fafc',
            '&:hover': {
              backgroundColor: '#f1f5f9',
            },
          }}
        >
          <Avatar sx={{ width: 30, height: 30, bgcolor: '#1976d2', fontSize: '13px' }}>
            A
          </Avatar>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: {
              mt: 1.5,
              minWidth: 200,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            },
          }}
        >
          <MenuItem onClick={handleProfileMenuClose}>
            <ListItemIcon>
              <Person fontSize="small" />
            </ListItemIcon>
            <ListItemText>Profile</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default RedesignedHeader;
