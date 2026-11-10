// src/components/MemberBalances.jsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function MemberBalances() {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for all bills to calculate global ledger
    const unsubscribe = onSnapshot(collection(db, "bills"), (snapshot) => {
      const userLedger = {};

      snapshot.docs.forEach((doc) => {
        const bill = doc.data();
        if (bill.splits) {
          bill.splits.forEach((split) => {
            if (!userLedger[split.uid]) {
              userLedger[split.uid] = {
                name: split.name,
                flatNumber: split.flatNumber,
                totalBilled: 0,
                totalPaid: 0,
              };
            }

            // Add what they were supposed to pay
            userLedger[split.uid].totalBilled += split.shareAmount || 0;

            // Add what they actually paid (supports legacy "paid" status as fallback)
            const paid =
              split.paidAmount !== undefined
                ? split.paidAmount
                : split.status === "paid"
                  ? split.shareAmount
                  : 0;

            userLedger[split.uid].totalPaid += paid;
          });
        }
      });

      // dueBalance = totalPaid - totalBilled
      // Positive = Advance (Overpaid), Negative = Due (Underpaid)
      const calculatedBalances = Object.values(userLedger)
        .map((user) => ({
          ...user,
          dueBalance: user.totalPaid - user.totalBilled,
        }))
        .sort((a, b) => a.dueBalance - b.dueBalance); // Sort negatives (dues) to top

      setBalances(calculatedBalances);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading)
    return <div className="p-4 text-zinc-400 text-sm">Loading ledger...</div>;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 sticky top-20">
      <h3 className="text-lg font-bold text-white mb-1">Global Ledger</h3>
      <p className="text-xs text-zinc-400 mb-4">Real-time dues and advances.</p>

      <div className="space-y-3">
        {balances.map((user, idx) => {
          const isAdvance = user.dueBalance > 0;
          const isDue = user.dueBalance < 0;

          return (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
            >
              <div>
                <p className="text-sm font-medium text-zinc-200">{user.name}</p>
                <p className="text-[10px] text-zinc-500">
                  Unit: {user.flatNumber}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-bold ${
                    isAdvance
                      ? "text-emerald-400"
                      : isDue
                        ? "text-rose-400"
                        : "text-zinc-400"
                  }`}
                >
                  {isAdvance ? "+" : ""}
                  {user.dueBalance.toFixed(2)}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {isAdvance ? "Advance" : isDue ? "Due" : "Settled"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
