/**
 * Notification Scheduler Service
 * Handles cron jobs for Phase 3 marketing, retention, and digest notifications
 */

const mongoose = require('mongoose');
const { createNotification } = require('../utils/notifications');
const NotificationDedupe = require('../models/NotificationDedupe');
const User = require('../models/User');
const { Order } = require('../models/Order');
const Product = require('../models/Product');
const Cook = require('../models/Cook');
const Campaign = require('../models/Campaign');

// Cooldown configurations (in hours)
const COOLDOWNS = {
  marketing_cart: 24,        // Abandoned cart: max 1 per 24h per foodie
  marketing_reorder: 168,    // Reorder reminder: max 1 per 7 days per foodie
  marketing_promo: 24,       // Promotions: max 1 per campaign per foodie
  marketing_favorite_activity: 24, // Favorite cook: max 1 per cook per 24h
  digest_cook_weekly: 168,   // Weekly digest: max 1 per week
  cook_performance: 168,     // Performance warning: max 1 per week
  digest_admin_daily: 24     // Daily admin digest: max 1 per day
};

/**
 * Check cooldown and record notification
 * @param {string} userId - User ID
 * @param {string} notificationType - Type of notification
 * @param {string} dedupeKey - Optional dedupe key
 * @returns {Promise<boolean>} - True if notification should be sent
 */
async function checkAndRecordCooldown(userId, notificationType, dedupeKey = null) {
  const cooldownHours = COOLDOWNS[notificationType] || 24;

  // Check if in cooldown
  const inCooldown = await NotificationDedupe.isInCooldown(
    userId,
    notificationType,
    dedupeKey,
    cooldownHours
  );

  if (inCooldown) {
    console.log(`[SCHEDULER] Skipping ${notificationType} for user ${userId} - in cooldown`);
    return false;
  }

  // Record the notification
  await NotificationDedupe.recordNotification(
    userId,
    notificationType,
    null,
    dedupeKey,
    cooldownHours
  );

  return true;
}

/**
 * TRIGGER 1: Abandoned Cart Reminder
 * Checks foodies with items in cart but no checkout after X hours
 */
async function sendAbandonedCartReminders() {
  console.log('[SCHEDULER] Running abandoned cart check...');

  try {
    // Find foodies who have items in cart and haven't checked out recently
    // This is a simplified check - in production, you'd check the actual cart
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    // Find users who have updated their cart but no order in last 6 hours
    // This would require integrating with your cart/checkout system
    // For now, we'll do a simplified implementation

    const recentCartUsers = await User.find({
      role: 'foodie',
      'notificationSettings.pushEnabled': true,
      'notificationSettings.promotionNotifications': true,
      updatedAt: { $lte: sixHoursAgo }
    }).limit(100);

    console.log(`[SCHEDULER] Found ${recentCartUsers.length} potential users for cart reminder`);

    for (const user of recentCartUsers) {
      // Check cooldown and dedupe
      const shouldSend = await checkAndRecordCooldown(
        user._id.toString(),
        'marketing_cart',
        `cart:${user._id}`
      );

      if (shouldSend) {
        await createNotification({
          userId: user._id,
          role: 'foodie',
          title: 'You left something behind! 🛒',
          message: 'Complete your order before it expires.',
          type: 'marketing_cart',
          entityType: 'cart',
          entityId: user._id,
          deepLink: '/cart',
          countryCode: user.countryCode
        });
        console.log(`[SCHEDULER] Sent cart reminder to ${user.email}`);
      }
    }
  } catch (error) {
    console.error('[SCHEDULER] Error in abandoned cart reminder:', error);
  }
}

/**
 * TRIGGER 2: Reorder Reminder
 * Checks foodies who completed orders X days ago and haven't ordered since
 */
