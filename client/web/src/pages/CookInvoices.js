import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Launch as LaunchIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import api from '../utils/api';

const CookInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentInvoice, setCurrentInvoice] = useState(null);

  useEffect(() => {
    fetchInvoices();
    
    // Listen for storage changes (when demo login updates token)
    const handleStorageChange = (e) => {
      if (e.key === 'token' && e.newValue) {
        console.log('Token updated, refetching invoices...');
        fetchInvoices();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/cook/invoices');
      setInvoices(response.data.data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceDetails = async (invoiceId) => {
    try {
      setError('');
      const response = await api.get(`/cook/invoices/${invoiceId}`);
      setSelectedInvoice(response.data.data);
      setDetailsOpen(true);
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      setError(err.response?.data?.message || 'Failed to load invoice details');
    }
  };

  const handlePayInvoice = (invoice) => {
    if (invoice.paymentLink) {
      window.open(invoice.paymentLink, '_blank', 'noopener,noreferrer');
    } else {
      setError('Payment link not available yet. Please contact support.');
    }
    setAnchorEl(null);
  };

  const handleDownloadPDF = async (invoice) => {
    try {
      const response = await api.get(`/cook/invoices/${invoice._id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download PDF. Please try again.');
    }
    setAnchorEl(null);
  };

  const handleMenuOpen = (event, invoice) => {
    setAnchorEl(event.currentTarget);
    setCurrentInvoice(invoice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setCurrentInvoice(null);
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      issued: 'warning',
      locked: 'error',
      paid: 'success',
      void: 'default'
    };
    return colors[status] || 'default';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount, currency = 'SAR') => {
    return `${amount?.toFixed(2)} ${currency}`;
  };



  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography 
        variant="h5" 
        sx={{ 
          fontWeight: 700, 
          mb: 4,
          color: '#333',
          fontSize: '1.75rem'
        }}
      >
        Invoices & Payouts
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#E5DELD' }}>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Invoice #</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Period</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Gross</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Commission</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>VAT</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Net</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Issued Date</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="textSecondary" sx={{ py: 3, display: 'none' }}>
                      No invoices found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice._id} hover sx={{ '&:hover': { bgcolor: '#f9f9f9' } }}>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{invoice.invoiceNumber}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{invoice.periodMonth}</TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.status.toUpperCase()}
                        color={getStatusColor(invoice.status)}
                        size="small"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.875rem' }}>
                      {formatCurrency(invoice.grossAmount, invoice.currency)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.875rem' }}>
                      {formatCurrency(invoice.commissionAmount, invoice.currency)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.875rem' }}>
                      {formatCurrency(invoice.vatAmount, invoice.currency)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.875rem' }}>
                      <strong>{formatCurrency(invoice.netAmount, invoice.currency)}</strong>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{formatDate(invoice.issuedAt)}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, invoice)}
                        sx={{ color: '#666' }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          fetchInvoiceDetails(currentInvoice._id);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        {currentInvoice && (currentInvoice.status === 'issued' || currentInvoice.status === 'locked') && (
          <MenuItem onClick={() => handlePayInvoice(currentInvoice)}>
            <ListItemIcon>
              <LaunchIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Pay Invoice</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => handleDownloadPDF(currentInvoice)}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download PDF</ListItemText>
        </MenuItem>
      </Menu>

      {/* Invoice Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedInvoice && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Invoice Details</Typography>
                <IconButton onClick={() => setDetailsOpen(false)} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {/* Summary Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Summary
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Invoice Number</Typography>
                    <Typography variant="body1">{selectedInvoice.invoiceNumber}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Period</Typography>
                    <Typography variant="body1">{selectedInvoice.periodMonth}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Status</Typography>
                    <Chip
                      label={selectedInvoice.status.toUpperCase()}
                      color={getStatusColor(selectedInvoice.status)}
                      size="small"
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Country</Typography>
                    <Typography variant="body1">{selectedInvoice.countryCode || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Issued Date</Typography>
                    <Typography variant="body1">{formatDate(selectedInvoice.issuedAt)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Due Date</Typography>
                    <Typography variant="body1">{formatDate(selectedInvoice.dueAt)}</Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Amounts Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Financial Breakdown
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Gross Amount</Typography>
                    <Typography variant="body2">
                      {formatCurrency(selectedInvoice.grossAmount, selectedInvoice.currency)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Commission</Typography>
                    <Typography variant="body2" color="error">
                      -{formatCurrency(selectedInvoice.commissionAmount, selectedInvoice.currency)}
                    </Typography>
                  </Box>
                  {selectedInvoice.vatAmount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">
                        {selectedInvoice.vatSnapshot?.vatLabel || 'VAT'}
                      </Typography>
                      <Typography variant="body2" color="error">
                        -{formatCurrency(selectedInvoice.vatAmount, selectedInvoice.currency)}
                      </Typography>
                    </Box>
                  )}
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Net Amount</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {formatCurrency(selectedInvoice.netAmount, selectedInvoice.currency)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Payment Summary */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Payment Summary
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Amount Due</Typography>
                    <Typography variant="body2">
                      {formatCurrency(selectedInvoice.amountDue, selectedInvoice.currency)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Amount Paid</Typography>
                    <Typography variant="body2" color="success.main">
                      {formatCurrency(selectedInvoice.amountPaid, selectedInvoice.currency)}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Outstanding Balance</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {formatCurrency(
                        selectedInvoice.amountDue - selectedInvoice.amountPaid,
                        selectedInvoice.currency
                      )}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Payout History */}
              {selectedInvoice.payouts && selectedInvoice.payouts.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      Payout History
                    </Typography>
                    {selectedInvoice.payouts.map((payout, index) => (
                      <Box
                        key={index}
                        sx={{
                          p: 2,
                          mb: 1,
                          bgcolor: 'grey.50',
                          borderRadius: 1,
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {payout.method.toUpperCase()}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {formatDate(payout.requestedAt)}
                          </Typography>
                        </Box>
                        <Chip
                          label={payout.status.toUpperCase()}
                          color={payout.status === 'completed' ? 'success' : 'warning'}
                          size="small"
                        />
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default CookInvoices;
