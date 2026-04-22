const mongoose = require('mongoose');
require('dotenv').config();

const Cook = require('./models/Cook');

async function debugTopRatedQuery() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected\n');

    const countryCode = 'SA';
    
    console.log('='.repeat(80));
    console.log('STEP 1: Check ALL cooks with isTopRated=true (no other filters)');
    console.log('='.repeat(80));
    
    const allTopRated = await Cook.find({ isTopRated: true })
      .select('name storeName status isAvailable countryCode location ratings ordersCount')
      .lean();
    
    console.log(`\nTotal cooks with isTopRated=true: ${allTopRated.length}\n`);
    
    if (allTopRated.length === 0) {
      console.log('❌ No cooks found with isTopRated=true in database!');
      console.log('This is the root cause - admin marking is not persisting');
      mongoose.disconnect();
      return;
    }
    
    allTopRated.forEach((cook, i) => {
      console.log(`${i+1}. ${cook.storeName || cook.name}`);
      console.log(`   status: ${cook.status}`);
      console.log(`   isAvailable: ${cook.isAvailable}`);
      console.log(`   countryCode: ${cook.countryCode}`);
      console.log(`   location.lat: ${cook.location?.lat}`);
      console.log(`   location.lng: ${cook.location?.lng}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('STEP 2: Apply filters one by one to find which one excludes cooks');
    console.log('='.repeat(80));

    // Filter 1: status
    const filter1 = allTopRated.filter(c => c.status === 'active');
    console.log(`\nAfter status='active' filter: ${filter1.length} cooks`);
    if (filter1.length < allTopRated.length) {
      const excluded = allTopRated.filter(c => c.status !== 'active');
      console.log('   Excluded:', excluded.map(c => `${c.storeName} (status=${c.status})`).join(', '));
    }

    // Filter 2: isAvailable
    const filter2 = filter1.filter(c => c.isAvailable === true);
    console.log(`After isAvailable=true filter: ${filter2.length} cooks`);
    if (filter2.length < filter1.length) {
      const excluded = filter1.filter(c => c.isAvailable !== true);
      console.log('   Excluded:', excluded.map(c => `${c.storeName} (isAvailable=${c.isAvailable})`).join(', '));
    }

    // Filter 3: countryCode
    const filter3 = filter2.filter(c => c.countryCode === countryCode.toUpperCase());
    console.log(`After countryCode='${countryCode.toUpperCase()}' filter: ${filter3.length} cooks`);
    if (filter3.length < filter2.length) {
      const excluded = filter2.filter(c => c.countryCode !== countryCode.toUpperCase());
      console.log('   Excluded:', excluded.map(c => `${c.storeName} (countryCode=${c.countryCode})`).join(', '));
    }

    // Filter 4: location.lat !== 0
    const filter4 = filter3.filter(c => c.location?.lat !== 0);
    console.log(`After location.lat!=0 filter: ${filter4.length} cooks`);
    if (filter4.length < filter3.length) {
      const excluded = filter3.filter(c => c.location?.lat === 0);
      console.log('   Excluded:', excluded.map(c => `${c.storeName} (lat=${c.location?.lat})`).join(', '));
    }

    // Filter 5: location.lng !== 0
    const filter5 = filter4.filter(c => c.location?.lng !== 0);
    console.log(`After location.lng!=0 filter: ${filter5.length} cooks`);
    if (filter5.length < filter4.length) {
      const excluded = filter4.filter(c => c.location?.lng === 0);
      console.log('   Excluded:', excluded.map(c => `${c.storeName} (lng=${c.location?.lng})`).join(', '));
    }

    console.log('\n' + '='.repeat(80));
    console.log('STEP 3: Run the EXACT query from getTopRatedCooks');
    console.log('='.repeat(80));

    const exactQuery = await Cook.find({ 
      status: 'active', 
      isAvailable: true, 
      isTopRated: true,
      countryCode: countryCode.toUpperCase(),
      'location.lat': { $ne: 0 },
      'location.lng': { $ne: 0 }
    })
      .select('name storeName status isAvailable countryCode location')
      .lean();

    console.log(`\n✅ Cooks matching ALL filters: ${exactQuery.length}`);
    
    if (exactQuery.length > 0) {
      console.log('\nMatches:');
      exactQuery.forEach((cook, i) => {
        console.log(`  ${i+1}. ${cook.storeName || cook.name}`);
      });
    } else {
      console.log('\n❌ NO COOKS MATCH - This is why mobile sees empty list!');
      console.log('\nChecking each cook to see which filter fails:');
      
      for (const cook of allTopRated) {
        const fails = [];
        if (cook.status !== 'active') fails.push(`status='${cook.status}' (need 'active')`);
        if (cook.isAvailable !== true) fails.push(`isAvailable=${cook.isAvailable} (need true)`);
        if (cook.countryCode !== countryCode.toUpperCase()) fails.push(`countryCode='${cook.countryCode}' (need '${countryCode.toUpperCase()}')`);
        if (cook.location?.lat === 0 || cook.location?.lat === undefined) fails.push(`lat=${cook.location?.lat} (need !=0)`);
        if (cook.location?.lng === 0 || cook.location?.lng === undefined) fails.push(`lng=${cook.location?.lng} (need !=0)`);
        
        if (fails.length > 0) {
          console.log(`\n  ${cook.storeName || cook.name}:`);
          fails.forEach(f => console.log(`    ❌ ${f}`));
        } else {
          console.log(`\n  ${cook.storeName || cook.name}:`);
          console.log(`    ✅ Should match!`);
        }
      }
    }

    mongoose.disconnect();
    console.log('\n✅ Debug complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    mongoose.disconnect();
    process.exit(1);
  }
}

debugTopRatedQuery();