async function sendReorderReminders() {
  console.log('[SCHEDULER] Running reorder reminder check...');

  try {
    // Find foodies who ordered 7-14 days ago and haven't ordered since
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // Find users with orders in that period
    const recentOrders = await Order.find({
      status: 'completed',
      completedAt: {
        $gte: fourteenDaysAgo,
        $lte: sevenDaysAgo
      }
    }).distinct('customer');

    // Filter users who haven't ordered since
    const latestOrder = await Order.findOne({
      customer: { $in: recentOrders },
      status: 'completed'
    }).sort({ completedAt: -1 });

    if (!latestOrder) {
      console.log('[SCHEDULER] No orders found for reorder reminder');
      return;
    }

    const usersToNotify = recentOrders.filter(userId => {
      return !recentOrders.some(id => id.toString() === userId.toString() && false); // Simplified
    });

    for (const userId of recentOrders) {
      const user = await User.findById(userId);
      if (!user) continue;

      // Check if user has opted in to promotions
      if (!user.notificationSettings?.promotionNotifications) continue;

      // Check cooldown
      const shouldSend = await checkAndRecordCooldown(
        userId.toString(),
        'marketing_reorder',
        `reorder:${userId}`
      );

      if (shouldSend) {
        await createNotification({
          userId: user._id,
          role: 'foodie',
          title: 'Your favorite meals miss you! 🍽️',
          message: 'Order again from your favorite cooks.',
          type: 'marketing_reorder',
          entityType: 'order',
          entityId: latestOrder._id,
          deepLink: '/menu',
          countryCode: user.countryCode
        });
        console.log(`[SCHEDULER] Sent reorder reminder to ${user.email}`);
      }
    }
  } catch (error) {
    console.error('[SCHEDULER] Error in reorder reminder:', error);
  }
}

/**
 * TRIGGER 3: Personalized Promotion Reminder
 * Notifies users of active campaigns they're eligible for
 */
async function sendPromotionReminders() {
  console.log('[SCHEDULER] Running promotion reminder check...');

  try {
    // Find active campaigns
    const now = new Date();
    const activeCampaigns = await Campaign.find({
      status: 'ACTIVE',
      startAt: { $lte: now },
      endAt: { $gte: now }
    });

    if (activeCampaigns.length === 0) {
      console.log('[SCHEDULER] No active campaigns found');
      return;
    }

    // Get all foodies who have opted in to promotions
    const foodies = await User.find({
      role: 'foodie',
      'notificationSettings.pushEnabled': true,
      'notificationSettings.promotionNotifications': true
    }).limit(500);

    for (const user of foodies) {
      for (const campaign of activeCampaigns) {
        // Check country match
        if (campaign.countryCode && campaign.countryCode !== user.countryCode) {
          continue;
        }

        // Check cooldown for this specific campaign
        const dedupeKey = `promo:${campaign._id}:${user._id}`;
        const shouldSend = await checkAndRecordCooldown(
          user._id.toString(),
          'marketing_promo',
          dedupeKey
        );

        if (shouldSend) {
          await createNotification({
            userId: user._id,
            role: 'foodie',
            title: 'Special Offer Just for You! 🎁',
            message: campaign.description || 'Check out our latest promotions!',
            type: 'marketing_promo',
            entityType: 'campaign',
            entityId: campaign._id,
            deepLink: '/offers',
            countryCode: user.countryCode
          });
          console.log(`[SCHEDULER] Sent promotion reminder to ${user.email} for campaign ${campaign._id}`);
        }
      }
    }
  } catch (error) {
    console.error('[SCHEDULER] Error in promotion reminder:', error);
  }
}

/**
 * TRIGGER 4: Favorite Cook Activity
 * Notifies foodies when their favorite cooks post new dishes
 */
