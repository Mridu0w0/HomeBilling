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
  const [editReceiptUrl, setEditReceiptUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Edit Modal State
  const [editingExpense, setEditingExpense] = useState(null);
  const [editCategory, setEditCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editMonth, setEditMonth] = useState("");
  const [editNote, setEditNote] = useState("");
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
    </div>
  );
}
