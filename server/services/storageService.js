/**
 * Storage Service - Unified Cloud Storage Abstraction Layer
 * 
 * Provides a unified interface for file uploads with automatic
 * fallback to local storage if cloud storage is unavailable.
 * 
 * All persistent uploads should go through this service to ensure
 * files survive server deploy/restart.
 */

const path = require('path');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');

// Load environment variables
require('dotenv').config();

// Configuration
const BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET || 'eltekkeya.appspot.com';
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'eltekkeya';

// Initialize Google Cloud Storage (lazy)
let storage = null;
let useCloudStorage = false;

const initializeStorage = () => {
  if (storage === null) {
    try {
      console.log('[storageService] Initializing cloud storage...');
      console.log('[storageService] FIREBASE_STORAGE_BUCKET:', process.env.FIREBASE_STORAGE_BUCKET);
      
      // OPTION 1: Use explicit service account JSON file (for local development)
      const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || './config/firebase-service-account.json');
      console.log('[storageService] Using explicit service account file:', serviceAccountPath);
      console.log('[storageService] File exists:', fs.existsSync(serviceAccountPath));
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        console.log('[storageService] Service account loaded:', serviceAccount.project_id ? '✅ Has project_id' : '❌ Missing project_id');
        if (serviceAccount && serviceAccount.project_id) {
          storage = new Storage({
            projectId: PROJECT_ID,
            credentials: serviceAccount
          });
          useCloudStorage = true;
          console.log('☁️  Cloud Storage initialized successfully with service account file');
        } else {
          console.log('[storageService] Service account missing project_id, trying ADC...');
          // Fall through to ADC
          initializeWithADC();
        }
      } else {
        console.log('[storageService] Service account file not found, trying ADC...');
        // Fall through to ADC
        initializeWithADC();
      }
    } catch (error) {
      console.log('⚠️  Cloud Storage not available, using local fallback:', error.message);
      console.log('   Error stack:', error.stack);
      storage = null;
      useCloudStorage = false;
    }
  }
  return storage;
};

// Helper function for ADC initialization (production Cloud Run)
const initializeWithADC = () => {
  try {
    console.log('[storageService] Using ADC (Application Default Credentials) for Cloud Storage...');
    storage = new Storage({
      projectId: PROJECT_ID
      // No credentials - uses default service account in Cloud Run
    });
    useCloudStorage = true;
    console.log('☁️  Cloud Storage initialized via ADC (Cloud Run default service account)');
  } catch (error) {
    console.log('⚠️  ADC also failed:', error.message);
    storage = null;
    useCloudStorage = false;
  }
};

/**
 * Get the storage instance
 */
const getStorage = () => {
  initializeStorage();
  return storage;
};

/**
 * Check if cloud storage is available
 */
const isCloudStorageEnabled = () => {
  initializeStorage();
  return useCloudStorage;
};

/**
 * Upload buffer to cloud storage
 * @param {Buffer} buffer - Image buffer
 * @param {string} destination - Destination path in bucket (e.g., 'offers/offer-123.jpg')
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Permanent public URL of uploaded file
 */
