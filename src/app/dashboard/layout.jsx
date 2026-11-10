// src/app/dashboard/layout.js
"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Protect the dashboard route
    if (!loading && !user) {
      window.location.assign("/login");
    }
  }, [user, loading]);

  // If loading or unauthenticated, show the loading screen but keep {children}
  // hidden in the DOM to satisfy Next.js compiler requirements.
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <span>Loading...</span>
        <div className="hidden">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Persistent Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64">
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
