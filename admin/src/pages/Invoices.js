import React, { useState, useEffect, useCallback } from 'react';
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
  TextField,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Link as LinkIcon,
  CheckCircle as PaidIcon,
  ReceiptLong as GenerateIcon,
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import api from '../utils/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { value: 'current-cycle', label: 'Current Cycle' },
  { value: 'unpaid',        label: 'Unpaid' },
  { value: 'paid',          label: 'Paid' },
  { value: 'overdue',       label: 'Overdue' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isOverdue = (inv) => {
  if (inv.status === 'paid' || inv.status === 'void') return false;
  return inv.dueAt && new Date(inv.dueAt) < new Date();
};

const statusLabel = (inv) => (isOverdue(inv) ? 'OVERDUE' : inv.status.toUpperCase());

const statusColor = (inv) => {
  if (isOverdue(inv)) return 'error';
  const map = { draft: 'default', issued: 'warning', locked: 'warning', paid: 'success', void: 'default' };
  return map[inv.status] || 'default';
};

const fmt = (n, currency = 'SAR') =>
  n != null ? `${Number(n).toFixed(2)} ${currency}` : '—';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** Return today's date as a YYYY-MM-DD string for date inputs */
const todayStr = () => new Date().toISOString().slice(0, 10);

/** Return first day of current month as YYYY-MM-DD */
const firstOfMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

/** Return last day of current month as YYYY-MM-DD */
const lastOfMonthStr = () => {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return last.toISOString().slice(0, 10);
};

// ─── Component ────────────────────────────────────────────────────────────────

const Invoices = () => {
  const [tab, setTab] = useState('current-cycle');
  const [invoices, setInvoices]           = useState([]);
  const [cyclePreview, setCyclePreview]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');

  // View details
  const [viewInvoice, setViewInvoice]     = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Payment link dialog
  const [linkDialog, setLinkDialog]       = useState(null);
  const [linkInput, setLinkInput]         = useState('');
  const [linkSaving, setLinkSaving]       = useState(false);

  // Mark paid dialog
  const [markPaidDialog, setMarkPaidDialog]   = useState(null);
  const [markPaidSaving, setMarkPaidSaving]   = useState(false);

  // Generate dialog
  const [genDialog, setGenDialog]     = useState(false);
  const [genStart, setGenStart]       = useState(firstOfMonthStr());
  const [genEnd, setGenEnd]           = useState(lastOfMonthStr());
  const [genSaving, setGenSaving]     = useState(false);
  const [genResult, setGenResult]     = useState(null); // last generation summary

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchCurrentCycle = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/invoices/admin/invoices/current-cycle');
      setCyclePreview(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load current cycle data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const statusParam = tab === 'unpaid' ? 'unpaid'
        : tab === 'paid'    ? 'paid'
        : tab === 'overdue' ? 'overdue'
        : 'all';
      const res = await api.get('/invoices/admin/invoices', { params: { status: statusParam, limit: 100 } });
      setInvoices(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'current-cycle') {
      fetchCurrentCycle();
    } else {
      fetchInvoices();
    }
  }, [tab, fetchCurrentCycle, fetchInvoices]);

  // ── View details ────────────────────────────────────────────────────────────

  const openViewInvoice = async (inv) => {
    setViewInvoice(inv);
    setDetailLoading(true);
    try {
      const res = await api.get(`/invoices/admin/invoices/${inv._id}`);
      setViewInvoice(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoice detail');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Payment link ────────────────────────────────────────────────────────────

  const openLinkDialog = (inv) => {
    setLinkInput(inv.paymentLink || '');
    setLinkDialog(inv);
  };

  const handleSaveLink = async () => {
    if (!linkInput.trim()) return;
    setLinkSaving(true);
    try {
      await api.put(`/invoices/admin/invoices/${linkDialog._id}/payment-link`, {
        paymentLink: linkInput.trim(),
      });
      setSuccess('Payment link saved. Cook was notified.');
      setLinkDialog(null);
      if (tab === 'current-cycle') fetchCurrentCycle(); else fetchInvoices();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save payment link');
    } finally {
      setLinkSaving(false);
    }
  };

  // ── Mark paid ───────────────────────────────────────────────────────────────

  const handleMarkPaid = async () => {
    setMarkPaidSaving(true);
    try {
      await api.post(`/invoices/admin/invoices/${markPaidDialog._id}/mark-paid`, {
        autoUnsuspend: true,
      });
      setSuccess('Invoice marked as paid.');
      setMarkPaidDialog(null);
      fetchInvoices();
      if (tab === 'current-cycle') fetchCurrentCycle();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark as paid');
    } finally {
      setMarkPaidSaving(false);
    }
  };

  // ── Generate all invoices ───────────────────────────────────────────────────

  const openGenDialog = () => {
    setGenResult(null);
    setGenStart(firstOfMonthStr());
    setGenEnd(lastOfMonthStr());
    setGenDialog(true);
  };

  const handleGenerate = async () => {
    if (!genStart || !genEnd) {
      setError('Period start and end dates are required');
      return;
    }
    if (genStart > genEnd) {
      setError('Start date must be before end date');
      return;
    }
    setGenSaving(true);
    try {
      const res = await api.post('/invoices/admin/invoices/generate-all', {
        periodStart: genStart,
        periodEnd: genEnd,
      });
      setGenResult(res.data.data);
      setSuccess(res.data.message);
      // Refresh both tabs
      fetchCurrentCycle();
      if (tab !== 'current-cycle') fetchInvoices();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate invoices');
    } finally {
      setGenSaving(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderCurrentCycleTab = () => (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#f8fafc' }}>
            {[
              'Cook', 'Country', 'Cycle Start', 'Cycle End',
              'Gross Sales', 'Sales VAT', 'Platform Fee', 'Fee VAT',
              'Est. Total', 'Orders', 'Last Invoiced'
            ].map((h) => (
              <TableCell key={h} sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', py: 1.25 }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {cyclePreview.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" color="textSecondary">No active cooks found</Typography>
              </TableCell>
            </TableRow>
          ) : cyclePreview.map((row) => (
            <TableRow key={row.cookId} hover sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
              <TableCell sx={{ fontSize: '12px', fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.cookName || '—'}
              </TableCell>
              <TableCell sx={{ fontSize: '12px' }}>{row.countryCode || '—'}</TableCell>
              <TableCell sx={{ fontSize: '12px' }}>{fmtDate(row.cycleStart)}</TableCell>
              <TableCell sx={{ fontSize: '12px' }}>{fmtDate(row.cycleEnd)}</TableCell>
              <TableCell sx={{ fontSize: '12px' }}>{fmt(row.grossSales, row.currency)}</TableCell>
              <TableCell sx={{ fontSize: '12px', color: '#6b7280' }}>{fmt(row.salesVat, row.currency)}</TableCell>
              <TableCell sx={{ fontSize: '12px', color: '#e67e22' }}>{fmt(row.platformFee, row.currency)}</TableCell>
              <TableCell sx={{ fontSize: '12px', color: '#6b7280' }}>{fmt(row.platformFeeVat, row.currency)}</TableCell>
              <TableCell sx={{ fontSize: '12px', fontWeight: 700, color: '#1a1a1a' }}>
                {fmt(row.estimatedTotal, row.currency)}
              </TableCell>
              <TableCell sx={{ fontSize: '12px' }}>
                <Chip
                  label={row.orderCount}
                  size="small"
                  color={row.orderCount > 0 ? 'primary' : 'default'}
                  sx={{ fontSize: '11px', height: 20 }}
                />
              </TableCell>
              <TableCell sx={{ fontSize: '11px', color: '#9ca3af' }}>
                {row.lastInvoicedPeriod || 'Never'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderInvoicesTab = () => (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#f8fafc' }}>
            {[
              'Invoice #', 'Cook', 'Country', 'Period', 'Issued',
              'Gross', 'Sales VAT', 'Platform Fee', 'Fee VAT', 'Total Due',
              'Status', 'Payment Link', 'Actions'
            ].map((h) => (
              <TableCell key={h} sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', py: 1.25 }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {invoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" color="textSecondary">No invoices found</Typography>
              </TableCell>
            </TableRow>
          ) : invoices.map((inv) => (
            <TableRow key={inv._id} hover sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
              <TableCell sx={{ fontSize: '12px', fontFamily: 'monospace' }}>{inv.invoiceNumber}</TableCell>
              <TableCell sx={{ fontSize: '12px', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {inv.cook?.storeName || inv.cook?.name || '—'}
              </TableCell>
              <TableCell sx={{ fontSize: '12px' }}>{inv.countryCode || inv.cook?.countryCode || '—'}</TableCell>
              <TableCell sx={{ fontSize: '12px', fontWeight: 500 }}>{inv.periodMonth}</TableCell>
              <TableCell sx={{ fontSize: '11px', color: '#6b7280' }}>{fmtDate(inv.issuedAt)}</TableCell>
              <TableCell sx={{ fontSize: '12px' }}>{fmt(inv.grossAmount, inv.currency)}</TableCell>
              <TableCell sx={{ fontSize: '12px', color: '#6b7280' }}>{fmt(inv.salesVatAmount, inv.currency)}</TableCell>
              <TableCell sx={{ fontSize: '12px', color: '#e67e22' }}>
                {fmt(inv.commissionAmount, inv.currency)}
                {inv.commissionRate > 0 && (
                  <Typography component="span" sx={{ fontSize: '10px', color: '#9ca3af', ml: 0.5 }}>
                    ({inv.commissionRate}%)
                  </Typography>
                )}
              </TableCell>
              <TableCell sx={{ fontSize: '12px', color: '#6b7280' }}>{fmt(inv.vatAmount, inv.currency)}</TableCell>
              <TableCell sx={{ fontSize: '12px', fontWeight: 700, color: '#1a1a1a' }}>{fmt(inv.amountDue, inv.currency)}</TableCell>
              <TableCell>
                <Chip
                  label={statusLabel(inv)}
                  color={statusColor(inv)}
                  size="small"
                  sx={{ fontSize: '11px', height: 22 }}
                />
              </TableCell>
              <TableCell sx={{ fontSize: '11px' }}>
                {inv.paymentLink ? (
                  <Tooltip title={inv.paymentLink}>
                    <Chip
                      label="Set"
                      size="small"
                      color="success"
                      sx={{ fontSize: '10px', height: 20, cursor: 'pointer' }}
                      onClick={() => openLinkDialog(inv)}
                    />
                  </Tooltip>
                ) : (
                  <Chip
                    label="None"
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '10px', height: 20, color: '#9ca3af', borderColor: '#e2e8f0' }}
                  />
                )}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="View Details">
                    <IconButton size="small" onClick={() => openViewInvoice(inv)} sx={{ color: '#64748b' }}>
                      <VisibilityIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={inv.paymentLink ? 'Update Payment Link' : 'Add Payment Link'}>
                    <IconButton size="small" onClick={() => openLinkDialog(inv)} sx={{ color: '#1976d2' }}>
                      <LinkIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  {inv.status !== 'paid' && inv.status !== 'void' && (
                    <Tooltip title="Mark as Paid">
                      <IconButton size="small" onClick={() => setMarkPaidDialog(inv)} sx={{ color: '#27ae60' }}>
                        <PaidIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 56px)', width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '24px', mb: 0.5 }}>
            Invoices & Payouts
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', fontSize: '13px' }}>
            Manage cook monthly invoices, payment links, and payout status
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton
              size="small"
              onClick={() => tab === 'current-cycle' ? fetchCurrentCycle() : fetchInvoices()}
              sx={{ color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<GenerateIcon />}
            onClick={openGenDialog}
            sx={{
              bgcolor: '#1976d2',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '13px',
              '&:hover': { bgcolor: '#1565c0' },
            }}
          >
            Generate Invoices
          </Button>
        </Box>
      </Box>

      {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: '1px solid #e2e8f0', px: 2, minHeight: 44 }}
          TabIndicatorProps={{ style: { backgroundColor: '#1976d2' } }}
        >
          {TABS.map((t) => (
            <Tab
              key={t.value}
              value={t.value}
              label={t.label}
              sx={{ textTransform: 'none', fontSize: '13px', fontWeight: 500, minHeight: 44 }}
            />
          ))}
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : tab === 'current-cycle' ? (
          renderCurrentCycleTab()
        ) : (
          renderInvoicesTab()
        )}
      </Paper>

      {/* ── View Details Dialog ──────────────────────────────────────────────── */}
      <Dialog open={Boolean(viewInvoice)} onClose={() => setViewInvoice(null)} maxWidth="md" fullWidth>
        {viewInvoice && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 700 }}>
                  Invoice {viewInvoice.invoiceNumber}
                </Typography>
                <IconButton size="small" onClick={() => setViewInvoice(null)}><CloseIcon /></IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {/* Summary grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                {[
                  ['Cook',      viewInvoice.cook?.storeName || viewInvoice.cook?.name || '—'],
                  ['Country',   viewInvoice.countryCode || viewInvoice.cook?.countryCode || '—'],
                  ['Period',    viewInvoice.periodMonth],
                  ['Status',    statusLabel(viewInvoice)],
                  ['Issued',    fmtDate(viewInvoice.issuedAt)],
                  ['Due',       fmtDate(viewInvoice.dueAt)],
                  ['Currency',  viewInvoice.currency],
                  ['Invoice #', viewInvoice.invoiceNumber],
                ].map(([k, v]) => (
                  <Box key={k}>
                    <Typography variant="body2" color="textSecondary" sx={{ fontSize: '11px' }}>{k}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '13px' }}>{v}</Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Financial breakdown */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Financial Breakdown</Typography>
              {[
                ['Gross Sales',                                                        fmt(viewInvoice.grossAmount, viewInvoice.currency),    '#1a1a1a'],
                [`Sales VAT${viewInvoice.vatSnapshot?.salesVatRate ? ` (${viewInvoice.vatSnapshot.salesVatRate}%)` : ''}`, fmt(viewInvoice.salesVatAmount, viewInvoice.currency), '#6b7280'],
                [`Platform Fee (${viewInvoice.commissionRate}%)`,                     fmt(viewInvoice.commissionAmount, viewInvoice.currency), '#e67e22'],
                [`${viewInvoice.vatSnapshot?.vatLabel || 'VAT'} on Fee${viewInvoice.vatSnapshot?.vatRate ? ` (${viewInvoice.vatSnapshot.vatRate}%)` : ''}`, fmt(viewInvoice.vatAmount, viewInvoice.currency), '#6b7280'],
              ].map(([label, value, color]) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography variant="body2" sx={{ fontSize: '13px', color: '#374151' }}>{label}</Typography>
                  <Typography variant="body2" sx={{ fontSize: '13px', color, fontWeight: 500 }}>{value}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>Total Due (Cook Owes)</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#1976d2' }}>
                  {fmt(viewInvoice.amountDue, viewInvoice.currency)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '12px' }}>Cook Keeps (Net)</Typography>
                <Typography variant="body2" sx={{ color: '#27ae60', fontWeight: 600, fontSize: '12px' }}>
                  {fmt(viewInvoice.netAmount, viewInvoice.currency)}
                </Typography>
              </Box>

              {/* Payment link */}
              {viewInvoice.paymentLink && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Payment Link</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: '#f0f9ff', borderRadius: 1, border: '1px solid #bae6fd' }}>
                    <Typography variant="body2" sx={{ fontSize: '12px', flex: 1, wordBreak: 'break-all', color: '#1976d2' }}>
                      {viewInvoice.paymentLink}
                    </Typography>
                    <IconButton size="small" onClick={() => window.open(viewInvoice.paymentLink, '_blank', 'noopener,noreferrer')}>
                      <OpenInNewIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </>
              )}

              {/* Order breakdown — 3 lines per order */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Order Breakdown</Typography>
              {detailLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={22} />
                </Box>
              ) : viewInvoice.lineItems && viewInvoice.lineItems.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '6px' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        {['Order', 'Date', 'Line', 'Amount'].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 600, fontSize: '11px', color: '#64748b', py: 1 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {viewInvoice.lineItems.map((li, i) => {
                        const orderRef = li.order?.orderNumber || li.order?._id?.toString().slice(-6) || '—';
                        const orderDate = li.order?.createdAt
                          ? new Date(li.order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—';
                        const currency = viewInvoice.currency;
                        return (
                          <React.Fragment key={i}>
                            {/* Row 1: Sales VAT */}
                            <TableRow sx={{ '& td': { borderBottom: 0, py: 0.5 } }}>
                              <TableCell sx={{ fontSize: '11px', fontFamily: 'monospace' }}>{orderRef}</TableCell>
                              <TableCell sx={{ fontSize: '11px' }}>{orderDate}</TableCell>
                              <TableCell sx={{ fontSize: '11px', color: '#6b7280' }}>Sales VAT</TableCell>
                              <TableCell sx={{ fontSize: '11px', color: '#6b7280' }}>{fmt(li.salesVat ?? 0, currency)}</TableCell>
                            </TableRow>
                            {/* Row 2: Selling Fees */}
                            <TableRow sx={{ '& td': { borderBottom: 0, py: 0.5 } }}>
                              <TableCell />
                              <TableCell />
                              <TableCell sx={{ fontSize: '11px', color: '#e67e22' }}>Selling Fees</TableCell>
                              <TableCell sx={{ fontSize: '11px', color: '#e67e22' }}>{fmt(li.commission, currency)}</TableCell>
                            </TableRow>
                            {/* Row 3: Fees VAT */}
                            <TableRow sx={{ '& td': { py: 0.5, borderBottom: i < viewInvoice.lineItems.length - 1 ? '1px solid #f1f5f9' : 0 } }}>
                              <TableCell />
                              <TableCell />
                              <TableCell sx={{ fontSize: '11px', color: '#6b7280' }}>Fees VAT</TableCell>
                              <TableCell sx={{ fontSize: '11px', color: '#6b7280' }}>{fmt(li.vat ?? 0, currency)}</TableCell>
                            </TableRow>
                          </React.Fragment>
                        );
                      })}
                      {/* Totals row */}
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell colSpan={2} sx={{ fontSize: '11px', fontWeight: 700, py: 1 }}>Totals</TableCell>
                        <TableCell sx={{ fontSize: '11px', fontWeight: 700 }}>
                          Sales VAT {fmt(viewInvoice.salesVatAmount, viewInvoice.currency)}<br />
                          <span style={{ color: '#e67e22' }}>Platform Fee {fmt(viewInvoice.commissionAmount, viewInvoice.currency)}</span><br />
                          Fees VAT {fmt(viewInvoice.vatAmount, viewInvoice.currency)}
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 700, color: '#1976d2' }}>
                          {fmt(viewInvoice.amountDue, viewInvoice.currency)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" sx={{ fontSize: '12px', color: '#9ca3af' }}>
                  No order line items recorded for this invoice.
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewInvoice(null)} sx={{ textTransform: 'none', fontSize: '13px' }}>
                Close
              </Button>
              <Button
                variant="outlined"
                onClick={() => { setViewInvoice(null); openLinkDialog(viewInvoice); }}
                sx={{ textTransform: 'none', fontSize: '13px' }}
              >
                {viewInvoice.paymentLink ? 'Update Payment Link' : 'Add Payment Link'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Payment Link Dialog ──────────────────────────────────────────────── */}
      <Dialog open={Boolean(linkDialog)} onClose={() => !linkSaving && setLinkDialog(null)} maxWidth="sm" fullWidth>
        {linkDialog && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 700 }}>
                  {linkDialog.paymentLink ? 'Update Payment Link' : 'Add Payment Link'}
                </Typography>
                <IconButton size="small" onClick={() => setLinkDialog(null)} disabled={linkSaving}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 2, color: '#64748b', fontSize: '13px' }}>
                Invoice <strong>{linkDialog.invoiceNumber}</strong> — {linkDialog.periodMonth} — Cook:{' '}
                <strong>{linkDialog.cook?.storeName || linkDialog.cook?.name}</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, fontSize: '13px', color: '#374151' }}>
                Saving this link will notify the cook that their invoice is ready.
              </Typography>
              <TextField
                label="Payoneer / Payment Link URL"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                fullWidth
                size="small"
                placeholder="https://payoneer.com/..."
                sx={{ mt: 1 }}
                autoFocus
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setLinkDialog(null)} disabled={linkSaving} sx={{ textTransform: 'none', fontSize: '13px' }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveLink}
                disabled={linkSaving || !linkInput.trim()}
                sx={{ bgcolor: '#1976d2', textTransform: 'none', fontSize: '13px', '&:hover': { bgcolor: '#1565c0' } }}
              >
                {linkSaving ? <CircularProgress size={18} color="inherit" /> : 'Save & Notify Cook'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Mark Paid Confirm Dialog ─────────────────────────────────────────── */}
      <Dialog open={Boolean(markPaidDialog)} onClose={() => !markPaidSaving && setMarkPaidDialog(null)} maxWidth="xs" fullWidth>
        {markPaidDialog && (
          <>
            <DialogTitle sx={{ fontSize: '16px', fontWeight: 700 }}>Mark Invoice as Paid</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ fontSize: '13px', color: '#374151' }}>
                Mark invoice <strong>{markPaidDialog.invoiceNumber}</strong> ({markPaidDialog.periodMonth}) for{' '}
                <strong>{markPaidDialog.cook?.storeName || markPaidDialog.cook?.name}</strong> as paid?
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontSize: '12px', color: '#64748b' }}>
                If the cook is suspended for unpaid invoices, they will be automatically re-activated.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setMarkPaidDialog(null)} disabled={markPaidSaving} sx={{ textTransform: 'none', fontSize: '13px' }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleMarkPaid}
                disabled={markPaidSaving}
                sx={{ bgcolor: '#27ae60', textTransform: 'none', fontSize: '13px', '&:hover': { bgcolor: '#219653' } }}
              >
                {markPaidSaving ? <CircularProgress size={18} color="inherit" /> : 'Confirm Paid'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Generate Invoices Dialog ─────────────────────────────────────────── */}
      <Dialog open={genDialog} onClose={() => !genSaving && setGenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '16px', fontWeight: 700 }}>Generate Invoices</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3, fontSize: '13px', color: '#64748b' }}>
            Generate invoices for <strong>all eligible cooks</strong> for the selected period.
            Invoices are calculated from delivered/picked-up orders within that date range.
            Cooks with no eligible orders are skipped automatically.
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <TextField
              label="Period Start"
              type="date"
              value={genStart}
              onChange={(e) => setGenStart(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Period End"
              type="date"
              value={genEnd}
              onChange={(e) => setGenEnd(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {genStart && genEnd && (
            <Typography variant="body2" sx={{ fontSize: '12px', color: '#374151', mb: 1 }}>
              Period: <strong>{fmtDate(genStart)}</strong> → <strong>{fmtDate(genEnd)}</strong>
            </Typography>
          )}

          {/* Generation result summary */}
          {genResult && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f0fdf4', borderRadius: 1, border: '1px solid #bbf7d0' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '13px', color: '#166534', mb: 0.5 }}>
                Generation complete
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '12px', color: '#374151' }}>
                ✓ Generated: <strong>{genResult.generated}</strong> &nbsp;
                · Skipped (no orders): <strong>{genResult.skipped}</strong> &nbsp;
                · Errors: <strong>{genResult.errors?.length ?? 0}</strong>
              </Typography>
              {genResult.errors?.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {genResult.errors.map((e, i) => (
                    <Typography key={i} variant="body2" sx={{ fontSize: '11px', color: '#dc2626' }}>
                      {e.cookName}: {e.error}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setGenDialog(false); setGenResult(null); }}
            disabled={genSaving}
            sx={{ textTransform: 'none', fontSize: '13px' }}
          >
            {genResult ? 'Close' : 'Cancel'}
          </Button>
          {!genResult && (
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={genSaving || !genStart || !genEnd || genStart > genEnd}
              sx={{ bgcolor: '#1976d2', textTransform: 'none', fontSize: '13px', '&:hover': { bgcolor: '#1565c0' } }}
            >
              {genSaving ? <CircularProgress size={18} color="inherit" /> : 'Generate Invoices'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Invoices;