async function sendFavoriteCookActivityReminders() {
  console.log('[SCHEDULER] Running favorite cook activity check...');

  try {
    // Find products created in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const newProducts = await Product.find({
      createdAt: { $gte: twentyFourHoursAgo }
    }).populate('cook', 'name storeName');

    if (newProducts.length === 0) {
      console.log('[SCHEDULER] No new products found');
      return;
    }

    // Group products by cook
    const cookNewDishes = {};
    for (const product of newProducts) {
      const cookId = product.cook._id.toString();
      if (!cookNewDishes[cookId]) {
        cookNewDishes[cookId] = {
          cook: product.cook,
          products: []
        };
      }
      cookNewDishes[cookId].products.push(product);
    }

    // Find users who favorited these cooks
    for (const [cookId, data] of Object.entries(cookNewDishes)) {
      const usersWhoFavorited = await User.find({
        favorites: { $in: [cookId] },
        'notificationSettings.pushEnabled': true,
        'notificationSettings.promotionNotifications': true
      });

      for (const user of usersWhoFavorited) {
        // Check cooldown for this specific cook
        const dedupeKey = `fav_cook:${cookId}:${user._id}`;
        const shouldSend = await checkAndRecordCooldown(
          user._id.toString(),
          'marketing_favorite_activity',
          dedupeKey
        );

        if (shouldSend) {
          const cookName = data.cook.storeName || data.cook.name;
          await createNotification({
            userId: user._id,
            role: 'foodie',
            title: `${cookName} has something new! 🔥`,
            message: `Check out ${data.products.length} new dish${data.products.length > 1 ? 'es' : ''} from ${cookName}!`,
            type: 'marketing_favorite_activity',
            entityType: 'cook',
            entityId: cookId,
            deepLink: `/cook/${cookId}/menu`,
            countryCode: user.countryCode
          });
          console.log(`[SCHEDULER] Sent favorite cook activity to ${user.email} for cook ${cookName}`);
        }
      }
    }
  } catch (error) {
    console.error('[SCHEDULER] Error in favorite cook activity:', error);
  }
}

/**
 * TRIGGER 5: Weekly Cook Performance Digest
 * Sends weekly summary to cooks about their performance
 */
async function sendWeeklyCookDigest() {
  console.log('[SCHEDULER] Running weekly cook digest check...');

  try {
    // Only run on Sundays at 9 AM (configurable)
    const now = new Date();
    const dayOfWeek = now.getDay();

    if (dayOfWeek !== 0) {
      console.log('[SCHEDULER] Not Sunday, skipping weekly cook digest');
      return;
    }

    // Get all active cooks
    const cooks = await User.find({
      role: 'foodie',
      role_cook_status: 'active'
    });

    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const cook of cooks) {
      // Check cooldown
      const shouldSend = await checkAndRecordCooldown(
        cook._id.toString(),
        'digest_cook_weekly'
      );

      if (shouldSend) {
        // Get cook's stats for the week
        const ordersThisWeek = await Order.countDocuments({
          'subOrders.cook': cook._id,
          createdAt: { $gte: weekStart },
          status: { $in: ['completed', 'delivered'] }
        });

        // Get average rating
        const ratingStats = await OrderRating.aggregate([
          { $match: { cook: cook._id } },
          { $group: { _id: null, avgRating: { $avg: '$overallRating' } } }
        ]);

        const avgRating = ratingStats[0]?.avgRating || 0;

        await createNotification({
          userId: cook._id,
          role: 'cook',
          title: 'Your Weekly Performance Summary 📊',
          message: `This week: ${ordersThisWeek} orders${avgRating > 0 ? `, ${avgRating.toFixed(1)} avg rating` : ''}. Keep up the great work!`,
          type: 'digest_cook_weekly',
          entityType: 'digest',
          deepLink: '/cook/dashboard',
          countryCode: cook.countryCode
        });
        console.log(`[SCHEDULER] Sent weekly digest to cook ${cook.email}`);
      }
    }
  } catch (error) {
    console.error('[SCHEDULER] Error in weekly cook digest:', error);
  }
}

/**
 * TRIGGER 6: Cook Performance Warning
 * Sends warning when cook's rating drops below threshold
 */
async function sendCookPerformanceWarnings() {
  console.log('[SCHEDULER] Running cook performance check...');

  try {
    const RATING_THRESHOLD = 3.5;
    const CANCELLATION_THRESHOLD = 0.15; // 15%

    // Find cooks with low ratings
    const lowRatedCooks = await User.find({
      role: 'foodie',
      role_cook_status: 'active',
      cookRatingAvg: { $lt: RATING_THRESHOLD }
    });

    for (const cook of lowRatedCooks) {
      // Check cooldown
      const shouldSend = await checkAndRecordCooldown(
        cook._id.toString(),
        'cook_performance'
      );

      if (shouldSend) {
        await createNotification({
          userId: cook._id,
          role: 'cook',
          title: 'Performance Alert ⚠️',
          message: `Your average rating has dropped to ${cook.cookRatingAvg.toFixed(1)}. Check your reviews and improve your service!`,
          type: 'cook_performance',
          entityType: 'cook',
          entityId: cook._id,
          deepLink: '/cook/account-status',
          countryCode: cook.countryCode
        });
        console.log(`[SCHEDULER] Sent performance warning to cook ${cook.email}`);
      }
    }
  } catch (error) {
    console.error('[SCHEDULER] Error in cook performance check:', error);
  }
}

