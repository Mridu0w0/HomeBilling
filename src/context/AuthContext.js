// src/context/AuthContext.js
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      console.warn("Profile sync warning:", err);
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
    // 1. Check for incoming redirect session
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          setUser(result.user);
          await syncProfile(result.user);
          window.location.replace("/dashboard");
        }
      })
      .catch((err) => {
        console.error("Redirect error:", err);
      });

    // 2. Auth listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
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
    } catch (err) {
      console.warn("Could not save initial profile:", err);
    }
    return cred;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return signInWithRedirect(auth, provider);
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
