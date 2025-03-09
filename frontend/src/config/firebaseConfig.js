// src/config/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDfJqFbaR3tMQ96BL9YilGGwuG-TDAgCso",
  authDomain: "ramaytilibrary.firebaseapp.com",
  projectId: "ramaytilibrary",
  storageBucket: "ramaytilibrary.firebasestorage.app",
  messagingSenderId: "1072722948467",
  appId: "1:1072722948467:web:361e2ee7ac1ad916859506",
  measurementId: "G-SENTXKPHZB"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { app, analytics, db };