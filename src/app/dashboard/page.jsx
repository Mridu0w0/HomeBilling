// src/app/dashboard/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { motion } from "framer-motion";
import RecurringManager from "@/components/RecurringManager";
import StatementPrint from "@/components/StatementPrint";
import ExpenseCharts from "@/components/ExpenseCharts";

const BILLING_CATEGORIES = [
  "Electricity",
  "Water",
  "Security",
  "Maintenance",
  "Cleaning",
];

export default function DashboardPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [bills, setBills] = useState([]);
  const [owners, setOwners] = useState([]);
  const [selectedBillTitle, setSelectedBillTitle] = useState("All Bills");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // 1. Fetch Registered Owners and their Unit counts
  useEffect(() => {
    async function fetchOwners() {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const ownersList = querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
          units: Number(docSnap.data().units || 1),
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

  // 2. Real-time Listener for Unit-Based Bills
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "bills"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setBills(list);
        setLoadingData(false);
      },
      (err) => {
        console.error("Firestore bills snapshot error:", err);
        setLoadingData(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // Unique Bill Titles / Cycles for the Filter Dropdown
  const availableCycles = [
    "All Bills",
    ...Array.from(
      new Set(
        bills
          .map(
            (b) =>
              b.billingPeriod ||
              (b.month && b.year ? `${b.month} ${b.year}` : b.title),
          )
          .filter(Boolean),
      ),
    ),
  ];
  const filteredBills =
    selectedBillTitle === "All Bills"
      ? bills
      : bills.filter(
          (b) =>
            (b.billingPeriod ||
              (b.month && b.year ? `${b.month} ${b.year}` : b.title)) ===
            selectedBillTitle,
        );

  // Unit & Expense Calculations
  const totalBuildingUnits =
    owners.reduce((sum, o) => sum + (Number(o.units) || 1), 0) || 1;

  const currentUserUnits = Number(
    userData?.units ||
      owners.find((o) => o.id === user?.uid || o.uid === user?.uid)?.units ||
      1,
  );

  const totalAmount = filteredBills.reduce(
    (sum, bill) => sum + (Number(bill.totalAmount) || 0),
    0,
  );

  // Calculate the logged-in user's exact unit-based share across filtered bills
  // Only count bills where the logged-in owner is actually included in `splits`
  const myTotalShare = filteredBills.reduce((sum, bill) => {
    const mySplit = bill.splits?.find((s) => s.uid === user?.uid);
    return mySplit ? sum + (Number(mySplit.shareAmount) || 0) : sum;
  }, 0);

  // Calculate how much of the logged-in user's share is still unpaid
  const myUnpaidShare = filteredBills.reduce((sum, bill) => {
    const mySplit = bill.splits?.find((s) => s.uid === user?.uid);
    if (mySplit && mySplit.status !== "paid") {
      return sum + (Number(mySplit.shareAmount) || 0);
    }
    return sum;
  }, 0);

  // Calculate total collected across the building
  const totalCollected = filteredBills.reduce((sum, bill) => {
    const billPaid =
      bill.splits
        ?.filter((s) => s.status === "paid")
        .reduce((sSum, s) => sSum + (Number(s.shareAmount) || 0), 0) || 0;
    return sum + billPaid;
  }, 0);

  const averageRatePerUnit =
    currentUserUnits > 0 ? myTotalShare / currentUserUnits : 0;

  const sectorCount = new Set(filteredBills.map((b) => b.sector)).size;

  // Map new `bills` structure to match `ExpenseCharts` and `StatementPrint` props
  const formattedExpensesForComponents = filteredBills.map((b) => ({
    id: b.id,
    title: b.title,
    category: b.sector || "Maintenance",
    amount: Number(b.totalAmount) || 0,
    month: b.title,
    createdAt: b.createdAt,
  }));

  if (authLoading || !user || loadingData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mr-2"></div>
        Loading overview...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Top Banner with Cycle Filter */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col justify-between gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-center"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Building Overview
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Welcome,{" "}
            <span className="text-zinc-200 font-medium">
              {userData?.name || user.email}
            </span>{" "}
            ({userData?.flatNumber || "Owner Unit"} •{" "}
            <span className="text-blue-400 font-medium">
              {currentUserUnits} {currentUserUnits === 1 ? "Unit" : "Units"}
            </span>
            )
          </p>
        </div>

        {/* Dynamic Cycle Selector & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs shadow-inner">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-zinc-400">Viewing:</span>
            <select
              value={selectedBillTitle}
              onChange={(e) => setSelectedBillTitle(e.target.value)}
              className="bg-transparent font-semibold text-white focus:outline-none cursor-pointer"
            >
              {availableCycles.map((cycle) => (
                <option
                  key={cycle}
                  value={cycle}
                  className="bg-zinc-900 text-white"
                >
                  {cycle}
                </option>
              ))}
            </select>
          </div>

          <Link
            href="/dashboard/bills"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            + Add Bill
          </Link>

          <StatementPrint
            selectedMonth={selectedBillTitle}
            bills={filteredBills}
            expenses={formattedExpensesForComponents}
            totalAmount={totalAmount}
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
        {/* Card 1: Total Building Expense */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-medium text-zinc-400">
            Total Building Expense
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">
            $
            {totalAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {filteredBills.length} published{" "}
            {filteredBills.length === 1 ? "bill" : "bills"} • $
            {totalCollected.toFixed(2)} collected
          </p>
        </div>

        {/* Card 2: Logged-in Owner's Unit Share */}
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-blue-400">
              Your Unit Share ({currentUserUnits}u)
            </p>
            {myUnpaidShare > 0 ? (
              <Link
                href="/dashboard/payments"
                className="text-[10px] font-semibold bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-500"
              >
                Pay Now
              </Link>
            ) : (
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                All Paid
              </span>
            )}
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-blue-400 tracking-tight">
            ${myTotalShare.toFixed(2)}
          </p>
          <p className="mt-1 text-[11px] text-blue-300/70">
            Rate: ${averageRatePerUnit.toFixed(2)} / unit • Unpaid: $
            {myUnpaidShare.toFixed(2)}
          </p>
        </div>

        {/* Card 3: Active Sectors */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-medium text-zinc-400">
            Active Billing Sectors
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {sectorCount}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Out of {BILLING_CATEGORIES.length} standard sectors
          </p>
        </div>

        {/* Card 4: Registered Owners & Total Units */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-medium text-zinc-400">
            Building Ownership
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {owners.length}{" "}
            <span className="text-base font-normal text-zinc-400">Owners</span>
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {totalBuildingUnits} total units registered
          </p>
        </div>
      </motion.div>

      {/* Recharts Analytics Section */}
      <div className="mb-8">
        <ExpenseCharts
          expenses={formattedExpensesForComponents}
          totalAmount={totalAmount}
        />
      </div>

      {/* Recurring Expenses Automation */}
      <div className="mb-8">
        <RecurringManager currentMonth={selectedBillTitle} />
      </div>
    </div>
  );
}
