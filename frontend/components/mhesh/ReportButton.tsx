"use client";

import React, { useState } from "react";
import { Flag, AlertTriangle, Check, Loader2, X } from "lucide-react";
import { api, errorMessage } from "@/lib/api";

export type ReportKind = "profile" | "image" | "task" | "partner";

export interface ReportButtonProps {
  subjectId: string;
  kind?: ReportKind;
  title?: string;
  className?: string;
}

export function ReportButton({
  subjectId,
  kind = "profile",
  title = "Report Profile",
  className = "",
}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 10) {
      setError("Please describe the issue in at least 10 characters.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/mhesh/reports", {
        kind,
        subject_id: subjectId,
        reason: trimmedReason,
        reporter_contact: contact.trim() || undefined,
      });
      setSubmitted(true);
      setReason("");
      setContact("");
    } catch (err) {
      setError(errorMessage(err, "Failed to submit report. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setSubmitted(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-red-600 transition dark:text-neutral-400 dark:hover:text-red-400 ${className}`}
      >
        <Flag size={14} />
        <span>{title}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900 dark:border dark:border-neutral-800">
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle size={20} />
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Submit a Report
              </h3>
            </div>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              Help preserve platform integrity. Reports are investigated by Mhesh compliance moderators according to IEBC and ODPC guidelines.
            </p>

            {submitted ? (
              <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <div className="flex items-start gap-2.5">
                  <Check size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                  <p className="text-sm font-medium">
                    Thank you. Your report has been submitted and queued for immediate review.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-4 w-full rounded-lg bg-neutral-800 py-2 text-xs font-semibold text-white hover:bg-neutral-900 dark:bg-neutral-700"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="report-reason" className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Reason for report *
                  </label>
                  <textarea
                    id="report-reason"
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe inaccurate info, impersonation, hate speech, or violations..."
                    required
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 p-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                  <p className="mt-1 text-[11px] text-neutral-400">
                    Minimum 10 characters.
                  </p>
                </div>

                <div>
                  <label htmlFor="report-contact" className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Your contact (optional)
                  </label>
                  <input
                    id="report-contact"
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Phone or email in case moderators need clarification"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-1/3 rounded-xl border border-neutral-200 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white shadow hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
                    <span>Submit Report</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
