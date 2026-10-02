"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CheckSquare,
  Users,
  MapPin,
  Calendar,
  Coins,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { api, errorMessage, shortDate, isUnauthorized } from "@/lib/api";

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
  verification_flags: {
    reason?: string;
    note?: string;
    lat?: number | null;
    lng?: number | null;
    dispute_reason?: string;
  };
  created_at: string;
  completed_at?: string | null;
  approved_at?: string | null;
}

interface ApplicationItem {
  id: string;
  supporter_id: string;
  display_name: string;
  trust_score: number;
  tasks_completed: number;
  verified_mpesa: boolean;
  message?: string | null;
  created_at: string;
}

export default function TaskManagementPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dispute modal state
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const loadTask = async () => {
    try {
      setLoading(true);
      const [tRes, appRes] = await Promise.all([
        api.get<TaskDetail>(`/api/mhesh/tasks/${taskId}`),
        api.get<ApplicationItem[]>(`/api/mhesh/tasks/${taskId}/applications`).catch(() => ({ data: [] })),
      ]);
      setTask(tRes.data);
      setApplications(appRes.data || []);
    } catch (err) {
      if (!isUnauthorized(err)) {
        setErrorMsg(errorMessage(err, "Failed to load task details"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) loadTask();
  }, [taskId]);

  const handleAssign = async (supporterId: string) => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post(`/api/mhesh/tasks/${taskId}/assign`, { supporter_id: supporterId });
      setSuccessMsg("Supporter assigned! An SMS notification has been sent with task instructions.");
      await loadTask();
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to assign supporter"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm("Approve task evidence? This will immediately release the M-Pesa payout to the supporter.")) {
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post(`/api/mhesh/tasks/${taskId}/approve`);
      setSuccessMsg(`Task approved! Payout of KSh ${res.data.payout_kes} sent via M-Pesa B2C.`);
      await loadTask();
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to approve task"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim()) return;

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post(`/api/mhesh/tasks/${taskId}/dispute`, { reason: disputeReason.trim() });
      setSuccessMsg("Task flagged as disputed. Escrow is safely frozen pending ops review.");
      setDisputeOpen(false);
      await loadTask();
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to flag dispute"));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (errorMsg && !task) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
        <h3 className="mt-2 text-base font-semibold">Task Not Found</h3>
        <p className="mt-1 text-sm">{errorMsg}</p>
        <Link
          href="/mhesh/dashboard/tasks"
          className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline"
        >
          ← Return to tasks list
        </Link>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/mhesh/dashboard/tasks"
          className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1 mb-2"
        >
          ← Back to Tasks
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-black tracking-tight text-stone-900 font-serif">
            {task.title}
          </h1>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-emerald-900 font-mono">
            {task.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-xs font-semibold text-rose-800 border border-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Task Overview Card */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
          {task.description}
        </p>

        <div className="grid grid-cols-2 gap-4 border-t border-stone-100 pt-4 sm:grid-cols-4 text-xs">
          <div>
            <span className="text-stone-400 block font-semibold">LOCATION</span>
            <span className="font-bold text-stone-800">
              {task.county}
              {task.ward ? `, ${task.ward}` : ""}
            </span>
          </div>

          <div>
            <span className="text-stone-400 block font-semibold">ESCROW REWARD</span>
            <span className="font-extrabold text-emerald-800 font-mono">
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
            <span className="text-stone-400 block font-semibold">CREATED</span>
            <span className="font-semibold text-stone-700">{shortDate(task.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Review Submitted Evidence (when COMPLETED or APPROVED or DISPUTED) */}
      {task.evidence_urls && task.evidence_urls.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              <span>Submitted Field Evidence & AI Verification</span>
            </h3>

            {task.verification_score !== null && task.verification_score !== undefined && (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                <span>AI Confidence:</span>
                <span className="font-mono text-sm">{Math.round(task.verification_score * 100)}%</span>
              </div>
            )}
          </div>

          {/* AI flags/reason */}
          {task.verification_flags?.reason && (
            <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-600">
              <span className="font-bold text-stone-800">AI Verification Analysis: </span>
              {task.verification_flags.reason}
            </div>
          )}

          {task.verification_flags?.note && (
            <div className="rounded-lg bg-emerald-50/50 border border-emerald-100 p-3 text-xs text-emerald-950">
              <span className="font-bold">Supporter Field Notes: </span>
              {task.verification_flags.note}
            </div>
          )}

          {/* Geolocation Tag */}
          {task.verification_flags?.lat && task.verification_flags?.lng && (
            <div className="text-xs text-stone-500 flex items-center gap-1 font-mono">
              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                Coordinates: {task.verification_flags.lat.toFixed(5)}, {task.verification_flags.lng.toFixed(5)}
              </span>
            </div>
          )}

          {/* Photos Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {task.evidence_urls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="group relative aspect-square overflow-hidden rounded-lg border border-stone-200 bg-stone-100 hover:border-emerald-600"
              >
                <img src={url} alt={`Evidence ${i + 1}`} className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100 text-white text-xs font-semibold">
                  <ExternalLink className="h-4 w-4 mr-1" /> View Full
                </div>
              </a>
            ))}
          </div>

          {/* Action Row for COMPLETED task: Approve or Dispute */}
          {task.status === "completed" && (
            <div className="flex flex-col gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setDisputeOpen(true)}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Dispute Evidence</span>
              </button>

              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing B2C Escrow Release...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve & Release M-Pesa Payout</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Applicants Section (when task is PUBLISHED) */}
      {task.status === "published" && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-700" />
              <span>Supporter Applicants ({applications.length})</span>
            </h3>
            <span className="text-xs text-stone-400">Ranked by verified trust score</span>
          </div>

          {applications.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-200 p-8 text-center text-xs text-stone-400">
              No supporter applications received yet. Supporters in {task.county} can apply from the Mhesh Work portal.
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col gap-3 rounded-lg border border-stone-200 p-4 transition hover:bg-stone-50/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm">{app.display_name}</span>
                      {app.verified_mpesa && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          M-Pesa Verified
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-stone-500">
                      <span>Trust Score: <strong className="text-emerald-800">{app.trust_score}</strong></span>
                      <span>•</span>
                      <span>{app.tasks_completed} tasks completed</span>
                      <span>•</span>
                      <span>Applied {shortDate(app.created_at)}</span>
                    </div>
                    {app.message && (
                      <p className="mt-2 text-xs text-stone-600 bg-white p-2 rounded border border-stone-200">
                        &quot;{app.message}&quot;
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAssign(app.supporter_id)}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <span>Assign Task</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dispute Modal */}
      {disputeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleDispute}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center gap-2 text-rose-700 font-bold text-base">
              <ShieldAlert className="h-5 w-5" />
              <span>Dispute Task Evidence</span>
            </div>
            <p className="text-xs text-stone-600">
              Provide specific reasons why this evidence is insufficient or inaccurate (e.g. wrong location, poster count not met).
            </p>
            <textarea
              required
              minLength={10}
              rows={4}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Explain the issue in detail..."
              className="w-full rounded-lg border border-stone-300 p-3 text-xs focus:border-rose-600 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDisputeOpen(false)}
                className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
              >
                {actionLoading ? "Filing Dispute..." : "Submit Dispute"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
