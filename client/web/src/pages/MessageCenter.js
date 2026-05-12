import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
} from '@mui/material';
import {
  Reply as ReplyIcon,
  Create as CreateIcon,
  Inbox as InboxIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { formatDateTime } from '../utils/localeFormatter';
import api from '../utils/api';

const MessageCenter = () => {
  const { t, isRTL, language } = useLanguage();
  const { showNotification } = useNotification();
  const [searchParams] = useSearchParams();
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [replyMode, setReplyMode] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [conversationUserId, setConversationUserId] = useState(null);
  const [conversationSource, setConversationSource] = useState(null);

  // Compose form state
  const [composeTo, setComposeTo] = useState(null);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  
  // Real contacts from API
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [prefillUser, setPrefillUser] = useState(null);

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
    fetchContacts();
    
    const userId = searchParams.get('userId');
    const source = searchParams.get('source');  
    
    console.log('[MessageCenter] Query params:', { userId, source });
    
    if (userId) {
      setConversationUserId(userId);
      setConversationSource(source);
      setComposeSubject(source === 'contact_cook' ? 'Inquiry' : 'Message');
      resolveAndPrefillUser(userId);
    }
  }, []);

  // Fetch real contacts from API
  const fetchContacts = async () => {
    try {
      setContactsLoading(true);
      const response = await api.get('/messages/contacts');
      if (response.data && response.data.data) {
        setContacts(response.data.data);
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  };

  // Resolve user by ID for prefill
  const resolveAndPrefillUser = async (userId) => {
    console.log('[MessageCenter] Resolving user:', userId);
    try {
      const response = await api.get(`/messages/resolve-user/${userId}`);
      console.log('[MessageCenter] Resolve response:', response.data);
      if (response.data && response.data.data) {
        const user = response.data.data;
        console.log('[MessageCenter] Setting prefillUser:', user);
        setPrefillUser(user);
        setComposeTo(user.value);
        setComposeDialogOpen(true);
      }
    } catch (error) {
      console.error('[MessageCenter] Failed to resolve user:', error);
      setComposeTo(userId);
      setComposeDialogOpen(true);
    }
  };

  // Reload messages when language changes
  useEffect(() => {
    fetchMessages();
  }, [language]);


  // Only inbox is API-backed; sent/trash/archive are not supported by the backend
  const tabLabels = [t('inbox')];
  const tabIcons = [<InboxIcon />];

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setSelectedMessage(null);
    setReplyMode(false);
  };

  const getMessagePreview = (body) => {
    return body.length > 60 ? body.substring(0, 60) + '...' : body;
  };

  const handleMessageClick = async (message) => {
    setSelectedMessage(message);
    setReplyMode(false);
    // Mark as read via real API
    if (!message.read) {
      // Optimistic UI update
      setMessages(prev => prev.map(msg =>
        msg.id === message.id ? { ...msg, read: true } : msg
      ));
      try {
        const senderId = message.sender?._id;
        if (senderId) {
          await api.patch(`/messages/read/${senderId}`);
        }
      } catch (err) {
        console.error('[MessageCenter] mark-as-read failed:', err);
      }
    }
  };

  const handleReply = () => {
    setReplyMode(true);
    setReplyText('');
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;

    const recipientId = selectedMessage.sender?._id;
    if (!recipientId) {
      showNotification(language === 'ar' ? 'لا يمكن تحديد المستلم' : 'Cannot identify recipient', 'error');
      return;
    }

    try {
      await api.post('/messages/send', {
        recipientId,
        subject: `Re: ${selectedMessage.subject}`,
        body: replyText.trim(),
      });
      setReplyMode(false);
      setReplyText('');
      showNotification(language === 'ar' ? 'تم إرسال الرد بنجاح' : 'Reply sent successfully', 'success');
      // Refresh inbox so the new message appears
      fetchMessages();
    } catch (error) {
      console.error('[MessageCenter] reply failed:', error);
      showNotification(
        error.response?.data?.message || (language === 'ar' ? 'فشل إرسال الرد' : 'Failed to send reply'),
        'error'
      );
    }
  };

  const handleCompose = () => {
    setComposeTo(null);
    setComposeSubject('');
    setComposeBody('');
    setComposeDialogOpen(true);
  };

  const handleSendCompose = async () => {
    if (!composeTo || !composeSubject.trim() || !composeBody.trim()) {
      showNotification(language === 'ar' ? 'يرجى تعبئة جميع الحقول' : 'Please fill in all fields', 'error');
      return;
    }

    try {
      // Determine recipientId from composeTo or conversationUserId
      const recipientId = conversationUserId || composeTo;
      
      // Prepare message payload
      const messagePayload = {
        recipientId,
        subject: composeSubject.trim(),
        body: composeBody.trim()
      };
      
      // Include contextType if source is contact_cook
      if (conversationSource === 'contact_cook') {
        messagePayload.contextType = 'contact_cook';
      }
      
      await api.post('/messages/send', messagePayload);
      
      showNotification(language === 'ar' ? 'تم إرسال الرسالة بنجاح' : 'Message sent successfully', 'success');
      
      // Close dialog and refresh messages
      setComposeDialogOpen(false);
      setComposeTo(null);
      setComposeSubject('');
      setComposeBody('');
      setConversationUserId(null);
      setConversationSource(null);
      fetchMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      showNotification(
        error.response?.data?.message || (language === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message'),
        'error'
      );
    }
  };

  // All messages from API are inbox; no client-side folder filtering needed
  const filteredMessages = messages;
  const unreadCount = messages.filter(msg => !msg.read).length;

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
                        <TableCell sx={{ fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left', color: '#2B1E16', borderBottom: '1px solid #E8E2DF' }}>
                          {t('from')}
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

                  {/* Action Buttons — only Reply is supported (archive/delete have no backend) */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Button
                      variant="contained"
                      startIcon={<ReplyIcon />}
                      onClick={handleReply}
                      sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E66A00' }, borderRadius: '12px', textTransform: 'none' }}
                    >
                      {t('reply')}
                    </Button>
                  </Box>

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
              options={prefillUser ? [prefillUser, ...contacts] : contacts}
              value={prefillUser && prefillUser.value === composeTo ? prefillUser : contacts.find(c => c.value === composeTo) || null}
              onChange={(event, newValue) => setComposeTo(newValue?.value || null)}
              loading={contactsLoading}
              getOptionLabel={(option) => option.label || ''}
              isOptionEqualToValue={(option, value) => option.value === value?.value}
              noOptionsText={language === 'ar' ? 'لا توجد جهات اتصال' : 'No contacts available'}
              renderInput={(params) => (
                <TextField {...params} label={t('to')} placeholder={contactsLoading ? 'Loading...' : t('selectRecipient')} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
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

    </Box>
  );
};

export default MessageCenter;
