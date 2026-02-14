import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../utils/api';

const Notifications = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // all, unread

  // Helper to get localized text
  const getLocalizedText = (notification, field) => {
    const arabicField = field === 'title' ? 'titleAr' : 'messageAr';
    if (language === 'ar' && notification[arabicField]) {
      return notification[arabicField];
    }
    return field === 'title' ? notification.title : notification.message;
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = filter === 'unread' ? { unreadOnly: true } : {};
      const response = await api.get('/notifications', { params });
      setNotifications(response.data.data.notifications);
      setUnreadCount(response.data.data.unreadCount);
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Fetch notifications error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      const notification = notifications.find(n => n._id === id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }

    // Navigate using deepLink
    if (notification.deepLink) {
      navigate(notification.deepLink);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order':
        return '🛒';
      case 'dish':
        return '🍽️';
      case 'promotion':
        return '🏷️';
      case 'issue':
        return '⚠️';
      case 'announcement':
        return '📢';
      default:
        return '🔔';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="notifications-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <button
            className="btn btn-outline"
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="notifications-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <h3>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification._id}
              className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <h4 className="notification-title">{getLocalizedText(notification, 'title')}</h4>
                <p className="notification-message">{getLocalizedText(notification, 'message')}</p>
                <span className="notification-time">
                  {formatDate(notification.createdAt)}
                </span>
              </div>
              <div className="notification-actions">
                {!notification.isRead && (
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification._id);
                    }}
                    title="Mark as read"
                  >
                    ✓
                  </button>
                )}
                <button
                  className="action-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notification._id);
                  }}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .notifications-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .notifications-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .notifications-header h1 {
          font-size: 24px;
          font-weight: 600;
          margin: 0;
        }

        .notifications-filters {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .filter-btn {
          padding: 8px 16px;
          border: 1px solid #e0e0e0;
          background: white;
          border-radius: 20px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .filter-btn.active {
          background: #FF7A00;
          color: white;
          border-color: #FF7A00;
        }

        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          padding: 16px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s;
        }

        .notification-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .notification-item.unread {
          background: #fff8f0;
          border-left: 3px solid #FF7A00;
        }

        .notification-icon {
          font-size: 24px;
          margin-right: 16px;
          width: 40px;
          text-align: center;
        }

        .notification-content {
          flex: 1;
        }

        .notification-title {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .notification-message {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #666;
        }

        .notification-time {
          font-size: 12px;
          color: #999;
        }

        .notification-actions {
          display: flex;
          gap: 8px;
          margin-left: 16px;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: #f5f5f5;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          color: #666;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #e0e0e0;
        }

        .action-btn.delete:hover {
          background: #ffebee;
          color: #f44336;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #999;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          color: #333;
        }

        .empty-state p {
          margin: 0;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #FF7A00;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          background: #ffebee;
          color: #c62828;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .btn-outline {
          background: white;
          border: 1px solid #FF7A00;
          color: #FF7A00;
        }

        .btn-outline:hover {
          background: #fff8f0;
        }
      `}</style>
    </div>
  );
};

export default Notifications;
