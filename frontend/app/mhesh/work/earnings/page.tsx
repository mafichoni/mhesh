"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Award,
  Vote,
  Phone,
} from "lucide-react";
import { api, errorMessage, shortDate, isUnauthorized } from "@/lib/api";

interface SupporterData {
  id: string;
  display_name: string;
  county?: string | null;
  ward?: string | null;
  verified_mpesa: boolean;
  trust_score: number;
  tasks_completed: number;
  tasks_disputed: number;
  total_earned_kes: number;
}

interface LedgerItem {
  task_id: string;
  title: string;
  payout_kes: number;
  approved_at?: string | null;
}

interface EarningsResponse {
  supporter: SupporterData;
  ledger: LedgerItem[];
}

export default function SupporterEarningsPage() {
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // M-Pesa verification
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  const loadEarnings = async () => {
    try {
      setLoading(true);
      const res = await api.get<EarningsResponse>("/api/mhesh/supporters/me/earnings");
      setData(res.data);
    } catch (err) {
      if (!isUnauthorized(err)) {
        setErrorMsg(errorMessage(err, "Failed to load supporter earnings"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyPhone) return;

    setVerifying(true);
    setVerifyMsg(null);

    try {
      await api.post("/api/mhesh/supporters/me/verify-mpesa", { phone: verifyPhone });
      setVerifyMsg("STK push sent! Enter your PIN on your phone (KSh 1 verification fee).");
    } catch (err) {
      setVerifyMsg(errorMessage(err, "Verification failed"));
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="mx-auto mt-16 max-w-lg rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
        <h3 className="mt-2 text-base font-bold">Earnings Ledger Unavailable</h3>
        <p className="mt-1 text-xs">{errorMsg || "Supporter profile not found. Please register first."}</p>
        <Link
          href="/mhesh/work"
          className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline"
        >
          <ArrowLeft className="h-3 w-3" /> Go to Work Portal
        </Link>
      </div>
    );
  }

  const { supporter, ledger } = data;

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-16">
      {/* Top Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link
            href="/mhesh/work"
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Work Portal</span>
          </Link>
          <span className="text-xs font-bold text-stone-500 font-mono">
            Supporter ID: {supporter.id.slice(0, 8)}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 font-serif">
            Supporter Earnings & Payout Ledger
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Track all completed campaign tasks, M-Pesa B2C disbursements, and your voter trust rating.
          </p>
        </div>

        {/* Verification Alert if unverified */}
        {!supporter.verified_mpesa && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Verify Your Phone for Priority Selection
                </h3>
                <p className="mt-1 text-xs text-amber-700 max-w-md">
                  Candidates prioritize M-Pesa verified supporters for high-paying assignments. A nominal KSh 1 check verifies your account.
                </p>
              </div>

              <form onSubmit={handleVerify} className="flex items-center gap-2">
                <input
                  type="tel"
                  required
                  placeholder="07XXXXXXXX"
                  value={verifyPhone}
                  onChange={(e) => setVerifyPhone(e.target.value)}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={verifying}
                  className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {verifying ? "Sending..." : "Verify (KSh 1)"}
                </button>
              </form>
            </div>
            {verifyMsg && <p className="mt-2 text-xs font-semibold text-emerald-800">{verifyMsg}</p>}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Total M-Pesa Earned
            </span>
            <div className="mt-2 flex items-baseline gap-1 text-2xl font-black text-emerald-800 font-mono">
              <Coins className="h-5 w-5 text-emerald-600" />
              <span>KSh {supporter.total_earned_kes.toLocaleString()}</span>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Completed Tasks
            </span>
            <div className="mt-2 text-2xl font-black text-stone-900 font-mono">
              {supporter.tasks_completed}
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Trust Score
            </span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl font-black text-stone-900 font-mono">
                {supporter.trust_score}
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                Top Tier
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              M-Pesa Verification
            </span>
            <div className="mt-2">
              {supporter.verified_mpesa ? (
                <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600">
                  <Clock className="h-4 w-4" /> Unverified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 bg-stone-50/70 p-4">
            <h3 className="text-sm font-bold text-stone-900">Payment Disbursements</h3>
          </div>

          {ledger.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-400">
              No completed payouts yet. Once you complete assigned tasks and the aspirant approves your evidence, payouts appear here.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/50 uppercase tracking-wider text-stone-400 font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Task Title</th>
                  <th className="px-6 py-3.5">Payout Amount</th>
                  <th className="px-6 py-3.5">Payment Method</th>
                  <th className="px-6 py-3.5">Date Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ledger.map((item) => (
                  <tr key={item.task_id} className="hover:bg-stone-50/50">
                    <td className="px-6 py-4 font-semibold text-stone-900">
                      <Link href={`/mhesh/work/${item.task_id}`} className="hover:text-emerald-700">
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-800">
                      KSh {item.payout_kes.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                        M-Pesa B2C
                      </span>
                    </td>
                    <td className="px-6 py-4 text-stone-500">{shortDate(item.approved_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
