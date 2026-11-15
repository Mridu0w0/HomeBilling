// src/context/AuthContext.js
"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
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

  // Prevents onAuthStateChanged from overwriting custom registration fields
  const isRegisteringRef = useRef(false);

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
          units: 1,
          role: "owner",
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, defaultProfile, { merge: true });
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
        units: 1,
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
        // Skip auto-sync if register() is currently saving custom form fields
        if (!isRegisteringRef.current) {
          await syncProfile(currentUser);
        }
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
    units = 1,
    role = "owner",
  ) => {
    isRegisteringRef.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // Save name on Firebase Auth user object as well
      await updateProfile(cred.user, {
        displayName: name?.trim() || "Owner",
      });

      const profile = {
        uid: cred.user.uid,
        name: name?.trim() || "Owner",
        email: cred.user.email,
        flatNumber: flatNumber?.trim() || "Owner Unit",
        units: Number(units) || 1,
        role,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", cred.user.uid), profile);
      setUserData(profile);
      return cred;
    } catch (err) {
      console.warn("Registration error:", err);
      throw err;
    } finally {
      isRegisteringRef.current = false;
    }
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
