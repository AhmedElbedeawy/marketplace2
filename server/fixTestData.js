// Fix test data: Update user roles and subOrder cook IDs
const mongoose = require('mongoose');
require('dotenv').config();
require('./models/User');
require('./models/Order');
const User = mongoose.model('User');
const Order = mongoose.model('Order');

async function fixTestData() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eltekkeya_marketplace');
    console.log('Connected to MongoDB');
    
    // Step 1: Fix user roles - make test cooks actually cooks
    console.log('\n=== FIXING USER COOK STATUS ===');
    const cookEmails = ['cook@test.com', 'cooksecond@test.com'];
    
    for (const email of cookEmails) {
      const user = await User.findOne({ email });
      if (user) {
        const oldStatus = user.isCook;
        user.isCook = true;
        await user.save();
        console.log(`✓ ${user.name} (${email}): isCook ${oldStatus} → true`);
      }
    }
    
    // Step 2: Fix subOrder cook IDs - point to real users
    console.log('\n=== FIXING SUBORDER COOK IDs ===');
    
    // Get real cook IDs (users with isCook: true)
    const cooks = await User.find({ isCook: true }).select('_id name email');
    const cookMap = {};
    cooks.forEach(c => {
      cookMap[c.email] = c._id.toString();
    });
    
    console.log('Available cooks:');
    cooks.forEach(c => console.log(`  - ${c.name}: ${c._id}`));
    
    // Find orders with invalid cook IDs
    const orders = await Order.find({});
    let fixedCount = 0;
    
    for (const order of orders) {
      let modified = false;
      
      for (const subOrder of order.subOrders) {
        const cookId = subOrder.cook?.toString();
        
        // Skip if cookId is not a valid ObjectId format
        if (!cookId || !/^[0-9a-fA-F]{24}$/.test(cookId)) {
          console.log(`\n⚠️  Order ${order._id.toString().slice(-6)}, SubOrder ${subOrder._id.toString().slice(-6)}`);
          console.log(`   Invalid cook ID format: ${cookId}`);
          
          // Assign to first available cook
          const defaultCook = cooks[0];
          subOrder.cook = defaultCook._id;
          modified = true;
          fixedCount++;
          
          console.log(`   ✓ Reassigned to: ${defaultCook.name} (${defaultCook._id})`);
          continue;
        }
        
        // Check if cook ID exists as a real user
        const cookExists = await User.exists({ _id: cookId });
        
        if (!cookExists) {
          console.log(`\n⚠️  Order ${order._id.toString().slice(-6)}, SubOrder ${subOrder._id.toString().slice(-6)}`);
          console.log(`   Invalid cook ID: ${cookId}`);
          
          // Assign to first available cook (for demo purposes)
          const defaultCook = cooks[0];
          subOrder.cook = defaultCook._id;
          modified = true;
          fixedCount++;
          
          console.log(`   ✓ Reassigned to: ${defaultCook.name} (${defaultCook._id})`);
        }
      }
      
      if (modified) {
        await order.save({ validateBeforeSave: false });
      }
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Fixed ${fixedCount} subOrders with invalid cook IDs`);
    console.log(`\nYou can now test Cook Hub order status updates!`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixTestData();
