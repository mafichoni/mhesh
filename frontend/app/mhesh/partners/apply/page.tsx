import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Printer, ShieldCheck, Banknote, Clock, CheckCircle } from "lucide-react";
import { PartnerApplicationForm } from "@/components/mhesh/PartnerApplicationForm";

export const metadata: Metadata = {
  title: "Apply as a Print Partner — Mhesh Kenya 2027",
  description:
    "Join Kenya's largest verified campaign print production network. Receive escrow-guaranteed bulk orders for election posters, banners, and t-shirts.",
};

export default function PartnerApplyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <div>
        <Link
          href="/mhesh/partners"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-[#0B6E4F] dark:text-neutral-400 dark:hover:text-emerald-400"
        >
          <ChevronLeft size={16} />
          <span>Back to Print Partners Directory</span>
        </Link>
      </div>

      {/* Hero Header */}
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-10 dark:border-white/10 dark:bg-neutral-900">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#0B6E4F] dark:bg-emerald-950/40 dark:text-emerald-300">
            <Printer size={14} />
            <span>Kenya 2027 Campaign Production Network</span>
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
            Apply as a Verified Print Partner
          </h1>
          <p className="mt-2 text-xs text-neutral-600 sm:text-sm dark:text-neutral-400">
            Partner with candidates running for Governor, MP, Senator, and MCA in your county. We protect your business with M-Pesa escrow guarantees on every order.
          </p>
        </div>

        {/* 3 Benefits Callouts */}
        <div className="mt-8 grid grid-cols-1 gap-4 border-t border-black/5 pt-6 sm:grid-cols-3 dark:border-white/5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0B6E4F] dark:bg-emerald-950/40 dark:text-emerald-300">
              <Banknote size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                100% Escrow Funded Upfront
              </h4>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                No bad campaign debts. Funds are locked before you press print.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Daraja M-Pesa Payouts
              </h4>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                Instant B2C disbursement to your phone as soon as delivery is verified.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <Clock size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Fast KSh 1 STK Verification
              </h4>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                Verify your business identity in 30 seconds to begin taking orders.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Application Form Component */}
      <div className="mt-8">
        <PartnerApplicationForm />
      </div>
    </div>
  );
}
