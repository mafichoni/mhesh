"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Vote,
  Lock,
  Mail,
  Phone,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Briefcase,
  Printer,
  Loader2,
} from "lucide-react";
import { api, saveToken, errorMessage } from "@/lib/api";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<"aspirant" | "supporter" | "partner">("aspirant");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) {
      setError("Please provide at least an email or phone number");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: {
        email?: string;
        phone?: string;
        password: string;
        full_name?: string;
      } = {
        password,
        full_name: fullName.trim() || undefined,
      };

      if (email.trim()) payload.email = email.trim().toLowerCase();
      if (phone.trim()) payload.phone = phone.trim();

      const res = await api.post<{ access_token: string; token_type: string }>("/api/auth/register", payload);

      saveToken(res.data.access_token);

      // Determine where to route based on account type or redirect param
      if (redirect) {
        router.push(redirect);
      } else if (accountType === "supporter") {
        router.push("/mhesh/work");
      } else if (accountType === "partner") {
        router.push("/mhesh/partners/apply");
      } else {
        router.push("/mhesh/dashboard");
      }
    } catch (err) {
      setError(errorMessage(err, "Registration failed. An account with this email/phone may already exist."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg space-y-8 rounded-2xl border border-black/10 bg-white p-8 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B6E4F] text-white shadow-md">
          <Vote size={28} />
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-[#0A1F1A] dark:text-neutral-100 font-serif">
          Create Your Mhesh Account
        </h2>
        <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">
          Join Kenya&apos;s verified 2027 campaign &amp; grassroots work infrastructure
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        {/* Account Role Selector */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            I want to register as:
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAccountType("aspirant")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${
                accountType === "aspirant"
                  ? "border-[#0B6E4F] bg-emerald-50 text-[#0B6E4F] ring-2 ring-[#0B6E4F]/20 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              <Vote size={20} />
              <span className="text-[11px] font-bold">Candidate</span>
            </button>

            <button
              type="button"
              onClick={() => setAccountType("supporter")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${
                accountType === "supporter"
                  ? "border-[#0B6E4F] bg-emerald-50 text-[#0B6E4F] ring-2 ring-[#0B6E4F]/20 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              <Briefcase size={20} />
              <span className="text-[11px] font-bold">Supporter</span>
            </button>

            <button
              type="button"
              onClick={() => setAccountType("partner")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${
                accountType === "partner"
                  ? "border-[#0B6E4F] bg-emerald-50 text-[#0B6E4F] ring-2 ring-[#0B6E4F]/20 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              <Printer size={20} />
              <span className="text-[11px] font-bold">Print Shop</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Full Name
          </label>
          <div className="relative mt-1">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Mwangi or Sarah Wanjiku"
              required
              className="w-full rounded-xl border border-neutral-300 bg-stone-50/50 px-3.5 py-2.5 pl-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0B6E4F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B6E4F] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
            <User className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Email Address
            </label>
            <div className="relative mt-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-neutral-300 bg-stone-50/50 px-3.5 py-2.5 pl-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0B6E4F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B6E4F] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
              <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Phone (M-Pesa)
            </label>
            <div className="relative mt-1">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712 345 678"
                className="w-full rounded-xl border border-neutral-300 bg-stone-50/50 px-3.5 py-2.5 pl-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0B6E4F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B6E4F] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
              <Phone className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Password (min. 8 characters)
          </label>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              minLength={8}
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
              Creating account...
            </span>
          ) : (
            <>
              <span>Complete Registration</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Footer link to login */}
      <div className="border-t border-neutral-100 pt-4 text-center text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
        <span>Already have an account? </span>
        <Link
          href={`/mhesh/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
          className="font-bold text-[#0B6E4F] hover:underline dark:text-emerald-400"
        >
          Sign In Here
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-[#0B6E4F]" />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
