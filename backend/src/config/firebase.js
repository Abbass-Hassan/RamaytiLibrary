const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

try {
  console.log("Beginning Firebase initialization...");

  // Get service account either from environment variable or file
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("Using service account from environment variable");
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    const serviceAccountPath = path.resolve(
      __dirname,
      "firebaseServiceAccount.json"
    );
    console.log(`Using service account from file: ${serviceAccountPath}`);
    serviceAccount = require(serviceAccountPath);
  }

  // Initialize Firebase Admin SDK
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ramaytilibrary-default-rtdb.firebaseio.com",
  });

  console.log("Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

module.exports = admin;
