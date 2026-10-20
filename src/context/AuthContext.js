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

// Pre-initialize outside the component so the popup opens instantaneously on click
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncProfile = async (firebaseUser) => {
    if (!firebaseUser) return null;
    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData(data);
        return data;
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
        return defaultProfile;
      }
    } catch (err) {
      console.warn("Profile sync warning:", err);
      const fallbackProfile = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || "Owner",
        email: firebaseUser.email,
        flatNumber: "Owner Unit",
        role: "owner",
      };
      setUserData(fallbackProfile);
      return fallbackProfile;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncProfile(currentUser);
      } else {
        setUserData(null);
      }
      setLoading(false);
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
      flatNumber: flatNumber || "Owner Unit",
      role,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, "users", cred.user.uid), profile);
      setUserData(profile);
    } catch (err) {
      console.warn("Could not save profile to firestore immediately:", err);
      setUserData(profile);
    }
    return cred;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Must remain synchronous up until signInWithPopup is called!
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    if (result?.user) {
      await syncProfile(result.user);
    }
    return result;
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
