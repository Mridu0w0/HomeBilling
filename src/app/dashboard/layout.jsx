// src/app/dashboard/layout.js
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Protect the dashboard route
    if (!loading && !user) {
      window.location.assign("/login");
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <span>Loading...</span>
        <div className="hidden">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row">
      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden flex items-center justify-between bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-30">
        <h2 className="text-lg font-bold text-white tracking-tight">
          HomeBilling
        </h2>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="text-zinc-400 hover:text-white p-1"
          aria-label="Open Sidebar"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Persistent Sidebar (passes state for mobile toggle) */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 w-full">
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
