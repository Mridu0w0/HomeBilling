// src/context/AuthContext.js
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Background sync helper so Firestore never blocks the auth session
  const syncProfile = async (firebaseUser) => {
    if (!firebaseUser) return;
    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setUserData(userSnap.data());
      } else {
        const defaultProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || "Owner",
          email: firebaseUser.email,
          flatNumber: "Owner Unit",
          role: "owner",
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, defaultProfile);
        setUserData(defaultProfile);
      }
    } catch (err) {
      console.warn("Firestore profile background sync warning:", err);
      // Fallback so the user is never locked out
      setUserData({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || "Owner",
        email: firebaseUser.email,
        flatNumber: "Owner Unit",
        role: "owner",
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // 1. Immediately acknowledge the authenticated user
      setUser(currentUser);
      setLoading(false);

      // 2. Fetch or create Firestore profile in the background
      if (currentUser) {
        syncProfile(currentUser);
      } else {
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const register = async (
    email,
    password,
    name,
    flatNumber,
    role = "owner",
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const profile = {
      uid: cred.user.uid,
      name,
      email,
      flatNumber,
      role,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, "users", cred.user.uid), profile);
      setUserData(profile);
    } catch (e) {
      console.warn("Could not write profile during registration:", e);
    }
    return cred;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    if (cred?.user) {
      syncProfile(cred.user);
    }
    return cred.user;
  };

  const logout = () => {
    setUserData(null);
    return signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        register,
        login,
        loginWithGoogle,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