const uploadToCloud = async (buffer, destination, contentType = 'image/jpeg') => {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(destination);
  
  // Upload with proper metadata - make publicly readable
  await file.save(buffer, {
    metadata: {
      contentType: contentType,
      cacheControl: 'public, max-age=31536000', // 1 year cache
    },
    resumable: false
  });
  
  // Make the file publicly readable
  await file.makePublic();
  
  // Return permanent public URL (no signed URL needed)
  const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`;
  console.log('[storageService] Uploaded to cloud, public URL:', publicUrl);
  return publicUrl;
};

/**
 * Delete file from cloud storage
 * @param {string} filePath - Path to delete (e.g., 'offers/offer-123.jpg')
 */
const deleteFromCloud = async (filePath) => {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(filePath);
    await file.delete();
    console.log(`🗑️  Deleted from cloud: ${filePath}`);
  } catch (error) {
    console.error(`❌ Failed to delete from cloud: ${error.message}`);
  }
};

/**
 * Check if file exists in cloud storage
 * @param {string} filePath - Path to check
 */
const fileExistsInCloud = async (filePath) => {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    return false;
  }
};

// ============================================
// Local Storage Fallback (for development/temp)
// ============================================

const getLocalUploadDir = (category) => {
  const dirs = {
    'offers': path.join(__dirname, '../uploads/offers'),
    'dishes': path.join(__dirname, '../uploads/dishes'),
    'categories': path.join(__dirname, '../uploads/categories'),
    'hero': path.join(__dirname, '../uploads/hero'),
    'cooks': path.join(__dirname, '../uploads/cooks'),
    'users': path.join(__dirname, '../uploads/users')
  };
  return dirs[category] || path.join(__dirname, '../uploads');
};

/**
 * Save to local filesystem (temp fallback)
 */
const saveLocally = async (buffer, category, filename) => {
  const dir = getLocalUploadDir(category);
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, buffer);
  
  // Return proper path that web server can serve
  return `/uploads/${category}/${filename}`;
};

/**
 * Delete from local filesystem
 */
const deleteLocally = async (category, filename) => {
  const dir = getLocalUploadDir(category);
  const filepath = path.join(dir, filename);
  
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
};

// ============================================
// Main Unified Storage API
// ============================================

/**
 * Process and save an image with optional cloud upload
 * 
 * @param {Buffer} buffer - Raw image buffer
 * @param {Object} options - Processing options
 * @param {string} options.category - Category (offers, dishes, categories, hero, cooks, users)
 * @param {string} options.filename - Desired filename (without extension)
 * @param {number} options.width - Resize width (default 800)
 * @param {number} options.height - Resize height (default 600)
 * @param {number} options.quality - JPEG quality (default 85)
 * @param {boolean} options.uploadToCloud - Force cloud upload (default true)
 * 
 * @returns {Promise<string>} URL to access the saved image
 */
const processAndSaveImage = async (buffer, options = {}) => {
  const {
    category = 'offers',
    filename,
    width = 800,
    height = 600,
    quality = 85,
    uploadToCloud: forceCloud = true
  } = options;
  
  // Initialize storage to ensure useCloudStorage is set correctly
  initializeStorage();
  
  console.log('[storageService.processAndSaveImage] After init:');
  console.log('  useCloudStorage:', useCloudStorage);
  console.log('  forceCloud:', forceCloud);
  console.log('  will attempt cloud upload:', forceCloud && useCloudStorage);
  
  // Process image with sharp
  const sharp = require('sharp');
  
  // Special handling: preserve aspect ratio for mobile category images
  // Don't force-crop to square, keep uploaded dimensions
  const isMobileCategory = category === 'categories' && filename && filename.includes('-mobile-');
  
  let processedBuffer;
  if (isMobileCategory) {
    // For mobile category images: preserve aspect ratio, just ensure max dimensions
    processedBuffer = await sharp(buffer)
      .resize(width, height, {
        fit: 'inside', // Don't crop, preserve aspect ratio
        withoutEnlargement: true // Don't upscale if image is smaller
      })
      .jpeg({ quality, progressive: true })
      .toBuffer();
  } else {
    // For all other images: existing behavior (center-crop to exact dimensions)
    processedBuffer = await sharp(buffer)
      .resize(width, height, {
        position: 'center',
        fit: 'cover'
      })
      .jpeg({ quality, progressive: true })
      .toBuffer();
  }
  
  // Generate unique filename if not provided
  const finalFilename = filename || `${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
  const cloudPath = `${category}/${finalFilename}`;
  
  // Try cloud storage first
  if (forceCloud && useCloudStorage) {
    console.log('[storageService] Attempting cloud upload...');
    try {
      const cloudUrl = await uploadToCloud(processedBuffer, cloudPath);
      console.log(`☁️  Image uploaded to cloud: ${cloudUrl}`);
      return cloudUrl;
    } catch (error) {
      console.error(`⚠️  Cloud upload failed: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      console.log('   Falling back to local storage...');
    }
  } else {
    console.log('[storageService] Skipping cloud upload:', { forceCloud, useCloudStorage });
  }
  
  // Fallback to local storage
  const localPath = await saveLocally(processedBuffer, category, finalFilename);
  console.log(`💾  Image saved locally: ${localPath}`);
  return localPath;
};

/**
 * Delete an image from storage
 * 
 * @param {string} imageUrl - URL or path of image to delete
 */
const deleteImage = async (imageUrl) => {
  if (!imageUrl) return;
  
  // Check if it's a cloud URL
  if (imageUrl.includes('firebasestorage.googleapis.com') || imageUrl.includes('storage.googleapis.com')) {
    // Extract path from Firebase URL
    const match = imageUrl.match(/o\/(.+?)\?/);
    if (match && useCloudStorage) {
      await deleteFromCloud(match[1]);
      return;
    }
  }
  
  // Local file
  const parts = imageUrl.replace('/uploads/', '').split('/');
  if (parts.length >= 2) {
    const category = parts[0];
    const filename = parts.slice(1).join('/');
    await deleteLocally(category, filename);
  }
};

/**
 * Migrate a local file to cloud storage
 * 
 * @param {string} localPath - Local file path (e.g., '/uploads/offers/image.jpg')
 * @returns {Promise<string>} Cloud URL if successful, original path if failed
 */
const migrateToCloud = async (localPath) => {
  if (!localPath || localPath.includes('firebasestorage')) {
    return localPath; // Already in cloud or invalid
  }
  
  // Read local file
  const fullPath = path.join(__dirname, '..', localPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Local file not found for migration: ${localPath}`);
    return localPath;
  }
  
  const buffer = fs.readFileSync(fullPath);
  const filename = path.basename(localPath);
  const category = localPath.split('/')[1] || 'misc';
  
  try {
    const cloudUrl = await uploadToCloud(buffer, `${category}/${filename}`);
    console.log(`☁️  Migrated to cloud: ${localPath} -> ${cloudUrl}`);
    return cloudUrl;
  } catch (error) {
    console.error(`❌ Migration failed: ${error.message}`);
    return localPath;
  }
};

/**
 * Check if an image URL is accessible
 * Returns true for cloud URLs, checks local for local URLs
 */
const isImageAccessible = async (imageUrl) => {
  if (!imageUrl) return false;
  
  // Cloud URLs are assumed accessible
  if (imageUrl.includes('firebasestorage.googleapis.com') || 
      imageUrl.includes('storage.googleapis.com')) {
    return true;
  }
  
  // Check local file
  const localPath = path.join(__dirname, '..', imageUrl);
  return fs.existsSync(localPath);
};

/**
 * Get storage stats
 */
const getStorageStats = () => {
  return {
    cloudStorageEnabled: useCloudStorage,
    bucketName: BUCKET_NAME,
    projectId: PROJECT_ID
  };
};

module.exports = {
  // Core functions
  processAndSaveImage,
  deleteImage,
  migrateToCloud,
  isImageAccessible,
  
  // Utility functions
  getStorage,
  isCloudStorageEnabled,
  getStorageStats,
  
  // Constants
  CATEGORIES: {
    OFFERS: 'offers',
    DISHES: 'dishes',
    CATEGORIES: 'categories',
    HERO: 'hero',
    COOKS: 'cooks',
    USERS: 'users'
  }
};
