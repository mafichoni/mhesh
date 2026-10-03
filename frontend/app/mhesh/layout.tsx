import React from "react";
import Link from "next/link";
import { Vote, Printer, Briefcase, UserCircle2, Shield } from "lucide-react";
import { ComplianceBanner } from "@/components/mhesh/ComplianceBanner";

export const metadata = {
  title: "Mhesh — Kenya 2027 Political Campaign Platform",
  description:
    "Verified Kenyan political campaign profiles, AI studio campaign materials, escrow-backed grassroots tasks, and bulk print partner marketplace.",
};

export default function MheshLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F7F4EC] text-[#0A1F1A]">
      {/* Top Compliance Bar */}
      <div className="border-b border-black/5 bg-[#0A1F1A] px-4 py-1.5 text-center text-[11px] font-medium text-[#F7F4EC]/80">
        <span className="inline-flex items-center gap-1.5">
          <Shield size={12} className="text-[#E4B363]" />
          <span>IEBC &amp; ODPC Data Compliance Certified • Kenya Election 2027 Official Campaign Tools</span>
        </span>
      </div>

      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/mhesh" className="flex items-center gap-2.5 transition hover:opacity-90">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B6E4F] text-white shadow-sm">
                <Vote size={20} />
              </span>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-[#0A1F1A] dark:text-neutral-50">
                  Mhesh<span className="text-[#0B6E4F]">.ke</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Kenya 2027
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex md:items-center md:gap-5">
              <Link
                href="/mhesh"
                className="text-xs font-semibold text-neutral-700 transition hover:text-[#0B6E4F] dark:text-neutral-300 dark:hover:text-emerald-400"
              >
                Aspirants
              </Link>
              <Link
                href="/mhesh/partners"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 transition hover:text-[#0B6E4F] dark:text-neutral-300 dark:hover:text-emerald-400"
              >
                <Printer size={14} className="text-[#0B6E4F]" />
                Print Partners
              </Link>
              <Link
                href="/mhesh/work"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 transition hover:text-[#0B6E4F] dark:text-neutral-300 dark:hover:text-emerald-400"
              >
                <Briefcase size={14} className="text-[#E4B363]" />
                Find Work
              </Link>
            </nav>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/mhesh/login"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <UserCircle2 size={15} />
              <span>Login</span>
            </Link>

            <Link
              href="/mhesh/register"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B6E4F] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 active:scale-95"
            >
              <span>Get Started</span>
            </Link>
          </div>
        </div>

        {/* Mobile quick links */}
        <div className="flex border-t border-black/5 px-4 py-2 text-xs md:hidden dark:border-white/5">
          <div className="flex w-full justify-around">
            <Link href="/mhesh" className="font-semibold text-neutral-700 dark:text-neutral-300">
              Aspirants
            </Link>
            <Link href="/mhesh/partners" className="font-semibold text-neutral-700 dark:text-neutral-300">
              Print Partners
            </Link>
            <Link href="/mhesh/work" className="font-semibold text-neutral-700 dark:text-neutral-300">
              Find Work
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Compliance Banner & Footer */}
      <ComplianceBanner />
    </div>
  );
}
