/**
 * Firebase Cloud Messaging Service
 * Handles push notification delivery to mobile devices
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (only once)
const initializeFCM = () => {
  if (admin.apps.length === 0) {
    try {
      const serviceAccount = require('../config/firebase-service-account.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized');
    } catch (error) {
      console.log('Firebase Admin SDK not initialized:', error.message);
    }
  }
};

// Lazy initialization
const getAdmin = () => {
  initializeFCM();
  return admin;
};

/**
 * Send push notification to a single device
 * @param {Object} params - Notification parameters
 * @param {string} params.token - FCM device token
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {Object} params.data - Additional data payload
 * @returns {Promise<Object>} FCM response
 */
const sendPushNotification = async ({ token, title, body, data = {} }) => {
  try {
    const firebaseAdmin = getAdmin();

    if (!firebaseAdmin.apps.length) {
      throw new Error('Firebase not initialized');
    }

    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      token
    };

    const response = await firebaseAdmin.messaging().send(message);
    console.log('Push notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error.message);
    throw error;
  }
};

/**
 * Send push notification to multiple devices
 * @param {Array<string>} tokens - Array of FCM device tokens
 * @param {Object} params - Notification parameters
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {Object} params.data - Additional data payload
 * @returns {Promise<Object>} FCM response
 */
const sendMulticastNotification = async (tokens, { title, body, data = {} }) => {
  try {
    const firebaseAdmin = getAdmin();

    if (!firebaseAdmin.apps.length) {
      throw new Error('Firebase not initialized');
    }

    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      tokens
    };

    const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
    console.log(`Push notification sent: ${response.successCount} success, ${response.failureCount} failed`);
    return response;
  } catch (error) {
    console.error('Error sending multicast notification:', error.message);
    throw error;
  }
};

/**
 * Send push notification to a topic
 * @param {string} topic - Topic name (e.g., 'country_SA', 'all_users')
 * @param {Object} params - Notification parameters
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {Object} params.data - Additional data payload
 * @returns {Promise<Object>} FCM response
 */
const sendTopicNotification = async (topic, { title, body, data = {} }) => {
  try {
    const firebaseAdmin = getAdmin();

    if (!firebaseAdmin.apps.length) {
      throw new Error('Firebase not initialized');
    }

    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      topic
    };

    const response = await firebaseAdmin.messaging().send(message);
    console.log(`Push notification sent to topic ${topic}:`, response);
    return response;
  } catch (error) {
    console.error('Error sending topic notification:', error.message);
    throw error;
  }
};

module.exports = {
  sendPushNotification,
  sendMulticastNotification,
  sendTopicNotification
};
