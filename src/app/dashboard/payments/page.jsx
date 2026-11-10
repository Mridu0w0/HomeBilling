// src/app/dashboard/payments/page.js
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

// 1. Move your main logic into a separate component
function PaymentsContent() {
  const { user, userData, loading: authLoading } = useAuth();
  const [bills, setBills] = useState([]);
  const [selectedBillId, setSelectedBillId] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [processingStripeId, setProcessingStripeId] = useState(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  const isAdmin = userData?.role === "admin" || true;

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const billId = searchParams.get("bill_id");
    const ownerId = searchParams.get("owner_id");

    if (paymentStatus === "success" && billId && ownerId) {
      const recordStripeSuccess = async () => {
        try {
          const billRef = doc(db, "bills", billId);
          const billSnap = await getDoc(billRef);

          if (billSnap.exists()) {
            const billData = billSnap.data();
            const updatedSplits = billData.splits.map((split) =>
              split.uid === ownerId ? { ...split, status: "paid" } : split,
            );

            await updateDoc(billRef, { splits: updatedSplits });
            router.replace("/dashboard/payments");
          }
        } catch (err) {
          console.error("Error confirming Stripe payment in Firestore:", err);
        }
      };

      recordStripeSuccess();
    }
  }, [searchParams, router]);

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
        if (fetchedBills?.length > 0) {
          setSelectedBillId(fetchedBills[0].id);
        }
      } catch (err) {
        console.error("Error fetching bills:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchBills();
    }
  }, [authLoading, searchParams]);

  const selectedBill = bills.find((b) => b.id === selectedBillId);

  const handlePayWithStripe = async (split, bill) => {
    setProcessingStripeId(split.uid);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: bill.id,
          ownerId: split.uid,
          ownerName: split.name,
          month: bill.title,
          amount: parseFloat(split.shareAmount) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start checkout");

      window.location.assign(data.url);
    } catch (err) {
      console.error("Stripe Checkout Error:", err);
      alert(err.message || "Failed to redirect to Stripe.");
    } finally {
      setProcessingStripeId(null);
    }
  };

  const handleTogglePayment = async (splitIndex) => {
    if (!isAdmin || !selectedBill) return;
    setUpdating(true);

    try {
      const updatedSplits = [...selectedBill.splits];
      const currentStatus = updatedSplits[splitIndex].status;

      updatedSplits[splitIndex].status =
        currentStatus === "paid" ? "unpaid" : "paid";

      const billRef = doc(db, "bills", selectedBill.id);
      await updateDoc(billRef, { splits: updatedSplits });

      setBills((prevBills) =>
        prevBills.map((b) =>
          b.id === selectedBill.id ? { ...b, splits: updatedSplits } : b,
        ),
      );
    } catch (err) {
      console.error("Error updating payment status:", err);
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading || loading) {
    return <div className="text-zinc-400 p-8">Loading payments...</div>;
  }

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Payment Tracking</h1>
        <p className="text-zinc-400">
          Track unit-based payment collections for your building.
        </p>
      </div>

      {bills?.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl text-zinc-400">
          No bills have been created yet.
        </div>
      ) : (
        <>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between mt-6">
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
                    {bill.title} ({bill.sector}) - ৳{bill.totalAmount}
                  </option>
                ))}
              </select>
            </div>

            {selectedBill && (
              <div className="text-right">
                <p className="text-xs text-zinc-400">Total Bill Rate</p>
                <p className="text-lg font-bold text-white">
                  ৳{selectedBill.costPerUnit.toFixed(2)}{" "}
                  <span className="text-sm font-normal text-zinc-500">
                    / unit
                  </span>
                </p>
              </div>
            )}
          </div>

          {selectedBill && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mt-6">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Owner Name</th>
                    <th className="px-6 py-4 font-medium text-center">Units</th>
                    <th className="px-6 py-4 font-medium text-right">Amount</th>
                    <th className="px-6 py-4 font-medium text-center">
                      Status
                    </th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {selectedBill.splits.map((split, index) => {
                    const isPaid = split.status === "paid";
                    const isCurrentUser = split.uid === user?.uid;
                    const isStripeLoading = processingStripeId === split.uid;

                    return (
                      <tr
                        key={split.uid || index}
                        className={`transition-colors ${isCurrentUser ? "bg-blue-900/10" : "hover:bg-zinc-800/20"}`}
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-white">
                            {split.name}{" "}
                            {isCurrentUser && (
                              <span className="ml-2 text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {split.flatNumber}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center text-zinc-300">
                          {split.units}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-400">
                          ৳{split.shareAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isPaid
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {isPaid ? "Paid" : "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {isAdmin ? (
                              <button
                                onClick={() => handleTogglePayment(index)}
                                disabled={updating}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                                  isPaid
                                    ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                    : "bg-zinc-700 text-white hover:bg-zinc-600"
                                } disabled:opacity-50`}
                              >
                                {isPaid ? "Undo Paid" : "Verify Payment"}
                              </button>
                            ) : null}

                            {isCurrentUser && !isPaid && (
                              <button
                                type="button"
                                onClick={() =>
                                  handlePayWithStripe(split, selectedBill)
                                }
                                disabled={isStripeLoading}
                                className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                              >
                                {isStripeLoading
                                  ? "Loading..."
                                  : "Pay with Card"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

// 2. Wrap the component inside Suspense in your default export
export default function PaymentsPage() {
  return (
    <div className="text-zinc-100 max-w-4xl space-y-6">
      <Suspense
        fallback={<div className="text-zinc-400 p-8">Loading dashboard...</div>}
      >
        <PaymentsContent />
      </Suspense>
    </div>
  );
}
