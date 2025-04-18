const admin = require("firebase-admin");
const path = require("path");

// Get the absolute path to the service account file
const serviceAccountPath = path.resolve(
  __dirname,
  "firebaseServiceAccount.json"
);

try {
  // Initialize the app with a service account
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
    databaseURL: "https://ramaytilibrary-default-rtdb.firebaseio.com", // Add your database URL
  });

  console.log("Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
  process.exit(1);
}

module.exports = admin;