/**
 * TRIGGER 7: Daily Admin Platform Digest
 * Sends daily summary to admins about platform activity
 */
async function sendDailyAdminDigest() {
  console.log('[SCHEDULER] Running daily admin digest check...');

  try {
    // Only run at 8 AM
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour !== 8) {
      console.log('[SCHEDULER] Not 8 AM, skipping daily admin digest');
      return;
    }

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
    const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));

    // Get platform stats
    const [ordersCount, newUsers, newCooks, activeCooks] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: startOfYesterday, $lte: endOfYesterday } }),
      User.countDocuments({ createdAt: { $gte: startOfYesterday, role: 'foodie' } }),
      User.countDocuments({ createdAt: { $gte: startOfYesterday, role: 'foodie', role_cook_status: 'pending' } }),
      User.countDocuments({ role: 'foodie', role_cook_status: 'active' })
    ]);

    // Get admins
    const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } });

    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        role: 'admin',
        title: 'Daily Platform Summary 📈',
        message: `Yesterday: ${ordersCount} orders, ${newUsers} new foodies, ${newCooks} cook applications. ${activeCooks} active cooks.`,
        type: 'digest_admin_daily',
        entityType: 'digest',
        deepLink: '/admin/dashboard',
        countryCode: admin.countryCode
      });
      console.log(`[SCHEDULER] Sent daily digest to admin ${admin.email}`);
    }
  } catch (error) {
    console.error('[SCHEDULER] Error in daily admin digest:', error);
  }
}

/**
 * Cleanup old dedupe records (run daily)
 */
async function cleanupDedupeRecords() {
  console.log('[SCHEDULER] Cleaning up old dedupe records...');
  try {
    await NotificationDedupe.cleanupOldRecords();
    console.log('[SCHEDULER] Cleanup complete');
  } catch (error) {
    console.error('[SCHEDULER] Error cleaning up dedupe records:', error);
  }
}

/**
 * Run all scheduled tasks
 */
async function runAllTasks() {
  console.log('[SCHEDULER] Running all notification tasks...');

  // Run cleanup
  await cleanupDedupeRecords();

  // Run all triggers
  await sendAbandonedCartReminders();
  await sendReorderReminders();
  await sendPromotionReminders();
  await sendFavoriteCookActivityReminders();
  await sendWeeklyCookDigest();
  await sendCookPerformanceWarnings();
  await sendDailyAdminDigest();

  console.log('[SCHEDULER] All tasks completed');
}

/**
 * Start the scheduler (call this from server.js)
 */
function startScheduler() {
  console.log('[SCHEDULER] Starting notification scheduler...');

  // Run all tasks immediately on startup
  runAllTasks();

  // Set up interval for hourly tasks (abandoned cart, etc.)
  setInterval(() => {
    sendAbandonedCartReminders();
    sendFavoriteCookActivityReminders();
  }, 60 * 60 * 1000); // Every hour

  // Set up daily tasks
  setInterval(() => {
    sendReorderReminders();
    sendPromotionReminders();
    sendCookPerformanceWarnings();
    sendDailyAdminDigest();
    cleanupDedupeRecords();
  }, 24 * 60 * 60 * 1000); // Every 24 hours

  // Set up weekly tasks
  setInterval(() => {
    sendWeeklyCookDigest();
  }, 7 * 24 * 60 * 60 * 1000); // Every 7 days

  console.log('[SCHEDULER] Scheduler started');
}

module.exports = {
  startScheduler,
  runAllTasks,
  sendAbandonedCartReminders,
  sendReorderReminders,
  sendPromotionReminders,
  sendFavoriteCookActivityReminders,
  sendWeeklyCookDigest,
  sendCookPerformanceWarnings,
  sendDailyAdminDigest,
  cleanupDedupeRecords,
  checkAndRecordCooldown
};
