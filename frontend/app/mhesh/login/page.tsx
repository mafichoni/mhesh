"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Vote, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { api, saveToken, errorMessage } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/mhesh/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please provide both identifier and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post<{ access_token: string; token_type: string }>("/api/auth/login", {
        identifier: identifier.trim(),
        password,
      });

      saveToken(res.data.access_token);
      router.push(redirect);
    } catch (err) {
      setError(errorMessage(err, "Invalid email/phone or password. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 rounded-2xl border border-black/10 bg-white p-8 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B6E4F] text-white shadow-md">
          <Vote size={28} />
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-[#0A1F1A] dark:text-neutral-100 font-serif">
          Welcome to Mhesh
        </h2>
        <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">
          Sign in to access your Campaign Command Center or Supporter Portal
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Email or Phone Number
          </label>
          <div className="relative mt-1">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. 0712345678 or mhesh@example.com"
              required
              className="w-full rounded-xl border border-neutral-300 bg-stone-50/50 px-3.5 py-2.5 pl-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0B6E4F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B6E4F] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
            <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Password
          </label>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your account password"
              required
              className="w-full rounded-xl border border-neutral-300 bg-stone-50/50 px-3.5 py-2.5 pl-10 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0B6E4F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B6E4F] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
            <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B6E4F] py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800 active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Signing in...
            </span>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Footer link to register */}
      <div className="border-t border-neutral-100 pt-4 text-center text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
        <span>Don&apos;t have a campaign account yet? </span>
        <Link
          href={`/mhesh/register${redirect !== "/mhesh/dashboard" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
          className="font-bold text-[#0B6E4F] hover:underline dark:text-emerald-400"
        >
          Register Here
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-[#0B6E4F]" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
