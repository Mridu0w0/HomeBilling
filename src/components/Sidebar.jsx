// src/components/Sidebar.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar({ isOpen = false, setIsOpen = () => {} }) {
  const pathname = usePathname();
  const { userData, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  };

  const navItems = [
    { name: "Overview", path: "/dashboard" },
    { name: "Manage Bills", path: "/dashboard/bills" },
    { name: "Custom Payments", path: "/dashboard/customPayments" },
    { name: "Payment Verification", path: "/dashboard/payments" },
    { name: "Settings", path: "/dashboard/settings" },
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
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Building Menu
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {userData?.flatNumber || "Owner Unit"} •{" "}
                {userData?.role === "admin" ? "Admin" : "Owner"}
              </p>
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
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-blue-600/15 text-blue-400 font-medium border border-blue-500/20"
                      : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                  }`}
                >
                  {item.name}
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
