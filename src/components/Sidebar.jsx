// src/components/Sidebar.js
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { userData, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.assign("/login");
  };

  const navItems = [
    { name: "Overview", path: "/dashboard" },
    { name: "Manage Bills", path: "/dashboard/bills" },
    { name: "Payments", path: "/dashboard/payments" },
    { name: "Custom Payments", path: "/dashboard/customPayments" },
    { name: "Settings", path: "/dashboard/settings" },
  ];

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen fixed left-0 top-10">
      <div className="p-6">
        <h2 className="text-xl font-bold text-white tracking-tight">
          HomeBilling
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          {userData?.flatNumber} •{" "}
          {userData?.role === "admin" ? "Admin" : "Owner"}
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`block px-4 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-600/10 text-blue-400 font-medium"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800 mb-10">
        <div className="mb-4 px-2">
          <p className="text-sm font-medium text-white truncate">
            {userData?.name}
          </p>
          <p className="text-xs text-zinc-500 truncate">{userData?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-700/80 active:scale-[0.99]"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
