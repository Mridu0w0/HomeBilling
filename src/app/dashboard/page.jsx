// src/app/dashboard/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import RecurringManager from "@/components/RecurringManager";
import PaymentTracker from "@/components/PaymentTracker";
import StatementPrint from "@/components/StatementPrint";
import ExpenseCharts from "@/components/ExpenseCharts";
import Image from "next/image";

const BILLING_CATEGORIES = [
  "Electricity",
  "Water & Sewerage",
  "Gas",
  "Lift Maintenance",
  "Caretaker & Security",
  "Waste Management",
  "Cleaning & Janitorial",
  "Repairs & Miscellaneous",
];

const DEFAULT_MONTHS = [
  "October 2026",
  "September 2026",
  "August 2026",
  "July 2026",
];

export default function DashboardPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [expenses, setExpenses] = useState([]);
  const [owners, setOwners] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Monthly Cycle Switcher State
  const [availableMonths, setAvailableMonths] = useState(DEFAULT_MONTHS);
  const [selectedMonth, setSelectedMonth] = useState("October 2026");
  const [showNewMonthModal, setShowNewMonthModal] = useState(false);
  const [newMonthInput, setNewMonthInput] = useState("");

  // Create Form State
  const [category, setCategory] = useState(BILLING_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Edit Modal State
  const [editingExpense, setEditingExpense] = useState(null);
  const [editCategory, setEditCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editMonth, setEditMonth] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editReceiptUrl, setEditReceiptUrl] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // View Receipt Modal State
  const [viewingReceipt, setViewingReceipt] = useState(null);

  // Delete Modal State
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchOwners() {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const ownersList = querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setOwners(ownersList);
      } catch (err) {
        console.error("Error fetching owners:", err);
      }
    }

    if (user) {
      fetchOwners();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "expenses"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbMonths = new Set(DEFAULT_MONTHS);
      snapshot.docs.forEach((d) => {
        const m = d.data().month;
        if (m) dbMonths.add(m);
      });
      setAvailableMonths(Array.from(dbMonths));
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedMonth) return;

    const q = query(
      collection(db, "expenses"),
      where("month", "==", selectedMonth),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0),
        );
        setExpenses(list);
      },
      (err) => {
        console.error("Firestore snapshot error:", err);
      },
    );

    return () => unsubscribe();
  }, [user, selectedMonth]);

  const handleFileUpload = async (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    if (!apiKey) {
      alert(
        "No ImgBB API key found in .env.local. Please paste an image URL directly into the receipt field.",
      );
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        if (isEdit) {
          setEditReceiptUrl(data.data.url);
        } else {
          setReceiptUrl(data.data.url);
        }
      } else {
        alert("Image upload failed. Try pasting an image link directly.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error uploading image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "expenses"), {
        category,
        amount: parsedAmount,
        month: selectedMonth,
        note: note.trim(),
        receiptUrl: receiptUrl.trim() || null,
        isRecurring: false,
        addedBy: user.email,
        createdAt: serverTimestamp(),
      });

      setAmount("");
      setNote("");
      setReceiptUrl("");
    } catch (err) {
      setError("Failed to add expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewMonth = (e) => {
    e.preventDefault();
    const formatted = newMonthInput.trim();
    if (!formatted) return;

    if (!availableMonths.includes(formatted)) {
      setAvailableMonths([formatted, ...availableMonths]);
    }
    setSelectedMonth(formatted);
    setNewMonthInput("");
    setShowNewMonthModal(false);
  };

  const openEditModal = (item) => {
    setEditingExpense(item);
    setEditCategory(item.category);
    setEditAmount(item.amount.toString());
    setEditMonth(item.month || selectedMonth);
    setEditNote(item.note || "");
    setEditReceiptUrl(item.receiptUrl || "");
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingExpense) return;

    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "expenses", editingExpense.id), {
        category: editCategory,
        amount: parsedAmount,
        month: editMonth,
        note: editNote.trim(),
        receiptUrl: editReceiptUrl.trim() || null,
        updatedAt: serverTimestamp(),
      });
      setEditingExpense(null);
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update expense.");
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDeleteExpense = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "expenses", deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete bill.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculations
  const totalAmount = expenses.reduce(
    (sum, item) => sum + (item.amount || 0),
    0,
  );
  const effectiveOwnerCount = Math.max(owners.length, 5);
  const sharePerOwner =
    effectiveOwnerCount > 0
      ? (totalAmount / effectiveOwnerCount).toFixed(2)
      : "0.00";
  const sectorCount = new Set(expenses.map((e) => e.category)).size;

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mr-2"></div>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      {/* Top Banner with Dynamic Switcher */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col justify-between gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-center"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Building Expenses & Dues
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Welcome,{" "}
            <span className="text-zinc-200 font-medium">
              {userData?.name || user.email}
            </span>{" "}
            ({userData?.flatNumber || "Unit Pending"})
          </p>
        </div>

        {/* Dynamic Month Selector & Cycle Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs shadow-inner">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-zinc-400">Viewing:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-semibold text-white focus:outline-none cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-zinc-900 text-white">
                  {m}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowNewMonthModal(true)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            + New Cycle
          </button>

          <StatementPrint
            selectedMonth={selectedMonth}
            expenses={expenses}
            totalAmount={totalAmount}
            effectiveOwnerCount={effectiveOwnerCount}
            sharePerOwner={sharePerOwner}
            owners={owners}
          />
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-medium text-zinc-400">
            Total Building Expense
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">
            ৳ {totalAmount.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {expenses.length} bills in {selectedMonth}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-medium text-blue-400">Share Per Owner</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-blue-400 tracking-tight">
            ৳ {sharePerOwner}
          </p>
          <p className="mt-1 text-[11px] text-blue-300/70">
            Split across {effectiveOwnerCount} owners
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-medium text-zinc-400">
            Active Billing Sectors
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {sectorCount}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Out of {BILLING_CATEGORIES.length} available
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-medium text-zinc-400">Registered Owners</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {owners.length}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Min. baseline 5 owners applied
          </p>
        </div>
      </motion.div>

      {/* Recharts Analytics Section */}
      <div className="mb-8">
        <ExpenseCharts expenses={expenses} totalAmount={totalAmount} />
      </div>

      {/* Recurring Expenses Automation */}
      <div className="mb-8">
        <RecurringManager currentMonth={selectedMonth} />
      </div>

      {/* Main Grid: Input Form + Expenses List */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left: Input Form */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-6 backdrop-blur-sm"
        >
          <h2 className="text-base font-semibold text-white">
            Log Billing Sector
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            Adding bill directly to{" "}
            <span className="text-zinc-200 font-medium">{selectedMonth}</span>
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-400">
              {error}
            </div>
          )}

          <form
            onSubmit={handleAddExpense}
            className="mt-4 flex flex-col gap-3.5"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Billing Sector
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                {BILLING_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Amount (৳)
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 4500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Active Month
              </label>
              <input
                type="text"
                disabled
                value={selectedMonth}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Optional Notes
              </label>
              <input
                type="text"
                placeholder="e.g. DESCO meter #10293"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-3">
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Attach Bill Receipt (Optional)
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, false)}
                disabled={isUploading}
                className="mb-2 block w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-700 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-white hover:file:bg-zinc-600 cursor-pointer"
              />

              <input
                type="url"
                placeholder="Or paste receipt image link (https://...)"
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />

              {isUploading && (
                <p className="mt-1 text-[11px] text-blue-400">
                  Uploading receipt image...
                </p>
              )}
              {receiptUrl && !isUploading && (
                <p className="mt-1 text-[11px] text-emerald-400 truncate">
                  Attached: {receiptUrl}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 transition-all"
            >
              {isSubmitting ? "Saving..." : `Add Expense to ${selectedMonth}`}
            </button>
          </form>
        </motion.div>

        {/* Right: Expenses Table & Payment Tracker */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Expenses Table */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Itemized Expenses
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  All recorded bills for {selectedMonth}
                </p>
              </div>
              <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
                {expenses.length} Line Items
              </span>
            </div>

            {expenses.length === 0 ? (
              <div className="mt-8 py-8 text-center text-xs text-zinc-500">
                No bills recorded yet for {selectedMonth}. Add one or
                auto-populate from recurring templates.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="pb-2 font-medium">Sector</th>
                      <th className="pb-2 font-medium">Receipt</th>
                      <th className="pb-2 font-medium">Total</th>
                      <th className="pb-2 font-medium">
                        Per Owner ({effectiveOwnerCount})
                      </th>
                      <th className="pb-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {expenses.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="py-2.5 font-medium text-white">
                          <div className="flex items-center gap-1.5">
                            {item.category}
                            {item.isRecurring && (
                              <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-400 border border-blue-500/20">
                                Recurring
                              </span>
                            )}
                          </div>
                          {item.note && (
                            <p className="text-[11px] text-zinc-400 font-normal">
                              {item.note}
                            </p>
                          )}
                        </td>

                        <td className="py-2.5">
                          {item.receiptUrl ? (
                            <button
                              type="button"
                              onClick={() => setViewingReceipt(item)}
                              className="inline-flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:bg-blue-500/20"
                            >
                              View Bill
                            </button>
                          ) : (
                            <span className="text-[11px] text-zinc-600">
                              No Receipt
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 font-semibold text-zinc-100">
                          ৳ {item.amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-blue-400 font-medium">
                          ৳ {(item.amount / effectiveOwnerCount).toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="font-medium text-blue-400 hover:text-blue-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingId(item.id)}
                            className="font-medium text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Integrated Owner Payment Tracker */}
          <PaymentTracker
            currentMonth={selectedMonth}
            owners={owners}
            sharePerOwner={sharePerOwner}
            currentUser={user}
            isAdmin={userData?.role === "admin" || true}
          />
        </div>
      </div>

      {/* New Month / Cycle Creator Modal */}
      <AnimatePresence>
        {showNewMonthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
            >
              <h3 className="text-base font-semibold text-white">
                Create New Billing Cycle
              </h3>
              <p className="mt-0.5 text-xs text-zinc-400">
                Initialize a fresh billing period (e.g., November 2026)
              </p>

              <form
                onSubmit={handleCreateNewMonth}
                className="mt-4 flex flex-col gap-3"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">
                    Cycle Name / Month & Year
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. November 2026"
                    value={newMonthInput}
                    onChange={(e) => setNewMonthInput(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewMonthModal(false)}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                  >
                    Open Cycle
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Receipt Image Modal */}
      <AnimatePresence>
        {viewingReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {viewingReceipt.category} Receipt
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {viewingReceipt.month} • Total: ৳{" "}
                    {viewingReceipt.amount.toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setViewingReceipt(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[70vh] overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-2 flex items-center justify-center">
                <Image
                  src={viewingReceipt.receiptUrl}
                  alt={`${viewingReceipt.category} bill proof`}
                  className="max-h-[60vh] max-w-full rounded object-contain"
                />
              </div>

              <div className="mt-4 flex justify-between items-center">
                <a
                  href={viewingReceipt.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:underline"
                >
                  Open Original File ↗
                </a>
                <button
                  type="button"
                  onClick={() => setViewingReceipt(null)}
                  className="rounded-lg bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Expense Modal */}
      <AnimatePresence>
        {editingExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">
                  Edit Sector Expense
                </h3>
                <button
                  onClick={() => setEditingExpense(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="flex flex-col gap-3.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">
                    Sector
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    {BILLING_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">
                    Amount (৳)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">
                    Billing Month
                  </label>
                  <input
                    type="text"
                    required
                    value={editMonth}
                    onChange={(e) => setEditMonth(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">
                    Optional Notes
                  </label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">
                    Receipt Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editReceiptUrl}
                    onChange={(e) => setEditReceiptUrl(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingExpense(null)}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-4">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>

              <h3 className="text-base font-semibold text-white">
                Delete Expense
              </h3>
              <p className="mt-1 text-xs text-zinc-400">
                Are you sure you want to remove this bill entry? This will
                automatically recalculate the building total and dues for all
                owners.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  disabled={isDeleting}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteExpense}
                  disabled={isDeleting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete Bill"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
