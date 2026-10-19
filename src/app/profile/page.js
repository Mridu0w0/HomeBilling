// src/app/profile/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Authentication Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch individual owner payment history
  useEffect(() => {
    async function fetchUserPayments() {
      if (!user) return;
      try {
        const q = query(
          collection(db, "payments"),
          where("userId", "==", user.uid),
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPaymentHistory(list);
      } catch (err) {
        console.error("Error fetching payment history:", err);
      } finally {
        setLoadingHistory(false);
      }
    }

    if (user) {
      fetchUserPayments();
    }
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mr-2"></div>
        Loading profile...
      </div>
    );
  }

  const photoUrl = user.photoURL;
  const userInitial = (userData?.name || user.displayName || user.email || "O")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Top Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col justify-between gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-center"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Owner Profile & Settings
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Manage your personal apartment unit information and account records
          </p>
        </div>
        <Link
          href="/dashboard"
          className="self-start sm:self-auto rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </motion.div>

      {/* Profile Overview Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-sm"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={userData?.name || "User Avatar"}
              width={72}
              height={72}
              unoptimized
              referrerPolicy="no-referrer"
              className="h-16 w-16 sm:h-18 sm:w-18 rounded-full object-cover ring-2 ring-blue-500/50"
            />
          ) : (
            <div className="flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-2xl font-bold text-white shadow-lg">
              {userInitial}
            </div>
          )}

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white">
                {userData?.name || user.displayName || "Property Owner"}
              </h2>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                {userData?.flatNumber || "Unit Pending Setup"}
              </span>
              <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-400 capitalize border border-zinc-700">
                {userData?.role || "Member"}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">{user.email}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Provider:{" "}
              <span className="text-zinc-300 font-medium capitalize">
                {user.providerData[0]?.providerId === "google.com"
                  ? "Google Account"
                  : "Email / Password"}
              </span>
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Edit Form (Uses key to reset once userData loads without cascading renders) */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="md:col-span-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-6 backdrop-blur-sm"
        >
          <ProfileForm
            key={userData ? "loaded" : "pending"}
            user={user}
            userData={userData}
          />
        </motion.div>

        {/* Right: Personal Payment Activity */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-6 backdrop-blur-sm"
        >
          <h3 className="text-base font-semibold text-white">
            Your Payment Records
          </h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Past utility share settlements
          </p>

          <div className="mt-4 flex flex-col gap-2.5">
            {loadingHistory ? (
              <p className="text-xs text-zinc-500 py-4 text-center">
                Loading payments...
              </p>
            ) : paymentHistory.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
                No payment entries recorded yet.
              </div>
            ) : (
              paymentHistory.map((item) => {
                const isPaid = item.status === "paid";
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-1 rounded-lg border border-zinc-800/80 bg-zinc-800/40 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">
                        {item.month}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                          isPaid
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {isPaid ? "Paid" : "Pending"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                      <span>
                        Amount:{" "}
                        <strong className="text-zinc-200">
                          ৳ {item.amount?.toLocaleString()}
                        </strong>
                      </span>
                      <span
                        className="truncate max-w-[120px] text-zinc-500"
                        title={item.proofNote}
                      >
                        {item.proofNote ? `Ref: ${item.proofNote}` : "Standard"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Subcomponent: Form state initialized synchronously on render
function ProfileForm({ user, userData }) {
  const [name, setName] = useState(userData?.name || user?.displayName || "");
  const [flatNumber, setFlatNumber] = useState(
    userData?.flatNumber === "Pending Setup" ? "" : userData?.flatNumber || "",
  );
  const [phone, setPhone] = useState(userData?.phone || "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!flatNumber.trim()) {
      setMessage({
        text: "Flat / Unit number cannot be blank.",
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    setMessage({ text: "", type: "" });

    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: name.trim(),
        flatNumber: flatNumber.trim(),
        phone: phone.trim(),
      });

      setMessage({
        text: "Profile details updated successfully!",
        type: "success",
      });
      setTimeout(() => setMessage({ text: "", type: "" }), 4000);
    } catch (err) {
      console.error("Profile update error:", err);
      setMessage({
        text: "Failed to update profile. Please try again.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <h3 className="text-base font-semibold text-white">
        Unit & Contact Information
      </h3>
      <p className="mt-0.5 text-xs text-zinc-400">
        Keep your flat unit updated to ensure accurate billing allocations
      </p>

      {message.text && (
        <div
          className={`mt-4 rounded-lg p-3 text-xs border ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="mt-5 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">
            Full Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jannatul Ferdous"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">
            Flat / Unit Number <span className="text-blue-400">*</span>
          </label>
          <input
            type="text"
            required
            value={flatNumber}
            onChange={(e) => setFlatNumber(e.target.value)}
            placeholder="e.g. Flat 4B or Suite 201"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">
            Contact Phone (Optional)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+880 1812-345678"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">
            Account Email (Read-Only)
          </label>
          <input
            type="email"
            disabled
            value={user.email || ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-xs text-zinc-500 cursor-not-allowed"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="mt-2 w-full sm:w-auto self-start rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 transition-all"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </>
  );
}
