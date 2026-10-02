"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Briefcase,
  MapPin,
  Calendar,
  Coins,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  Send,
  Sparkles,
  ArrowLeft,
  Vote,
} from "lucide-react";
import { api, errorMessage, shortDate, isUnauthorized } from "@/lib/api";
import { EvidenceUploader } from "@/components/mhesh/EvidenceUploader";

interface TaskDetail {
  id: string;
  aspirant_id: string;
  title: string;
  description: string;
  category: string;
  county: string;
  ward?: string | null;
  reward_kes: number;
  escrow_fee_kes: number;
  status: string;
  deadline?: string | null;
  assigned_supporter_id?: string | null;
  evidence_urls: string[];
  verification_score?: number | null;
  verification_flags?: {
    reason?: string;
    note?: string;
    lat?: number | null;
    lng?: number | null;
  };
  created_at: string;
}

interface SupporterMe {
  id: string;
  display_name: string;
  verified_mpesa: boolean;
  trust_score: number;
}

export default function SupporterTaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [supporter, setSupporter] = useState<SupporterMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [taskRes, suppRes] = await Promise.all([
        api.get<TaskDetail>(`/api/mhesh/tasks/${taskId}`),
        api.get<SupporterMe>("/api/mhesh/supporters/me").catch(() => null),
      ]);
      setTask(taskRes.data);
      if (suppRes?.data) setSupporter(suppRes.data);
    } catch (err) {
      if (!isUnauthorized(err)) {
        setErrorMsg(errorMessage(err, "Failed to load task details"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) loadData();
  }, [taskId]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supporter) {
      setErrorMsg("Please register as a supporter before applying for tasks.");
      return;
    }

    setApplying(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post(`/api/mhesh/tasks/${taskId}/apply`, {
        message: applyMessage.trim() || undefined,
      });
      setSuccessMsg("Application submitted! The campaign manager will review and assign you.");
      setApplyMessage("");
    } catch (err) {
      setErrorMsg(errorMessage(err, "Application submission failed"));
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (errorMsg && !task) {
    return (
      <div className="mx-auto mt-16 max-w-lg rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-600" />
        <h3 className="mt-2 text-base font-bold">Task Unavailable</h3>
        <p className="mt-1 text-xs">{errorMsg}</p>
        <Link
          href="/mhesh/work"
          className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline"
        >
          <ArrowLeft className="h-3 w-3" /> Back to open work
        </Link>
      </div>
    );
  }

  if (!task) return null;

  const isAssignedToMe = Boolean(supporter && task.assigned_supporter_id === supporter.id);
  const isCompleted = ["completed", "approved"].includes(task.status);

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
            <span>Back to Campaign Tasks</span>
          </Link>

          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-stone-800 font-mono">
            {task.status.replace(/_/g, " ")}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-8 space-y-6">
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

        {/* Task Details Card */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-900">
              {task.category.replace(/_/g, " ")}
            </span>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-stone-900 font-serif">
              {task.title}
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-4 border-y border-stone-100 py-4 sm:grid-cols-4 text-xs">
            <div>
              <span className="text-stone-400 block font-semibold">LOCATION</span>
              <span className="font-bold text-stone-800">
                {task.county}
                {task.ward ? `, ${task.ward}` : ""}
              </span>
            </div>

            <div>
              <span className="text-stone-400 block font-semibold">TAKE-HOME REWARD</span>
              <span className="font-extrabold text-emerald-800 font-mono text-base">
                KSh {task.reward_kes.toLocaleString()}
              </span>
            </div>

            <div>
              <span className="text-stone-400 block font-semibold">DEADLINE</span>
              <span className="font-semibold text-stone-700">
                {task.deadline ? shortDate(task.deadline) : "Open"}
              </span>
            </div>

            <div>
              <span className="text-stone-400 block font-semibold">ESCROW STATUS</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Funded (Protected)
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              Deliverables & Requirements
            </h3>
            <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
              {task.description}
            </p>
          </div>
        </div>

        {/* CONDITION 1: Task Assigned to Me -> Show Evidence Uploader */}
        {isAssignedToMe && task.status === "assigned" && (
          <div>
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-100/70 p-3 text-xs font-semibold text-emerald-900">
              <Sparkles className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>
                You have been assigned to this task! Complete the deliverables and submit proof below.
              </span>
            </div>
            <EvidenceUploader
              taskId={task.id}
              onSuccess={() => {
                setSuccessMsg(
                  "Evidence submitted! The campaign manager will review and approve payout."
                );
                loadData();
              }}
            />
          </div>
        )}

        {/* CONDITION 2: Evidence Submitted -> Show Confirmation / Review Details */}
        {isCompleted && (
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                <span>Field Evidence Submitted</span>
              </h3>
              {task.status === "approved" ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-900">
                  Approved & Paid to M-Pesa
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900">
                  Awaiting Aspirant Sign-off
                </span>
              )}
            </div>

            {task.verification_score !== null && task.verification_score !== undefined && (
              <p className="text-xs font-medium text-emerald-800">
                AI Authenticity Score: <strong>{Math.round(task.verification_score * 100)}%</strong>
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {task.evidence_urls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-lg border border-stone-200"
                >
                  <img src={url} alt={`Evidence ${i + 1}`} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 text-white text-xs font-semibold">
                    <ExternalLink className="h-4 w-4 mr-1" /> View
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* CONDITION 3: Not Assigned Yet -> Show Apply Form */}
        {!isAssignedToMe && task.status === "published" && (
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-stone-900">Apply for this Campaign Task</h3>
            <p className="mt-1 text-xs text-stone-500">
              Submit your interest to the campaign manager. You will receive an SMS if selected.
            </p>

            <form onSubmit={handleApply} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Note to Candidate (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. I live near the market and have a team of 4 youth ready to distribute immediately..."
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 p-3 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={applying}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
              >
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>Submit Task Application</span>
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
