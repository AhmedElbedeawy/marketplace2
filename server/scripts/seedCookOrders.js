#!/usr/bin/env node
/**
 * Dev-only script to seed dummy orders for cook@test.com
 * 
 * Usage: node scripts/seedCookOrders.js
 * 
 * Safety: Aborts if NODE_ENV === 'production'
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Safety guard - never run in production
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ERROR: This script cannot run in production environment');
  process.exit(1);
}

// Import models
const User = require('../models/User');
const Cook = require('../models/Cook');
const DishOffer = require('../models/DishOffer');
const { Order } = require('../models/Order');
const AdminDish = require('../models/AdminDish');

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace';

async function connectDB() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');
}

async function disconnectDB() {
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
}

async function seedCookOrders() {
  try {
    await connectDB();

    console.log('\n🔍 Finding cook@test.com...');
    const cookUser = await User.findOne({ email: 'cook@test.com' });
    if (!cookUser) {
      console.error('❌ Cook user not found: cook@test.com');
      process.exit(1);
    }
    console.log(`✅ Found cook user: ${cookUser._id}`);

    // Find the cook profile
    const cookProfile = await Cook.findOne({ userId: cookUser._id });
    if (!cookProfile) {
      console.error('❌ Cook profile not found for user');
      process.exit(1);
    }
    console.log(`✅ Found cook profile: ${cookProfile.storeName}`);

    // Find dish offers for this cook
    console.log('\n🔍 Finding dish offers for cook...');
    let offers = await DishOffer.find({ cook: cookProfile._id, isActive: true })
      .populate('adminDish', 'nameEn nameAr imageUrl descriptionEn descriptionAr')
      .lean();

    // If no offers exist, create some
    if (offers.length === 0) {
      console.log('⚠️  No active offers found. Creating sample offers...');
      
      // Find some admin dishes to create offers for
      const adminDishes = await AdminDish.find({ isActive: true }).limit(3);
      if (adminDishes.length === 0) {
        console.error('❌ No admin dishes found to create offers');
        process.exit(1);
      }

      const sampleOffers = [];
      for (let i = 0; i < Math.min(3, adminDishes.length); i++) {
        const dish = adminDishes[i];
        const offer = await DishOffer.create({
          adminDishId: dish._id,
          cook: cookProfile._id,
          price: 50 + (i * 25), // 50, 75, 100
          stock: 10 + (i * 5),
          portionSize: ['small', 'medium', 'large'][i],
          prepReadyConfig: {
            optionType: ['fixed', 'range', 'cutoff'][i],
            prepTimeMinutes: 30 + (i * 15),
            prepTimeMinMinutes: i === 1 ? 30 : undefined,
            prepTimeMaxMinutes: i === 1 ? 60 : undefined,
            cutoffTime: i === 2 ? '14:00' : undefined,
            beforeCutoffReadyTime: i === 2 ? '18:00' : undefined
          },
          fulfillmentModes: {
            pickup: true,
            delivery: i !== 0 // First dish pickup only
          },
          deliveryFee: i === 0 ? 0 : 15 + (i * 5),
          isActive: true,
          images: []
        });
        
        // Re-fetch with populated adminDish
        const populatedOffer = await DishOffer.findById(offer._id)
          .populate('adminDish', 'nameEn nameAr imageUrl descriptionEn descriptionAr')
          .lean();
        
        sampleOffers.push(populatedOffer);
        console.log(`✅ Created offer: ${dish.nameEn} - ${offer.price} SAR`);
      }
      
      offers = sampleOffers;
    } else {
      console.log(`✅ Found ${offers.length} existing offers`);
    }

    // Find or create a customer user
    console.log('\n🔍 Finding customer user...');
    let customer = await User.findOne({ email: 'customer@test.com' });
    if (!customer) {
      customer = await User.create({
        email: 'customer@test.com',
        password: '$2a$10$YourHashedPasswordHere', // placeholder
        name: 'Test Customer',
        role: 'foodie',
        status: 'active',
        phone: '+966500000001'
      });
      console.log(`✅ Created customer user: ${customer._id}`);
    } else {
      console.log(`✅ Found customer user: ${customer._id}`);
    }

    // Create orders
    console.log('\n📝 Creating orders...\n');
    const createdOrders = [];

    // Order A: Pickup, single dish, quantity 1
    if (offers.length >= 1) {
      const offerA = offers[0];
      const orderA = await Order.create({
        customer: customer._id,
        deliveryAddress: {
          addressLine1: '123 Test Street',
          addressLine2: '',
          city: 'Riyadh',
          countryCode: 'SA',
          label: 'Home',
          deliveryNotes: 'Please call on arrival',
          lat: 24.7136,
          lng: 46.6753
        },
        subOrders: [{
          cook: cookUser._id,
          pickupAddress: `${cookProfile.city || 'Riyadh'}, ${cookProfile.area || ''}`,
          cookLocationSnapshot: {
            lat: cookProfile.location?.lat || 24.7136,
            lng: cookProfile.location?.lng || 46.6753,
            address: `${cookProfile.city || 'Riyadh'}, ${cookProfile.area || ''}`,
            city: cookProfile.city || 'Riyadh'
          },
          totalAmount: offerA.price * 1,
          status: 'order_received',
          fulfillmentMode: 'pickup',
          timingPreference: 'separate',
          deliveryFee: 0,
          items: [{
            product: offerA._id,
            quantity: 1,
            price: offerA.price,
            notes: 'Extra spicy please',
            productSnapshot: {
              name: offerA.adminDish?.nameEn || 'Dish A',
              image: offerA.images?.[0] || offerA.adminDish?.imageUrl || '/assets/dishes/placeholder.png',
              description: offerA.adminDish?.descriptionEn || ''
            }
          }]
        }],
        totalAmount: offerA.price * 1,
        status: 'pending',
        notes: 'Test order A - Pickup'
      });
      createdOrders.push({
        id: orderA._id,
        type: 'Order A: Pickup, single dish, qty 1',
        fulfillment: 'pickup',
        total: orderA.totalAmount,
        deliveryFee: 0
      });
      console.log(`✅ Order A created: ${orderA._id} (Pickup, ${offerA.price} SAR)`);
    }

    // Order B: Delivery, two dishes (same cook), quantity variations
    if (offers.length >= 2) {
      const offerB1 = offers[0];
      const offerB2 = offers[1];
      const qty1 = 2;
      const qty2 = 1;
      const deliveryFee = (offerB1.deliveryFee || 0) + (offerB2.deliveryFee || 0);
      const subtotal = (offerB1.price * qty1) + (offerB2.price * qty2);
      
      const orderB = await Order.create({
        customer: customer._id,
        deliveryAddress: {
          addressLine1: '456 Delivery Ave',
          addressLine2: 'Apt 12',
          city: 'Jeddah',
          countryCode: 'SA',
          label: 'Work',
          deliveryNotes: 'Leave at reception',
          lat: 21.4858,
          lng: 39.1925
        },
        subOrders: [{
          cook: cookUser._id,
          pickupAddress: `${cookProfile.city || 'Riyadh'}, ${cookProfile.area || ''}`,
          cookLocationSnapshot: {
            lat: cookProfile.location?.lat || 24.7136,
            lng: cookProfile.location?.lng || 46.6753,
            address: `${cookProfile.city || 'Riyadh'}, ${cookProfile.area || ''}`,
            city: cookProfile.city || 'Riyadh'
          },
          totalAmount: subtotal + deliveryFee,
          status: 'preparing',
          fulfillmentMode: 'delivery',
          timingPreference: 'separate',
          deliveryFee: deliveryFee,
          items: [
            {
              product: offerB1._id,
              quantity: qty1,
              price: offerB1.price,
              notes: '',
              productSnapshot: {
                name: offerB1.adminDish?.nameEn || 'Dish B1',
                image: offerB1.images?.[0] || offerB1.adminDish?.imageUrl || '/assets/dishes/placeholder.png',
                description: offerB1.adminDish?.descriptionEn || ''
              }
            },
            {
              product: offerB2._id,
              quantity: qty2,
              price: offerB2.price,
              notes: 'No onions',
              productSnapshot: {
                name: offerB2.adminDish?.nameEn || 'Dish B2',
                image: offerB2.images?.[0] || offerB2.adminDish?.imageUrl || '/assets/dishes/placeholder.png',
                description: offerB2.adminDish?.descriptionEn || ''
              }
            }
          ]
        }],
        totalAmount: subtotal + deliveryFee,
        status: 'confirmed',
        notes: 'Test order B - Delivery, 2 dishes'
      });
      createdOrders.push({
        id: orderB._id,
        type: 'Order B: Delivery, 2 dishes, separate timing',
        fulfillment: 'delivery',
        total: orderB.totalAmount,
        deliveryFee: deliveryFee
      });
      console.log(`✅ Order B created: ${orderB._id} (Delivery, ${subtotal} SAR + ${deliveryFee} SAR delivery)`);
    }

    // Order C: Combined delivery with different ready times
    if (offers.length >= 2) {
      const offerC1 = offers[0];
      const offerC2 = offers[offers.length - 1]; // Use different dish
      const qty1 = 1;
      const qty2 = 1;
      
      // Calculate combined delivery fee (max of both)
      const deliveryFee = Math.max(offerC1.deliveryFee || 0, offerC2.deliveryFee || 0);
      const subtotal = (offerC1.price * qty1) + (offerC2.price * qty2);
      
      // Calculate combined ready time (latest prep time)
      const prepTime1 = offerC1.prepReadyConfig?.prepTimeMinutes || 30;
      const prepTime2 = offerC2.prepReadyConfig?.prepTimeMinutes || 45;
      const maxPrepTime = Math.max(prepTime1, prepTime2);
      const combinedReadyTime = new Date(Date.now() + maxPrepTime * 60000);
      
      const orderC = await Order.create({
        customer: customer._id,
        deliveryAddress: {
          addressLine1: '789 Combined St',
          addressLine2: '',
          city: 'Dammam',
          countryCode: 'SA',
          label: 'Home',
          deliveryNotes: 'Ring doorbell',
          lat: 26.3927,
          lng: 50.0916
        },
        subOrders: [{
          cook: cookUser._id,
          pickupAddress: `${cookProfile.city || 'Riyadh'}, ${cookProfile.area || ''}`,
          cookLocationSnapshot: {
            lat: cookProfile.location?.lat || 24.7136,
            lng: cookProfile.location?.lng || 46.6753,
            address: `${cookProfile.city || 'Riyadh'}, ${cookProfile.area || ''}`,
            city: cookProfile.city || 'Riyadh'
          },
          totalAmount: subtotal + deliveryFee,
          status: 'order_received',
          fulfillmentMode: 'delivery',
          timingPreference: 'combined',
          combinedReadyTime: combinedReadyTime,
          deliveryFee: deliveryFee,
          items: [
            {
              product: offerC1._id,
              quantity: qty1,
              price: offerC1.price,
              notes: '',
              productSnapshot: {
                name: offerC1.adminDish?.nameEn || 'Dish C1',
                image: offerC1.images?.[0] || offerC1.adminDish?.imageUrl || '/assets/dishes/placeholder.png',
                description: offerC1.adminDish?.descriptionEn || ''
              }
            },
            {
              product: offerC2._id,
              quantity: qty2,
              price: offerC2.price,
              notes: 'Extra sauce',
              productSnapshot: {
                name: offerC2.adminDish?.nameEn || 'Dish C2',
                image: offerC2.images?.[0] || offerC2.adminDish?.imageUrl || '/assets/dishes/placeholder.png',
                description: offerC2.adminDish?.descriptionEn || ''
              }
            }
          ]
        }],
        totalAmount: subtotal + deliveryFee,
        status: 'pending',
        notes: 'Test order C - Combined delivery'
      });
      createdOrders.push({
        id: orderC._id,
        type: 'Order C: Combined delivery, 2 dishes, combined timing',
        fulfillment: 'delivery (combined)',
        total: orderC.totalAmount,
        deliveryFee: deliveryFee,
        combinedReadyTime: combinedReadyTime.toISOString()
      });
      console.log(`✅ Order C created: ${orderC._id} (Combined delivery, ${subtotal} SAR + ${deliveryFee} SAR delivery)`);
    }

    // Order D: Ready for pickup status
    if (offers.length >= 1) {
      const offerD = offers[offers.length - 1];
      const orderD = await Order.create({
        customer: customer._id,
        deliveryAddress: {
          addressLine1: '321 Ready Lane',
          addressLine2: '',
          city: 'Riyadh',
          countryCode: 'SA',
          label: 'Home',
          deliveryNotes: '',
          lat: 24.7136,
          lng: 46.6753
        },
        subOrders: [{
          cook: cookUser._id,
          pickupAddress: `${cookProfile.city || 'Riyadh'}, ${cookProfile.area || ''}`,
          cookLocationSnapshot: {
            lat: cookProfile.location?.lat || 24.7136,
            lng: cookProfile.location?.lng || 46.6753,
            address: `${cookProfile.city || 'Riyadh'}, ${cookProfile.area || ''}`,
            city: cookProfile.city || 'Riyadh'
          },
          totalAmount: offerD.price * 2,
          status: 'ready',
          fulfillmentMode: 'pickup',
          timingPreference: 'separate',
          deliveryFee: 0,
          items: [{
            product: offerD._id,
            quantity: 2,
            price: offerD.price,
            notes: 'Ready for pickup test',
            productSnapshot: {
              name: offerD.adminDish?.nameEn || 'Dish D',
              image: offerD.images?.[0] || offerD.adminDish?.imageUrl || '/assets/dishes/placeholder.png',
              description: offerD.adminDish?.descriptionEn || ''
            }
          }]
        }],
        totalAmount: offerD.price * 2,
        status: 'confirmed',
        notes: 'Test order D - Ready for pickup'
      });
      createdOrders.push({
        id: orderD._id,
        type: 'Order D: Pickup, ready status',
        fulfillment: 'pickup',
        total: orderD.totalAmount,
        deliveryFee: 0
      });
      console.log(`✅ Order D created: ${orderD._id} (Ready for pickup, ${offerD.price * 2} SAR)`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SEEDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Cook ID:        ${cookUser._id}`);
    console.log(`Cook Name:      ${cookProfile.storeName}`);
    console.log(`Customer ID:    ${customer._id}`);
    console.log(`Orders Created: ${createdOrders.length}`);
    console.log('\nOrder Details:');
    createdOrders.forEach((order, idx) => {
      console.log(`\n  ${idx + 1}. ${order.type}`);
      console.log(`     ID:           ${order.id}`);
      console.log(`     Fulfillment:  ${order.fulfillment}`);
      console.log(`     Total:        ${order.total} SAR`);
      console.log(`     Delivery Fee: ${order.deliveryFee} SAR`);
      if (order.combinedReadyTime) {
        console.log(`     Ready By:     ${order.combinedReadyTime}`);
      }
    });
    console.log('\n' + '='.repeat(60));
    console.log('✅ Seeding completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Login to Cook Hub as cook@test.com');
    console.log('2. Navigate to Orders page');
    console.log('3. Click "View details" on any order');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

// Run the seeding
seedCookOrders();
