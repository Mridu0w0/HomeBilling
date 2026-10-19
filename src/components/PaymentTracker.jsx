// src/components/PaymentTracker.jsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

export default function PaymentTracker({
  currentMonth,
  owners,
  sharePerOwner,
  currentUser,
  isAdmin = false,
}) {
  const [payments, setPayments] = useState({});
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [proofNote, setProofNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStripeId, setProcessingStripeId] = useState(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Auto-record Stripe success payment from redirect query params
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    const ownerId = searchParams.get("owner_id");
    const paidMonth = searchParams.get("month");

    if (paymentStatus === "success" && sessionId && ownerId && paidMonth) {
      const recordStripeSuccess = async () => {
        const paymentDocId = `${paidMonth}_${ownerId}`.replace(/\s+/g, "_");
        try {
          await setDoc(
            doc(db, "payments", paymentDocId),
            {
              month: paidMonth,
              userId: ownerId,
              amount: parseFloat(sharePerOwner) || 0,
              status: "paid",
              proofNote: `Stripe Online Card Payment (Session: ${sessionId.slice(-8)})`,
              paidAt: serverTimestamp(),
            },
            { merge: true },
          );
          // Clean the query parameters from URL
          router.replace("/dashboard");
        } catch (err) {
          console.error("Error confirming Stripe payment in Firestore:", err);
        }
      };

      recordStripeSuccess();
    }
  }, [searchParams, sharePerOwner, router]);

  // Real-time listener for current month payments
  useEffect(() => {
    if (!currentMonth) return;

    const q = query(
      collection(db, "payments"),
      where("month", "==", currentMonth),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const payMap = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          payMap[data.userId] = { id: d.id, ...data };
        });
        setPayments(payMap);
      },
      (err) => console.error("Payment snapshot error:", err),
    );

    return () => unsubscribe();
  }, [currentMonth]);

  // Handle Stripe Checkout Redirection
  const handlePayWithStripe = async (owner) => {
    setProcessingStripeId(owner.id);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: owner.id,
          ownerName: owner.name || owner.email,
          ownerEmail: owner.email,
          flatNumber: owner.flatNumber || "N/A",
          month: currentMonth,
          amount: parseFloat(sharePerOwner) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start checkout");

      // Redirect to Stripe Checkout page
      window.location.assign(data.url);
    } catch (err) {
      console.error("Stripe Checkout Error:", err);
      alert(err.message || "Failed to redirect to Stripe.");
    } finally {
      setProcessingStripeId(null);
    }
  };

  // Open manual proof submission modal
  const handleOpenSubmit = (owner) => {
    setSelectedOwner(owner);
    const existing = payments[owner.id];
    setProofNote(existing?.proofNote || "");
  };

  // Submit manual payment reference (bKash/Cash/Bank)
  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!selectedOwner) return;

    setIsSubmitting(true);
    const paymentDocId = `${currentMonth}_${selectedOwner.id}`.replace(
      /\s+/g,
      "_",
    );

    try {
      await setDoc(
        doc(db, "payments", paymentDocId),
        {
          month: currentMonth,
          userId: selectedOwner.id,
          userName: selectedOwner.name || selectedOwner.email,
          flatNumber: selectedOwner.flatNumber || "N/A",
          amount: parseFloat(sharePerOwner) || 0,
          status: isAdmin ? "paid" : "pending",
          proofNote: proofNote.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setSelectedOwner(null);
      setProofNote("");
    } catch (err) {
      console.error("Error submitting payment proof:", err);
      alert("Failed to submit payment details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin status toggle
  const handleToggleStatus = async (owner) => {
    const paymentDocId = `${currentMonth}_${owner.id}`.replace(/\s+/g, "_");
    const currentStatus = payments[owner.id]?.status || "pending";
    const nextStatus = currentStatus === "paid" ? "pending" : "paid";

    try {
      await setDoc(
        doc(db, "payments", paymentDocId),
        {
          month: currentMonth,
          userId: owner.id,
          userName: owner.name || owner.email,
          flatNumber: owner.flatNumber || "N/A",
          amount: parseFloat(sharePerOwner) || 0,
          status: nextStatus,
          proofNote: payments[owner.id]?.proofNote || "Marked by Admin",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err) {
      console.error("Error updating payment status:", err);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6">
      <div className="mb-4 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold text-white">
            Owner Payment Ledger
          </h2>
          <p className="text-xs text-zinc-400">
            Track dues, pay via Stripe card, or record offline references for{" "}
            {currentMonth}
          </p>
        </div>
        <span className="text-xs text-zinc-400">
          Target Share:{" "}
          <strong className="text-emerald-400">৳ {sharePerOwner}</strong> / flat
        </span>
      </div>

      {owners.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-500">
          No registered owners found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {owners.map((owner) => {
            const payRecord = payments[owner.id];
            const isPaid = payRecord?.status === "paid";
            const isCurrentOwner = currentUser?.uid === owner.id;
            const isStripeLoading = processingStripeId === owner.id;

            return (
              <div
                key={owner.id}
                className="flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-800/40 p-3.5 text-xs transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">
                        {owner.name || "Owner"}
                      </p>
                      {isCurrentOwner && (
                        <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-blue-300">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {owner.flatNumber || "Unit Pending"} • {owner.email}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${
                      isPaid
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {isPaid ? "Paid" : "Pending"}
                  </span>
                </div>

                {payRecord?.proofNote && (
                  <div className="mt-2.5 rounded bg-zinc-900/80 px-2 py-1 text-[11px] text-zinc-300 border border-zinc-800 truncate">
                    <span className="text-zinc-500">Proof: </span>
                    {payRecord.proofNote}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-2.5">
                  <span className="font-semibold text-zinc-200">
                    ৳ {sharePerOwner}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Pay with Stripe Button (Visible when Pending) */}
                    {!isPaid && (isCurrentOwner || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => handlePayWithStripe(owner)}
                        disabled={
                          isStripeLoading || parseFloat(sharePerOwner) <= 0
                        }
                        className="flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                      >
                        <svg
                          className="h-3 w-3"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697.4 12.365.4 6.723.4 2.87 3.398 2.87 8.358c0 5.494 4.887 6.46 8.016 7.625 2.51.932 3.327 1.638 3.327 2.637 0 1.026-.957 1.543-2.348 1.543-2.525 0-5.328-1.127-7.234-2.196L3.6 23.633c2.091 1.026 5.093 1.673 8.32 1.673 5.922 0 10.026-2.88 10.026-8.08 0-5.659-4.86-6.697-7.97-7.976z" />
                        </svg>
                        {isStripeLoading ? "Loading..." : "Pay Card"}
                      </button>
                    )}

                    {/* Manual Proof Submission */}
                    {(isCurrentOwner || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleOpenSubmit(owner)}
                        className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700 hover:text-white"
                      >
                        {payRecord?.proofNote ? "Edit" : "Proof"}
                      </button>
                    )}

                    {/* Admin Status Switcher */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(owner)}
                        className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                          isPaid
                            ? "bg-zinc-800 text-zinc-400 hover:text-amber-400"
                            : "bg-emerald-600 text-white hover:bg-emerald-500"
                        }`}
                      >
                        {isPaid ? "Undo" : "Approve"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Proof Modal */}
      {selectedOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white">
              Record Manual Payment
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              For{" "}
              <span className="text-zinc-200">
                {selectedOwner.name || selectedOwner.email}
              </span>{" "}
              ({selectedOwner.flatNumber || "Unit"})
            </p>

            <form
              onSubmit={handleSubmitProof}
              className="mt-4 flex flex-col gap-3"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Payment Reference / Transaction Details
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. bKash TrxID: 9AKJ8219 or Hand Cash to Caretaker"
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOwner(null)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
