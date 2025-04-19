const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// Get the absolute path to the service account file
const serviceAccountPath = path.resolve(
  __dirname,
  "firebaseServiceAccount.json"
);

try {
  // Check if the file exists
  if (!fs.existsSync(serviceAccountPath)) {
    console.error(
      `Service account file does not exist at: ${serviceAccountPath}`
    );
    process.exit(1);
  }

  console.log(`Loading service account from: ${serviceAccountPath}`);
  const serviceAccount = require(serviceAccountPath);
  console.log("Service account loaded successfully");

  // Initialize the app with a service account
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ramaytilibrary-default-rtdb.firebaseio.com",
  });

  console.log("Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
  console.error("Service account path:", serviceAccountPath);
  console.error("__dirname:", __dirname);
  process.exit(1);
}

module.exports = admin;
