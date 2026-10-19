// src/components/Navbar.jsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { FaHome } from "react-icons/fa";

export default function Navbar() {
  const { user, userData, logout } = useAuth();
  const pathname = usePathname();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const dropdownRef = useRef(null);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsDropdownOpen(false);
  }

  const isActive = (path) => pathname === path;

  const photoUrl = user?.photoURL;
  const displayName =
    userData?.name ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Owner";
  const userInitial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const closeDropdown = () => setIsDropdownOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-600/30 group-hover:bg-blue-500 transition-colors">
            <FaHome />
          </div>
          <span className="text-base font-semibold tracking-tight text-white group-hover:text-zinc-200 transition-colors">
            HomeBilling
          </span>
        </Link>

        {/* Navigation Items */}
        <nav className="flex items-center gap-3 sm:gap-4 text-xs font-medium">
          <Link
            href="/"
            className={`transition-colors px-2.5 py-1 rounded-md ${
              isActive("/")
                ? "text-white font-semibold bg-zinc-900"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Home
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className={`transition-colors px-2.5 py-1 rounded-md ${
                  isActive("/dashboard")
                    ? "text-blue-400 font-semibold bg-blue-500/10"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Dashboard
              </Link>

              {/* User Avatar with Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  aria-expanded={isDropdownOpen}
                  aria-label="Owner profile menu"
                  className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/90 py-1 pl-1 pr-2.5 text-left transition-all hover:border-zinc-700 hover:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt={displayName}
                      width={24}
                      height={24}
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="h-6 w-6 rounded-full object-cover ring-1 ring-zinc-700"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-[11px] font-bold text-white shadow-inner">
                      {userInitial}
                    </div>
                  )}

                  <span className="hidden sm:inline max-w-[100px] truncate text-zinc-200 text-[11px]">
                    {displayName}
                  </span>
                  <svg
                    className={`h-3 w-3 text-zinc-400 transition-transform duration-200 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl backdrop-blur-md z-50 text-xs"
                    >
                      {/* Owner Info Header */}
                      <div className="border-b border-zinc-800/80 px-3 py-2.5 mb-1">
                        <p className="font-semibold text-white truncate">
                          {displayName}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {user.email}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20">
                            {userData?.flatNumber || "Property Owner"}
                          </span>
                        </div>
                      </div>

                      {/* Links */}
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href="/dashboard"
                          onClick={closeDropdown}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                          <svg
                            className="h-4 w-4 text-zinc-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                          </svg>
                          Billing Dashboard
                        </Link>

                        <Link
                          href="/profile"
                          onClick={closeDropdown}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                          <svg
                            className="h-4 w-4 text-zinc-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          Owner Settings
                        </Link>
                      </div>

                      {/* Sign Out */}
                      <div className="border-t border-zinc-800/80 mt-1 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            closeDropdown();
                            logout();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className={`transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 ${
                  isActive("/login")
                    ? "text-white border-zinc-700 bg-zinc-800 font-semibold"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded-lg bg-blue-600 px-3.5 py-1.5 font-semibold text-white shadow-sm hover:bg-blue-500 active:scale-[0.98] transition-all"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
