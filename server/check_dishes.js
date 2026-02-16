const mongoose = require('mongoose');
const mongoUri = 'mongodb+srv://ahmedelbedeawy_db_user:Z0AHQ6Eo07o2Nout@mpcluster.odymgfu.mongodb.net/?retryWrites=true&w=majority&appName=MPCluster';
mongoose.connect(mongoUri).then(async () => {
  const AdminDish = mongoose.model('AdminDish', require('./models/AdminDish').schema);
  const dishes = await AdminDish.find({ 
    nameEn: { $in: ['Molokhia', 'Roasted Duck', 'Stuffed Grape Leaves', 'Shish Tawook', 'Lamb Shank Fattah', 'Moussaka', 'Stuffed Pigeon'] }
  }).select('nameEn _id category imageUrl');
  const fs = require('fs');
  let output = 'Dishes:\n';
  dishes.forEach(d => {
    output += '\n=== ' + d.nameEn + ' ===\n';
    output += '_id: ' + d._id + ' | valid ObjectId: ' + /^[0-9a-fA-F]{24}$/.test(d._id.toString()) + '\n';
    output += 'category: ' + d.category + ' | type: ' + typeof d.category + '\n';
    output += 'imageUrl: ' + d.imageUrl + '\n';
  });
  fs.writeFileSync('dishes_output.txt', output);
  process.exit(0);
}).catch(e => { const fs = require('fs'); fs.writeFileSync('error.txt', e.message); process.exit(1); });
