const admin = require('firebase-admin');

// Lazily initialise Firebase Admin SDK — safe to call multiple times.
const getFirebaseAdmin = () => {
  if (admin.apps.length === 0) {
    const serviceAccount = require('../config/firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  return admin;
};

module.exports = { getFirebaseAdmin };
