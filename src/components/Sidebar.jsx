// src/components/Sidebar.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LuLayoutDashboard,
  LuReceiptText,
  LuWalletCards,
  LuShieldCheck,
  LuSettings,
  LuBuilding2,
} from "react-icons/lu";

export default function Sidebar({ isOpen = false, setIsOpen = () => {} }) {
  const pathname = usePathname();
  const { userData, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  };

  const navItems = [
    { name: "Overview", path: "/dashboard", icon: LuLayoutDashboard },
    { name: "Manage Bills", path: "/dashboard/bills", icon: LuReceiptText },
    {
      name: "Custom Payments",
      path: "/dashboard/customPayments",
      icon: LuWalletCards,
    },
    {
      name: "Payment Verification",
      path: "/dashboard/payments",
      icon: LuShieldCheck,
    },
    { name: "Settings", path: "/dashboard/settings", icon: LuSettings },
  ];

  return (
    <>
      {/* Dark Backdrop Overlay on Mobile when Open (Clicking outside closes sidebar) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Top Header inside Sidebar */}
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Gradient Icon Badge */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/25 text-blue-400 shadow-inner">
                <LuBuilding2 className="h-4 w-4" />
              </div>

              {/* Unit Info & Role Badge */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-zinc-100 truncate">
                    {userData?.flatNumber || "Owner Unit"}
                  </h2>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase border ${
                      userData?.role === "admin"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/25"
                    }`}
                  >
                    {userData?.role === "admin" ? "Admin" : "Owner"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                  {userData?.units || 1}{" "}
                  {Number(userData?.units || 1) === 1 ? "Unit" : "Units"}{" "}
                  Allocated
                </p>
              </div>
            </div>

            {/* Close Button inside Sidebar (Mobile only) */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="md:hidden rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              aria-label="Close Sidebar"
            >
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
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-blue-600/15 text-blue-400 font-medium border border-blue-500/20"
                      : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-blue-400" : "text-zinc-500"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile & Sign Out */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900">
          <div className="mb-3 px-1">
            <p className="text-sm font-medium text-white truncate">
              {userData?.name || "Owner"}
            </p>
            <p className="text-xs text-zinc-400 truncate">{userData?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
