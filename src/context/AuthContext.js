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

  const syncUserToFirestore = async (loggedUser) => {
    try {
      const userRef = doc(db, "users", loggedUser.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        const profileData = {
          uid: loggedUser.uid,
          name: loggedUser.displayName || "Owner",
          email: loggedUser.email,
          flatNumber: "Owner Unit",
          role: "owner",
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, profileData);
        setUserData(profileData);
      } else {
        setUserData(userDoc.data());
      }
    } catch (err) {
      console.error("Firestore user sync error:", err);
    }
  };

  useEffect(() => {
    // Process redirect result if browser fell back to redirect
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await syncUserToFirestore(result.user);
        }
      })
      .catch((err) => {
        console.error("Redirect handler error:", err);
      });

    // Listen to authentication state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserToFirestore(currentUser);
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
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const uid = userCredential.user.uid;

    const profileData = {
      uid,
      name,
      email,
      flatNumber,
      role,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "users", uid), profileData);
    setUserData(profileData);
    return userCredential;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Immediate popup execution with auto-redirect fallback on blocked popups
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const result = await signInWithPopup(auth, provider);
      if (result?.user) {
        await syncUserToFirestore(result.user);
      }
      return result;
    } catch (err) {
      // If popup was blocked by browser or mobile viewport, switch to redirect
      if (err?.code === "auth/popup-blocked") {
        return await signInWithRedirect(auth, provider);
      }
      throw err;
    }
  };

  const logout = () => {
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
