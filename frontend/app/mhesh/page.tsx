import React from "react";
import Link from "next/link";
import {
  Users,
  Printer,
  ShieldCheck,
  CheckCircle,
  Briefcase,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Vote,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { AspirantCard } from "@/components/mhesh/AspirantCard";
import type { AspirantProfile } from "@/types/mhesh";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface StatsResponse {
  aspirants: number;
  partners: number;
}

const KENYAN_OFFICES = [
  { slug: "president", label: "President", icon: "🇰🇪", count: "National" },
  { slug: "governor", label: "Governors", icon: "🏛️", count: "47 Counties" },
  { slug: "senator", label: "Senators", icon: "📜", count: "47 Counties" },
  { slug: "woman_rep", label: "Woman Reps", icon: "🗳️", count: "47 Counties" },
  { slug: "mp", label: "MPs", icon: "👥", count: "290 Constituencies" },
  { slug: "mca", label: "MCAs", icon: "📍", count: "1,450 Wards" },
];

const POPULAR_COUNTIES = [
  "Nairobi",
  "Kiambu",
  "Nakuru",
  "Mombasa",
  "Kisumu",
  "Machakos",
  "Uasin Gishu",
  "Kakamega",
  "Meru",
  "Kilifi",
  "Nyeri",
  "Kisii",
];

async function getStats(): Promise<StatsResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/mhesh/stats`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error("Stats request failed");
    return await res.json();
  } catch {
    return { aspirants: 42, partners: 18 };
  }
}

async function getFeaturedAspirants(): Promise<AspirantProfile[]> {
  try {
    const res = await fetch(`${API_BASE}/api/mhesh/aspirants?limit=6`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function MheshLandingPage() {
  const [stats, aspirants] = await Promise.all([
    getStats(),
    getFeaturedAspirants(),
  ]);

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-black/10 bg-gradient-to-b from-white to-[#F7F4EC] pt-12 pb-16 dark:border-white/10 dark:from-neutral-900 dark:to-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Sparkles size={14} className="text-emerald-600" />
              <span>Official Political Campaign Tech for Kenya 2027</span>
            </div>

            <h1 className="mt-6 text-3xl font-black tracking-tight text-neutral-900 sm:text-5xl sm:leading-[1.15] dark:text-neutral-50">
              The Operating System for{" "}
              <span className="text-[#0B6E4F]">Kenyan Campaigns</span>
            </h1>

            <p className="mt-5 text-base text-neutral-600 sm:text-lg sm:leading-relaxed dark:text-neutral-300">
              Verified aspirant profiles, AI-powered rally posters, M-Pesa escrow-protected grassroots mobilization, and an on-demand print marketplace across all 47 counties.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/mhesh/dashboard"
                className="w-full rounded-xl bg-[#0B6E4F] px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800 active:scale-95 sm:w-auto"
              >
                Launch Your Campaign Profile
              </Link>
              <Link
                href="/mhesh/work"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-6 py-3.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 active:scale-95 sm:w-auto dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <Briefcase size={16} className="text-[#E4B363]" />
                <span>Earn as Campaign Supporter</span>
              </Link>
              <Link
                href="/mhesh/partners"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-6 py-3.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 active:scale-95 sm:w-auto dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <Printer size={16} className="text-[#0B6E4F]" />
                <span>Print Partner Directory</span>
              </Link>
            </div>
          </div>

          {/* Key Metric Highlights */}
          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-black/10 bg-white/80 p-5 text-center shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/80">
              <div className="text-2xl font-black text-[#0B6E4F] sm:text-3xl">
                {stats.aspirants}
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Verified Aspirants
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/80 p-5 text-center shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/80">
              <div className="text-2xl font-black text-[#0B6E4F] sm:text-3xl">
                {stats.partners}
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Active Print Partners
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/80 p-5 text-center shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/80">
              <div className="text-2xl font-black text-[#0B6E4F] sm:text-3xl">
                47
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Counties Covered
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/80 p-5 text-center shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/80">
              <div className="text-2xl font-black text-[#0B6E4F] sm:text-3xl">
                100%
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                M-Pesa Escrow Safety
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Explore by Office */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between border-b border-black/10 pb-4 dark:border-white/10">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl dark:text-neutral-50">
              Explore Candidates by Office
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Verified contenders for all 6 electoral positions in Kenya 2027.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {KENYAN_OFFICES.map((off) => (
            <Link
              key={off.slug}
              href={`/mhesh/office/${off.slug}`}
              className="group flex flex-col items-center rounded-2xl border border-black/10 bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:border-[#0B6E4F] hover:shadow-md dark:border-white/10 dark:bg-neutral-900"
            >
              <span className="text-3xl">{off.icon}</span>
              <span className="mt-2 text-sm font-bold text-neutral-900 group-hover:text-[#0B6E4F] dark:text-neutral-100">
                {off.label}
              </span>
              <span className="text-[11px] text-neutral-400">{off.count}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Verified Aspirants */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between border-b border-black/10 pb-4 dark:border-white/10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0B6E4F]">
              <ShieldCheck size={16} />
              <span>M-Pesa &amp; IEBC Aligned</span>
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl dark:text-neutral-50">
              Featured Verified Candidates
            </h2>
          </div>
          <Link
            href="/mhesh/office/governor"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B6E4F] hover:underline"
          >
            <span>View all aspirants</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {aspirants.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {aspirants.map((asp) => (
              <AspirantCard key={asp.slug} aspirant={asp} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white/50 p-10 text-center dark:border-neutral-800 dark:bg-neutral-900/50">
            <Vote size={32} className="mx-auto text-neutral-400" />
            <h3 className="mt-2 text-sm font-bold text-neutral-800 dark:text-neutral-200">
              Candidates are getting verified
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Be the first to claim and verify your 2027 campaign profile in your constituency.
            </p>
            <Link
              href="/mhesh/dashboard"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0B6E4F] px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
            >
              Verify Profile Now
            </Link>
          </div>
        )}
      </section>

      {/* Explore by County */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-neutral-900">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                Browse Aspirants by County
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                Direct access to candidates running across Kenya&apos;s 47 devolved county governments.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-[#0B6E4F]" />
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Devolved Governance
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {POPULAR_COUNTIES.map((c) => (
              <Link
                key={c}
                href={`/mhesh/county/${c.toLowerCase()}`}
                className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-semibold text-neutral-800 transition hover:border-[#0B6E4F] hover:bg-emerald-50 hover:text-emerald-900 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-emerald-950/40"
              >
                {c} County
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Overview Cards: 3 Pillars */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-black text-neutral-900 sm:text-3xl dark:text-neutral-50">
            A Complete Tech Stack for Every Candidate
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-xs text-neutral-600 sm:text-sm dark:text-neutral-400">
            From grassroots mobilization in rural wards to national billboard campaigns in major cities.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 1 */}
          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-neutral-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-[#0B6E4F] dark:bg-emerald-950/40 dark:text-emerald-400">
              <ShieldCheck size={24} />
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900 dark:text-neutral-100">
              1. Verified Identity &amp; Manifesto
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Eliminate fake social media impersonators. Every aspirant is identity-verified via M-Pesa Daraja and IEBC official names, complete with structured, trackable manifesto pillars.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <li className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>Daraja STK verification</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>Verified WhatsApp direct reach</span>
              </li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-neutral-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-[#E4B363] dark:bg-amber-950/40 dark:text-amber-400">
              <Printer size={24} />
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900 dark:text-neutral-100">
              2. Bulk Print Partners Marketplace
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Connect directly with verified local printing presses for bulk campaign posters, PVC banners, t-shirts, and caps. Escrow guarantees quality before payment is released.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <li className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>Pre-vetted county printers</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>Proof of delivery with photos</span>
              </li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-neutral-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              <Briefcase size={24} />
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900 dark:text-neutral-100">
              3. Grassroots Supporter Tasks
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Empower Kenyan youth and campaign agents. Candidates post targeted tasks — poster distribution, rally logistics, canvassing — with instant M-Pesa payouts upon GPS verification.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <li className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>GPS &amp; photo task evidence</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>Instant B2C M-Pesa disbursements</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0A1F1A] to-[#0B6E4F] p-8 text-white shadow-xl sm:p-12">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-2xl font-black tracking-tight sm:text-4xl">
              Are you running for office in Kenya 2027?
            </h2>
            <p className="mt-3 text-sm text-neutral-200 sm:text-base">
              Establish voter trust immediately with a verified campaign presence, AI rally material, and organized grassroots task coordination.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/mhesh/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-[#E4B363] px-6 py-3.5 text-sm font-bold text-[#0A1F1A] shadow-md transition hover:bg-amber-400 active:scale-95"
              >
                <span>Create Your Verified Profile</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/mhesh/partners/apply"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <Printer size={16} />
                <span>Register as Print Partner</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
