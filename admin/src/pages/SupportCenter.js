import React, { useState, useEffect } from 'react';
import { API_BASE } from '../utils/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Pagination,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  SupportAgent as SupportIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SupportCenter = () => {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchThreads();
  }, [pagination.page]); // eslint-disable-line

  const fetchThreads = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      const response = await axios.get(`${API_BASE}/support/admin/threads`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: pagination.page, limit: 20 },
      });

      if (response.data.success) {
        setThreads(response.data.data.threads || []);
        const p = response.data.data.pagination || {};
        setPagination(prev => ({
          ...prev,
          total: p.total || 0,
          pages: Math.ceil((p.total || 0) / (p.limit || 20)),
        }));
      }
    } catch (err) {
      console.error('fetchThreads error:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      setError('Failed to load support threads. ' + (err.response?.data?.message || 'Check your connection.'));
    } finally {
      setLoading(false);
    }
  };

  const filtered = threads.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (t.user?.name || '').toLowerCase().includes(q) ||
      (t.user?.email || '').toLowerCase().includes(q) ||
      (t.lastMessage || '').toLowerCase().includes(q)
    );
  });

  const formatDate = (raw) => {
    if (!raw) return '—';
    const d = new Date(raw);
    const now = new Date();
    const diffMs = now - d;
    const diffH = diffMs / 3600000;
    if (diffH < 1) return `${Math.round(diffMs / 60000)}m ago`;
    if (diffH < 24) return `${Math.round(diffH)}h ago`;
    if (diffH < 168) return `${Math.round(diffH / 24)}d ago`;
    return d.toLocaleDateString();
  };

  const roleChip = (role) => {
    if (role === 'cook') {
      return (
        <Chip
          label="Cook"
          size="small"
          sx={{ backgroundColor: '#fff3e0', color: '#e65100', fontWeight: 600, fontSize: '11px' }}
        />
      );
    }
    return (
      <Chip
        label="Foodie"
        size="small"
        sx={{ backgroundColor: '#e3f2fd', color: '#1565c0', fontWeight: 600, fontSize: '11px' }}
      />
    );
  };

  return (
    <Box sx={{ p: 0 }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SupportIcon sx={{ color: '#FF7A00', fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
              Support Center
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              User support conversations from the mobile app
            </Typography>
          </Box>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchThreads}
          variant="outlined"
          size="small"
          sx={{ borderColor: '#e2e8f0', color: '#64748b' }}
        >
          Refresh
        </Button>
      </Box>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search by name, email, or message..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 340, backgroundColor: '#fff', borderRadius: 1 }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <Card sx={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#FF7A00' }} />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <SupportIcon sx={{ fontSize: 56, color: '#e0e0e0', mb: 2 }} />
              <Typography variant="body1" sx={{ color: '#94a3b8' }}>
                {search ? 'No results match your search.' : 'No support conversations yet.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                    {['User', 'Role', 'Last Message', 'Date', 'Unread', 'Action'].map(h => (
                      <TableCell
                        key={h}
                        sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', py: 1.5 }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((thread) => (
                    <TableRow
                      key={thread.userId}
                      hover
                      sx={{ '&:last-child td': { border: 0 } }}
                    >
                      {/* User */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              backgroundColor: '#f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <PersonIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                              {thread.user?.name || 'Unknown'}
                            </Typography>
                            <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>
                              {thread.user?.email || ''}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Role */}
                      <TableCell>{roleChip(thread.user?.role)}</TableCell>

                      {/* Last message preview */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {thread.lastSenderRole === 'admin' && (
                            <Typography sx={{ fontSize: '11px', color: '#FF7A00', fontWeight: 600 }}>
                              You:&nbsp;
                            </Typography>
                          )}
                          <Tooltip title={thread.lastMessage || ''}>
                            <Typography
                              sx={{
                                fontSize: '13px',
                                color: '#475569',
                                maxWidth: 280,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {thread.lastMessage
                                ? thread.lastMessage.length > 60
                                  ? `${thread.lastMessage.substring(0, 60)}…`
                                  : thread.lastMessage
                                : '—'}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </TableCell>

                      {/* Date */}
                      <TableCell>
                        <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>
                          {formatDate(thread.lastMessageAt)}
                        </Typography>
                      </TableCell>

                      {/* Unread badge */}
                      <TableCell>
                        {thread.unreadCount > 0 ? (
                          <Badge
                            badgeContent={thread.unreadCount}
                            sx={{
                              '& .MuiBadge-badge': {
                                backgroundColor: '#FF7A00',
                                color: '#fff',
                                fontSize: '11px',
                                minWidth: 20,
                                height: 20,
                                borderRadius: 10,
                              },
                            }}
                          >
                            <Box sx={{ width: 24, height: 24 }} />
                          </Badge>
                        ) : (
                          <Typography sx={{ fontSize: '12px', color: '#d1d5db' }}>—</Typography>
                        )}
                      </TableCell>

                      {/* Action */}
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => navigate(`/support/${thread.userId}`)}
                          variant="outlined"
                          sx={{
                            borderColor: '#FF7A00',
                            color: '#FF7A00',
                            fontSize: '12px',
                            '&:hover': { backgroundColor: '#fff5ee', borderColor: '#FF7A00' },
                          }}
                        >
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {pagination.pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={pagination.pages}
            page={pagination.page}
            onChange={(_, p) => setPagination(prev => ({ ...prev, page: p }))}
            sx={{ '& .MuiPaginationItem-root.Mui-selected': { backgroundColor: '#FF7A00', color: '#fff' } }}
          />
        </Box>
      )}
    </Box>
  );
};

export default SupportCenter;
