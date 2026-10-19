// src/app/login/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, login, loginWithGoogle } = useAuth();
  const router = useRouter();

  // Watch for active authentication and navigate immediately
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      // Must be invoked directly synchronously inside the user click
      const loggedUser = await loginWithGoogle();
      if (loggedUser) {
        router.replace("/dashboard");
      }
    } catch (err) {
      if (err?.code === "auth/popup-blocked") {
        setError(
          "Browser blocked the popup window. Please allow popups for this site or try again.",
        );
      } else {
        setError(err?.message || "Google sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-xl backdrop-blur-sm">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Owner Login
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Sign in to check and manage monthly dues
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Google Sign-in */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || authLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-700/80 active:scale-[0.99] disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          {loading ? "Connecting..." : "Continue with Google"}
        </button>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full border-t border-zinc-800"></div>
          <span className="absolute bg-zinc-900 px-3 text-xs uppercase text-zinc-500">
            or with email
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || authLoading}
            className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="mt-2 text-center text-xs text-zinc-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
