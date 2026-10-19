// src/app/page.js
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

const FEATURES = [
  {
    icon: (
      <svg
        className="h-6 w-6 text-blue-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    title: "Multi-Sector Utility Tracking",
    description:
      "Input and track monthly bills across all building sectors including Electricity, Water, Gas, and Waste Management in one unified ledger.",
  },
  {
    icon: (
      <svg
        className="h-6 w-6 text-emerald-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
    title: "Automated Recurring Contracts",
    description:
      "Save fixed templates for caretaker wages, lift AMC, and fixed internet lines. Auto-populate them into new billing cycles with one click.",
  },
  {
    icon: (
      <svg
        className="h-6 w-6 text-purple-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    title: "Precise 5+ Owner Split",
    description:
      "Divide the entire building's total costs equally or proportionally across all flat owners with precise 2-decimal rounding.",
  },
  {
    icon: (
      <svg
        className="h-6 w-6 text-indigo-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
    title: "Online Stripe & Offline Proof",
    description:
      "Pay dues with credit or debit card through Stripe Checkout, or submit offline mobile banking transaction references for admin verification.",
  },
  {
    icon: (
      <svg
        className="h-6 w-6 text-amber-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    title: "Transparent Receipt Proofs",
    description:
      "Attach and inspect photos or PDF links of physical meter bills so every owner can verify charges transparently.",
  },
  {
    icon: (
      <svg
        className="h-6 w-6 text-pink-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    title: "One-Click Statement PDF Export",
    description:
      "Export clean, formal monthly accounting statements ready for physical community meetings or digital archiving.",
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="relative overflow-hidden">
      {/* Background Glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-125 w-200 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/15 blur-[120px]" />

      {/* Hero Section */}
      <section className="mx-auto max-w-5xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-medium text-blue-400"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          Smart Shared Property Expense System
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl"
        >
          Effortless utility management & bill splitting for{" "}
          <span className="text-blue-500">home owners</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base"
        >
          Replace messy spreadsheets and manual calculations. Log variable
          monthly utility bills, automate fixed recurring contracts, track
          payments, and divide costs transparently across all units.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-transparent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-600/40 active:scale-[0.99]"
            >
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-600/40 active:scale-[0.99]"
              >
                Register as Owner
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-6 py-3 text-sm font-semibold text-zinc-200 transition-all hover:bg-zinc-800 hover:text-white"
              >
                Sign In
              </Link>
            </>
          )}
        </motion.div>
      </section>

      {/* Interactive Feature Grid */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Everything your building committee needs
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-zinc-400">
            Tailored specifically for buildings with 5 or more owners managing
            shared utilities
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-800/80">
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors">
                {feature.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Live Preview / Stats Banner */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-8 text-center sm:p-12">
          <h3 className="text-xl font-bold text-white sm:text-2xl">
            Ready to streamline your building&apos;s monthly expenses?
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-xs sm:text-sm text-zinc-400">
            Join the flat owners managing predictable contracts, receipts, and
            split payments on HomeBilling.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href={user ? "/dashboard" : "/register"}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-blue-500 transition-all"
            >
              {user ? "Open Your Dashboard" : "Create Free Owner Account"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
