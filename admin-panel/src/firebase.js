import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDfJqFbaR3tMQ96BL9YilGGwuG-TDAgCso",
  authDomain: "ramaytilibrary.firebaseapp.com",
  projectId: "ramaytilibrary",
  storageBucket: "ramaytilibrary.firebasestorage.app",
  messagingSenderId: "1072722948467",
  appId: "1:1072722948467:web:361e2ee7ac1ad916859506",
  measurementId: "G-SENTXKPHZB",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
