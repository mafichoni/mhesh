"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Eye,
  Share2,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Wand2,
  PhoneCall,
  Loader2,
  Clock,
  Layers,
} from "lucide-react";
import { api, errorMessage, isUnauthorized } from "@/lib/api";

interface AspirantData {
  id: string;
  slug: string;
  display_name: string;
  official_name?: string | null;
  office: string;
  party?: string | null;
  county: string;
  constituency?: string | null;
  ward?: string | null;
  photo_url?: string | null;
  verified_mpesa: boolean;
  tier: string;
  trust_score: number;
  follower_count: number;
  share_count: number;
  view_count: number;
  whatsapp_click_count: number;
  lora_key?: string | null;
  manifesto: Array<{ title: string; description: string }>;
  achievements: Array<{ title: string; description: string }>;
}

interface UsageData {
  used_today: number;
  daily_limit: number;
}

interface TaskData {
  id: string;
  status: string;
  reward_kes: number;
}

const COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", "Embu", "Garissa", "Homa Bay",
  "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii",
  "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
  "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi",
  "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita Taveta", "Tana River",
  "Tharaka Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
];

const OFFICES = [
  { value: "president", label: "President of Kenya" },
  { value: "governor", label: "County Governor" },
  { value: "senator", label: "Senator" },
  { value: "woman_rep", label: "Woman Representative" },
  { value: "mp", label: "Member of Parliament (MP)" },
  { value: "mca", label: "Member of County Assembly (MCA)" },
];

