import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../utils/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Send as SendIcon,
  SupportAgent as SupportIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const SupportThread = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [userInfo, setUserInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchThread();
  }, [userId]); // eslint-disable-line

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchThread = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      // GET /api/support/admin/threads/:userId
      const response = await axios.get(
        `${API_BASE}/support/admin/threads/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setUserInfo(response.data.data.user);
        setMessages(response.data.data.messages || []);
      }
    } catch (err) {
      console.error('fetchThread error:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      setError('Failed to load conversation. ' + (err.response?.data?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    const body = replyText.trim();
    if (!body) return;

    try {
      setSending(true);
      const token = localStorage.getItem('token');

      // POST /api/support/admin/threads/:userId/reply
      await axios.post(
        `${API_BASE}/support/admin/threads/${userId}/reply`,
        { body },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      setReplyText('');
      await fetchThread(); // reload to show admin reply
    } catch (err) {
      console.error('sendReply error:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      setError('Failed to send reply. ' + (err.response?.data?.message || ''));
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (raw) => {
    if (!raw) return '';
    const d = new Date(raw);
    const now = new Date();
    const diffMs = now - d;
    const diffH = diffMs / 3600000;
    if (diffH < 1) return `${Math.round(diffMs / 60000)}m ago`;
    if (diffH < 24) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffH < 168) return `${Math.round(diffH / 24)}d ago`;
    return d.toLocaleDateString();
  };

  const formatDateSeparator = (raw) => {
    if (!raw) return '';
    const d = new Date(raw);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'long' });
    return d.toLocaleDateString();
  };

  const isSameDay = (a, b) => {
    const da = new Date(a);
    const db = new Date(b);
    return da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#FF7A00' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto' }}>
      {/* ── Back + header ──────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/support')}
          variant="text"
          sx={{ color: '#64748b', textTransform: 'none', px: 0 }}
        >
          Support Center
        </Button>
      </Box>

      {/* User info card */}
      {userInfo && (
        <Card sx={{ mb: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: 2 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#f1f5f9', width: 44, height: 44 }}>
                <PersonIcon sx={{ color: '#94a3b8' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>
                  {userInfo.name}
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>
                  {userInfo.email}
                </Typography>
              </Box>
              <Chip
                label={userInfo.role === 'cook' ? 'Cook' : 'Foodie'}
                size="small"
                sx={
                  userInfo.role === 'cook'
                    ? { backgroundColor: '#fff3e0', color: '#e65100', fontWeight: 600 }
                    : { backgroundColor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }
                }
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* ── Chat area ──────────────────────────────────────────────────── */}
      <Card sx={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          {/* Messages */}
          <Box
            sx={{
              height: 480,
              overflowY: 'auto',
              p: 2,
              backgroundColor: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
          >
            {messages.length === 0 ? (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <SupportIcon sx={{ fontSize: 48, color: '#e0e0e0', mb: 1 }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: '14px' }}>
                    No messages yet in this conversation.
                  </Typography>
                </Box>
              </Box>
            ) : (
              messages.map((msg, index) => {
                const isAdmin = msg.senderRole === 'admin';
                const showDate =
                  index === 0 ||
                  !isSameDay(messages[index - 1].createdAt, msg.createdAt);

                return (
                  <Box key={msg._id || index}>
                    {/* Date separator */}
                    {showDate && (
                      <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                        <Divider sx={{ flex: 1 }} />
                        <Typography
                          sx={{
                            mx: 2,
                            fontSize: '11px',
                            color: '#94a3b8',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDateSeparator(msg.createdAt)}
                        </Typography>
                        <Divider sx={{ flex: 1 }} />
                      </Box>
                    )}

                    {/* Bubble */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-end',
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      {/* User avatar (left side) */}
                      {!isAdmin && (
                        <Avatar sx={{ width: 28, height: 28, bgcolor: '#e2e8f0' }}>
                          <PersonIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                        </Avatar>
                      )}

                      <Box
                        sx={{
                          maxWidth: '65%',
                          backgroundColor: isAdmin ? '#FFF0E8' : '#ffffff',
                          borderRadius: isAdmin
                            ? '16px 16px 4px 16px'
                            : '16px 16px 16px 4px',
                          px: 2,
                          py: 1.25,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        }}
                      >
                        {isAdmin && (
                          <Typography
                            sx={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#FF7A00',
                              mb: 0.25,
                            }}
                          >
                            Support Team
                          </Typography>
                        )}
                        <Typography sx={{ fontSize: '14px', color: '#1e293b', lineHeight: 1.5 }}>
                          {msg.body}
                        </Typography>
                        <Typography
                          sx={{ fontSize: '10px', color: '#94a3b8', mt: 0.5, textAlign: isAdmin ? 'right' : 'left' }}
                        >
                          {formatTime(msg.createdAt)}
                        </Typography>
                      </Box>

                      {/* Support avatar (right side) */}
                      {isAdmin && (
                        <Avatar sx={{ width: 28, height: 28, bgcolor: '#FF7A00' }}>
                          <SupportIcon sx={{ fontSize: 14, color: '#fff' }} />
                        </Avatar>
                      )}
                    </Box>
                  </Box>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* ── Reply input ─────────────────────────────────────────────── */}
          <Box
            sx={{
              borderTop: '1px solid #e2e8f0',
              p: 2,
              backgroundColor: '#fff',
              display: 'flex',
              gap: 1.5,
              alignItems: 'flex-end',
            }}
          >
            <TextField
              multiline
              maxRows={4}
              fullWidth
              size="small"
              placeholder="Type your reply to the user..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendReply();
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  fontSize: '14px',
                },
              }}
            />
            <Button
              variant="contained"
              onClick={sendReply}
              disabled={sending || !replyText.trim()}
              endIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              sx={{
                backgroundColor: '#FF7A00',
                borderRadius: '12px',
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                minWidth: 110,
                '&:hover': { backgroundColor: '#e06800' },
                '&:disabled': { backgroundColor: '#ffcca3', color: '#fff' },
              }}
            >
              {sending ? 'Sending…' : 'Send Reply'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SupportThread;
