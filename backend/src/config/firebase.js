// backend/src/config/firebase.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

try {
  console.log("Beginning Firebase initialization...");

  // Check if environment variable exists
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("Environment variable FIREBASE_SERVICE_ACCOUNT exists");

    try {
      // Try parsing the JSON to see if it's valid
      const serviceAccountData = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT
      );
      console.log("Successfully parsed service account JSON");
      console.log("Service account project_id:", serviceAccountData.project_id);

      // Initialize Firebase with parsed credentials
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountData),
        databaseURL: "https://ramaytilibrary-default-rtdb.firebaseio.com",
      });

      console.log("Firebase Admin SDK initialized with env variable");
    } catch (parseError) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", parseError);
      throw parseError;
    }
  } else {
    console.log("Environment variable not found, trying local file");

    // Fall back to reading from file
    const serviceAccountPath = path.resolve(
      __dirname,
      "firebaseServiceAccount.json"
    );
    console.log(`Checking for service account at: ${serviceAccountPath}`);

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(
        `Service account file not found at: ${serviceAccountPath}`
      );
    }

    console.log("Service account file exists, loading...");
    const serviceAccount = require(serviceAccountPath);
    console.log(
      "Service account loaded from file, project_id:",
      serviceAccount.project_id
    );

    // Initialize Firebase with file credentials
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://ramaytilibrary-default-rtdb.firebaseio.com",
    });

    console.log("Firebase Admin SDK initialized with file");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  console.error("Error name:", error.name);
  console.error("Error message:", error.message);
  console.error("Current directory:", process.cwd());
  console.error("__dirname:", __dirname);

  // Don't exit so we can at least start the server
  console.error(
    "WARNING: Firebase is not initialized properly. The app may have limited functionality."
  );
}

module.exports = admin;
