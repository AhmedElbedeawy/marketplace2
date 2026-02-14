const mongoose = require('mongoose');
const { Order } = require('./models/Order');
require('dotenv').config();

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Get recent orders
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(10);

    console.log('\n📋 RECENT ORDERS (Last 10):');
    console.log(`Total: ${orders.length}\n`);

    orders.forEach((order, idx) => {
      console.log(`\n[${idx}] Order ID: ${order._id}`);
      console.log(`    Customer: ${order.customer}`);
      console.log(`    Created: ${order.createdAt}`);
      console.log(`    SubOrders: ${order.subOrders.length}`);
      
      order.subOrders.forEach((sub, sidx) => {
        console.log(`\n    SubOrder ${sidx}:`);
        console.log(`      _id: ${sub._id}`);
        console.log(`      fulfillmentMode: ${sub.fulfillmentMode}`);
        console.log(`      prepTime: ${sub.prepTime}`);
        console.log(`      items: ${sub.items.length}`);
        
        if (sub.items.length > 0) {
          const firstItem = sub.items[0];
          console.log(`\n      First Item:`);
          console.log(`        product: ${firstItem.product}`);
          console.log(`        quantity: ${firstItem.quantity}`);
          console.log(`        price: ${firstItem.price}`);
          console.log(`        productSnapshot.name: ${firstItem.productSnapshot?.name}`);
          console.log(`        productSnapshot.image: ${firstItem.productSnapshot?.image}`);
        }
      });
    });

    // Detect mixed orders
    console.log('\n\n🔍 DETECTING MIXED ORDERS:');
    const mixedOrders = orders.filter(order => {
      const modes = new Set(order.subOrders.map(s => s.fulfillmentMode));
      return modes.size > 1;
    });

    if (mixedOrders.length > 0) {
      console.log(`Found ${mixedOrders.length} mixed order(s):`);
      mixedOrders.forEach((order, idx) => {
        console.log(`\n[MIXED ${idx}] Order ID: ${order._id}`);
        console.log(`    SubOrders:`);
        order.subOrders.forEach((sub, sidx) => {
          console.log(`      ${sidx}: fulfillmentMode=${sub.fulfillmentMode}, prepTime=${sub.prepTime}, items=${sub.items.length}`);
        });
      });
    } else {
      console.log('❌ No mixed orders found');
    }

    // Show NEW order (created in last 5 minutes)
    console.log('\n\n🆕 NEWEST ORDERS (Last 5 minutes):');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const newOrders = orders.filter(o => o.createdAt > fiveMinutesAgo);
    
    if (newOrders.length > 0) {
      newOrders.forEach((order, idx) => {
        console.log(`\n[NEW ${idx}] Order ID: ${order._id}`);
        console.log(`    Created: ${order.createdAt}`);
        console.log(`    SubOrders: ${order.subOrders.length}`);
        
        order.subOrders.forEach((sub, sidx) => {
          console.log(`\n    SubOrder ${sidx}:`);
          console.log(`      mode: ${sub.fulfillmentMode}`);
          console.log(`      prepTime: ${sub.prepTime}`);
          console.log(`      items: ${sub.items.length}`);
          
          if (sub.items.length > 0) {
            const firstItem = sub.items[0];
            console.log(`      First item image: ${firstItem.productSnapshot?.image}`);
          }
        });
      });
    } else {
      console.log('❌ No new orders in last 5 minutes');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
