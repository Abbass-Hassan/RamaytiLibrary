// backend/src/config/firebase.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

let firebaseConfig;

try {
  // Try to get the service account from environment variable first
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("Using Firebase service account from environment variable");
    firebaseConfig = {
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      ),
      databaseURL: "https://ramaytilibrary-default-rtdb.firebaseio.com",
    };
  } else {
    // Fall back to reading from file
    const serviceAccountPath = path.resolve(
      __dirname,
      "firebaseServiceAccount.json"
    );
    console.log(`Loading service account from: ${serviceAccountPath}`);

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(
        `Service account file not found at: ${serviceAccountPath}`
      );
    }

    firebaseConfig = {
      credential: admin.credential.cert(require(serviceAccountPath)),
      databaseURL: "https://ramaytilibrary-default-rtdb.firebaseio.com",
    };
  }

  // Initialize Firebase
  admin.initializeApp(firebaseConfig);
  console.log("Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
  console.error("Current directory:", process.cwd());
  console.error("__dirname:", __dirname);
  process.exit(1);
}

module.exports = admin;
