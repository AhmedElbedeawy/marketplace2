/**
 * createDemoAccount.js
 * Creates or resets the Apple App Review demo account.
 *
 * Account: demo@eltekkeya.com / Test1234!
 * - isPhoneVerified is set to true in the DB as a belt-and-suspenders backup
 *   (the loginUser bypass in authController already returns true at runtime,
 *    but this ensures checkout and profile flows work even if the server logic
 *    is ever re-ordered).
 * - isDeleted: false — ensures a previously deleted demo account is restored.
 *
 * Usage:
 *   cd server && node scripts/createDemoAccount.js
 *   or:  npm run seed:demo-account
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DEMO_EMAIL = 'demo@eltekkeya.com';
const DEMO_PASSWORD = 'Test1234!';
const DEMO_NAME = 'ElTekkeya Demo';

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGO_URI is not set in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected.');

  // Load User model after mongoose connects
  const User = require('../models/User');

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  const existing = await User.findOne({ email: DEMO_EMAIL });

  if (existing) {
    // Reset the existing account to a clean state
    await User.findByIdAndUpdate(existing._id, {
      name: DEMO_NAME,
      password: hashedPassword,
      isPhoneVerified: true,
      isDeleted: false,
      role: 'foodie',
      role_cook_status: 'none',
      provider: 'local',
      providerId: undefined,
    });
    console.log(`✅ Demo account updated: ${DEMO_EMAIL}`);
    console.log(`   _id: ${existing._id}`);
  } else {
    // Create fresh
    const user = await User.create({
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD, // pre-save hook will hash this
      isPhoneVerified: true,
      role: 'foodie',
      role_cook_status: 'none',
      provider: 'local',
    });
    console.log(`✅ Demo account created: ${DEMO_EMAIL}`);
    console.log(`   _id: ${user._id}`);
  }

  console.log(`   Password: ${DEMO_PASSWORD}`);
  console.log(`   isPhoneVerified: true`);
  console.log('\nDone. Disconnecting...');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
