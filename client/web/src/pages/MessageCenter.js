import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Chip,
  Avatar,
  Divider,
  Card,
  Autocomplete,
  Grid,
  Container,
  InputAdornment,
  Badge,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Reply as ReplyIcon,
  Create as CreateIcon,
  Inbox as InboxIcon,
  Send as SendIcon,
  DeleteOutline as TrashIcon,
  ArchiveOutlined as ArchiveOutlinedIcon,
  Close as CloseIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { formatDateTime } from '../utils/localeFormatter';
import api from '../utils/api';

const MessageCenter = () => {
  const { t, isRTL, language } = useLanguage();
  const { showNotification } = useNotification();
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [replyMode, setReplyMode] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);

  // Compose form state
  const [composeTo, setComposeTo] = useState(null);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  // Sample messages data with bilingual support
  const getInitialMessages = () => {
    if (language === 'ar') {
      return [
        {
          id: 'msg00001',
          from: 'أحمد (مستخدم)',
          to: 'مطعم فاطمة',
          subject: 'استفسار عن وقت الاستلام',
          body: 'السلام عليكم، هل يمكن استلام الطلب قبل الساعة 2 ظهراً؟ شكراً.',
          timestamp: '2025-10-30T14:35:00',
          folder: 'inbox',
          flagged: false,
          read: false,
        },
        {
          id: 'msg00002',
          from: 'سلمى (مستخدمة)',
          to: 'مطعم فاطمة',
          subject: 'تعليق على الطلب',
          body: 'اللازانيا كانت لذيذة جداً! عائلتي أحبتها. سنطلب مرة أخرى بالتأكيد. شكراً على الطعام الرائع!',
          timestamp: '2025-10-29T18:20:00',
          folder: 'inbox',
          flagged: true,
          read: true,
        },
        {
          id: 'msg00003',
          from: 'منصة المصطبة',
          to: 'مطعم فاطمة',
          subject: 'تذكير بتفعيل العروض',
          body: 'يمكنك الآن تفعيل عرض نهاية الأسبوع من لوحة التسويق.',
          timestamp: '2025-10-29T10:15:00',
          folder: 'inbox',
          flagged: false,
          read: true,
        },
        {
          id: 'msg00004',
          from: 'مطعم فاطمة',
          to: 'يوسف (مستخدم)',
          subject: 'رد: طلبك في الطريق',
          body: 'تم إرساسل طلبك وسيصل خلال 30 دقيقة. سيتصل بك السائق عند الاقتراب. بالهناء والشفاء!',
          timestamp: '2025-10-28T16:45:00',
          folder: 'sent',
          flagged: false,
          read: true,
        },
        {
          id: 'msg00005',
          from: 'مطعم فاطمة',
          to: 'منى (مستخدمة)',
          subject: 'تم تجهيز طلبك',
          body: 'شكراً على طلبك! السوشي جاهز للاستلام. يمكنك الحضور في أي وقت بين 12 ظهراً - 2 ظهراً.',
          timestamp: '2025-10-28T11:30:00',
          folder: 'sent',
          flagged: false,
          read: true,
        },
        {
          id: 'msg00006',
          from: 'خدمة الدعم',
          to: 'مطعم فاطمة',
          subject: 'رد على تذكرة',
          body: 'تم حل المشكلة، الرجاء التحقق وإعلامنا إذا استمرت.',
          timestamp: '2025-10-27T09:20:00',
          folder: 'archive',
          flagged: false,
          read: true,
        },
        {
          id: 'msg00007',
          from: 'يوسف (مستخدم)',
          to: 'مطعم فاطمة',
          subject: 'طلب إلغاء',
          body: 'لو سمحت، أريد إلغاء طلبي رقم 10234.',
          timestamp: '2025-10-26T15:10:00',
          folder: 'trash',
          flagged: false,
          read: true,
        },
      ];
    } else {
      return [
        {
          id: 'msg00001',
          from: 'Ahmed Hassan',
          to: 'You',
          subject: 'Question about delivery time',
          body: 'Hello, I wanted to ask if you can deliver the order by 6 PM today? I have an important event. Thank you!',
          timestamp: '2025-10-30T14:35:00',
          folder: 'inbox',
          flagged: false,
          read: false,
        },
        {
          id: 'msg00002',
          from: 'Sara Mohammed',
          to: 'You',
          subject: 'Order feedback',
          body: 'The lasagna was absolutely delicious! My family loved it. Will definitely order again. Thank you for the amazing food!',
          timestamp: '2025-10-29T18:20:00',
          folder: 'inbox',
          flagged: true,
          read: true,
        },
        {
          id: 'msg00003',
          from: 'Admin Support',
          to: 'You',
          subject: 'Payment received for Order #10452',
          body: 'Dear Cook, payment for Order #10452 has been successfully processed. Amount: SAR 115.00. The funds will be transferred to your account within 2-3 business days.',
          timestamp: '2025-10-29T10:15:00',
          folder: 'inbox',
          flagged: false,
          read: true,
        },
        {
          id: 'msg00004',
          from: 'You',
          to: 'Omar Khalil',
          subject: 'Re: Your order is on the way',
          body: 'Your order has been dispatched and should arrive within 30 minutes. The driver will call you when nearby. Enjoy your meal!',
          timestamp: '2025-10-28T16:45:00',
          folder: 'sent',
          flagged: false,
          read: true,
        },
        {
          id: 'msg00005',
          from: 'You',
          to: 'Mona Ali',
          subject: 'Thank you for your order',
          body: 'Thank you for ordering from my kitchen! Your sushi platter is ready for pickup. Please come by anytime between 12 PM - 2 PM.',
          timestamp: '2025-10-28T11:30:00',
          folder: 'sent',
          flagged: false,
          read: true,
        },
        {
          id: 'msg00006',
          from: 'Layla Ibrahim',
          to: 'You',
          subject: 'Menu inquiry',
          body: 'Do you offer vegetarian options? I am interested in ordering but need vegan-friendly dishes. Looking forward to your response.',
          timestamp: '2025-10-27T09:20:00',
          folder: 'archive',
          flagged: false,
          read: true,
        },
        {
          id: 'msg00007',
          from: 'Hassan Farouk',
          to: 'You',
          subject: 'Cancellation request',
          body: 'I need to cancel my order. Something urgent came up. Please let me know if this is possible. Sorry for the inconvenience.',
          timestamp: '2025-10-26T15:10:00',
          folder: 'trash',
          flagged: false,
          read: true,
        },
      ];
    }
  };

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch messages from API
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/messages/inbox');
      console.log('[MessageCenter] API response:', response.data);
      
      if (response.data.success && response.data.data?.conversations) {
        console.log('[MessageCenter] Conversations count:', response.data.data.conversations.length);
        
        // Transform conversations to message format with safety checks
        const transformedMessages = response.data.data.conversations
          .filter(conv => conv.lastMessage && conv.partner) // Filter out invalid data
          .map((conv) => {
            try {
              return {
                id: conv.lastMessage._id,
                _id: conv.lastMessage._id,
                from: conv.partner?.name || 'Unknown',
                to: 'You',
                sender: conv.partner,
                body: conv.lastMessage.body || '',
                timestamp: conv.lastMessage.createdAt || conv.lastMessage.updatedAt,
                folder: 'inbox',
                read: conv.lastMessage.isRead || false,
                subject: conv.partner?.name || 'Message',
                flagged: false,
              };
            } catch (err) {
              console.error('[MessageCenter] Error transforming conversation:', conv, err);
              return null;
            }
          })
          .filter(msg => msg !== null); // Remove failed transformations
          
        console.log('[MessageCenter] Transformed messages:', transformedMessages.length);
        setMessages(transformedMessages);
      } else {
        console.warn('[MessageCenter] Invalid response structure:', response.data);
        setMessages([]);
      }
    } catch (err) {
      console.error('[MessageCenter] Failed to fetch messages:', err);
      console.error('[MessageCenter] Error details:', err.response?.data);
      showNotification('Failed to load messages', 'error');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages on mount
  useEffect(() => {
    fetchMessages();
  }, []);

  // Reload messages when language changes
  useEffect(() => {
    fetchMessages();
  }, [language]);

  // Available contacts for autocomplete (bilingual)
  const getContacts = () => {
    if (language === 'ar') {
      return [
        { label: 'أحمد (مستخدم)', value: 'أحمد (مستخدم)' },
        { label: 'سلمى (مستخدمة)', value: 'سلمى (مستخدمة)' },
        { label: 'يوسف (مستخدم)', value: 'يوسف (مستخدم)' },
        { label: 'منى (مستخدمة)', value: 'منى (مستخدمة)' },
        { label: 'خدمة الدعم', value: 'خدمة الدعم' },
      ];
    } else {
      return [
        { label: 'Ahmed Hassan (Foodie)', value: 'Ahmed Hassan' },
        { label: 'Sara Mohammed (Foodie)', value: 'Sara Mohammed' },
        { label: 'Omar Khalil (Foodie)', value: 'Omar Khalil' },
        { label: 'Mona Ali (Foodie)', value: 'Mona Ali' },
        { label: 'Admin Support', value: 'Admin Support' },
      ];
    }
  };

  const contacts = getContacts();

  const tabs = ['inbox', 'sent', 'trash', 'archive'];
  const tabLabels = [t('inbox'), t('sent'), t('trash'), t('archive')];
  const tabIcons = [
    <InboxIcon />,
    <SendIcon />,
    <TrashIcon />,
    <ArchiveOutlinedIcon />,
  ];

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setSelectedMessage(null);
    setReplyMode(false);
  };

  const getMessagePreview = (body) => {
    return body.length > 60 ? body.substring(0, 60) + '...' : body;
  };

  const handleMessageClick = (message) => {
    setSelectedMessage(message);
    setReplyMode(false);
    // Mark as read
    if (!message.read) {
      setMessages(messages.map(msg =>
        msg.id === message.id ? { ...msg, read: true } : msg
      ));
    }
  };

  const handleToggleFlag = (messageId, event) => {
    event.stopPropagation();
    setMessages(messages.map(msg =>
      msg.id === messageId ? { ...msg, flagged: !msg.flagged } : msg
    ));
  };

  const handleDeleteMessage = (message) => {
    setMessageToDelete(message);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (messageToDelete.folder === 'trash') {
      // Permanent delete
      setMessages(messages.filter(msg => msg.id !== messageToDelete.id));
      setSelectedMessage(null);
    } else {
      // Move to trash
      setMessages(messages.map(msg =>
        msg.id === messageToDelete.id ? { ...msg, folder: 'trash' } : msg
      ));
      if (selectedMessage?.id === messageToDelete.id) {
        setSelectedMessage(null);
      }
    }
    setDeleteConfirmOpen(false);
    setMessageToDelete(null);
  };

  const handleArchiveMessage = () => {
    if (!selectedMessage) return;
    setMessages(messages.map(msg =>
      msg.id === selectedMessage.id ? { ...msg, folder: 'archive' } : msg
    ));
    setSelectedMessage(null);
  };

  const handleReply = () => {
    setReplyMode(true);
    setReplyText('');
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedMessage) return;

    const newMessage = {
      id: `msg${String(messages.length + 1).padStart(5, '0')}`,
      from: 'You',
      to: selectedMessage.from,
      subject: `Re: ${selectedMessage.subject}`,
      body: replyText,
      timestamp: new Date().toISOString(),
      folder: 'sent',
      flagged: false,
      read: true,
    };

    setMessages([newMessage, ...messages]);
    setReplyMode(false);
    setReplyText('');
    showNotification(language === 'ar' ? 'تم إرسال الرد بنجاح' : 'Reply sent successfully', 'success');
  };

  const handleCompose = () => {
    setComposeTo(null);
    setComposeSubject('');
    setComposeBody('');
    setComposeDialogOpen(true);
  };

  const handleSendCompose = () => {
    if (!composeTo || !composeSubject.trim() || !composeBody.trim()) {
      showNotification(language === 'ar' ? 'يرجى تعبئة جميع الحقول' : 'Please fill in all fields', 'error');
      return;
    }

    const newMessage = {
      id: `msg${String(messages.length + 1).padStart(5, '0')}`,
      from: 'You',
      to: composeTo,
      subject: composeSubject,
      body: composeBody,
      timestamp: new Date().toISOString(),
      folder: 'sent',
      flagged: false,
      read: true,
    };

    // Add to sent folder
    setMessages([newMessage, ...messages]);
    setComposeDialogOpen(false);
    setComposeTo(null);
    setComposeSubject('');
    setComposeBody('');
    showNotification(language === 'ar' ? 'تم إرسال الرسالة بنجاح' : 'Message sent successfully', 'success');
  };

  const filteredMessages = messages.filter(msg => msg.folder === tabs[currentTab]);
  const unreadCount = messages.filter(msg => msg.folder === 'inbox' && !msg.read).length;

  return (
    <Box sx={{ direction: isRTL ? 'rtl' : 'ltr', px: '52px', py: 3, bgcolor: '#FAF5F3', minHeight: '100vh' }}>
      <Container maxWidth={false} disableGutters>
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700, 
              color: '#2B1E16',
              mb: 0.5,
              textAlign: isRTL ? 'right' : 'left',
              fontFamily: 'Inter'
            }}
          >
            {language === 'ar' ? 'مركز الرسائل' : 'Message Center'}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#6B7280',
              fontSize: '14px',
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {language === 'ar' 
              ? 'البقاء على اتصال مع العملاء والرد على استفساراتهم 📧'
              : 'Stay connected with customers and respond to inquiries 📧'}
          </Typography>
        </Box>

        {/* Tabs with Compose Button */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: '#E8E2DF', mb: 2 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTabs-flexContainer': {
                justifyContent: isRTL ? 'flex-end' : 'flex-start',
              },
              '& .MuiTabs-indicator': {
                bgcolor: '#FF7A00',
              },
              '& .MuiTab-root.Mui-selected': {
                color: '#FF7A00',
              }
            }}
          >
            {tabLabels.map((label, index) => (
              <Tab
                key={label}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {React.cloneElement(tabIcons[index], { sx: { fontSize: 20 } })}
                    {label}
                    {index === 0 && unreadCount > 0 && (
                      <Chip
                        label={unreadCount}
                        size="small"
                        sx={{ height: 20, fontSize: '0.75rem', bgcolor: '#FF7A00', color: 'white' }}
                      />
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
          <Button
            variant="contained"
            startIcon={<CreateIcon />}
            onClick={handleCompose}
            sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E66A00' }, mb: 1, borderRadius: '12px', textTransform: 'none' }}
          >
            {t('compose')}
          </Button>
        </Box>

        <Box sx={{ bgcolor: '#FFFFFF', borderRadius: '24px', p: 3, mt: 3 }}>
          {/* Two-column layout - RTL aware */}
          <Grid container spacing={2} sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            {/* Message List */}
            <Grid item xs={12} md={selectedMessage ? 5 : 12} sx={{ order: isRTL && selectedMessage ? 2 : 1 }}>
              <Card sx={{ boxShadow: 'none', border: '1px solid #E8E2DF', borderRadius: '16px', overflow: 'hidden' }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#E5DEDD' }}>
                        <TableCell sx={{ width: 40, textAlign: isRTL ? 'right' : 'left', borderBottom: '1px solid #E8E2DF' }}></TableCell>
                        <TableCell sx={{ fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left', color: '#2B1E16', borderBottom: '1px solid #E8E2DF' }}>
                          {currentTab === 1 ? t('to') : t('from')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left', color: '#2B1E16', borderBottom: '1px solid #E8E2DF' }}>{t('subject')}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left', color: '#2B1E16', borderBottom: '1px solid #E8E2DF' }}>{t('date')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredMessages.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4, border: 'none' }}>
                            <Typography color="textSecondary">
                              {t('noMessagesIn')} {tabLabels[currentTab].toLowerCase()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMessages.map((message) => (
                          <TableRow
                            key={message.id}
                            hover
                            onClick={() => handleMessageClick(message)}
                            sx={{
                              cursor: 'pointer',
                              bgcolor: selectedMessage?.id === message.id ? '#FBFAFA' : 'inherit',
                              '&:hover': { bgcolor: '#FBFAFA' },
                              '& td': { borderBottom: '1px solid #E8E2DF' }
                            }}
                          >
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={(e) => handleToggleFlag(message.id, e)}
                                title={message.flagged ? t('unflag') : t('flag')}
                              >
                                {message.flagged ? (
                                  <StarIcon sx={{ color: '#FFB800' }} />
                                ) : (
                                  <StarBorderIcon />
                                )}
                              </IconButton>
                            </TableCell>
                            <TableCell sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: '#FF7A00', fontSize: '14px' }}>
                                  {(currentTab === 1 ? message.to : message.from).charAt(0)}
                                </Avatar>
                                <Box sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: !message.read ? 700 : 500, color: '#2B1E16' }}
                                  >
                                    {currentTab === 1 ? message.to : message.from}
                                  </Typography>
                                  {!message.read && (
                                    <Box
                                      component="span"
                                      sx={{
                                        width: 8,
                                        height: 8,
                                        bgcolor: '#FF7A00',
                                        borderRadius: '50%',
                                        display: 'inline-block',
                                        ml: isRTL ? 0 : 1,
                                        mr: isRTL ? 1 : 0,
                                      }}
                                    />
                                  )}
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: !message.read ? 700 : 500, color: '#2B1E16' }}
                              >
                                {message.subject}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#6B6B6B' }}>
                                {getMessagePreview(message.body)}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                              <Typography variant="caption" sx={{ color: '#A6A6A6' }}>
                                {formatDateTime(message.timestamp, language)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>

            {/* Message Details */}
            {selectedMessage && (
              <Grid item xs={12} md={7} sx={{ order: isRTL && selectedMessage ? 1 : 2 }}>
                <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #E8E2DF', borderRadius: '16px', bgcolor: '#FBFAFA' }}>
                  {/* Message Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <Box sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#2B1E16', mb: 1 }}>
                        {selectedMessage.subject}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                        <Avatar sx={{ width: 40, height: 40, bgcolor: '#FF7A00' }}>
                          {selectedMessage.from.charAt(0)}
                        </Avatar>
                        <Box sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#2B1E16' }}>
                            {selectedMessage.from}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6B6B6B' }}>
                            {t('to')} {selectedMessage.to}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#A6A6A6' }}>
                        {formatDateTime(selectedMessage.timestamp, language)}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => setSelectedMessage(null)}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>

                  <Divider sx={{ mb: 2, borderColor: '#E8E2DF' }} />

                  {/* Message Body */}
                  <Box sx={{ mb: 3, minHeight: 100, textAlign: isRTL ? 'right' : 'left', bgcolor: '#FFFFFF', p: 2, borderRadius: '12px', border: '1px solid #E8E2DF' }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: '#2B1E16' }}>
                      {selectedMessage.body}
                    </Typography>
                  </Box>

                  {/* Action Buttons */}
                  {selectedMessage.folder !== 'archive' && (
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
                      {selectedMessage.folder !== 'sent' && (
                        <Button
                          variant="contained"
                          startIcon={<ReplyIcon />}
                          onClick={handleReply}
                          sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E66A00' }, borderRadius: '12px', textTransform: 'none' }}
                        >
                          {t('reply')}
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        startIcon={<ArchiveIcon />}
                        onClick={handleArchiveMessage}
                        sx={{ borderColor: '#E8E2DF', color: '#2B1E16', borderRadius: '12px', textTransform: 'none', '&:hover': { borderColor: '#FF7A00', color: '#FF7A00' } }}
                      >
                        {t('archiveAction')}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteMessage(selectedMessage)}
                        sx={{ borderRadius: '12px', textTransform: 'none' }}
                      >
                        {selectedMessage.folder === 'trash' ? t('deletePermanently') : t('delete')}
                      </Button>
                    </Box>
                  )}

                  {/* Reply Box */}
                  {replyMode && (
                    <Box sx={{ mt: 3, p: 2, bgcolor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E8E2DF' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, textAlign: isRTL ? 'right' : 'left', color: '#2B1E16', fontWeight: 700 }}>
                        {t('replyTo')} {selectedMessage.from}
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        placeholder={t('replyPlaceholder')}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        sx={{ 
                          mb: 2, 
                          bgcolor: '#FBFAFA',
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                            '& fieldset': { borderColor: '#E8E2DF' },
                          }
                        }}
                        inputProps={{ style: { textAlign: isRTL ? 'right' : 'left' } }}
                      />
                      <Box sx={{ display: 'flex', gap: 2, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Button
                          variant="contained"
                          onClick={handleSendReply}
                          sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E66A00' }, borderRadius: '12px', textTransform: 'none' }}
                        >
                          {t('send')}
                        </Button>
                        <Button variant="outlined" onClick={() => setReplyMode(false)} sx={{ borderRadius: '12px', textTransform: 'none', borderColor: '#E8E2DF', color: '#2B1E16' }}>
                          {t('cancel')}
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Card>
              </Grid>
            )}
          </Grid>
        </Box>
      </Container>

      {/* Compose Dialog */}
      <Dialog
        open={composeDialogOpen}
        onClose={() => setComposeDialogOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{ '& .MuiDialog-paper': { direction: isRTL ? 'rtl' : 'ltr', borderRadius: '24px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#2B1E16' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <CreateIcon sx={{ color: '#FF7A00' }} />
            {t('composeNewMessage')}
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#E8E2DF' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Autocomplete
              options={contacts}
              value={contacts.find(c => c.value === composeTo) || null}
              onChange={(event, newValue) => setComposeTo(newValue?.value || null)}
              renderInput={(params) => (
                <TextField {...params} label={t('to')} placeholder={t('selectRecipient')} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
              )}
            />
            <TextField
              fullWidth
              label={t('subject')}
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              inputProps={{ maxLength: 100, style: { textAlign: isRTL ? 'right' : 'left' } }}
              helperText={`${composeSubject.length}/100`}
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
            <TextField
              fullWidth
              multiline
              rows={6}
              label={t('messageCenter')}
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder={t('messagePlaceholder')}
              inputProps={{ style: { textAlign: isRTL ? 'right' : 'left' } }}
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ flexDirection: isRTL ? 'row-reverse' : 'row', p: 2 }}>
          <Button onClick={() => setComposeDialogOpen(false)} sx={{ color: '#2B1E16', textTransform: 'none' }}>{t('cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleSendCompose}
            sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E66A00' }, borderRadius: '12px', textTransform: 'none', px: 4 }}
          >
            {t('send')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={() => setDeleteConfirmOpen(false)}
        sx={{ '& .MuiDialog-paper': { direction: isRTL ? 'rtl' : 'ltr', borderRadius: '24px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{t('confirmDelete')}</DialogTitle>
        <DialogContent>
          <Typography sx={{ textAlign: isRTL ? 'right' : 'left', color: '#2B1E16' }}>
            {messageToDelete?.folder === 'trash'
              ? t('deletePermanentConfirm')
              : t('deleteConfirmMessage')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexDirection: isRTL ? 'row-reverse' : 'row', p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ color: '#2B1E16', textTransform: 'none' }}>{t('cancel')}</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" sx={{ borderRadius: '12px', textTransform: 'none' }}>
            {messageToDelete?.folder === 'trash' ? t('deletePermanently') : t('moveToTrash')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MessageCenter;
