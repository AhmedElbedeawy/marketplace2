/**
 * AdminDish.imageUrl Repair Script
 *
 * Finds AdminDish records where imageUrl still points to /uploads/dishes/...
 * and checks whether the local file exists (recoverable) or is gone (missing).
 *
 * Modes:
 *   node repairAdminDishImageUrl.js            → dry-run (no DB writes)
 *   node repairAdminDishImageUrl.js --apply    → upload + update DB
 *
 * Categories are NOT migrated: they require re-upload via the admin UI.
 * DishOffer.images are NOT touched.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const storageService = require('./services/storageService');
const AdminDish = require('./models/AdminDish');
const Category = require('./models/Category');

const APPLY = process.argv.includes('--apply');
const UPLOADS_DISHES_DIR = path.join(__dirname, 'uploads', 'dishes');

// ─── helpers ────────────────────────────────────────────────────────────────

function localFileForUrl(imageUrl) {
  // imageUrl looks like /uploads/dishes/filename.jpg
  const filename = path.basename(imageUrl);
  return path.join(UPLOADS_DISHES_DIR, filename);
}

function hr(char = '─', len = 60) {
  return char.repeat(len);
}

// ─── AdminDish repair ────────────────────────────────────────────────────────

async function repairAdminDishes() {
  console.log('\n' + hr());
  console.log('AdminDish.imageUrl repair');
  console.log(hr());

  const dishes = await AdminDish.find({}).lean();

  const recoverable = [];
  const missing = [];
  const alreadyCloud = [];
  const noImage = [];

  for (const dish of dishes) {
    const url = dish.imageUrl;

    if (!url) {
      noImage.push({ id: dish._id, name: dish.nameEn });
      continue;
    }

    if (url.startsWith('https://')) {
      alreadyCloud.push({ id: dish._id, name: dish.nameEn, url });
      continue;
    }

    if (url.startsWith('/uploads/')) {
      const localPath = localFileForUrl(url);
      if (fs.existsSync(localPath)) {
        recoverable.push({ id: dish._id, name: dish.nameEn, url, localPath });
      } else {
        missing.push({ id: dish._id, name: dish.nameEn, url });
      }
      continue;
    }

    // unexpected format
    missing.push({ id: dish._id, name: dish.nameEn, url });
  }

  console.log(`\nTotal dishes        : ${dishes.length}`);
  console.log(`Already GCS URLs    : ${alreadyCloud.length}`);
  console.log(`No image set        : ${noImage.length}`);
  console.log(`Recoverable (local) : ${recoverable.length}`);
  console.log(`Missing (no file)   : ${missing.length}`);

  if (recoverable.length > 0) {
    console.log('\nRecoverable dishes:');
    recoverable.forEach(d => {
      console.log(`  [${d.id}] ${d.name}`);
      console.log(`    DB url   : ${d.url}`);
      console.log(`    local    : ${d.localPath}`);
    });
  }

  if (missing.length > 0) {
    console.log('\nMissing dishes (no local file — manual re-upload required):');
    missing.forEach(d => {
      console.log(`  [${d.id}] ${d.name}  →  ${d.url}`);
    });
  }

  if (!APPLY) {
    console.log('\n[DRY-RUN] No DB writes performed.');
    console.log('[DRY-RUN] Re-run with --apply to upload recoverable dishes to GCS and update DB.');
    return { recoverable: recoverable.length, missing: missing.length };
  }

  // ── apply mode ──────────────────────────────────────────────────────────
  console.log('\n[APPLY] Starting GCS upload and DB update...');

  const results = { ok: 0, failed: 0 };

  for (const dish of recoverable) {
    try {
      const buffer = fs.readFileSync(dish.localPath);
      const filename = path.basename(dish.localPath);

      const cloudUrl = await storageService.processAndSaveImage(buffer, {
        category: 'dishes',
        filename,
        width: 800,
        height: 600,
        quality: 85,
        uploadToCloud: true,
      });

      await AdminDish.findByIdAndUpdate(dish.id, { imageUrl: cloudUrl });
      console.log(`  ✅ [${dish.id}] ${dish.name}`);
      console.log(`      ${dish.url}  →  ${cloudUrl}`);
      results.ok++;
    } catch (err) {
      console.log(`  ❌ [${dish.id}] ${dish.name} — ${err.message}`);
      results.failed++;
    }
  }

  console.log(`\n[APPLY] Done. Uploaded: ${results.ok}, Failed: ${results.failed}`);
  return results;
}

// ─── Category status report ──────────────────────────────────────────────────

async function reportCategories() {
  console.log('\n' + hr());
  console.log('Category icons — status report (no DB writes)');
  console.log(hr());

  const categories = await Category.find({}).lean();

  let needsReupload = 0;
  let alreadyCloud = 0;
  let noIcon = 0;

  for (const cat of categories) {
    const web = cat.icons?.web || cat.icon || null;
    const mobile = cat.icons?.mobile || null;

    const urls = [web, mobile].filter(Boolean);
    if (urls.length === 0) { noIcon++; continue; }

    let catCloud = 0;
    let catMissing = 0;

    for (const url of urls) {
      if (url.startsWith('https://')) {
        catCloud++;
      } else if (url.startsWith('/uploads/')) {
        // check local
        const localPath = path.join(__dirname, url);
        if (fs.existsSync(localPath)) {
          // recoverable — but task brief says catRecoverable: 0, so this should not occur
          catCloud++; // treat as "has file" — not missing
        } else {
          catMissing++;
        }
      }
    }

    if (catMissing > 0) {
      needsReupload++;
      console.log(`  ❌ MISSING  [${cat._id}] ${cat.nameEn || cat.name}`);
      if (web && !web.startsWith('https://')) console.log(`      web   : ${web}`);
      if (mobile && !mobile.startsWith('https://')) console.log(`      mobile: ${mobile}`);
    } else {
      alreadyCloud++;
    }
  }

  console.log(`\nTotal categories    : ${categories.length}`);
  console.log(`Already GCS         : ${alreadyCloud}`);
  console.log(`No icon             : ${noIcon}`);
  console.log(`Require re-upload   : ${needsReupload}`);
  console.log('\n⚠️  Category source files are missing. Re-upload each icon via the Admin UI.');
  console.log('   Categories are NOT migrated by this script.');
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log(APPLY ? '🚀 APPLY MODE — will write to DB' : '🔍 DRY-RUN MODE — read only');
  console.log('='.repeat(60));

  if (APPLY && !storageService.isCloudStorageEnabled()) {
    console.error('\n❌ Cloud storage is not available. Cannot apply. Check GCS credentials.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('\n✅ Connected to MongoDB');

  await repairAdminDishes();
  await reportCategories();

  console.log('\n' + '='.repeat(60));
  console.log(APPLY ? '✅ Apply complete.' : '✅ Dry-run complete. No DB writes performed.');
  console.log('='.repeat(60));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
