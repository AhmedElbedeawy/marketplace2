import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

const Users = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ArrowUpIcon sx={{ fontSize: 14 }} /> : <ArrowDownIcon sx={{ fontSize: 14 }} />;
  };
  
  useEffect(() => {
    fetchUsers();
  }, [searchTerm, filterRole, filterStatus]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not logged in');
        return;
      }
      let url = `http://localhost:5005/api/admin/users?search=${searchTerm}`;
      if (filterRole) url += `&role=${filterRole}`;
      if (filterStatus) url += `&role_cook_status=${filterStatus}`;
      if (sortBy) url += `&sortBy=${sortBy}`;
      if (sortOrder) url += `&sortOrder=${sortOrder}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || []);
      } else {
        setError(data.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    setEditingUser(user);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
  };

  const handleSaveUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const method = editingUser?._id ? 'PATCH' : 'POST';
      const url = editingUser?._id 
        ? `http://localhost:5005/api/admin/users/${editingUser._id}`
        : 'http://localhost:5005/api/admin/users';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingUser)
      });

      if (response.ok) {
        fetchUsers();
        handleCloseDialog();
      } else {
        const data = await response.json();
        alert(data.message || 'Operation failed');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5005/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (err) {
      alert('Network error');
    }
  };

  return (
    <Box sx={{ backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 56px)', width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '24px', mb: 0.5 }}>
            User Management
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', fontSize: '13px' }}>
            Manage platform users, roles, and permissions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            bgcolor: '#1976d2',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '13px',
            '&:hover': { bgcolor: '#1565c0' }
          }}
        >
          Add User
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px', mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: showFilters ? 2 : 0 }}>
            <TextField
              fullWidth
              label="Search Users"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#e2e8f0' },
                  '&:hover fieldset': { borderColor: '#cbd5e1' },
                },
                fontSize: '13px'
              }}
            />
            <Button
              variant={showFilters ? "contained" : "outlined"}
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{ bgcolor: showFilters ? '#1976d2' : 'transparent', '&:hover': { bgcolor: showFilters ? '#1565c0' : '#f8fafc' } }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </Box>

          {/* Filters Panel */}
          {showFilters && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small" sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#e2e8f0' },
                  }
                }}>
                  <InputLabel>Role</InputLabel>
                  <Select
                    label="Role"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                  >
                    <MenuItem value="">All Roles</MenuItem>
                    <MenuItem value="foodie">Foodie</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="super_admin">Super Admin</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small" sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#e2e8f0' },
                  }
                }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                    <MenuItem value="none">None (Foodie Only)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  onClick={() => { setSearchTerm(''); setFilterRole(''); setFilterStatus(''); }}
                  sx={{ height: '100%' }}
                >
                  Clear All
                </Button>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

      {/* Users List */}
      <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: '8px' }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', backgroundColor: '#f5f5f5' }}>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('name')}
                    >
                      Name {getSortIcon('name')}
                    </th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('email')}
                    >
                      Email {getSortIcon('email')}
                    </th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('role')}
                    >
                      Role {getSortIcon('role')}
                    </th>
                    <th 
                      style={{ textAlign: 'left', padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleSort('role_cook_status')}
                    >
                      Cook Status {getSortIcon('role_cook_status')}
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                        <Typography color="textSecondary">No users found.</Typography>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr 
                        key={user._id} 
                        style={{ 
                          borderBottom: '1px solid #eee',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>{user.name}</Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2" sx={{ color: '#4a4a4a' }}>{user.email}</Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Chip
                            label={user.role}
                            size="small"
                            sx={{
                              fontSize: '11px',
                              fontWeight: 500,
                              bgcolor: (user.role === 'admin' || user.role === 'super_admin') ? '#1976d210' : '#f8fafc',
                              color: (user.role === 'admin' || user.role === 'super_admin') ? '#1976d2' : '#64748b',
                              border: '1px solid ' + ((user.role === 'admin' || user.role === 'super_admin') ? '#1976d2' : '#e2e8f0'),
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px' }}>
                          {user.role_cook_status !== 'none' ? (
                            <Chip
                              label={user.role_cook_status}
                              size="small"
                              sx={{
                                fontSize: '11px',
                                fontWeight: 500,
                                bgcolor: user.role_cook_status === 'pending' ? '#f59e0b10' : user.role_cook_status === 'active' ? '#10b98110' : '#ef444410',
                                color: user.role_cook_status === 'pending' ? '#f59e0b' : user.role_cook_status === 'active' ? '#10b981' : '#ef4444',
                                border: 'none',
                                textTransform: 'capitalize'
                              }}
                            />
                          ) : (
                            <Chip label="Not a Cook" size="small" variant="outlined" sx={{ fontSize: '11px', color: '#64748b' }} />
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Button
                            size="small"
                            startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                            onClick={() => handleOpenDialog(user)}
                            sx={{
                              mr: 1,
                              fontSize: '12px',
                              color: '#1976d2',
                              '&:hover': { bgcolor: '#1976d210' }
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                            onClick={() => handleDeleteUser(user._id)}
                            sx={{ fontSize: '12px' }}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, fontSize: '16px', color: '#1a1a1a' }}>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              variant="outlined"
              margin="normal"
              size="small"
              value={editingUser?.name || ''}
              onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Email"
              variant="outlined"
              margin="normal"
              type="email"
              size="small"
              value={editingUser?.email || ''}
              onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
            />
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={editingUser?.role || 'foodie'}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
              >
                <MenuItem value="foodie">Foodie</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="super_admin">Super Admin</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={editingUser?.role_cook_status || 'none'}
                onChange={(e) => setEditingUser({ ...editingUser, role_cook_status: e.target.value })}
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ color: '#64748b', fontSize: '13px' }}>Cancel</Button>
          <Button
            onClick={handleSaveUser}
            variant="contained"
            sx={{
              bgcolor: '#1976d2',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '13px',
              '&:hover': { bgcolor: '#1565c0' }
            }}
          >
            {editingUser ? 'Update' : 'Add'} User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;