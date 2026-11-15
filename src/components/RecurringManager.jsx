// src/components/RecurringManager.jsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const PRESET_CATEGORIES = [
  "Electricity",
  "Water",
  "Security",
  "Maintenance",
  "Cleaning",
  "Caretaker & Security",
  "Lift Maintenance",
  "Gas",
  "Internet & WiFi",
];

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

export default function RecurringManager({ onBillsGenerated }) {
  const [templates, setTemplates] = useState([]);
  const [owners, setOwners] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Client-safe current Month & Year states
  const [currentMonth, setCurrentMonth] = useState("November");
  const [currentYear, setCurrentYear] = useState(2026);

  // Form State
  const [title, setTitle] = useState("");
  const [sector, setSector] = useState(PRESET_CATEGORIES[0]);
  const [amount, setAmount] = useState("");

  const currentPeriod = `${currentMonth} ${currentYear}`;

  const fetchTemplatesAndOwners = async () => {
    try {
      const [templateSnap, userSnap] = await Promise.all([
        getDocs(collection(db, "recurring_templates")),
        getDocs(collection(db, "users")),
      ]);

      const templateList = templateSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      const ownerList = userSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        units: Number(d.data().units || 1),
      }));

      setTemplates(templateList);
      setOwners(ownerList);
      return { templateList, ownerList };
    } catch (err) {
      console.error("Error fetching recurring data:", err);
      return { templateList: [], ownerList: [] };
    }
  };

  // 2. Load initial data & set client date after the async boundary (satisfies React 19 ESLint)
  useEffect(() => {
    let isMounted = true;

    async function initRecurringModule() {
      try {
        const [templateSnap, userSnap] = await Promise.all([
          getDocs(collection(db, "recurring_templates")),
          getDocs(collection(db, "users")),
        ]);

        if (!isMounted) return;

        const now = new Date();
        setCurrentMonth(MONTHS[now.getMonth()]);
        setCurrentYear(now.getFullYear());

        setTemplates(templateSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setOwners(
          userSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            units: Number(d.data().units || 1),
          })),
        );
      } catch (err) {
        console.error("Error initializing recurring module:", err);
      }
    }

    initRecurringModule();

    return () => {
      isMounted = false;
    };
  }, []);
  // 3. Core Unit-Split Bill Generator (ONLY runs when Sync button is clicked)
  const syncRecurringBillsForMonth = async (
    targetTemplates,
    targetOwners,
    monthName,
    yearNum,
  ) => {
    const activeTemplates = targetTemplates.filter((t) => t.isActive);
    if (activeTemplates.length === 0) {
      setStatusMessage(
        "No active contracts to sync. Switch at least one contract to Active.",
      );
      setTimeout(() => setStatusMessage(""), 4000);
      return;
    }

    if (targetOwners.length === 0) {
      setStatusMessage("No registered owners found to split bills.");
      setTimeout(() => setStatusMessage(""), 4000);
      return;
    }

    const periodLabel = `${monthName} ${yearNum}`;

    // Check which recurring bills already exist in `bills` for this billingPeriod
    const existingBillsQuery = query(
      collection(db, "bills"),
      where("billingPeriod", "==", periodLabel),
    );
    const existingSnap = await getDocs(existingBillsQuery);
    const existingTemplateIds = new Set(
      existingSnap.docs
        .map((d) => d.data().recurringTemplateId)
        .filter(Boolean),
    );

    // Calculate total building units across all registered owners
    const totalUnits =
      targetOwners.reduce((sum, o) => sum + (Number(o.units) || 1), 0) || 1;

    let addedCount = 0;

    for (const t of activeTemplates) {
      // Skip if already generated for this Month + Year
      if (existingTemplateIds.has(t.id)) continue;

      const numericAmount = Number(t.amount) || 0;
      const costPerUnit = numericAmount / totalUnits;

      // Build unit-based splits for each owner
      const ownerSplits = targetOwners.map((owner) => {
        const ownerUnits = Number(owner.units) || 1;
        return {
          uid: owner.uid || owner.id,
          name: owner.name || owner.email || "Owner",
          flatNumber: owner.flatNumber || "Owner Unit",
          units: ownerUnits,
          shareAmount: Number((costPerUnit * ownerUnits).toFixed(2)),
          status: "unpaid",
        };
      });

      // Deterministic Document ID prevents duplicate creation
      const deterministicBillId =
        `recurring_${t.id}_${monthName}_${yearNum}`.replace(/\s+/g, "_");

      await setDoc(doc(db, "bills", deterministicBillId), {
        title: t.title,
        sector: t.sector || t.category || "Maintenance",
        month: monthName,
        year: Number(yearNum),
        billingPeriod: periodLabel,
        totalAmount: numericAmount,
        totalUnits,
        costPerUnit: Number(costPerUnit.toFixed(2)),
        splits: ownerSplits,
        isRecurring: true,
        recurringTemplateId: t.id,
        createdAt: new Date().toISOString(),
      });

      // Stamp template with last generated period
      await updateDoc(doc(db, "recurring_templates", t.id), {
        lastGeneratedPeriod: periodLabel,
      });

      addedCount++;
    }

    if (addedCount > 0) {
      setStatusMessage(
        `Synced ${addedCount} active recurring ${
          addedCount === 1 ? "bill" : "bills"
        } for ${periodLabel}!`,
      );
      fetchTemplatesAndOwners();
      if (onBillsGenerated) onBillsGenerated();
    } else {
      setStatusMessage(
        `All active recurring bills are already synced for ${periodLabel}.`,
      );
    }
    setTimeout(() => setStatusMessage(""), 5000);
  };

  // Add new recurring template (Saves template ONLY — does not create a bill until Sync is pressed)
  const handleAddTemplate = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    try {
      await addDoc(collection(db, "recurring_templates"), {
        title: title.trim(),
        sector,
        amount: parsedAmount,
        frequency: "Monthly",
        isActive: true,
        lastGeneratedPeriod: "",
        createdAt: serverTimestamp(),
      });

      setTitle("");
      setAmount("");
      await fetchTemplatesAndOwners();
      setStatusMessage(
        "Contract saved! Click 'Sync' when you are ready to publish to bills.",
      );
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      console.error("Error saving template:", err);
    }
  };

  // Toggle Active / Paused switch (Updates template state ONLY — does not trigger bill creation)
  const handleToggleActive = async (template) => {
    try {
      const nextState = !template.isActive;
      await updateDoc(doc(db, "recurring_templates", template.id), {
        isActive: nextState,
      });

      // Update local state immediately without triggering any bill generation
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === template.id ? { ...t, isActive: nextState } : t,
        ),
      );
    } catch (err) {
      console.error("Error toggling template:", err);
    }
  };

  // Delete template
  const handleDeleteTemplate = async (id) => {
    try {
      await deleteDoc(doc(db, "recurring_templates", id));
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Error deleting template:", err);
    }
  };

  // Manual Sync button handler (The ONLY place that adds recurring bills to `bills`)
  const handleManualSync = async () => {
    setIsGenerating(true);
    try {
      await syncRecurringBillsForMonth(
        templates,
        owners,
        currentMonth,
        currentYear,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const totalUnits =
    owners.reduce((sum, o) => sum + (Number(o.units) || 1), 0) || 1;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">
              Recurring Bills Automation
            </h2>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20">
              {templates.filter((t) => t.isActive).length} Active Contracts
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Configure active contracts first, then click Sync to split across{" "}
            {totalUnits} building units for {currentPeriod}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
          >
            {isOpen ? "Hide Contracts" : "Manage Contracts"}
          </button>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isGenerating || templates.length === 0}
            className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            {isGenerating ? "Syncing..." : `Sync ${currentPeriod}`}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-400">
          {statusMessage}
        </div>
      )}

      {/* Templates Drawer */}
      {isOpen && (
        <div className="mt-5 border-t border-zinc-800 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Add Permanent Monthly Contract
          </h3>

          <form
            onSubmit={handleAddTemplate}
            className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-5"
          >
            <input
              type="text"
              required
              placeholder="Title (e.g. Caretaker Salary)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none sm:col-span-2"
            />

            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              {PRESET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <input
              type="number"
              step="any"
              required
              placeholder="Total Amount ($)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              + Save Contract
            </button>
          </form>

          {/* Existing Templates Table */}
          <div className="mt-5">
            <h4 className="text-xs font-medium text-zinc-400 mb-2">
              Saved Contracts (Only Active items will be added when you press
              Sync)
            </h4>
            {templates.length === 0 ? (
              <p className="text-xs text-zinc-600 py-2">
                No recurring contracts configured yet.
              </p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {templates.map((t) => {
                    const ratePerUnit =
                      totalUnits > 0 ? Number(t.amount) / totalUnits : 0;
                    return (
                      <div
                        key={t.id}
                        className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3.5 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-zinc-100">
                              {t.title}
                            </p>
                            <p className="text-[11px] text-zinc-400">
                              {t.sector || t.category}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(t)}
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                              t.isActive
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                            }`}
                          >
                            {t.isActive ? "● Active" : "○ Paused"}
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2 text-xs">
                          <div>
                            <span className="text-zinc-400">Total: </span>
                            <span className="font-semibold text-zinc-200">
                              ${Number(t.amount).toLocaleString()}
                            </span>
                            <span className="ml-2 text-emerald-400">
                              (${ratePerUnit.toFixed(2)}/u)
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-zinc-500">
                              {t.lastGeneratedPeriod || "Not synced"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(t.id)}
                              className="text-xs font-medium text-zinc-500 hover:text-red-400"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="hidden md:block overflow-x-auto rounded-lg border border-zinc-800/80">
                  <table className="w-full min-w-170 text-left text-xs">
                    <thead className="bg-zinc-900/90">
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="py-3 px-4 font-medium whitespace-nowrap">
                          Title
                        </th>
                        <th className="py-3 px-4 font-medium whitespace-nowrap">
                          Sector
                        </th>
                        <th className="py-3 px-4 font-medium whitespace-nowrap">
                          Total Bill
                        </th>
                        <th className="py-3 px-4 font-medium whitespace-nowrap">
                          Rate / Unit
                        </th>
                        <th className="py-3 px-4 font-medium whitespace-nowrap">
                          Last Synced
                        </th>
                        <th className="py-3 px-4 font-medium whitespace-nowrap">
                          Switch
                        </th>
                        <th className="py-3 px-4 font-medium text-right whitespace-nowrap">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50 bg-zinc-950/40">
                      {templates.map((t) => {
                        const ratePerUnit =
                          totalUnits > 0 ? Number(t.amount) / totalUnits : 0;
                        return (
                          <tr
                            key={t.id}
                            className="hover:bg-zinc-800/30 transition-colors"
                          >
                            <td className="py-3 px-4 font-medium text-zinc-200 whitespace-nowrap">
                              {t.title}
                            </td>
                            <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                              {t.sector || t.category}
                            </td>
                            <td className="py-3 px-4 text-zinc-200 font-semibold whitespace-nowrap">
                              ${Number(t.amount).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-emerald-400 font-medium whitespace-nowrap">
                              ${ratePerUnit.toFixed(2)}/u
                            </td>
                            <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                              {t.lastGeneratedPeriod || "Not synced"}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleToggleActive(t)}
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                                  t.isActive
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                                }`}
                              >
                                {t.isActive ? "● Active" : "○ Paused"}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleDeleteTemplate(t.id)}
                                className="text-zinc-500 hover:text-red-400 transition-colors"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
