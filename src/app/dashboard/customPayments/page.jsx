// src/app/dashboard/customPayments/page.js
"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import MemberBalances from "@/components/MemberBalances";

export default function CustomPaymentsPage() {
  const { userData, loading: authLoading } = useAuth();
  const [bills, setBills] = useState([]);
  const [selectedBillId, setSelectedBillId] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // State for inline editing of actual payment amount
  const [editingIndex, setEditingIndex] = useState(null);
  const [manualAmount, setManualAmount] = useState("");

  const isAdmin = userData?.role === "admin" || true; // Adjust admin check as needed

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const billsQuery = query(
          collection(db, "bills"),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(billsQuery);
        const fetchedBills = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setBills(fetchedBills);
        if (fetchedBills.length > 0) setSelectedBillId(fetchedBills[0].id);
      } catch (err) {
        console.error("Error fetching bills:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) fetchBills();
  }, [authLoading]);

  const selectedBill = bills.find((b) => b.id === selectedBillId);

  // Save the specific custom amount to Firestore
  const handleSaveManualPayment = async (splitIndex) => {
    if (!isAdmin || !selectedBill) return;
    setUpdating(true);

    try {
      const updatedSplits = [...selectedBill.splits];
      const amountPaid = parseFloat(manualAmount) || 0;

      updatedSplits[splitIndex].paidAmount = amountPaid;
      // Optionally update the status tag based on full/partial payment
      updatedSplits[splitIndex].status =
        amountPaid >= updatedSplits[splitIndex].shareAmount
          ? "paid"
          : "pending";

      const billRef = doc(db, "bills", selectedBill.id);
      await updateDoc(billRef, { splits: updatedSplits });

      // Update local state instantly to reflect the change
      setBills((prevBills) =>
        prevBills.map((b) =>
          b.id === selectedBill.id ? { ...b, splits: updatedSplits } : b,
        ),
      );

      setEditingIndex(null);
      setManualAmount("");
    } catch (err) {
      console.error("Error updating custom payment:", err);
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading || loading)
    return <div className="text-zinc-400 p-8">Loading custom payments...</div>;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 text-zinc-100 max-w-7xl">
      {/* Main Content Area (Takes 3 columns) */}
      <div className="xl:col-span-3 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Custom Manual Payments
          </h1>
          <p className="text-zinc-400">
            Record exact cash or offline payments, including partial payments
            and overpayments.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Select Billing Period
            </label>
            <select
              value={selectedBillId}
              onChange={(e) => setSelectedBillId(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {bills.map((bill) => (
                <option key={bill.id} value={bill.id}>
                  {bill.title} - ৳{bill.totalAmount}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedBill && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mt-6 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Owner</th>
                  <th className="px-6 py-4 font-medium text-right">
                    Billed Amount
                  </th>
                  <th className="px-6 py-4 font-medium text-right">
                    Paid Amount
                  </th>
                  <th className="px-6 py-4 font-medium text-right w-48">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {selectedBill.splits.map((split, index) => {
                  // Fallback to legacy logic if paidAmount hasn't been set yet
                  const currentPaidAmount =
                    split.paidAmount !== undefined
                      ? split.paidAmount
                      : split.status === "paid"
                        ? split.shareAmount
                        : 0;

                  const isOverpaid = currentPaidAmount > split.shareAmount;
                  const isUnderpaid = currentPaidAmount < split.shareAmount;

                  return (
                    <tr
                      key={split.uid || index}
                      className="hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{split.name}</p>
                        <p className="text-xs text-zinc-500">
                          Unit: {split.flatNumber}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-300 font-medium">
                        ৳{split.shareAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingIndex === index ? (
                          <div className="flex justify-end">
                            <input
                              type="number"
                              value={manualAmount}
                              onChange={(e) => setManualAmount(e.target.value)}
                              className="w-28 bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-white text-right focus:outline-none focus:border-blue-500"
                              placeholder="0.00"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <span
                            className={`font-bold ${
                              isOverpaid
                                ? "text-emerald-400"
                                : isUnderpaid
                                  ? "text-amber-400"
                                  : "text-zinc-200"
                            }`}
                          >
                            ৳{currentPaidAmount.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isAdmin &&
                          (editingIndex === index ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingIndex(null)}
                                className="text-xs text-zinc-400 hover:text-white px-2 py-1.5"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveManualPayment(index)}
                                disabled={updating}
                                className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-500 disabled:opacity-50"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingIndex(index);
                                setManualAmount(currentPaidAmount);
                              }}
                              className="px-3 py-1.5 rounded text-xs font-medium border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                            >
                              Update Payment
                            </button>
                          ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sidebar Area (Takes 1 column) */}
      <div className="xl:col-span-1">
        <MemberBalances />
      </div>
    </div>
  );
}
