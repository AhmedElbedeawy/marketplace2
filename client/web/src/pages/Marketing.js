import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Paper,
} from '@mui/material';
import {
  Campaign as CampaignIcon,
  PlayCircleOutline as ActiveIcon,
  Schedule as UpcomingIcon,
  History as ExpiredIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';

const CURRENCY = 'SAR';

const Marketing = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [expired, setExpired] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/campaigns/impact/my-dishes');
      if (res.data.success) {
        const d = res.data.data;
        setActive(d.active || []);
        setUpcoming(d.upcoming || []);
        setExpired(d.expired || []);
        setSummary(d.summary || null);
      } else {
        setError(res.data.message || 'Failed to load');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  const hasAnyCampaign = active.length > 0 || upcoming.length > 0 || expired.length > 0;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#FF7A00' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAF5F3', px: '52px', py: 3, direction: isAr ? 'rtl' : 'ltr' }}>
      {/* Title */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B', mb: 0.5 }}>
          {isAr ? 'التسويق' : 'Marketing Campaigns'}
        </Typography>
        <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '14px' }}>
          {isAr
            ? 'الحملات التي تؤثر على أطباقك'
            : 'Campaigns affecting your dishes'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {/* Summary strip */}
      {summary && hasAnyCampaign && (
        <Paper sx={{ p: 2.5, mb: 3, borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
            {[
              { label: isAr ? 'الكل' : 'Total Campaigns', value: summary.totalCampaigns || 0, color: '#1E293B' },
              { label: isAr ? 'نشطة' : 'Active', value: summary.activeCampaigns || 0, color: '#27AE60' },
              { label: isAr ? 'الاستخدام' : 'Total Uses', value: summary.totalUsageCount || 0, color: '#FF7A00' },
              { label: isAr ? 'المبيعات الصافية' : 'Net Sales', value: `${CURRENCY} ${(summary.totalNetSales || 0).toFixed(0)}`, color: '#27AE60' },
            ].map((cell, i) => (
              <Box key={i} sx={{ textAlign: 'center', py: 1 }}>
                <Typography sx={{ fontSize: '20px', fontWeight: 700, color: cell.color }}>{cell.value}</Typography>
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mt: 0.25 }}>{cell.label}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      <Alert severity="info" sx={{ mb: 3, fontSize: '13px' }}>
        {isAr
          ? 'الحملات تُنشأ وتُدار من قِبل المنصة. يعرض هذا القسم فقط التأثير على أطباقك.'
          : 'Campaigns are created and managed by the platform. This section shows only the impact on your dishes.'}
      </Alert>

      {!hasAnyCampaign ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <CampaignIcon sx={{ fontSize: 36, color: '#bbb' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {isAr ? 'لا توجد حملات' : 'No Campaigns Yet'}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 400, mx: 'auto' }}>
              {isAr
                ? 'ستظهر الحملات التي تؤثر على أطباقك هنا.'
                : 'Campaigns affecting your dishes will appear here.'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <CampaignSection
              title={isAr ? 'الحملات النشطة' : 'Active Campaigns'}
              icon={<ActiveIcon />}
              color="#27AE60"
              campaigns={active}
              group="active"
              isAr={isAr}
              formatDate={formatDate}
            />
          )}
          {upcoming.length > 0 && (
            <CampaignSection
              title={isAr ? 'الحملات القادمة' : 'Upcoming'}
              icon={<UpcomingIcon />}
              color="#2980B9"
              campaigns={upcoming}
              group="upcoming"
              isAr={isAr}
              formatDate={formatDate}
            />
          )}
          {expired.length > 0 && (
            <CampaignSection
              title={isAr ? 'الحملات المنتهية' : 'Ended Campaigns'}
              icon={<ExpiredIcon />}
              color="#9E9E9E"
              campaigns={expired}
              group="expired"
              isAr={isAr}
              formatDate={formatDate}
            />
          )}
        </>
      )}
      <Box sx={{ height: 60 }} />
    </Box>
  );
};

const CampaignSection = ({ title, icon, color, campaigns, group, isAr, formatDate }) => (
  <Box sx={{ mb: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <Box sx={{ color }}>{icon}</Box>
      <Typography sx={{ fontWeight: 700, fontSize: '15px', color }}>{title}</Typography>
    </Box>
    {campaigns.map((c) => (
      <CampaignCard key={c.id} campaign={c} group={group} isAr={isAr} formatDate={formatDate} />
    ))}
  </Box>
);

const CampaignCard = ({ campaign, group, isAr, formatDate }) => {
  const impact = campaign.impact || {};
  const accentColor = group === 'active' ? '#27AE60' : group === 'upcoming' ? '#2980B9' : '#9E9E9E';
  const isCoupon = campaign.type === 'COUPON';

  return (
    <Paper sx={{ p: 2.5, mb: 1.5, borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '15px', color: '#1E293B', flex: 1, mr: 1 }}>
          {campaign.name}
        </Typography>
        <Chip
          label={isCoupon
            ? (isAr ? `كوبون ${campaign.discountPercent}%` : `Coupon ${campaign.discountPercent}%`)
            : (isAr ? `خصم ${campaign.discountPercent}%` : `${campaign.discountPercent}% Off`)}
          size="small"
          sx={{
            bgcolor: isCoupon ? '#8E44AD18' : '#FF7A0018',
            color: isCoupon ? '#8E44AD' : '#FF7A00',
            fontWeight: 700,
            fontSize: '11px',
          }}
        />
      </Box>

      {/* Date range */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <CalendarIcon sx={{ fontSize: 13, color: '#9E9E9E' }} />
        <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
          {formatDate(campaign.startAt)} → {formatDate(campaign.endAt)}
        </Typography>
      </Box>

      {/* Impact stats (only when there was usage) */}
      {impact.usageCount > 0 && (
        <>
          <Divider sx={{ my: 1.25 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}>
            {[
              { label: isAr ? 'الاستخدام' : 'Uses', value: impact.usageCount, color: accentColor },
              { label: isAr ? 'الطلبات' : 'Orders', value: impact.discountedOrdersCount, color: accentColor },
              { label: isAr ? 'الإجمالي' : 'Gross', value: `${CURRENCY} ${(impact.grossSales || 0).toFixed(0)}`, color: accentColor },
              { label: isAr ? 'الخصم' : 'Discount', value: `−${CURRENCY} ${(impact.discountAmount || 0).toFixed(0)}`, color: '#E67E22' },
              { label: isAr ? 'الصافي' : 'Net', value: `${CURRENCY} ${(impact.netSales || 0).toFixed(0)}`, color: '#27AE60' },
            ].map((cell, i) => (
              <Box key={i} sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: cell.color }}>{cell.value}</Typography>
                <Typography sx={{ fontSize: '10px', color: '#9E9E9E' }}>{cell.label}</Typography>
              </Box>
            ))}
          </Box>
        </>
      )}
      {impact.usageCount === 0 && group !== 'expired' && (
        <Typography sx={{ fontSize: '12px', color: '#9E9E9E', mt: 0.5 }}>
          {isAr ? 'لا يوجد استخدام بعد' : 'No usage yet'}
        </Typography>
      )}

      {/* Affected dishes */}
      {campaign.affectedDishes && campaign.affectedDishes.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.25 }}>
          {campaign.affectedDishes.slice(0, 5).map((d, i) => (
            <Box key={i} sx={{
              px: 1, py: 0.25,
              bgcolor: `${accentColor}14`,
              borderRadius: '6px',
            }}>
              <Typography sx={{ fontSize: '11px', color: accentColor, fontWeight: 500 }}>
                {d.name}
              </Typography>
            </Box>
          ))}
          {campaign.affectedDishCount > 5 && (
            <Typography sx={{ fontSize: '11px', color: '#9E9E9E', alignSelf: 'center' }}>
              +{campaign.affectedDishCount - 5} {isAr ? 'أخرى' : 'more'}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default Marketing;
