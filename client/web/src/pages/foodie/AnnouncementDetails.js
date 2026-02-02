import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Divider
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Campaign as CampaignIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';

const AnnouncementDetails = () => {
  const { announcementId } = useParams();
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnnouncement();
  }, [announcementId]);

  const fetchAnnouncement = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch announcements list and find the one with matching ID
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/api/notifications`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 100 }
        }
      );

      if (response.data.success) {
        const notifications = response.data.data.notifications;
        const found = notifications.find(n => n._id === announcementId || n.id === announcementId);
        
        if (found) {
          setAnnouncement(found);
        } else {
          // If not found in notifications, create a mock announcement from notification data
          const notification = notifications.find(n => 
            n.entityType === 'announcement' && n.entityId === announcementId
          );
          
          if (notification) {
            setAnnouncement({
              ...notification,
              title: notification.title,
              message: notification.message,
              createdAt: notification.createdAt
            });
          } else {
            setError(language === 'ar' ? 'لم يتم العثور على الإعلان' : 'Announcement not found');
          }
        }
      }
    } catch (err) {
      console.error('Fetch announcement error:', err);
      setError(err.response?.data?.message || (language === 'ar' ? 'فشل في تحميل الإعلان' : 'Failed to load announcement'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: '#FF7A00' }} />
      </Box>
    );
  }

  if (error || !announcement) {
    return (
      <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || (language === 'ar' ? 'لم يتم العثور على الإعلان' : 'Announcement not found')}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/foodie/notifications')}>
          {language === 'ar' ? 'العودة للإشعارات' : 'Back to Notifications'}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto', direction: isRTL ? 'rtl' : 'ltr' }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/foodie/notifications')} sx={{ bgcolor: '#FFFFFF' }}>
          <BackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {language === 'ar' ? 'تفاصيل الإعلان' : 'Announcement Details'}
        </Typography>
      </Box>

      <Card sx={{ borderRadius: '12px' }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
            <Box sx={{ 
              width: 56, 
              height: 56, 
              borderRadius: '12px', 
              bgcolor: '#FF7A00', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <CampaignIcon sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {announcement.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(announcement.createdAt)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Content */}
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
              {announcement.message}
            </Typography>
          </Box>

          {/* Actions */}
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/foodie/notifications')}
            >
              {language === 'ar' ? 'العودة للإشعارات' : 'Back to Notifications'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AnnouncementDetails;
