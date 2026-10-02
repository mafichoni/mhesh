"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  MapPin,
  Coins,
  ShieldCheck,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  ArrowRight,
  Wallet,
  Clock,
  Vote,
} from "lucide-react";
import { api, errorMessage, getToken, isUnauthorized } from "@/lib/api";
import { TaskCard, TaskItem } from "@/components/mhesh/TaskCard";

const COUNTIES = [
  "All Counties", "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", "Embu", "Garissa", "Homa Bay",
  "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii",
  "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
  "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi",
  "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita Taveta", "Tana River",
  "Tharaka Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
];

interface SupporterProfile {
  id: string;
  display_name: string;
  county?: string | null;
  ward?: string | null;
  verified_mpesa: boolean;
  trust_score: number;
  tasks_completed: number;
  total_earned_kes: number;
}

export default function SupporterWorkPage() {
  const [profile, setProfile] = useState<SupporterProfile | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<TaskItem[]>([]);
  const [activeTab, setActiveTab] = useState<"available" | "assigned">("available");
  const [selectedCounty, setSelectedCounty] = useState("All Counties");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Registration modal state
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCounty, setRegCounty] = useState("Nairobi");
  const [regWard, setRegWard] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const loadData = async (countyName?: string) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Check supporter profile
      let userProfile: SupporterProfile | null = null;
      try {
        const suppRes = await api.get<SupporterProfile>("/api/mhesh/supporters/me");
        userProfile = suppRes.data;
        setProfile(userProfile);
        setIsRegistered(true);
      } catch {
        setIsRegistered(false);
      }

      // Fetch open tasks
      const cQuery = countyName && countyName !== "All Counties" ? `?county=${encodeURIComponent(countyName)}` : "";
      const [tasksRes, assignedRes] = await Promise.all([
        api.get<TaskItem[]>(`/api/mhesh/supporters/me/tasks${cQuery}`).catch(() => ({ data: [] })),
        userProfile ? api.get<TaskItem[]>("/api/mhesh/supporters/me/assigned").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);

      setTasks(tasksRes.data || []);
      setAssignedTasks(assignedRes.data || []);
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to load campaign work"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedCounty);
  }, [selectedCounty]);

  const handleRegisterSupporter = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setRegError(null);

    try {
      const res = await api.post("/api/mhesh/supporters/me", {
        display_name: regName.trim(),
        phone: regPhone.trim(),
        county: regCounty,
        ward: regWard.trim() || null,
      });
      setProfile(res.data);
      setIsRegistered(true);
      await loadData(selectedCounty);
    } catch (err) {
      setRegError(errorMessage(err, "Registration failed. Check phone format."));
    } finally {
      setRegistering(false);
    }
  };

  const displayedTasks = activeTab === "available" ? tasks : assignedTasks;
  const filtered = displayedTasks.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.county.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.ward && t.ward.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/mhesh" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-sm">
              <Vote className="h-5 w-5" />
            </div>
            <div>
              <span className="font-serif text-lg font-black tracking-tight text-emerald-950">
                MHESH WORK
              </span>
              <span className="hidden sm:inline-block ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                Escrow Protected Field Work
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {profile && (
              <Link
                href="/mhesh/work/earnings"
                className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs font-semibold text-stone-800 transition hover:bg-stone-100"
              >
                <Wallet className="h-3.5 w-3.5 text-emerald-700" />
                <span>Earned: KSh {profile.total_earned_kes.toLocaleString()}</span>
              </Link>
            )}

            {!profile && isRegistered === false && (
              <a
                href="#register-box"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Register as Supporter</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        {/* Hero banner */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-stone-900 p-8 text-white shadow-md">
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
            Kenya 2027 Grassroots Work Network
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl font-serif">
            Earn M-Pesa Payouts for Verified Campaign Work
          </h1>
          <p className="mt-2 text-xs text-stone-300 max-w-2xl leading-relaxed">
            Support your chosen aspirants on the ground. Deliver posters, marshal rallies, distribute merch, and upload geotagged proof. All rewards are held in escrow and paid directly to your M-Pesa.
          </p>
        </div>

        {/* Not Registered Supporter Prompt */}
        {isRegistered === false && (
          <div id="register-box" className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-emerald-700" />
                  <span>Register as a Verified Campaign Supporter</span>
                </h3>
                <p className="mt-1 text-xs text-emerald-800 max-w-xl">
                  Register in seconds to start applying for tasks in your constituency. Receive instant SMS job notifications and escrow-backed payments.
                </p>
              </div>
            </div>

            <form onSubmit={handleRegisterSupporter} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dennis Ochieng"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                  M-Pesa Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="07XXXXXXXX or 254..."
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                  County *
                </label>
                <select
                  value={regCounty}
                  onChange={(e) => setRegCounty(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
                >
                  {COUNTIES.filter((c) => c !== "All Counties").map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                  Ward / Estate
                </label>
                <input
                  type="text"
                  placeholder="e.g. Roysambu"
                  value={regWard}
                  onChange={(e) => setRegWard(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={registering}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-900 disabled:opacity-50"
                >
                  {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>Join Network</span>
                </button>
              </div>
            </form>

            {regError && (
              <p className="mt-2 text-xs font-semibold text-rose-700">{regError}</p>
            )}
          </div>
        )}

        {/* Tab and Filter bar */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
            <button
              onClick={() => setActiveTab("available")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                activeTab === "available"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "bg-white text-stone-600 hover:bg-stone-100"
              }`}
            >
              Available Ground Tasks ({tasks.length})
            </button>

            {profile && (
              <button
                onClick={() => setActiveTab("assigned")}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                  activeTab === "assigned"
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "bg-white text-stone-600 hover:bg-stone-100"
                }`}
              >
                My Active Tasks ({assignedTasks.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* County Selector */}
            <select
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold focus:border-emerald-600 focus:outline-none"
            >
              {COUNTIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-44 sm:w-56 rounded-lg border border-stone-300 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tasks Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
            <Briefcase className="h-10 w-10 text-stone-300" />
            <h3 className="mt-3 text-base font-semibold text-stone-900">No tasks found</h3>
            <p className="mt-1 text-xs text-stone-500 max-w-sm">
              {activeTab === "assigned"
                ? "You do not have any tasks currently assigned to you."
                : `There are no open tasks currently available in ${selectedCounty}. Check back shortly or select 'All Counties'.`}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                role="supporter"
                href={`/mhesh/work/${task.id}`}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
