"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Coins,
  ShieldCheck,
  Calendar,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Phone,
  ArrowRight,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api";

const CATEGORIES = [
  { value: "distribute_posters", label: "Distribute & Mount Posters" },
  { value: "distribute_merch", label: "Distribute T-Shirts & Caps" },
  { value: "event_staffing", label: "Rally & Event Marshaling" },
  { value: "canvassing", label: "Grassroots Door-to-Door Canvassing" },
  { value: "digital_amplification", label: "Social Media / WhatsApp Group Mobilization" },
  { value: "print_merchandise", label: "Local Merchandise Printing" },
];

const COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", "Embu", "Garissa", "Homa Bay",
  "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii",
  "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
  "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi",
  "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita Taveta", "Tana River",
  "Tharaka Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
];

export default function NewTaskPage() {
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("distribute_posters");
  const [county, setCounty] = useState("Nairobi");
  const [ward, setWard] = useState("");
  const [rewardKes, setRewardKes] = useState(1500);
  const [deadline, setDeadline] = useState("");

  // Flow State: 'create' | 'fund' | 'publish' | 'done'
  const [step, setStep] = useState<"create" | "fund" | "publish" | "done">("create");
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [escrowFeeKes, setEscrowFeeKes] = useState<number>(0);
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pollingEscrow, setPollingEscrow] = useState(false);

  // 1. Submit form to create Draft task
  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.post("/api/mhesh/tasks", {
        title: title.trim(),
        description: description.trim(),
        category,
        county,
        ward: ward.trim() || null,
        reward_kes: Number(rewardKes),
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });

      const task = res.data;
      setCreatedTaskId(task.id);
      setEscrowFeeKes(task.escrow_fee_kes || Math.round(Number(rewardKes) * 0.05));
      setStep("fund");
      setSuccessMsg("Task draft created! Please fund the escrow via M-Pesa to activate it.");
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to create task draft"));
    } finally {
      setLoading(false);
    }
  };

  // 2. Fund task via M-Pesa STK push
  const handleFundEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdTaskId || !phone) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post(`/api/mhesh/tasks/${createdTaskId}/fund`, { phone });
      setSuccessMsg("M-Pesa STK push sent! Enter your PIN on your handset to deposit escrow funds.");
      setPollingEscrow(true);

      // Check escrow status every 4 seconds
      const interval = setInterval(async () => {
        try {
          const escRes = await api.get(`/api/mhesh/tasks/${createdTaskId}/escrow`);
          if (escRes.data?.status === "funded") {
            clearInterval(interval);
            setPollingEscrow(false);
            setStep("publish");
            setSuccessMsg("Escrow successfully funded! You can now publish the task to supporters.");
          }
        } catch {
          // keep checking
        }
      }, 4000);

      // Timeout after 60s
      setTimeout(() => {
        clearInterval(interval);
        setPollingEscrow(false);
      }, 60000);
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to initiate M-Pesa funding"));
      setPollingEscrow(false);
    } finally {
      setLoading(false);
    }
  };

  // 3. Publish task to open applications
  const handlePublish = async () => {
    if (!createdTaskId) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      await api.post(`/api/mhesh/tasks/${createdTaskId}/publish`);
      setStep("done");
      setSuccessMsg("Task published live! Supporters can now apply.");
      setTimeout(() => {
        router.push(`/mhesh/dashboard/tasks/${createdTaskId}`);
      }, 1500);
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to publish task"));
    } finally {
      setLoading(false);
    }
  };

  const totalDeposit = Number(rewardKes) + escrowFeeKes;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <Link
          href="/mhesh/dashboard/tasks"
          className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1 mb-2"
        >
          ← Back to Tasks
        </Link>
        <h1 className="text-2xl font-black tracking-tight text-stone-900 font-serif">
          Create & Fund Campaign Task
        </h1>
        <p className="mt-1 text-xs text-stone-500">
          Set up deliverables, location boundaries, and escrow reward. Escrow is only released when you approve verified field evidence.
        </p>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-4 text-xs font-semibold">
        <span
          className={`flex items-center gap-1.5 ${
            step === "create" ? "text-emerald-800 font-bold" : "text-stone-400"
          }`}
        >
          1. Task Details
        </span>
        <span className="text-stone-300">→</span>
        <span
          className={`flex items-center gap-1.5 ${
            step === "fund" ? "text-emerald-800 font-bold" : "text-stone-400"
          }`}
        >
          2. M-Pesa Escrow Funding
        </span>
        <span className="text-stone-300">→</span>
        <span
          className={`flex items-center gap-1.5 ${
            step === "publish" || step === "done" ? "text-emerald-800 font-bold" : "text-stone-400"
          }`}
        >
          3. Publish to Ground
        </span>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-xs font-semibold text-rose-800 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* STEP 1: Task Creation Form */}
      {step === "create" && (
        <form onSubmit={handleCreateDraft} className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
              Task Title *
            </label>
            <input
              type="text"
              required
              minLength={5}
              placeholder="e.g. Mount 200 campaign posters along Outering Road bus stops"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                Task Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                County *
              </label>
              <select
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              >
                {COUNTIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                Ward / Specific Locality
              </label>
              <input
                type="text"
                placeholder="e.g. Roysambu / Githurai 44"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                Completion Deadline (Optional)
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
              Task Description & Evidence Instructions *
            </label>
            <p className="mt-0.5 text-xs text-stone-500">
              Detail exact requirements, locations to cover, and how supporters must take evidence photos (e.g. geotagged wide shot + close up).
            </p>
            <textarea
              required
              minLength={20}
              rows={4}
              placeholder="Explain deliverables clearly. E.g. Distribute 300 flyers at the main market between 9am and 2pm. Upload at least 3 geotagged photos showing distribution to traders."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 w-full rounded-lg border border-stone-300 p-3 text-xs focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Reward & Escrow info */}
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Supporter Reward (KSh) *
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min={100}
                    max={1000000}
                    required
                    value={rewardKes}
                    onChange={(e) => setRewardKes(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-lg border border-stone-300 pl-8 pr-3 py-2 text-sm font-bold font-mono focus:border-emerald-600 focus:outline-none"
                  />
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-stone-400">KSh</span>
                </div>
              </div>

              <div className="flex flex-col justify-center text-xs text-stone-600 space-y-1">
                <div className="flex justify-between">
                  <span>Task Escrow Fee (5%):</span>
                  <span className="font-mono">KSh {Math.round(rewardKes * 0.05)}</span>
                </div>
                <div className="flex justify-between font-bold text-stone-900 border-t border-stone-200 pt-1">
                  <span>Total Escrow Deposit:</span>
                  <span className="font-mono text-emerald-800">KSh {Math.round(rewardKes * 1.05)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Draft Task...</span>
                </>
              ) : (
                <>
                  <span>Save Draft & Proceed to Funding</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: Escrow Funding via M-Pesa STK */}
      {step === "fund" && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-2.5 text-emerald-800">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Deposit Escrow into Protected Campaign Vault
              </h3>
              <p className="text-xs text-stone-500">
                Supporters only apply to funded tasks. Funds stay in escrow until you approve the verified work.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 text-xs space-y-2">
            <div className="flex justify-between text-stone-700">
              <span>Task:</span>
              <span className="font-semibold text-stone-900">{title}</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>Reward Payout:</span>
              <span className="font-mono">KSh {rewardKes.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>Escrow Fee:</span>
              <span className="font-mono">KSh {escrowFeeKes.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-950 border-t border-emerald-200 pt-2 text-sm">
              <span>Total STK Push Amount:</span>
              <span className="font-mono">KSh {totalDeposit.toLocaleString()}</span>
            </div>
          </div>

          <form onSubmit={handleFundEscrow} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                M-Pesa Mobile Number *
              </label>
              <div className="relative mt-1">
                <input
                  type="tel"
                  required
                  placeholder="07XXXXXXXX or 254..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 pl-9 pr-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
                <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || pollingEscrow || !phone}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading || pollingEscrow ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Waiting for M-Pesa PIN confirmation...</span>
                </>
              ) : (
                <>
                  <span>Deposit KSh {totalDeposit.toLocaleString()} via M-Pesa STK</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 3: Publish Button */}
      {step === "publish" && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">Escrow Funded Successfully!</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Your campaign escrow deposit is secure. Click below to publish this task to local youth supporters across {county}.
          </p>
          <button
            onClick={handlePublish}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-8 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
            <span>Publish Task to Ground</span>
          </button>
        </div>
      )}
    </div>
  );
}
