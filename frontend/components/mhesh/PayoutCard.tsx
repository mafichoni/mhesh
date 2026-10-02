import React from "react";
import { CheckCircle2, ShieldCheck, Wallet, ArrowDownRight, Award } from "lucide-react";
import { shortDate } from "@/lib/api";

export interface PayoutLedgerItem {
  task_id: string;
  title: string;
  payout_kes: number;
  approved_at?: string | null;
}

export interface PayoutCardProps {
  totalEarnedKes: number;
  tasksCompleted: number;
  trustScore: number;
  tasksDisputed?: number;
  phone?: string;
  ledger?: PayoutLedgerItem[];
  className?: string;
}

export function PayoutCard({
  totalEarnedKes,
  tasksCompleted,
  trustScore,
  tasksDisputed = 0,
  phone,
  ledger = [],
  className = "",
}: PayoutCardProps) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 ${className}`}
    >
      <div className="flex flex-col gap-4 border-b border-black/5 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Supporter Earnings
          </span>
          <h2 className="text-xl font-black text-neutral-900 dark:text-neutral-100">
            Campaign Work Ledger
          </h2>
          {phone && (
            <p className="mt-0.5 text-xs text-neutral-500">
              Disbursed to: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{phone}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
            <CheckCircle2 size={14} />
            M-Pesa B2C Active
          </span>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Earned */}
        <div className="rounded-2xl border border-black/5 bg-neutral-50 p-4 dark:border-white/5 dark:bg-neutral-800/50">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Total Earned</span>
            <Wallet size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            KSh {totalEarnedKes.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Gross paid out to your phone
          </p>
        </div>

        {/* Tasks Completed */}
        <div className="rounded-2xl border border-black/5 bg-neutral-50 p-4 dark:border-white/5 dark:bg-neutral-800/50">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Completed Tasks</span>
            <Award size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900 dark:text-neutral-100">
            {tasksCompleted}
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            {tasksDisputed > 0 ? `${tasksDisputed} disputed` : "100% completion rate"}
          </p>
        </div>

        {/* Trust Score */}
        <div className="rounded-2xl border border-black/5 bg-neutral-50 p-4 dark:border-white/5 dark:bg-neutral-800/50">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Trust Score</span>
            <ShieldCheck size={18} className="text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900 dark:text-neutral-100">
            {trustScore}
            <span className="text-xs font-medium text-neutral-400"> / 100</span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Higher score grants first access to top tasks
          </p>
        </div>
      </div>

      {/* Payout History Ledger */}
      {ledger.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">
            Recent Task Payouts
          </h3>
          <div className="divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/10 bg-white dark:divide-white/5 dark:border-white/10 dark:bg-neutral-900">
            {ledger.map((item, idx) => (
              <div
                key={`${item.task_id}-${idx}`}
                className="flex items-center justify-between p-3.5 text-xs transition hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {shortDate(item.approved_at)}
                  </p>
                </div>

                <div className="ml-4 flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <ArrowDownRight size={14} />
                  <span>+KSh {item.payout_kes.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
