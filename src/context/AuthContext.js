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

  // Helper to ensure user document exists in Firestore
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
      console.error("Firestore sync error:", err);
    }
  };

  useEffect(() => {
    // Check redirect result on page load (after returning from Google)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await syncUserToFirestore(result.user);
        }
      })
      .catch((err) => {
        console.error("Redirect sign-in error:", err);
      });

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setUserData(userDoc.data());
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

  // Uses full-page redirect so it never triggers browser popup blocks
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return signInWithRedirect(auth, provider);
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
