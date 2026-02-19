// READ-ONLY Audit Script - Do NOT modify anything
const mongoose = require('mongoose');
const User = require('./models/User');
const Cook = require('./models/Cook');
const Product = require('./models/Product');
const DishOffer = require('./models/DishOffer');
const Order = require('./models/Order');
const Invoice = require('./models/Invoice');
const Category = require('./models/Category');
require('dotenv').config();

const auditDemoData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace');
    console.log('\n========== READ-ONLY AUDIT: Demo/Seed Data Report ==========\n');

    // 1. USERS
    console.log('=== 1. USER ACCOUNTS ===');
    const allUsers = await User.find();
    console.log('Total Users: ' + allUsers.length);
    
    const demoEmails = ['test.com', 'demo', 'example'];
    const demoUsers = allUsers.filter(u => demoEmails.some(pattern => (u.email || '').toLowerCase().includes(pattern)));
    
    console.log('\nDemo/Test users: ' + demoUsers.length);
    demoUsers.forEach(u => console.log('  - ' + u.email + ' (role: ' + u.role + ', name: ' + u.name + ')'));
    
    const realUsers = allUsers.filter(u => !demoEmails.some(pattern => (u.email || '').toLowerCase().includes(pattern)));
    console.log('\nReal users: ' + realUsers.length);
    
    console.log('\n*** EXCLUDED ACCOUNTS (DO NOT DELETE):');
    const excludedAccounts = ['cooksecond@test.com', 'cook@test.com', 'admin@test.com'];
    const excluded = allUsers.filter(u => excludedAccounts.includes(u.email));
    excluded.forEach(u => console.log('  - ' + u.email));

    // 2. COOKS
    console.log('\n=== 2. COOK PROFILES ===');
    const allCooks = await Cook.find({});
    console.log('Total Cook profiles: ' + allCooks.length);
    
    const demoCooks = allCooks.filter(c => demoEmails.some(pattern => (c.email || '').toLowerCase().includes(pattern)));
    console.log('Demo Cook profiles: ' + demoCooks.length);
    demoCooks.forEach(c => console.log('  - ' + c.email + ' (store: ' + c.storeName + ')'));
    
    const realCooks = allCooks.filter(c => !demoEmails.some(pattern => (c.email || '').toLowerCase().includes(pattern)));
    console.log('Real Cook profiles: ' + realCooks.length);

    // 3. PRODUCTS
    console.log('\n=== 3. PRODUCTS (Cook-created dishes) ===');
    const allProducts = await Product.find({});
    console.log('Total Products: ' + allProducts.length);
    
    const demoProducts = allProducts.filter(p => 
      ((p.name || '').toLowerCase().includes('test') || 
      (p.name || '').toLowerCase().includes('demo') ||
      demoEmails.some(pattern => (p.email || '').toLowerCase().includes(pattern)))
    );
    console.log('Demo Products: ' + demoProducts.length);
    
    const realProducts = allProducts.filter(p => 
      !((p.name || '').toLowerCase().includes('test') || 
      (p.name || '').toLowerCase().includes('demo')) &&
      !demoEmails.some(pattern => (p.email || '').toLowerCase().includes(pattern))
    );
    console.log('Real Products: ' + realProducts.length);

    // 4. DISH OFFERS
    console.log('\n=== 4. DISH OFFERS (Admin Dish offers) ===');
    const allOffers = await DishOffer.find({});
    console.log('Total Dish Offers: ' + allOffers.length);
    
    const activeOffers = allOffers.filter(o => o.isActive === true);
    console.log('Active Offers: ' + activeOffers.length);
    
    const inactiveOffers = allOffers.filter(o => o.isActive === false);
    console.log('Inactive Offers: ' + inactiveOffers.length);

    // 5. ORDERS
    console.log('\n=== 5. ORDERS ===');
    const allOrders = await Order.find({});
    console.log('Total Orders: ' + allOrders.length);
    
    const demoUserIds = demoUsers.map(u => u._id.toString());
    const demoCookIds = demoCooks.map(c => c._id.toString());
    
    const demoOrders = allOrders.filter(o => 
      demoUserIds.includes((o.user || '').toString()) ||
      demoCookIds.includes((o.cook || '').toString()) ||
      ((o.customerName || '').toLowerCase().includes('test') ||
      (o.customerName || '').toLowerCase().includes('demo'))
    );
    console.log('Demo/Test Orders: ' + demoOrders.length);
    console.log('Real Orders: ' + (allOrders.length - demoOrders.length));

    // 6. INVOICES
    console.log('\n=== 6. INVOICES ===');
    const allInvoices = await Invoice.find({});
    console.log('Total Invoices: ' + allInvoices.length);

    // 7. CATEGORIES
    console.log('\n=== 7. CATEGORIES ===');
    const allCategories = await Category.find({});
    console.log('Total Categories: ' + allCategories.length);
    allCategories.forEach(c => console.log('  - ' + c.name + ' (' + c.nameAr + ')'));

    // SUMMARY
    console.log('\n========== SUMMARY ==========');
    console.log('');
    console.log('Collection         | Total | Demo | Real');
    console.log('-------------------|-------|------|------');
    console.log('Users             | ' + String(allUsers.length).padEnd(5) + ' | ' + String(demoUsers.length).padEnd(4) + ' | ' + realUsers.length);
    console.log('Cooks            | ' + String(allCooks.length).padEnd(5) + ' | ' + String(demoCooks.length).padEnd(4) + ' | ' + realCooks.length);
    console.log('Products         | ' + String(allProducts.length).padEnd(5) + ' | ' + String(demoProducts.length).padEnd(4) + ' | ' + realProducts.length);
    console.log('DishOffers       | ' + String(allOffers.length).padEnd(5) + ' |  -  | ' + allOffers.length);
    console.log('Orders           | ' + String(allOrders.length).padEnd(5) + ' | ' + String(demoOrders.length).padEnd(4) + ' | ' + (allOrders.length - demoOrders.length));
    console.log('Invoices         | ' + String(allInvoices.length).padEnd(5) + ' |  -  | ' + allInvoices.length);
    console.log('Categories       | ' + String(allCategories.length).padEnd(5) + ' |  -  | ' + allCategories.length);
    console.log('');
    console.log('Demo/Test Email Patterns Used:');
    console.log('  - @test.com');
    console.log('  - demo');
    console.log('  - example');
    console.log('');
    console.log('*** EXCLUDED ACCOUNTS (per user request):');
    console.log('  - cooksecond@test.com');
    console.log('  - cook@test.com');
    console.log('  - admin@test.com');
    console.log('');
    console.log('========== AUDIT COMPLETE - READ ONLY ==========');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

auditDemoData();
