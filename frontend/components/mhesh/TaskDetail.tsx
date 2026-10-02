"use client";

import React, { useState } from "react";
import {
  Calendar,
  CheckCircle,
  FileText,
  MapPin,
  ShieldCheck,
  Tag,
  AlertTriangle,
  Lock,
  ExternalLink,
  X,
} from "lucide-react";
import { EscrowStatusBadge } from "./EscrowStatusBadge";
import { formatCategory, TaskStatusBadge } from "./TaskCard";
import { shortDate } from "@/lib/api";
import type { EscrowStatus, MheshTaskItem } from "@/types/mhesh";

export interface TaskDetailProps {
  task: MheshTaskItem;
  escrowStatus?: EscrowStatus | string;
  role?: "supporter" | "aspirant" | "public";
  onApply?: () => void;
  onUploadEvidence?: () => void;
  onApprove?: () => void;
  onDispute?: () => void;
  className?: string;
}

export function TaskDetail({
  task,
  escrowStatus = "funded",
  role = "public",
  onApply,
  onUploadEvidence,
  onApprove,
  onDispute,
  className = "",
}: TaskDetailProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const {
    title,
    description,
    category,
    county,
    ward,
    reward_kes,
    escrow_fee_kes,
    deadline,
    status,
    evidence_urls = [],
    verification_score,
    verification_flags = {},
    created_at,
  } = task;

  const locationText = [ward ? `${ward} Ward` : null, `${county} County`].filter(Boolean).join(", ");
  const isCompleted = status === "completed";
  const isApproved = status === "approved";
  const isDisputed = status === "disputed";
  const isPublished = status === "published";
  const isAssigned = status === "assigned";

  return (
    <div
      className={`space-y-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-neutral-900 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-black/5 pb-6 sm:flex-row sm:items-start sm:justify-between dark:border-white/5">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              <Tag size={12} className="text-emerald-600 dark:text-emerald-400" />
              {formatCategory(category)}
            </span>
            <TaskStatusBadge status={status} />
            <EscrowStatusBadge status={escrowStatus} size="sm" />
          </div>

          <h1 className="text-2xl font-black text-neutral-900 sm:text-3xl dark:text-neutral-50">
            {title}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            {locationText && (
              <div className="flex items-center gap-1">
                <MapPin size={13} className="text-emerald-600" />
                <span>{locationText}</span>
              </div>
            )}
            {deadline && (
              <div className="flex items-center gap-1">
                <Calendar size={13} />
                <span>Deadline: {shortDate(deadline)}</span>
              </div>
            )}
            {created_at && (
              <span>Posted {shortDate(created_at)}</span>
            )}
          </div>
        </div>

        {/* Reward Box */}
        <div className="flex-shrink-0 rounded-2xl bg-emerald-50/70 p-4 text-center sm:text-right dark:bg-emerald-950/30">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Task Reward
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            KSh {reward_kes.toLocaleString()}
          </div>
          {escrow_fee_kes ? (
            <p className="mt-0.5 text-[10px] text-neutral-500">
              Escrow fee: KSh {escrow_fee_kes.toLocaleString()} (Paid by Aspirant)
            </p>
          ) : null}
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-neutral-100">
          <FileText size={16} className="text-emerald-600" />
          Task Instructions & Scope of Work
        </h3>
        <div className="rounded-2xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap dark:bg-neutral-800/50 dark:text-neutral-300">
          {description}
        </div>
      </div>

      {/* Escrow Protection Box */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/30 p-4 dark:bg-emerald-950/20">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Lock size={16} />
          </div>
          <div className="text-xs">
            <h4 className="font-bold text-emerald-900 dark:text-emerald-300">
              Daraja M-Pesa Escrow Guarantee
            </h4>
            <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">
              Candidate funds are locked in Daraja escrow before tasks are assigned. Supporter receives automatic B2C payout as soon as work evidence is approved.
            </p>
          </div>
        </div>
      </div>

      {/* Evidence Section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-neutral-100">
            <ShieldCheck size={16} className="text-emerald-600" />
            Submitted Proof & Evidence ({evidence_urls.length})
          </h3>
          {typeof verification_score === "number" && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
              Verification Match: {Math.round(verification_score * 100)}%
            </span>
          )}
        </div>

        {evidence_urls.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-xs text-neutral-500 dark:border-neutral-700">
            No work evidence photos submitted yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {evidence_urls.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                onClick={() => setSelectedPhoto(url)}
                className="group relative aspect-video cursor-pointer overflow-hidden rounded-xl border border-black/10 bg-neutral-100 dark:border-white/10 dark:bg-neutral-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Evidence ${idx + 1}`}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <ExternalLink size={18} className="text-white" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Verification Flags */}
        {Object.keys(verification_flags).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {Object.entries(verification_flags).map(([key, val]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {val ? (
                  <CheckCircle size={12} className="text-emerald-600" />
                ) : (
                  <AlertTriangle size={12} className="text-amber-500" />
                )}
                {key.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Role-Specific Actions */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-black/5 pt-5 dark:border-white/5">
        {role === "supporter" && isPublished && onApply && (
          <button
            type="button"
            onClick={onApply}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
          >
            Apply for this Task
          </button>
        )}

        {role === "supporter" && isAssigned && onUploadEvidence && (
          <button
            type="button"
            onClick={onUploadEvidence}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
          >
            Submit Work Evidence
          </button>
        )}

        {role === "aspirant" && isCompleted && (
          <>
            {onDispute && (
              <button
                type="button"
                onClick={onDispute}
                className="rounded-xl border border-red-300 px-4 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Dispute Evidence
              </button>
            )}
            {onApprove && (
              <button
                type="button"
                onClick={onApprove}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
              >
                Approve & Release Escrow
              </button>
            )}
          </>
        )}

        {isApproved && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={16} />
            Funds released to supporter via Daraja B2C
          </div>
        )}

        {isDisputed && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
            <AlertTriangle size={16} />
            Task is in dispute mediation
          </div>
        )}
      </div>

      {/* Lightbox for Evidence Photo */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-neutral-900">
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white transition hover:bg-black/80"
            >
              <X size={18} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto}
              alt="Evidence Full View"
              className="max-h-[85vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
