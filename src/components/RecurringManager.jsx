"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const PRESET_CATEGORIES = [
  "Caretaker & Security",
  "Lift Maintenance",
  "Gas",
  "Internet & WiFi",
  "Cleaning & Janitorial",
  "Waste Management",
  "Electricity",
  "Repairs & Miscellaneous",
];

export default function RecurringManager({
  currentMonth,
  onExpensesGenerated,
}) {
  const [templates, setTemplates] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(PRESET_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("Monthly");

  // Fetch all templates
  const fetchTemplates = async () => {
    try {
      const snap = await getDocs(collection(db, "recurring_templates"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTemplates(list);
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
  };

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const snap = await getDocs(collection(db, "recurring_templates"));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTemplates(list);
      } catch (err) {
        console.error("Error fetching templates:", err);
      }
    }

    fetchTemplates();
  }, []);

  // Add new recurring template
  const handleAddTemplate = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    try {
      await addDoc(collection(db, "recurring_templates"), {
        title: title.trim(),
        category,
        amount: parsedAmount,
        frequency,
        isActive: true,
        createdAt: serverTimestamp(),
      });

      setTitle("");
      setAmount("");
      fetchTemplates();
    } catch (err) {
      console.error("Error saving template:", err);
    }
  };

  // Toggle active/inactive
  const handleToggleActive = async (template) => {
    try {
      await updateDoc(doc(db, "recurring_templates", template.id), {
        isActive: !template.isActive,
      });
      fetchTemplates();
    } catch (err) {
      console.error("Error toggling template:", err);
    }
  };

  // Delete template
  const handleDeleteTemplate = async (id) => {
    try {
      await deleteDoc(doc(db, "recurring_templates", id));
      fetchTemplates();
    } catch (err) {
      console.error("Error deleting template:", err);
    }
  };

  // Auto-populate active templates into the current month's expenses
  const handleGenerateExpenses = async () => {
    setIsGenerating(true);
    setStatusMessage("");

    try {
      // 1. Get existing expenses for this month to prevent duplicates
      const currentExpensesQuery = query(
        collection(db, "expenses"),
        where("month", "==", currentMonth),
      );
      const currentExpensesSnap = await getDocs(currentExpensesQuery);
      const existingNotesAndCats = new Set(
        currentExpensesSnap.docs.map(
          (d) => `${d.data().category}-${d.data().note || ""}`,
        ),
      );

      // 2. Filter active templates
      const activeTemplates = templates.filter((t) => t.isActive);

      let addedCount = 0;

      for (const t of activeTemplates) {
        const identifier = `${t.category}-${t.title}`;

        // Skip if already posted for this month
        if (!existingNotesAndCats.has(identifier)) {
          await addDoc(collection(db, "expenses"), {
            category: t.category,
            amount: t.amount,
            month: currentMonth,
            note: t.title,
            isRecurring: true,
            createdAt: serverTimestamp(),
          });
          addedCount++;
        }
      }

      if (addedCount > 0) {
        setStatusMessage(
          `Successfully generated ${addedCount} fixed recurring expenses!`,
        );
        if (onExpensesGenerated) onExpensesGenerated();
      } else {
        setStatusMessage(
          `All active recurring expenses are already applied for ${currentMonth}.`,
        );
      }
    } catch (err) {
      console.error("Error generating recurring items:", err);
      setStatusMessage("Failed to populate expenses.");
    } finally {
      setIsGenerating(false);
      setTimeout(() => setStatusMessage(""), 5000);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">
              Recurring Expenses Module
            </h2>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20">
              {templates.filter((t) => t.isActive).length} Active Contracts
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Automate predictable monthly bills (caretaker salary, lift
            maintenance, internet)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
          >
            {isOpen ? "Hide Templates" : "Manage Templates"}
          </button>

          <button
            type="button"
            onClick={handleGenerateExpenses}
            disabled={isGenerating || templates.length === 0}
            className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            {isGenerating ? "Applying..." : `Auto-Populate for ${currentMonth}`}
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
            Create Recurring Template
          </h3>

          <form
            onSubmit={handleAddTemplate}
            className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-5"
          >
            <input
              type="text"
              required
              placeholder="Title (e.g. Caretaker Wage)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none sm:col-span-2"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
              placeholder="Amount (৳)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              + Add Template
            </button>
          </form>

          {/* Existing Templates Table */}
          <div className="mt-5">
            <h4 className="text-xs font-medium text-zinc-400 mb-2">
              Saved Fixed Templates
            </h4>
            {templates.length === 0 ? (
              <p className="text-xs text-zinc-600 py-2">
                No templates configured yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="pb-2">Title</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {templates.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-800/20">
                        <td className="py-2 font-medium text-zinc-200">
                          {t.title}
                        </td>
                        <td className="py-2 text-zinc-400">{t.category}</td>
                        <td className="py-2 text-zinc-200 font-semibold">
                          ৳ {t.amount.toLocaleString()}
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => handleToggleActive(t)}
                            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                              t.isActive
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                            }`}
                          >
                            {t.isActive ? "Active" : "Paused"}
                          </button>
                        </td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => handleDeleteTemplate(t.id)}
                            className="text-zinc-500 hover:text-red-400"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
