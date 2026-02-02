const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ExpertiseCategory = require('./models/ExpertiseCategory');

dotenv.config();

const expertise = [
  { name: 'Pastry & Bakery', nameAr: 'المخبوزات والمعجنات', sortOrder: 1 },
  { name: 'Oriental Pastry', nameAr: 'الحلويات الشرقية', sortOrder: 2 },
  { name: 'Appetizer & Salad', nameAr: 'المقبلات / السلطات', sortOrder: 3 },
  { name: 'Meat', nameAr: 'شيف لحوم', sortOrder: 4 },
  { name: 'Fish & Seafood', nameAr: 'السمك والمأكولات البحرية', sortOrder: 5 },
  { name: 'Vegetable & Vegetarian', nameAr: 'شيف خضار / أطباق نباتية', sortOrder: 6 },
  { name: 'Fast Food / Line Cook', nameAr: 'شيف أطباق سريعة / مطبخ سريع', sortOrder: 7 },
  { name: 'Multi-Specialty', nameAr: 'متعدد التخصصات', sortOrder: 8 }
];

const migrateExpertise = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace');
    console.log('MongoDB Connected...');

    for (const item of expertise) {
      const normalizedName = item.name.trim().toLowerCase();
      await ExpertiseCategory.findOneAndUpdate(
        { normalizedName },
        { ...item, normalizedName, isActive: true },
        { upsert: true, new: true }
      );
    }

    console.log('Expertise categories migrated successfully!');
    process.exit();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateExpertise();
