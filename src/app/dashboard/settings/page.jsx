// src/app/dashboard/settings/page.js
"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { user, userData } = useAuth();
  const [flatNumber, setFlatNumber] = useState("");
  const [units, setUnits] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (userData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFlatNumber(userData.flatNumber || "");
      setUnits(userData.units || 1);
    }
  }, [userData]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage("");

    try {
      await updateDoc(doc(db, "users", user.uid), {
        flatNumber,
        units: Number(units),
      });
      setMessage("Profile updated! Refresh to see changes across the app.");
    } catch (err) {
      console.error(err);
      setMessage("Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg text-zinc-100">
      <h1 className="text-3xl font-bold text-white mb-2">Owner Settings</h1>
      <p className="text-zinc-400 mb-8">
        Configure your flat details and number of owned units.
      </p>

      <form
        onSubmit={handleSave}
        className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4"
      >
        {message && (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm">
            {message}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Flat / Unit Names
          </label>
          <input
            type="text"
            value={flatNumber}
            onChange={(e) => setFlatNumber(e.target.value)}
            placeholder="e.g. Flats 2A & 2B"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Number of Units Owned
          </label>
          <input
            type="number"
            min="1"
            required
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-sm text-white"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Your monthly bill share will be multiplied by this unit count.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
