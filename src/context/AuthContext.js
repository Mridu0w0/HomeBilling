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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
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

  // 1. Email/Password Registration
  const register = async (
    email,
    password,
    name,
    flatNumber,
    role = "member",
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

  // 2. Email/Password Login
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // 3. Continue with Google
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const loggedUser = result.user;

    // Check if user already exists in Firestore
    const userDoc = await getDoc(doc(db, "users", loggedUser.uid));
    if (!userDoc.exists()) {
      // In src/context/AuthContext.js:
      // Find loginWithGoogle and update profileData to:

      const profileData = {
        uid: loggedUser.uid,
        name: loggedUser.displayName || "Owner",
        email: loggedUser.email,
        flatNumber: "Owner Unit",
        role: "owner",
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", loggedUser.uid), profileData);
      setUserData(profileData);
    } else {
      setUserData(userDoc.data());
    }

    return result;
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
