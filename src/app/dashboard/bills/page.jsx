// src/app/dashboard/bills/page.js
"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";

import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

export default function BillsPage() {
  const { user } = useAuth();

  // 1. Initialize with an empty string or a static default like "November"
  const [selectedMonth, setSelectedMonth] = useState("");

  // 2. Set the dynamic date on the client side after hydration
  useEffect(() => {
    const currentMonthName = new Date().toLocaleString("default", {
      month: "long",
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedMonth(currentMonthName);
  }, []);

  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Modal / Interaction states
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Form states
  const [billTitle, setBillTitle] = useState("");
  const [sector, setSector] = useState("Electricity");
  const [totalAmount, setTotalAmount] = useState("");
  const [totalUnits, setTotalUnits] = useState("");

  // Data states
  const [owners, setOwners] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [editReceiptUrl, setEditReceiptUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // --- EDIT FORM STATE ---
  const [editForm, setEditForm] = useState({
    sector: "",
    amount: "",
    month: "",
    note: "",
    receiptUrl: "",
  });

  // --- HANDLERS ---
  const openEditModal = (item) => {
    setEditingItem(item);
    // Pre-fill the form with the selected item's data
    setEditForm({
      sector: item.sector || item.category || "",
      amount: item.totalAmount || item.amount || "",
      month: item.title || item.month || selectedMonth,
      note: item.note || "",
      receiptUrl: item.receiptUrl || item.splits?.[0]?.receiptUrl || "",
    });
  };

  const handleUpdateBill = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const billRef = doc(db, "bills", editingItem.id);

      const updatedData = {
        sector: editForm.sector,
        totalAmount: Number(editForm.amount),
        title: editForm.month,
        note: editForm.note,
        receiptUrl: editForm.receiptUrl,
      };

      // Update Firestore
      await updateDoc(billRef, updatedData);

      // Instantly update local UI state
      setBills((prev) =>
        prev.map((b) =>
          b.id === editingItem.id ? { ...b, ...updatedData } : b,
        ),
      );

      setEditingItem(null);
    } catch (error) {
      console.error("Error updating bill:", error);
    }
  };

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

  // Fetch all owners and existing bills
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Owners
        const usersSnap = await getDocs(collection(db, "users"));
        const ownersList = usersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          units: Number(doc.data().units || 1), // Default to 1 unit if not set
        }));
        setOwners(ownersList);

        // Pre-fill Total Units with the sum of all owners' units
        const sumUnits = ownersList.reduce((acc, curr) => acc + curr.units, 0);
        if (sumUnits > 0) setTotalUnits(String(sumUnits));

        // 2. Fetch Saved Bills
        const billsQuery = query(
          collection(db, "bills"),
          orderBy("createdAt", "desc"),
        );
        const billsSnap = await getDocs(billsQuery);
        setBills(billsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const currentMonthBills = selectedMonth
    ? bills.filter(
        (bill) => bill.title === selectedMonth || bill.month === selectedMonth,
      )
    : [];

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, "bills", deletingId));
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  // Unit Calculation Math
  const numericTotalBill = parseFloat(totalAmount) || 0;
  const numericTotalUnits = parseFloat(totalUnits) || 0;
  const costPerUnit =
    numericTotalUnits > 0 ? numericTotalBill / numericTotalUnits : 0;

  // Update an owner's unit count directly in the preview table if needed
  const handleUnitChange = (ownerId, newUnitValue) => {
    const updated = owners.map((o) =>
      o.id === ownerId ? { ...o, units: Math.max(0, Number(newUnitValue)) } : o,
    );
    setOwners(updated);
  };

  // Save the split bill to Firestore
  const handleCreateBill = async (e) => {
    e.preventDefault();
    if (numericTotalBill <= 0 || numericTotalUnits <= 0) return;
    setSubmitting(true);

    try {
      const ownerSplits = owners.map((owner) => ({
        uid: owner.uid || owner.id,
        name: owner.name,
        flatNumber: owner.flatNumber || "Owner Unit",
        receiptUrl: receiptUrl.trim() || null,
        units: owner.units,
        shareAmount: Number((costPerUnit * owner.units).toFixed(2)),
        status: "unpaid",
      }));

      const newBill = {
        title: billTitle,
        sector,
        totalAmount: numericTotalBill,
        totalUnits: numericTotalUnits,
        costPerUnit: Number(costPerUnit.toFixed(2)),
        splits: ownerSplits,
        createdBy: user?.uid || "admin",
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "bills"), newBill);
      setBills([{ id: docRef.id, ...newBill }, ...bills]);
      setBillTitle("");
      setReceiptUrl("");
      setTotalAmount("");
    } catch (err) {
      console.error("Failed to create bill:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="text-zinc-100 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">
          Manage & Split Bills
        </h1>
        <p className="text-zinc-400">
          Calculate owner dues proportionally based on total building units.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Bills</h1>
          <p className="text-sm text-zinc-400">
            View and edit your monthly building expenses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="month-select"
            className="text-sm font-medium text-zinc-400"
          >
            Billing Period:
          </label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {MONTHS.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>
      {loading ? (
        <div className="text-zinc-400 p-4">Loading expenses...</div>
      ) : (
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
              {currentMonthBills.length} Line Items
            </span>
          </div>

          {currentMonthBills.length === 0 ? (
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
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {currentMonthBills.map((item) => {
                    // Extract the receipt from either the root (if you add it later) OR the first split object
                    const actualReceiptUrl =
                      item.receiptUrl || item.splits?.[0]?.receiptUrl;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="py-2.5 font-medium text-white">
                          <div className="flex items-center gap-1.5">
                            {item.sector || item.category}
                          </div>
                        </td>

                        {/* UPDATE THIS TD ELEMENT */}
                        <td className="py-2.5">
                          {actualReceiptUrl ? (
                            <button
                              type="button"
                              // Pass the actual extracted URL into your state so the modal can use it
                              onClick={() =>
                                setViewingReceipt({
                                  ...item,
                                  receiptUrl: actualReceiptUrl,
                                })
                              }
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
                          ৳{" "}
                          {item.totalAmount?.toLocaleString() ||
                            item.amount?.toLocaleString()}
                        </td>

                        <td className="py-2.5 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingId(item.id)}
                            className="font-medium text-red-400 hover:text-red-300 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-[#121212] border border-zinc-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-semibold mb-2">Delete Bill?</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Are you sure you want to delete this expense? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors rounded-lg bg-zinc-800 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sector Expense Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-[#18181b] border border-zinc-800 p-6 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                Edit Sector Expense
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateBill} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Sector
                </label>
                <select
                  value={editForm.sector}
                  onChange={(e) =>
                    setEditForm({ ...editForm, sector: e.target.value })
                  }
                  className="w-full bg-[#121212] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="Repairs & Miscellaneous">
                    Repairs & Miscellaneous
                  </option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Water">Water</option>
                  <option value="Security">Security</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Amount (৳)
                </label>
                <input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) =>
                    setEditForm({ ...editForm, amount: e.target.value })
                  }
                  className="w-full bg-[#121212] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Billing Month
                </label>
                <input
                  type="text"
                  value={editForm.month}
                  onChange={(e) =>
                    setEditForm({ ...editForm, month: e.target.value })
                  }
                  className="w-full bg-[#121212] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Optional Notes
                </label>
                <input
                  type="text"
                  value={editForm.note}
                  onChange={(e) =>
                    setEditForm({ ...editForm, note: e.target.value })
                  }
                  className="w-full bg-[#121212] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Receipt Image URL
                </label>
                <input
                  type="text"
                  value={editForm.receiptUrl}
                  onChange={(e) =>
                    setEditForm({ ...editForm, receiptUrl: e.target.value })
                  }
                  className="w-full bg-[#121212] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#3b82f6] hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-[#18181b] border border-zinc-800 p-6 rounded-2xl max-w-2xl w-full shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {viewingReceipt.sector || viewingReceipt.category} Receipt
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  {viewingReceipt.title || selectedMonth} • Total: ৳{" "}
                  {viewingReceipt.totalAmount?.toLocaleString() ||
                    viewingReceipt.amount?.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setViewingReceipt(null)}
                className="text-zinc-500 hover:text-white transition-colors p-1"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="bg-[#27272a]/50 rounded-xl p-4 mt-6 mb-6 flex justify-center items-center min-h-62.5 border border-zinc-800/50">
              <Image
                width={300}
                height={300}
                src={viewingReceipt.receiptUrl}
                alt="Receipt"
                className="max-w-full max-h-[50vh] object-contain rounded shadow-lg"
              />
            </div>

            <div className="flex justify-between items-center">
              <a
                href={viewingReceipt.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#60a5fa] hover:text-blue-400 text-sm font-medium flex items-center gap-1 transition-colors"
              >
                Open Original File ↗
              </a>
              <button
                onClick={() => setViewingReceipt(null)}
                className="bg-[#27272a] hover:bg-zinc-700 text-zinc-200 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Bill Input Form */}
        <form
          onSubmit={handleCreateBill}
          className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4 h-fit"
        >
          <h2 className="text-lg font-semibold text-white">
            Create New Bill Split
          </h2>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Bill Title / Month
            </label>
            <input
              type="text"
              required
              placeholder="e.g. October Maintenance & Water"
              value={billTitle}
              onChange={(e) => setBillTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Billing Sector
            </label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-sm text-white"
            >
              <option value="Electricity">Common Electricity</option>
              <option value="Water">Water Supply</option>
              <option value="Security">Security & Guard</option>
              <option value="Maintenance">Elevator & Maintenance</option>
              <option value="Cleaning">Garbage & Cleaning</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Total Bill Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="e.g. 5000"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Total Building Units
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 10"
                value={totalUnits}
                onChange={(e) => setTotalUnits(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-sm text-white"
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
          </div>

          {/* Live Formula Breakdown Box */}
          <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400">
                Rate Per Single Unit (Total Bill ÷ Total Units)
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {numericTotalBill || 0} ÷ {numericTotalUnits || 1} units
              </p>
            </div>
            <span className="text-xl font-bold text-blue-400">
              ${costPerUnit.toFixed(2)}{" "}
              <span className="text-xs font-normal text-zinc-400">/ unit</span>
            </span>
          </div>

          <button
            type="submit"
            disabled={
              submitting || numericTotalBill <= 0 || numericTotalUnits <= 0
            }
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting ? "Saving Bill..." : "Publish & Split Bill"}
          </button>
        </form>

        {/* Right Column: Live Owner Split Preview */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Live Split Preview per Owner
            </h2>
            <span className="text-xs text-zinc-400">
              {owners.length} Registered Owners
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500">Loading owners...</p>
          ) : (
            <div className="space-y-3">
              {owners.map((owner) => {
                const ownerShare = costPerUnit * owner.units;
                return (
                  <div
                    key={owner.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-800"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {owner.name}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {owner.flatNumber}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={owner.units}
                          onChange={(e) =>
                            handleUnitChange(owner.id, e.target.value)
                          }
                          className="w-14 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-center text-xs text-white"
                        />
                        <span className="text-xs text-zinc-400">units</span>
                      </div>

                      <div className="w-24 text-right">
                        <p className="text-sm font-bold text-emerald-400">
                          ${ownerShare.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {owner.units} × ${costPerUnit.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Saved Bills History */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <h2 className="text-lg font-semibold text-white mb-4">
          Published Building Bills
        </h2>
        {bills.length === 0 ? (
          <p className="text-sm text-zinc-500">No bills created yet.</p>
        ) : (
          <div className="space-y-4">
            {bills.map((bill) => (
              <div
                key={bill.id}
                className="p-4 rounded-lg bg-zinc-950 border border-zinc-800"
              >
                <div className="flex flex-wrap justify-between items-center border-b border-zinc-800 pb-3 mb-3">
                  <div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 mr-2">
                      {bill.sector}
                    </span>
                    <span className=" font-semibold text-white">
                      {bill.title}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-300">
                    Total:{" "}
                    <strong className="text-white">${bill.totalAmount}</strong>{" "}
                    ({bill.totalUnits} units @ ${bill.costPerUnit}/unit)
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {bill.splits?.map((split, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs bg-zinc-900 px-3 py-2 rounded border border-zinc-800/80"
                    >
                      <span>
                        <strong className="text-zinc-200">{split.name}</strong>{" "}
                        ({split.units}u)
                      </span>
                      <span className="font-semibold text-emerald-400">
                        ${split.shareAmount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
