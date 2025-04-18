const admin = require("../config/firebase");
const db = admin.firestore();

// Register a new user
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Create user with Firebase Admin SDK
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
    });

    // Add the user to Firestore
    await db.collection("users").doc(userRecord.uid).set({
      email: userRecord.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      role: "user", // Default role
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    let errorMessage = "Registration failed";
    if (error.code === "auth/email-already-exists") {
      errorMessage = "Email already in use";
    } else if (error.code === "auth/invalid-password") {
      errorMessage = "Password must be at least 6 characters";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email format";
    }

    res.status(400).json({
      success: false,
      message: errorMessage,
      error: error.message,
    });
  }
};

// Login user (testing version)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(userRecord.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        role: userData.role || "user",
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(401).json({
      success: false,
      message: "Invalid credentials",
      error: error.message,
    });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const userRecord = await admin.auth().getUser(uid);

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    res.status(200).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        role: userData.role || "user",
        createdAt: userData.createdAt,
      },
    });
  } catch (error) {
    console.error("Get user profile error:", error);

    res.status(400).json({
      success: false,
      message: "Failed to get user profile",
      error: error.message,
    });
  }
};
