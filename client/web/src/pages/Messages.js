import React, { useState } from 'react';
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  IconButton,
  Box,
  TextField,
  Grid,
} from '@mui/material';
import {
  Send as SendIcon,
  Reply as ReplyIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';

const Messages = () => {
  const { isRTL } = useLanguage();
  const { showNotification } = useNotification();
  const [messages, setMessages] = useState([
    { id: 1, customer: 'John Doe', subject: 'Order #1001 - Delivery Time', date: '2023-06-15', status: 'unread' },
    { id: 2, customer: 'Jane Smith', subject: 'Recipe Inquiry', date: '2023-06-14', status: 'read' },
    { id: 3, customer: 'Robert Johnson', subject: 'Special Request for Order #1003', date: '2023-06-14', status: 'unread' },
    { id: 4, customer: 'Emily Davis', subject: 'Feedback on Pizza', date: '2023-06-13', status: 'read' },
  ]);

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');

  const handleMarkAsRead = (id) => {
    setMessages(messages.map(msg => 
      msg.id === id ? { ...msg, status: 'read' } : msg
    ));
  };

  const handleReply = () => {
    if (selectedMessage && replyText.trim()) {
      console.log(`Replying to ${selectedMessage.customer}: ${replyText}`);
      setReplyText('');
      showNotification('Message sent successfully!', 'success');
    }
  };

  return (
    <Box sx={{ px: '52px', py: 3, direction: isRTL ? 'rtl' : 'ltr', bgcolor: '#FAF5F3', minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom>
        Messages
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {messages.map((message) => (
                  <TableRow 
                    key={message.id} 
                    onClick={() => {
                      setSelectedMessage(message);
                      if (message.status === 'unread') {
                        handleMarkAsRead(message.id);
                      }
                    }}
                    style={{ cursor: 'pointer', backgroundColor: message.id === selectedMessage?.id ? '#f5f5f5' : 'transparent' }}
                  >
                    <TableCell>{message.customer}</TableCell>
                    <TableCell>{message.subject}</TableCell>
                    <TableCell>{message.date}</TableCell>
                    <TableCell>
                      <Chip 
                        label={message.status} 
                        color={message.status === 'unread' ? 'warning' : 'default'} 
                        size="small" 
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        
        <Grid item xs={12} md={8}>
          {selectedMessage ? (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {selectedMessage.subject}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                From: {selectedMessage.customer} | Date: {selectedMessage.date}
              </Typography>
              <Box sx={{ my: 3, p: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
                <Typography variant="body1">
                  Hello, I wanted to check if my order #1001 will be ready by 6 PM today as requested. 
                  Please let me know if there are any delays. Thank you!
                </Typography>
              </Box>
              
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Your Reply"
                variant="outlined"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button 
                variant="contained" 
                startIcon={<SendIcon />}
                onClick={handleReply}
              >
                Send Reply
              </Button>
            </Paper>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary">
                Select a message to view details
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default Messages;
