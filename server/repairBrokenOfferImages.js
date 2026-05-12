/**
 * repairBrokenOfferImages.js
 *
 * Finds DishOffer records whose images[] contain ephemeral local paths
 * (/uploads/... or https://api.eltekkeya.com/uploads/...) and either:
 *   1. Backfills from the parent AdminDish.imageUrl if it is a safe GCS URL, or
 *   2. Clears the broken image so the cook can re-upload via Cook Hub.
 *
 * Local files are NOT re-read — they no longer exist on Cloud Run after a deploy.
 *
 * Usage:
 *   Dry-run (safe, no writes):   node repairBrokenOfferImages.js
 *   Apply to database:           node repairBrokenOfferImages.js --apply
 */

'use strict';

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ── Model loading ────────────────────────────────────────────────────────────
// Register all models before accessing any, to avoid OverwriteModelError
const modelsDir = path.join(__dirname, 'models');
require('fs').readdirSync(modelsDir)
  .filter(f => f.endsWith('.js'))
  .forEach(f => {
    try { require(path.join(modelsDir, f)); } catch (_) {}
  });

const DishOffer = mongoose.model('DishOffer');
const AdminDish = mongoose.model('AdminDish');

// ── Helpers ──────────────────────────────────────────────────────────────────

const APPLY = process.argv.includes('--apply');

/** Returns true for ephemeral local-path URLs that will 404 on Cloud Run. */
const isUnsafeUrl = url =>
  typeof url === 'string' && (
    url.startsWith('/uploads/') ||
    url.startsWith('https://api.eltekkeya.com/uploads/')
  );

/** Returns true for a permanent GCS URL that is safe to store. */
const isSafeGcsUrl = url =>
  typeof url === 'string' &&
  url.startsWith('https://storage.googleapis.com/');

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('');
  console.log('='.repeat(65));
  console.log('  ElTekkeya — Repair Broken DishOffer Images');
  console.log(`  Mode: ${APPLY ? '🔴 APPLY (writes to DB)' : '🟡 DRY-RUN (no writes)'}`);
  console.log('='.repeat(65));
  console.log('');

  if (!process.env.MONGODB_URI) {
    console.error('❌  MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }

  console.log('🔌  Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅  Connected.\n');

  // ── Find affected offers ────────────────────────────────────────────────
  const affected = await DishOffer.find({
    $or: [
      { images: { $regex: '^/uploads/' } },
      { images: { $regex: '^https://api\\.eltekkeya\\.com/uploads/' } }
    ]
  }).lean();

  console.log(`🔍  Offers with broken image paths: ${affected.length}`);
  if (affected.length === 0) {
    console.log('✅  No broken records found. Nothing to do.\n');
    await mongoose.disconnect();
    return;
  }

  // Pre-fetch AdminDish records for all affected offers (batch)
  const adminDishIds = [...new Set(
    affected.map(o => o.adminDishId).filter(Boolean)
  )];
  const adminDishes = await AdminDish.find({ _id: { $in: adminDishIds } })
    .select('_id imageUrl nameEn')
    .lean();
  const adminDishMap = Object.fromEntries(
    adminDishes.map(d => [d._id.toString(), d])
  );

  // ── Process each offer ──────────────────────────────────────────────────
  let backfilledCount = 0;
  let clearedCount    = 0;
  let skippedCount    = 0;

  for (const offer of affected) {
    const adminDish  = adminDishMap[offer.adminDishId?.toString()] || null;
    const cookLabel  = offer.cook?.toString() || '(unknown cook)';
    const dishLabel  = adminDish
      ? `${adminDish.nameEn} [adminDish: ${adminDish._id}]`
      : `(no adminDish linked)`;

    console.log('─'.repeat(65));
    console.log(`Offer ID  : ${offer._id}`);
    console.log(`Cook ID   : ${cookLabel}`);
    console.log(`Dish      : ${dishLabel}`);
    console.log(`Old images: ${JSON.stringify(offer.images)}`);

    // Build cleaned images array: keep safe URLs, replace unsafe ones
    const hasBroken = offer.images.some(isUnsafeUrl);
    if (!hasBroken) {
      console.log('⏭️   No unsafe URLs in this offer — skipping.');
      skippedCount++;
      continue;
    }

    // Determine replacement value for broken entries
    const fallback = adminDish && isSafeGcsUrl(adminDish.imageUrl)
      ? adminDish.imageUrl   // backfill from AdminDish GCS image
      : null;                 // clear — cook must re-upload

    const newImages = offer.images
      .map(url => {
        if (!isUnsafeUrl(url)) return url;   // safe already
        if (fallback) return fallback;         // backfill
        return null;                           // mark for removal
      })
      .filter(Boolean);                        // drop nulls (cleared entries)

    // Deduplicate (backfill may create duplicates if multiple broken entries existed)
    const deduped = [...new Set(newImages)];

    const action = fallback ? 'BACKFILL' : 'CLEAR';
    console.log(`Action    : ${action}`);
    console.log(`New images: ${JSON.stringify(deduped)}`);

    if (APPLY) {
      await DishOffer.updateOne({ _id: offer._id }, { $set: { images: deduped } });
      console.log(`✅  Updated in DB.`);
    } else {
      console.log(`🟡  [DRY-RUN] Would update DB.`);
    }

    if (fallback) backfilledCount++;
    else          clearedCount++;
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('');
  console.log('='.repeat(65));
  console.log('SUMMARY');
  console.log('='.repeat(65));
  console.log(`Total affected offers : ${affected.length}`);
  console.log(`  Backfilled (GCS URL): ${backfilledCount}`);
  console.log(`  Cleared (no GCS)    : ${clearedCount}`);
  console.log(`  Skipped             : ${skippedCount}`);
  console.log('');
  if (!APPLY) {
    console.log('🟡  DRY-RUN complete — no changes written.');
    console.log('    To apply, re-run with: node repairBrokenOfferImages.js --apply');
  } else {
    console.log('✅  APPLY complete — DB updated.');
    if (clearedCount > 0) {
      console.log(`⚠️   ${clearedCount} offer(s) had images cleared. Cooks must re-upload via Cook Hub.`);
    }
  }
  console.log('='.repeat(65));

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌  Script failed:', err);
  process.exit(1);
});