export default function AspirantOverviewPage() {
  const [profile, setProfile] = useState<AspirantData | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [usage, setUsage] = useState<UsageData>({ used_today: 0, daily_limit: 20 });
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Setup form state
  const [setupDisplayName, setSetupDisplayName] = useState("");
  const [setupOfficialName, setSetupOfficialName] = useState("");
  const [setupTitlePrefix, setSetupTitlePrefix] = useState("Hon.");
  const [setupOffice, setSetupOffice] = useState("mp");
  const [setupCounty, setSetupCounty] = useState("Nairobi");
  const [setupConstituency, setSetupConstituency] = useState("");
  const [setupWard, setSetupWard] = useState("");
  const [setupParty, setSetupParty] = useState("Independent");
  const [setupWhatsapp, setSetupWhatsapp] = useState("");
  const [submittingSetup, setSubmittingSetup] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // M-Pesa STK verification state
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        let prof: AspirantData | null = null;
        try {
          const profRes = await api.get<AspirantData>("/api/mhesh/aspirants/me");
          prof = profRes.data;
        } catch (err: unknown) {
          const errorObj = err as { response?: { status?: number } };
          if (errorObj?.response?.status === 404) {
            setNeedsSetup(true);
            try {
              const u = await api.get<{ full_name?: string }>("/api/auth/me");
              if (u.data.full_name) {
                setSetupDisplayName(u.data.full_name);
                setSetupOfficialName(u.data.full_name);
              }
            } catch {
              // ignore
            }
          } else {
            throw err;
          }
        }

        const [usageRes, tasksRes] = await Promise.all([
          api.get<UsageData>("/api/mhesh/studio/usage").catch(() => ({ data: { used_today: 0, daily_limit: 20 } })),
          api.get<TaskData[]>("/api/mhesh/tasks").catch(() => ({ data: [] })),
        ]);

        if (prof) setProfile(prof);
        setUsage(usageRes.data);
        setTasks(tasksRes.data);
      } catch (err) {
        if (!isUnauthorized(err)) {
          setError(errorMessage(err, "Failed to load dashboard overview"));
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupDisplayName.trim()) {
      setSetupError("Candidate name is required");
      return;
    }

    setSubmittingSetup(true);
    setSetupError(null);

    try {
      const payload = {
        display_name: setupDisplayName.trim(),
        official_name: setupOfficialName.trim() || null,
        title_prefix: setupTitlePrefix.trim() || null,
        party: setupParty.trim() || null,
        office: setupOffice,
        county: setupCounty,
        constituency: setupConstituency.trim() || null,
        ward: setupWard.trim() || null,
        whatsapp_public: setupWhatsapp.trim() || null,
      };

      const res = await api.post<AspirantData>("/api/mhesh/aspirants/me", payload);
      setProfile(res.data);
      setNeedsSetup(false);
    } catch (err) {
      setSetupError(errorMessage(err, "Failed to create campaign profile"));
    } finally {
      setSubmittingSetup(false);
    }
  };

  const calculateCompleteness = (p: AspirantData) => {
    let score = 0;
    if (p.photo_url) score += 20;
    if (p.party && p.official_name) score += 20;
    if (p.manifesto && p.manifesto.length > 0) score += 20;
    if (p.achievements && p.achievements.length > 0) score += 20;
    if (p.verified_mpesa) score += 20;
    return score;
  };

  const handleVerifyMpesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyPhone) return;

    setVerifying(true);
    setVerifyError(null);
    setVerifySuccess(null);

    try {
      await api.post("/api/mhesh/aspirants/me/verify-mpesa", { phone: verifyPhone });
      setVerifySuccess("STK Push sent to your phone! Please enter your M-Pesa PIN (KSh 1 verification fee).");
    } catch (err) {
      setVerifyError(errorMessage(err, "Could not initiate M-Pesa verification"));
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-md">
            <Sparkles size={28} />
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-stone-900 font-serif">
            Set Up Your 2027 Campaign Profile
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Welcome to Mhesh! Enter your political candidacy details to activate your official campaign dashboard and public page.
          </p>
        </div>

        {setupError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
            <span>{setupError}</span>
          </div>
        )}

        <form onSubmit={handleCreateProfile} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-stone-700">Prefix</label>
              <input
                type="text"
                value={setupTitlePrefix}
                onChange={(e) => setSetupTitlePrefix(e.target.value)}
                placeholder="Hon."
                className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-stone-700">Candidate Campaign Name *</label>
              <input
                type="text"
                value={setupDisplayName}
                onChange={(e) => setSetupDisplayName(e.target.value)}
                placeholder="e.g. Sarah Wanjiku Mwangi"
                required
                className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-stone-700">Official Name (ID / Passport)</label>
              <input
                type="text"
                value={setupOfficialName}
                onChange={(e) => setSetupOfficialName(e.target.value)}
                placeholder="e.g. Sarah Wanjiku Mwangi"
                className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700">Political Party</label>
              <input
                type="text"
                value={setupParty}
                onChange={(e) => setSetupParty(e.target.value)}
                placeholder="e.g. Independent, UDA, ODM"
                className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-stone-700">Office Sought *</label>
              <select
                value={setupOffice}
                onChange={(e) => setSetupOffice(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm focus:border-emerald-700 focus:outline-none"
              >
                {OFFICES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700">County *</label>
              <select
                value={setupCounty}
                onChange={(e) => setSetupCounty(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm focus:border-emerald-700 focus:outline-none"
              >
                {COUNTIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-stone-700">Constituency (if MP / MCA)</label>
              <input
                type="text"
                value={setupConstituency}
                onChange={(e) => setSetupConstituency(e.target.value)}
                placeholder="e.g. Westlands, Dagoretti North"
                className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700">Ward (if MCA)</label>
              <input
                type="text"
                value={setupWard}
                onChange={(e) => setSetupWard(e.target.value)}
                placeholder="e.g. Parklands, Kilimani"
                className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700">Public WhatsApp Campaign Number</label>
            <input
              type="tel"
              value={setupWhatsapp}
              onChange={(e) => setSetupWhatsapp(e.target.value)}
              placeholder="e.g. 0712345678"
              className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submittingSetup}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {submittingSetup ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Activating Campaign Profile...
              </span>
            ) : (
              <>
                <span>Launch My Campaign Profile</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
        <h3 className="mt-2 text-base font-semibold">Unable to load campaign overview</h3>
        <p className="mt-1 text-sm">{error || "Please check your network connection and reload."}</p>
      </div>
    );
  }

  const completeness = calculateCompleteness(profile);
  const activeTasksCount = tasks.filter((t) => ["published", "assigned"].includes(t.status)).length;
  const completedTasksCount = tasks.filter((t) => ["completed", "approved"].includes(t.status)).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl font-serif">
            Campaign Command Center
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Welcome back, {profile.display_name}. Here is an overview of your 2027 voter reach and field operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/mhesh/dashboard/studio"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            <Wand2 className="h-4 w-4" />
            <span>AI Studio</span>
          </Link>
          <Link
            href="/mhesh/dashboard/tasks/new"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50"
          >
            <CheckSquare className="h-4 w-4 text-emerald-700" />
            <span>Create Task</span>
          </Link>
        </div>
      </div>

      {/* Unverified M-Pesa Alert Banner */}
      {!profile.verified_mpesa && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 p-2 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Verify Your Profile via M-Pesa
                </h3>
                <p className="mt-1 text-xs text-amber-700 max-w-xl">
                  Unverified profiles cannot appear on the public directory or fund escrow tasks.
                  A nominal KSh 1 M-Pesa verification verifies your legal voter ownership and unlocks trust badges.
                </p>
              </div>
            </div>

            <form onSubmit={handleVerifyMpesa} className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="tel"
                placeholder="07XXXXXXXX or 254..."
                value={verifyPhone}
                onChange={(e) => setVerifyPhone(e.target.value)}
                className="w-full sm:w-48 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
              <button
                type="submit"
                disabled={verifying}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Sending PIN...</span>
                  </>
                ) : (
                  <>
                    <PhoneCall className="h-3.5 w-3.5" />
                    <span>Verify (KSh 1)</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {verifySuccess && (
            <p className="mt-3 text-xs font-semibold text-emerald-800 bg-emerald-100/70 p-2 rounded">
              {verifySuccess}
            </p>
          )}
          {verifyError && (
            <p className="mt-3 text-xs font-semibold text-rose-800 bg-rose-100/70 p-2 rounded">
              {verifyError}
            </p>
          )}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Followers */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Supporters / Followers</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-stone-900">
              {profile.follower_count.toLocaleString()}
            </span>
            <span className="text-xs text-stone-400">opted-in</span>
          </div>
          <Link
            href="/mhesh/dashboard/followers"
            className="mt-3 flex items-center text-xs font-medium text-emerald-700 hover:underline"
          >
            <span>View supporters</span>
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>

        {/* Profile Views */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Public Profile Views</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-stone-900">
              {profile.view_count.toLocaleString()}
            </span>
            <span className="text-xs text-stone-400">impressions</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-stone-500">
            <Share2 className="mr-1 h-3 w-3 text-stone-400" />
            <span>{profile.share_count} total link shares</span>
          </div>
        </div>

        {/* Tasks Summary */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Ground Tasks</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-stone-900">
              {tasks.length}
            </span>
            <span className="text-xs text-stone-400">total created</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
            <span className="text-emerald-700 font-medium">{activeTasksCount} active</span>
            <span className="text-stone-400">•</span>
            <span className="text-stone-600">{completedTasksCount} completed</span>
          </div>
        </div>

        {/* AI Generations */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">AI Generations Today</span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-700">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-stone-900">
              {usage.used_today} / {usage.daily_limit}
            </span>
            <span className="text-xs text-stone-400">quota</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-stone-500">
            <Clock className="mr-1 h-3 w-3 text-stone-400" />
            <span>Resets at midnight UTC</span>
          </div>
        </div>
      </div>

      {/* Profile Completeness & LoRA Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Completeness Card */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900">
              Profile Completeness Score
            </h3>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-900 font-mono">
              {completeness}%
            </span>
          </div>

          <div className="mt-4 h-2.5 w-full rounded-full bg-stone-100">
            <div
              className="h-2.5 rounded-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${completeness}%` }}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2.5 text-xs">
              {profile.photo_url ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-stone-300" />
              )}
              <span className={profile.photo_url ? "text-stone-800 font-medium" : "text-stone-400"}>
                Campaign Portrait Uploaded
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              {profile.party && profile.official_name ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-stone-300" />
              )}
              <span
                className={
                  profile.party && profile.official_name
                    ? "text-stone-800 font-medium"
                    : "text-stone-400"
                }
              >
                Official Name & Political Party
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              {profile.manifesto && profile.manifesto.length > 0 ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-stone-300" />
              )}
              <span
                className={
                  profile.manifesto && profile.manifesto.length > 0
                    ? "text-stone-800 font-medium"
                    : "text-stone-400"
                }
              >
                Manifesto Key Pillars Added
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              {profile.verified_mpesa ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-stone-300" />
              )}
              <span
                className={profile.verified_mpesa ? "text-stone-800 font-medium" : "text-stone-400"}
              >
                M-Pesa Verification Completed
              </span>
            </div>
          </div>

          <div className="mt-6 border-t border-stone-100 pt-4">
            <Link
              href="/mhesh/dashboard/profile"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
            >
              <span>Update candidate profile and manifesto</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* AI LoRA Model Status Card */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-emerald-700" />
              <h3 className="text-base font-bold text-stone-900">Custom LoRA</h3>
            </div>
            {profile.lora_key ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                Trained
              </span>
            ) : (
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600">
                Untrained
              </span>
            )}
          </div>

          <p className="mt-3 text-xs text-stone-600 leading-relaxed">
            {profile.lora_key
              ? "Your personalized campaign LoRA model is active. Generate realistic campaign photos across Kenyan rallies, markets, and townhalls."
              : "Upload 5 to 10 clear photos to train a custom face model for producing bespoke AI posters and billboard visuals."}
          </p>

          <div className="mt-6">
            <Link
              href={profile.lora_key ? "/mhesh/dashboard/studio" : "/mhesh/dashboard/studio/train"}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-800"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{profile.lora_key ? "Open AI Studio" : "Train Face Model"}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
