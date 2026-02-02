import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Alert, 
  CircularProgress,
  Divider
} from '@mui/material';
import { 
  ArrowBack as BackIcon,
  Warning as WarningIcon,
  SupportAgent as SupportIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../utils/api';

const SuspendedNoticePage = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [suspensionReason, setSuspensionReason] = useState(null);
  const [suspensionDetails, setSuspensionDetails] = useState(null);
  const [hasUnpaidInvoice, setHasUnpaidInvoice] = useState(false);

  // Get deep link parameters
  const notificationId = searchParams.get('notificationId');
  const issueType = searchParams.get('type');

  useEffect(() => {
    fetchSuspensionInfo();
  }, []);

  const fetchSuspensionInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      if (!user || !user.role_cook) {
        setLoading(false);
        return;
      }

      // Fetch cook details to get suspension reason
      const cookResponse = await api.get(`/cooks/${user.role_cook}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (cookResponse.data.suspensionReason) {
        setSuspensionReason(cookResponse.data.suspensionReason);
        setSuspensionDetails(cookResponse.data.suspensionDetails || {});
        
        // If suspension is due to unpaid invoice, check for unpaid invoices
        if (cookResponse.data.suspensionReason === 'unpaid_invoice') {
          try {
            const invoicesResponse = await api.get('/cook/invoices?status=issued,locked', {
              headers: { Authorization: `Bearer ${token}` }
            });
            setHasUnpaidInvoice(invoicesResponse.data.data && invoicesResponse.data.data.length > 0);
          } catch (err) {
            console.error('Error fetching invoices:', err);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching suspension info:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F5F5', p: 3 }}>
      <Card sx={{ maxWidth: 500, width: '100%', textAlign: 'center', p: 2 }}>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box component="img" src="/assets/icons/Suspended.png" sx={{ width: 80, height: 80, mb: 2 }} onError={(e) => e.target.style.display = 'none'} />
              <Typography variant="h5" color="error" sx={{ fontWeight: 700, mb: 2 }}>
                {language === 'ar' ? 'تم تعليق حساب الشيف' : 'Cook Account Suspended'}
              </Typography>
              
              {suspensionReason === 'unpaid_invoice' && hasUnpaidInvoice ? (
                <>
                  <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      {language === 'ar' ? 'السبب: فاتورة غير مدفوعة' : 'Reason: Unpaid Invoice'}
                    </Typography>
                    <Typography variant="body2">
                      {language === 'ar' 
                        ? 'تم تعليق حسابك بسبب فاتورة معلقة. يرجى سداد فاتورتك لاستعادة الوصول إلى مركز الشيف.'
                        : 'Your account has been suspended due to a pending invoice. Please pay your invoice to restore access to the Cook Hub.'}
                    </Typography>
                  </Alert>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button 
                      variant="contained" 
                      onClick={() => navigate('/invoices')}
                      sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E66E00' } }}
                    >
                      {language === 'ar' ? 'عرض الفواتير' : 'View Invoices'}
                    </Button>
                    <Button 
                      variant="outlined" 
                      onClick={() => navigate('/')}
                    >
                      {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  <Box component="img" src="/assets/icons/Suspended.png" sx={{ width: 80, height: 80, mb: 2 }} onError={(e) => e.target.style.display = 'none'} />
                  <Typography variant="h5" color="error" sx={{ fontWeight: 700, mb: 2 }}>
                    {language === 'ar' ? 'تم تعليق حساب الشيف' : 'Cook Account Suspended'}
                  </Typography>
                  
                  {/* Issue details from notification */}
                  {issueType === 'cook_suspended' && (
                    <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        {language === 'ar' ? 'سبب التعليق' : 'Suspension Reason'}
                      </Typography>
                      <Typography variant="body2">
                        {language === 'ar' 
                          ? 'تم تعليق حسابك بسبب مخالفة شروط الاستخدام. يرجى مراجعة التفاصيل أدناه.'
                          : 'Your account has been suspended due to a violation of our terms of service. Please review the details below.'}
                      </Typography>
                    </Alert>
                  )}
                  
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
                    {language === 'ar' 
                      ? 'تم تعليق وصولك إلى مركز الشيف مؤقتاً. يمكنك الاستمرار في استخدام التطبيق كعميل (Foodie). يرجى الاتصال بالدعم لمزيد من المعلومات.'
                      : 'Your access to the Cook Hub has been temporarily suspended. You can still use the app as a Foodie. Please contact support for more information.'}
                  </Typography>
                  
                  {/* Support Contact Section */}
                  <Card variant="outlined" sx={{ mb: 3, textAlign: 'left' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <SupportIcon color="primary" />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {language === 'ar' ? 'فريق الدعم' : 'Support Team'}
                        </Typography>
                      </Box>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          support@foodie.com
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PhoneIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          +966-XXX-XXXX
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                  
                  <Button 
                    variant="contained" 
                    onClick={() => navigate('/')}
                    sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E66E00' } }}
                  >
                    {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SuspendedNoticePage;
