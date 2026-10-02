import React from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Tag,
  CheckCircle,
  Clock,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { shortDate } from "@/lib/api";
import type { MheshTaskItem, TaskCategory, TaskStatus } from "@/types/mhesh";

export interface TaskCardProps {
  task?: MheshTaskItem;
  id?: string;
  title?: string;
  category?: TaskCategory | string;
  county?: string;
  ward?: string | null;
  rewardKes?: number;
  deadline?: string | null;
  status?: TaskStatus | string;
  href?: string;
  className?: string;
}

export function formatCategory(cat?: string): string {
  if (!cat) return "";
  switch (cat) {
    case "print_merchandise":
      return "Print Merchandise";
    case "distribute_posters":
      return "Distribute Posters";
    case "distribute_merch":
      return "Distribute Merch";
    case "event_staffing":
      return "Event Staffing";
    case "digital_amplification":
      return "Digital Amplification";
    case "canvassing":
      return "Canvassing / Door-to-Door";
    default:
      return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function TaskStatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const norm = status.toLowerCase();
  switch (norm) {
    case "published":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400 ${className}`}
        >
          <Clock size={12} />
          Open for Applications
        </span>
      );
    case "assigned":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-400/10 dark:text-blue-400 ${className}`}
        >
          <Clock size={12} />
          In Progress
        </span>
      );
    case "completed":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-400 ${className}`}
        >
          <FileCheck size={12} />
          Evidence Submitted
        </span>
      );
    case "approved":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400 ${className}`}
        >
          <CheckCircle size={12} />
          Completed & Paid
        </span>
      );
    case "disputed":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-400/10 dark:text-red-400 ${className}`}
        >
          <AlertCircle size={12} />
          Disputed
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 ${className}`}
        >
          {status}
        </span>
      );
  }
}

export function TaskCard({
  task,
  id: propId,
  title: propTitle,
  category: propCategory,
  county: propCounty,
  ward: propWard,
  rewardKes: propRewardKes,
  deadline: propDeadline,
  status: propStatus,
  href: propHref,
  className = "",
}: TaskCardProps) {
  const taskId = task?.id ?? propId ?? "";
  const title = task?.title ?? propTitle ?? "Campaign Task";
  const category = task?.category ?? propCategory ?? "";
  const county = task?.county ?? propCounty ?? "";
  const ward = task?.ward ?? propWard;
  const rewardKes = task?.reward_kes ?? propRewardKes ?? 0;
  const deadline = task?.deadline ?? propDeadline;
  const status = task?.status ?? propStatus ?? "published";

  const targetHref = propHref ?? `/mhesh/tasks/${taskId}`;
  const locationText = [ward ? `${ward} Ward` : null, `${county} County`].filter(Boolean).join(", ");

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md dark:border-white/10 dark:bg-neutral-900 dark:hover:border-white/20 ${className}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            <Tag size={11} className="text-emerald-600 dark:text-emerald-400" />
            {formatCategory(category)}
          </span>

          <TaskStatusBadge status={status} />
        </div>

        <h3 className="mt-3 text-base font-bold text-neutral-900 transition group-hover:text-emerald-600 dark:text-neutral-100 dark:group-hover:text-emerald-400">
          <Link href={targetHref} className="focus:outline-none">
            <span className="absolute inset-0" aria-hidden="true" />
            {title}
          </Link>
        </h3>

        {locationText && (
          <div className="mt-2 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            <MapPin size={13} className="flex-shrink-0 text-neutral-400" />
            <span className="truncate">{locationText}</span>
          </div>
        )}

        {deadline && (
          <div className="mt-1 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            <Calendar size={13} className="flex-shrink-0 text-neutral-400" />
            <span>Deadline: {shortDate(deadline)}</span>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-3 dark:border-white/5">
        <div>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            Supporter Reward
          </span>
          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
            KSh {rewardKes.toLocaleString()}
          </span>
        </div>

        <span className="inline-flex items-center text-xs font-semibold text-neutral-600 group-hover:text-emerald-600 dark:text-neutral-300 dark:group-hover:text-emerald-400">
          View details &rarr;
        </span>
      </div>
    </div>
  );
}
