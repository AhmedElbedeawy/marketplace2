import React from 'react';
import { Card, CardContent, Typography, Box, Divider, Chip } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { getCountryContext } from '../utils/countryContext';

const OrderSummary = ({ session }) => {
  const { language, isRTL } = useLanguage();

  const pricing = session?.pricingBreakdown || {};
  const context = getCountryContext(pricing.countryCode);
  const currency = pricing.currencyCode || context.currencyCode;
  
  if (session && localStorage.getItem('VAT_DEBUG_ENABLED') === 'true') {
    console.log('📦 [DEBUG] OrderSummary Pricing Breakdown:', pricing);
  }

  const cartSnapshot = session?.cartSnapshot || [];
  const appliedCoupon = session?.appliedCoupon;

  // VAT Debug Panel (Dev Only)
  const renderDebugPanel = () => {
    // Check if debug panel is enabled via localStorage
    const isDebugEnabled = localStorage.getItem('VAT_DEBUG_ENABLED') === 'true';
    if (!pricing || !pricing.debug || !isDebugEnabled) return null;
    const { debug } = pricing;
    return (
      <Box sx={{ 
        mt: 3, 
        p: 2, 
        border: '1px dashed red', 
        bgcolor: '#fff5f5', 
        borderRadius: 2,
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        direction: 'ltr', // Always LTR for debug info
        textAlign: 'left'
      }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'red', display: 'block', mb: 1 }}>
          VAT DEBUG PANEL (DEV ONLY)
        </Typography>
        <div>selectedCountryFromButton: {debug.selectedCountryFromButton}</div>
        <div>resolvedCountryCode: {debug.resolvedCountryCode}</div>
        <div>resolvedCurrencyCode: {debug.resolvedCurrencyCode}</div>
        <div>settingsLookupKeyUsed: {debug.settingsLookupKeyUsed}</div>
        <div style={{ color: 'blue', fontWeight: 'bold' }}>
          localStorage.platformCountryCode: {localStorage.getItem('platformCountryCode')}
        </div>
        <div>checkoutVatEnabled: {debug.checkoutVatEnabled ? 'YES' : 'NO'}</div>
        <div>checkoutVatRate: {debug.checkoutVatRate}%</div>
        <Divider sx={{ my: 1 }} />
        <div>subtotal: {debug.subtotal?.toFixed(2)}</div>
        <div>deliveryFee: {debug.deliveryFee?.toFixed(2)}</div>
        <div>grossTotal: {debug.grossTotal?.toFixed(2)}</div>
        <div>netTotal: {debug.netTotal?.toFixed(2)}</div>
        <div>vatAmount: {debug.vatAmount?.toFixed(2)}</div>
        <div>finalTotal: {debug.finalTotal?.toFixed(2)}</div>
      </Box>
    );
  };

  const formatCurrency = (amount) => {
    const val = Number(amount) || 0;
    if (language === 'ar') {
      const arCurrency = currency === 'SAR' ? 'ر.س' : (currency === 'EGP' ? 'ج.م' : (currency === 'AED' ? 'د.إ' : (currency === 'KWD' ? 'د.ك' : (currency === 'QAR' ? 'ر.ق' : currency))));
      return `${val.toFixed(2)} ${arCurrency}`;
    }
    return `${currency} ${val.toFixed(2)}`;
  };

  return (
    <Card
      sx={{
        borderRadius: '16px',
        position: 'sticky',
        top: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: '#2C2C2C' }}>
          {language === 'ar' ? 'ملخص الطلب' : 'Order Summary'}
        </Typography>

        {/* Cart Items */}
        <Box sx={{ mb: 3 }}>
          {cartSnapshot.map((item, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mb: 2,
                alignItems: 'flex-start'
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C2C2C' }}>
                  {item.dishName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  {language === 'ar' ? 'الكمية' : 'Qty'}: {item.quantity}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C2C2C' }}>
                {formatCurrency(item.unitPrice * item.quantity)}
              </Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Applied Coupon */}
        {appliedCoupon && (
          <Box sx={{ mb: 2 }}>
            <Chip
              label={`${language === 'ar' ? 'كوبون' : 'Coupon'}: ${appliedCoupon.code}`}
              size="small"
              sx={{
                bgcolor: '#F0FDF4',
                color: '#10B981',
                fontWeight: 600,
                fontSize: '12px'
              }}
            />
          </Box>
        )}

        {/* Pricing Breakdown */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              {language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatCurrency(pricing.subtotal)}
            </Typography>
          </Box>

          {pricing.couponDiscount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" sx={{ color: '#10B981' }}>
                {language === 'ar' ? 'خصم الكوبون' : 'Coupon Discount'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#10B981' }}>
                -{formatCurrency(pricing.couponDiscount)}
              </Typography>
            </Box>
          )}

          {pricing.autoDiscount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" sx={{ color: '#10B981' }}>
                {language === 'ar' ? 'خصم تلقائي' : 'Auto Discount'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#10B981' }}>
                -{formatCurrency(pricing.autoDiscount)}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              {language === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatCurrency(pricing.deliveryFee)}
            </Typography>
          </Box>

          {pricing.vatAmount > 0 && pricing.vatRate > 0 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#6B7280' }}>
                  {language === 'ar' ? 'المجموع بدون الضريبة' : 'Net Total'}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatCurrency(pricing.netTotal || (pricing.total - (pricing.vatAmount || 0)))}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#6B7280' }}>
                  {pricing.vatLabel?.includes(`(${pricing.vatRate}%)`) ? pricing.vatLabel : `${pricing.vatLabel || 'VAT'} (${pricing.vatRate}%)`}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatCurrency(pricing.vatAmount)}
                </Typography>
              </Box>
            </>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {pricing.vatAmount > 0 && pricing.vatRate > 0 && (
          <Typography variant="caption" sx={{ display: 'block', mb: 2, color: '#6B7280', fontStyle: 'italic', textAlign: 'center' }}>
            {language === 'ar' 
              ? `الأسعار تشمل ${pricing.vatRate}% ضريبة القيمة المضافة` 
              : `Prices include ${pricing.vatRate}% ${pricing.vatLabel || 'VAT'}`}
          </Typography>
        )}

        {/* Total */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C2C2C' }}>
            {language === 'ar' ? 'الإجمالي' : 'Total'}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#FF7A00' }}>
            {formatCurrency(pricing.total)}
          </Typography>
        </Box>

        {renderDebugPanel()}
      </CardContent>
    </Card>
  );
};

export default OrderSummary;
