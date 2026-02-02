require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Cook = require('./models/Cook');
const Invoice = require('./models/Invoice');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Find the demo cook user
    const user = await User.findOne({ email: 'cook@test.com' });
    if (!user) {
      console.log('Demo cook user not found');
      process.exit(1);
    }
    
    console.log('Found user:', user.email);
    
    // Check if Cook record exists
    let cook = await Cook.findOne({ userId: user._id });
    
    if (!cook) {
      // Create Cook record
      console.log('Creating Cook record...');
      cook = await Cook.create({
        userId: user._id,
        name: user.name,
        email: user.email,
        storeName: 'Demo Kitchen',
        area: 'Cairo',
        expertise: [],
        bio: 'Demo cook account for testing',
        profilePhoto: '',
        isTopRated: false,
        status: 'active'
      });
      console.log('Cook record created:', cook._id);
    } else {
      console.log('Cook record already exists:', cook._id);
    }
    
    // Delete existing demo invoices
    await Invoice.deleteMany({ cook: cook._id });
    console.log('Cleared existing invoices');
    
    // Create demo invoices
    const currentDate = new Date();
    const invoices = [
      {
        cook: cook._id,
        invoiceNumber: 'INV-2025-001',
        periodMonth: '2025-01',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        status: 'paid',
        currency: 'SAR',
        grossAmount: 5000,
        commissionRate: 15,
        commissionAmount: 750,
        vatRate: 15,
        vatAmount: 112.5,
        netAmount: 4137.5,
        amountDue: 4137.5,
        issuedAt: new Date('2025-02-01'),
        paidAt: new Date('2025-02-05'),
        paymentLink: 'https://example.com/pay/inv-001'
      },
      {
        cook: cook._id,
        invoiceNumber: 'INV-2025-002',
        periodMonth: '2025-02',
        periodStart: new Date('2025-02-01'),
        periodEnd: new Date('2025-02-28'),
        status: 'issued',
        currency: 'SAR',
        grossAmount: 7200,
        commissionRate: 15,
        commissionAmount: 1080,
        vatRate: 15,
        vatAmount: 162,
        netAmount: 5958,
        amountDue: 5958,
        issuedAt: new Date('2025-03-01'),
        paymentLink: 'https://example.com/pay/inv-002'
      },
      {
        cook: cook._id,
        invoiceNumber: 'INV-2025-003',
        periodMonth: '2025-03',
        periodStart: new Date('2025-03-01'),
        periodEnd: new Date('2025-03-31'),
        status: 'draft',
        currency: 'SAR',
        grossAmount: 3800,
        commissionRate: 15,
        commissionAmount: 570,
        vatRate: 15,
        vatAmount: 85.5,
        netAmount: 3144.5,
        amountDue: 3144.5
      }
    ];
    
    const created = await Invoice.insertMany(invoices);
    console.log(`Created ${created.length} demo invoices`);
    
    // Display results
    console.log('\nDemo invoices created:');
    created.forEach(inv => {
      console.log(`- ${inv.invoiceNumber}: ${inv.status.toUpperCase()} - ${inv.currency} ${inv.netAmount}`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
