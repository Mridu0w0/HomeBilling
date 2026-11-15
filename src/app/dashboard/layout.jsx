// src/app/dashboard/layout.jsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const isCheckingAuth = loading || !user;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row relative">
      {/* Full-screen loader overlay while checking Firebase Auth */}
      {isCheckingAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 text-zinc-400">
          <span>Loading...</span>
        </div>
      )}

      {/* Mobile Sidebar Control Bar (Only visible on small screens) */}
      <div className="md:hidden flex items-center justify-between bg-zinc-900/95 backdrop-blur border-b border-zinc-800 px-4 py-3 sticky top-0 z-40">
        <span className="text-sm font-semibold text-zinc-200">
          Dashboard Menu
        </span>
        <button
          type="button"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-zinc-200 hover:bg-zinc-700 hover:text-white focus:outline-none"
          aria-label="Toggle Sidebar"
        >
          {isSidebarOpen ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
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
          )}
        </button>
      </div>

      {/* Sidebar Component with open/close props */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Area — Always renders {children} inside Suspense so Next.js 16 can validate routes */}
      <div className="flex-1 w-full min-w-0">
        <main className="p-4 md:p-8">
          <Suspense
            fallback={
              <div className="flex min-h-[60vh] items-center justify-center text-zinc-400">
                <span>Loading...</span>
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
