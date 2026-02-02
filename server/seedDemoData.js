const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Settings = require('./models/Settings');
const { Order } = require('./models/Order');
require('dotenv').config();

const seedDemoData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace');
    console.log('MongoDB Connected for seeding demo data...\n');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Order.deleteMany({});
    await Settings.deleteMany({});

    // Create Settings with all 5 countries
    console.log('⚙️ Initializing Settings...');
    await Settings.create({
      vatByCountry: [
        { countryCode: 'SA', countryName: 'Saudi Arabia', currencyCode: 'SAR', checkoutVatEnabled: true, checkoutVatRate: 15, vatLabel: 'VAT (15%)' },
        { countryCode: 'EG', countryName: 'Egypt', currencyCode: 'EGP', checkoutVatEnabled: true, checkoutVatRate: 14, vatLabel: 'VAT (14%)' },
        { countryCode: 'AE', countryName: 'United Arab Emirates', currencyCode: 'AED', checkoutVatEnabled: true, checkoutVatRate: 5, vatLabel: 'VAT (5%)' },
        { countryCode: 'KW', countryName: 'Kuwait', currencyCode: 'KWD', checkoutVatEnabled: false, checkoutVatRate: 0, vatLabel: 'VAT' },
        { countryCode: 'QA', countryName: 'Qatar', currencyCode: 'QAR', checkoutVatEnabled: false, checkoutVatRate: 0, vatLabel: 'VAT' }
      ]
    });

    // Create Categories
    console.log('📁 Creating categories...');
    const categories = await Category.insertMany([
      { name: 'Traditional Egyptian Dishes', nameAr: 'أكلات مصرية أصيلة', icon: 'c1.png', color: '#FFB973' },
      { name: 'Grilled', nameAr: 'مشويات', icon: 'c2.png', color: '#FF9966' },
      { name: 'Fried', nameAr: 'مقليات', icon: 'c3.png', color: '#FFCC99' },
      { name: 'Casseroles', nameAr: 'طواجن', icon: 'c4.png', color: '#FFE5B4' },
      { name: 'Oven Dishes', nameAr: 'أكلات بالفرن', icon: 'c5.png', color: '#FFD4A3' },
      { name: 'Salads', nameAr: 'سلطات', icon: 'c6.png', color: '#C8E6C9' },
      { name: 'Desserts', nameAr: 'حلويات', icon: 'c7.png', color: '#F8BBD0' },
    ]);
    console.log(`✅ Created ${categories.length} categories\n`);

    // Create Test Users
    console.log('👥 Creating test users...');
    
    const foodie = await User.create({
      name: 'Sarah Emad',
      email: 'foodie@test.com',
      password: 'test123',
      phone: '+201234567890',
      role: 'foodie',
      isCook: false,
      countryCode: 'EG',
      profileImage: 'https://i.pravatar.cc/150?img=5'
    });

    const cooks = await User.insertMany([
      {
        name: 'Amal Kitchen (EG)',
        email: 'cook@test.com',
        password: 'test123',
        phone: '+201111111111',
        role: 'foodie',
        role_cook_status: 'active',
        isCook: true,
        countryCode: 'EG',
        storeName: 'Amal Kitchen EG',
        storeStatus: 'approved',
        pickupAddress: '15 Tahrir Street, Cairo',
        profilePhoto: '/assets/cooks/C1.png',
        rating: 4.9,
        reviewCount: 323,
        expertise: []
      },
      {
        name: 'Chef Mohamed (SA)',
        email: 'cook2@test.com',
        password: 'test123',
        phone: '+966122222222',
        role: 'foodie',
        role_cook_status: 'active',
        isCook: true,
        countryCode: 'SA',
        storeName: 'Chef Mohamed Kitchen SA',
        storeStatus: 'approved',
        pickupAddress: 'King Fahd Road, Riyadh',
        profilePhoto: '/assets/cooks/C2.png',
        rating: 4.8,
        reviewCount: 256,
        expertise: []
      },
      {
        name: 'Mama Nadia (EG)',
        email: 'cook3@test.com',
        password: 'test123',
        phone: '+201333333333',
        role: 'foodie',
        role_cook_status: 'active',
        isCook: true,
        countryCode: 'EG',
        storeName: 'Mama Nadia Home Cooking EG',
        storeStatus: 'approved',
        pickupAddress: '42 Nasr City, Cairo',
        profilePhoto: '/assets/cooks/C3.png',
        rating: 4.7,
        reviewCount: 189,
        expertise: []
      },
      {
        name: 'Chef Hassan (SA)',
        email: 'cook4@test.com',
        password: 'test123',
        phone: '+966144444444',
        role: 'foodie',
        role_cook_status: 'active',
        isCook: true,
        countryCode: 'SA',
        storeName: 'Hassan Grill House SA',
        storeStatus: 'approved',
        pickupAddress: 'Olaya District, Riyadh',
        profilePhoto: '/assets/cooks/C4.png',
        rating: 4.9,
        reviewCount: 412,
        expertise: []
      },
      {
        name: 'Chef Zayed (AE)',
        email: 'cook5@test.com',
        password: 'test123',
        phone: '+971155555555',
        role: 'foodie',
        role_cook_status: 'active',
        isCook: true,
        countryCode: 'AE',
        storeName: 'Zayed Mandi UAE',
        storeStatus: 'approved',
        pickupAddress: 'Dubai Marina',
        profilePhoto: '/assets/cooks/C1.png',
        rating: 4.9,
        reviewCount: 150,
        expertise: []
      },
      {
        name: 'Chef Mubarak (KW)',
        email: 'cook6@test.com',
        password: 'test123',
        phone: '+965166666666',
        role: 'foodie',
        role_cook_status: 'active',
        isCook: true,
        countryCode: 'KW',
        storeName: 'Mubarak Majboos KW',
        storeStatus: 'approved',
        pickupAddress: 'Kuwait City',
        profilePhoto: '/assets/cooks/C2.png',
        rating: 4.8,
        reviewCount: 95,
        expertise: []
      },
      {
        name: 'Chef Tamim (QA)',
        email: 'cook7@test.com',
        password: 'test123',
        phone: '+974177777777',
        role: 'foodie',
        role_cook_status: 'active',
        isCook: true,
        countryCode: 'QA',
        storeName: 'Tamim Qatar Kitchen',
        storeStatus: 'approved',
        pickupAddress: 'Doha Corniche',
        profilePhoto: '/assets/cooks/C3.png',
        rating: 4.7,
        reviewCount: 80,
        expertise: []
      }
    ]);

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'test123',
      phone: '+201555555555',
      role: 'admin',
      isCook: false
    });

    console.log(`✅ Created ${cooks.length + 2} users\n`);

    // Create Products/Dishes
    console.log('🍽️ Creating dishes...');
    const dishes = [
      // Molokhia
      { name: 'Molokhia', nameAr: 'ملوخية', description: 'Home-Style Flavor', descriptionAr: 'نكهة بيتية غنية', price: 65, category: categories[0]._id, cook: cooks[0]._id, prepTime: 35, photoUrl: '/assets/dishes/M.png', isPopular: true },
      { name: 'Molokhia', nameAr: 'ملوخية', description: 'Authentic homemade flavor', descriptionAr: 'طعم بيتي أصيل', price: 60, category: categories[0]._id, cook: cooks[2]._id, prepTime: 30, photoUrl: '/assets/dishes/M.png', isPopular: false },
      
      // Roasted Duck
      { name: 'Roasted Duck', nameAr: 'بطة محمرة', description: 'Crispy Rich Taste', descriptionAr: 'قوام مقرمش غني', price: 95, category: categories[0]._id, cook: cooks[1]._id, prepTime: 40, photoUrl: '/assets/dishes/D.png', isPopular: true },
      { name: 'Roasted Duck', nameAr: 'بطة محمرة', description: 'Traditional roasted duck', descriptionAr: 'بط محمر تقليدي', price: 90, category: categories[0]._id, cook: cooks[2]._id, prepTime: 45, photoUrl: '/assets/dishes/D.png', isPopular: false },
      
      // Stuffed Grape Leaves
      { name: 'Stuffed Grape Leaves', nameAr: 'محشي ورق عنب', description: 'Tender Balanced Taste', descriptionAr: 'طري ومتوازن الطعم', price: 75, category: categories[0]._id, cook: cooks[0]._id, prepTime: 45, photoUrl: '/assets/dishes/W.png', isPopular: true },
      { name: 'Stuffed Grape Leaves', nameAr: 'محشي ورق عنب', description: 'Homemade stuffed grape leaves', descriptionAr: 'ورق عنب محشي بيتي', price: 72, category: categories[0]._id, cook: cooks[3]._id, prepTime: 50, photoUrl: '/assets/dishes/W.png', isPopular: false },
      
      // Shish Tawook
      { name: 'Shish Tawook', nameAr: 'شيش طاووك', description: 'Light Smoky Marinade', descriptionAr: 'تتبيلة خفيفة مدخنة', price: 85, category: categories[1]._id, cook: cooks[3]._id, prepTime: 30, photoUrl: '/assets/dishes/S.png', isPopular: true },
      { name: 'Shish Tawook', nameAr: 'شيش طاووك', description: 'Grilled chicken skewers', descriptionAr: 'شيش طاووك مشوي', price: 82, category: categories[1]._id, cook: cooks[1]._id, prepTime: 35, photoUrl: '/assets/dishes/S.png', isPopular: false },
      
      // Lamb Shank Fattah
      { name: 'Lamb Shank Fattah', nameAr: 'فتة بالموزة الضاني', description: 'Tender Rich Lamb', descriptionAr: 'لحمة طرية غنية', price: 120, category: categories[0]._id, cook: cooks[2]._id, prepTime: 50, photoUrl: '/assets/dishes/F.png', isPopular: true },
      
      // Egyptian Moussaka
      { name: 'Egyptian Moussaka', nameAr: 'مسقعة باللحمة المفرومة', description: 'Authentic Local Taste', descriptionAr: 'طعم بلدي أصيل', price: 80, category: categories[3]._id, cook: cooks[0]._id, prepTime: 40, photoUrl: '/assets/dishes/K.png', isPopular: true },
      
      // Stuffed Pigeon
      { name: 'Stuffed Pigeon', nameAr: 'حمام محشي', description: 'Rich Rice Stuffing', descriptionAr: 'أرز بالخلطة غني', price: 110, category: categories[0]._id, cook: cooks[1]._id, prepTime: 45, photoUrl: '/assets/dishes/H.png', isPopular: true },
      
      // Additional items
      { name: 'Falafel Platter', nameAr: 'طبق فلافل', description: 'Crispy falafel with tahini', descriptionAr: 'فلافل مقرمشة مع طحينة', price: 45, category: categories[2]._id, cook: cooks[0]._id, prepTime: 15, photoUrl: '/assets/dishes/F.png', isPopular: false },
      { name: 'Hawawshi', nameAr: 'حواوشي', description: 'Spiced meat stuffed bread', descriptionAr: 'خبز محشو باللحم المتبل', price: 55, category: categories[4]._id, cook: cooks[1]._id, prepTime: 25, photoUrl: '/assets/dishes/H.png', isPopular: false },
      
      // AE, KW, QA specific dishes
      { name: 'Chicken Mandi', nameAr: 'مندي دجاج', description: 'UAE Special Mandi', descriptionAr: 'مندي إماراتي خاص', price: 45, category: categories[0]._id, cook: cooks[4]._id, prepTime: 50, photoUrl: '/assets/dishes/S.png', isPopular: true },
      { name: 'Lamb Majboos', nameAr: 'مجبوس لحم', description: 'Kuwaiti Traditional Dish', descriptionAr: 'مجبوس كويتي تقليدي', price: 6.5, category: categories[0]._id, cook: cooks[5]._id, prepTime: 60, photoUrl: '/assets/dishes/D.png', isPopular: true },
      { name: 'Qatar Machboos', nameAr: 'مكبوس قطري', description: 'Qatari Seafood Special', descriptionAr: 'مكبوس قطري بحري', price: 55, category: categories[0]._id, cook: cooks[6]._id, prepTime: 55, photoUrl: '/assets/dishes/F.png', isPopular: true },
      
      { name: 'Salad Bowl', nameAr: 'سلطانية سلطة', description: 'Fresh mixed vegetables', descriptionAr: 'خضروات طازجة متنوعة', price: 25, category: categories[5]._id, cook: cooks[3]._id, prepTime: 10, photoUrl: '/assets/dishes/S.png', isPopular: false },
    ];

    const products = [];
    for (const dish of dishes) {
      const cook = cooks.find(c => c._id.equals(dish.cook));
      products.push({
        ...dish,
        description: dish.description || `Delicious ${dish.name} prepared with authentic ingredients`,
        descriptionAr: dish.descriptionAr || `${dish.nameAr} لذيذ محضر بمكونات أصلية`,
        cookId: dish.cook,
        cookName: cook.storeName,
        cookRating: cook.rating,
        countryCode: cook.countryCode, // Inherit from cook
        isAvailable: true,
        stock: 50,
        orderCount: Math.floor(Math.random() * 200) + 50,
        reviewCount: Math.floor(Math.random() * 100) + 20
      });
    }

    const createdProducts = await Product.insertMany(products);
    console.log(`✅ Created ${createdProducts.length} dishes\n`);

    // Create Sample Orders
    console.log('📦 Creating sample orders...');
    const orders = await Order.insertMany([
      {
        customer: foodie._id,
        deliveryAddress: {
          addressLine1: '123 Test St',
          city: 'Cairo',
          label: 'Home',
          lat: 30.0444,
          lng: 31.2357
        },
        subOrders: [
          {
            cook: cooks[0]._id,
            pickupAddress: cooks[0].pickupAddress,
            totalAmount: (createdProducts[0].price * 2) + createdProducts[10].price,
            status: 'delivered',
            items: [
              { product: createdProducts[0]._id, quantity: 2, price: createdProducts[0].price },
              { product: createdProducts[10]._id, quantity: 1, price: createdProducts[10].price }
            ]
          }
        ],
        totalAmount: (createdProducts[0].price * 2) + createdProducts[10].price,
        status: 'completed',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        customer: foodie._id,
        deliveryAddress: {
          addressLine1: '456 Sample Blvd',
          city: 'Riyadh',
          label: 'Work',
          lat: 24.7136,
          lng: 46.6753
        },
        subOrders: [
          {
            cook: cooks[3]._id,
            pickupAddress: cooks[3].pickupAddress,
            totalAmount: createdProducts[3].price,
            status: 'preparing',
            items: [
              { product: createdProducts[3]._id, quantity: 1, price: createdProducts[3].price }
            ]
          }
        ],
        totalAmount: createdProducts[3].price,
        status: 'confirmed',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ]);
    console.log(`✅ Created ${orders.length} orders\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 DEMO DATA SEEDED SUCCESSFULLY!\n');
    console.log('📊 Summary:');
    console.log(`   • ${categories.length} Categories`);
    console.log(`   • ${cooks.length + 2} Users (${cooks.length} Cooks, 1 Foodie, 1 Admin)`);
    console.log(`   • ${createdProducts.length} Dishes`);
    console.log(`   • ${orders.length} Orders\n`);
    console.log('🔐 Test Accounts:');
    console.log('   Foodie: foodie@test.com / test123');
    console.log('   Cook: cook@test.com / test123');
    console.log('   Admin: admin@test.com / test123');
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    process.exit(1);
  }
};

seedDemoData();
