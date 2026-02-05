import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Divider,
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminLoginDiagnostic = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState([]);
  const navigate = useNavigate();

  const addDiagnostic = (message) => {
    setDiagnostics(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setDiagnostics([]);
    setLoading(true);

    addDiagnostic('Starting login process...');
    addDiagnostic(`Email: ${email}`);
    addDiagnostic(`Password length: ${password.length}`);

    try {
      addDiagnostic('Making request to http://localhost:5005/api/auth/login');
      
      const response = await axios.post('http://localhost:5005/api/auth/login', {
        email,
        password,
      }, {
        timeout: 10000,
        validateStatus: (status) => status < 500, // Accept 4xx errors for better diagnostics
      });

      addDiagnostic(`Response status: ${response.status}`);
      addDiagnostic(`Response data: ${JSON.stringify(response.data)}`);

      if (response.status === 200) {
        const { token, user } = response.data;
        addDiagnostic(`User role: ${user.role}`);

        if (user.role === 'admin' || user.role === 'super_admin') {
          addDiagnostic('Valid admin user, storing credentials');
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          addDiagnostic('Redirecting to dashboard...');
          navigate('/');
          window.location.reload();
        } else {
          addDiagnostic('User not authorized as admin');
          setError('Not authorized as an admin');
        }
      } else {
        addDiagnostic(`Login failed with status ${response.status}`);
        setError(response.data?.message || `Login failed (${response.status})`);
      }
    } catch (err) {
      addDiagnostic(`Request failed: ${err.message}`);
      if (err.response) {
        addDiagnostic(`Response status: ${err.response.status}`);
        addDiagnostic(`Response data: ${JSON.stringify(err.response.data)}`);
        setError(`Server error: ${err.response.data?.message || err.response.statusText}`);
      } else if (err.request) {
        addDiagnostic('No response received - network error');
        setError('Network error - cannot connect to server. Check if backend is running on port 5005.');
      } else {
        addDiagnostic(`Request setup error: ${err.message}`);
        setError(`Request error: ${err.message}`);
      }
    } finally {
      setLoading(false);
      addDiagnostic('Login process completed');
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setDiagnostics([]);
    setLoading(true);
    addDiagnostic('Starting demo login...');

    try {
      addDiagnostic('Making request to http://localhost:5005/api/auth/demo-login');
      const response = await axios.post('http://localhost:5005/api/auth/demo-login', {
        role: 'admin'
      }, {
        timeout: 10000,
        validateStatus: (status) => status < 500,
      });

      addDiagnostic(`Demo response status: ${response.status}`);
      addDiagnostic(`Demo response data: ${JSON.stringify(response.data)}`);

      if (response.status === 200 && response.data.success) {
        const { token, user } = response.data;
        addDiagnostic('Demo login successful');
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        navigate('/');
        window.location.reload();
      } else {
        addDiagnostic('Demo login failed');
        setError(response.data?.message || 'Demo login failed');
      }
    } catch (err) {
      addDiagnostic(`Demo login error: ${err.message}`);
      if (err.response) {
        addDiagnostic(`Demo response status: ${err.response.status}`);
        setError(`Demo login error: ${err.response.data?.message || err.response.statusText}`);
      } else if (err.request) {
        addDiagnostic('Demo login network error');
        setError('Network error - cannot connect to server for demo login');
      } else {
        setError(`Demo login error: ${err.message}`);
      }
    } finally {
      setLoading(false);
      addDiagnostic('Demo login process completed');
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 10 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" align="center" gutterBottom sx={{ fontWeight: 700 }}>
            Admin Login - Diagnostic Mode
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Email"
              variant="outlined"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Password"
              variant="outlined"
              margin="normal"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              fullWidth
              variant="contained"
              type="submit"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2, bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E56A00' } }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          
          <Divider sx={{ my: 2 }}>OR</Divider>
          
          <Button
            fullWidth
            variant="outlined"
            onClick={handleDemoLogin}
            disabled={loading}
            sx={{ color: '#FF7A00', borderColor: '#FF7A00', '&:hover': { borderColor: '#E56A00' } }}
          >
            Demo Admin Login
          </Button>
        </Paper>

        {diagnostics.length > 0 && (
          <Paper elevation={1} sx={{ p: 2, mt: 2, maxHeight: 200, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>Diagnostic Logs:</Typography>
            {diagnostics.map((log, index) => (
              <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {log}
              </Typography>
            ))}
          </Paper>
        )}
      </Box>
    </Container>
  );
};



export default AdminLoginDiagnostic;