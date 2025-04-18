// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import axios from "axios";

const API_URL = "http://localhost:3000/api";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(email, password) {
    try {
      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Backend verification
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async function register(email, password) {
    try {
      // Use our backend to register
      const response = await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
      });

      // Login after successful registration
      await signInWithEmailAndPassword(auth, email, password);

      return response.data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
