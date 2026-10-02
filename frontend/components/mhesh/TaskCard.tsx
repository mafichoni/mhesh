import React from "react";
import Link from "next/link";
import { MapPin, Coins, Calendar, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import { shortDate } from "@/lib/api";

export interface TaskItem {
  id: string;
  aspirant_id: string;
  title: string;
  description: string;
  category: string;
  county: string;
  ward?: string | null;
  reward_kes: number;
  escrow_fee_kes?: number;
  status: string;
  deadline?: string | null;
  assigned_supporter_id?: string | null;
  evidence_urls?: string[];
  verification_score?: number | null;
  created_at: string;
}

interface TaskCardProps {
  task: TaskItem;
  href: string;
  role?: "aspirant" | "supporter";
}

const CATEGORY_LABELS: Record<string, string> = {
  print_merchandise: "Print Merchandise",
  distribute_posters: "Distribute Posters",
  distribute_merch: "Distribute Merch",
  event_staffing: "Event Staffing",
  digital_amplification: "Digital Amplification",
  canvassing: "Grassroots Canvassing",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-stone-100", text: "text-stone-700", label: "Draft" },
  funded: { bg: "bg-blue-50", text: "text-blue-700", label: "Funded (Escrow)" },
  published: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Open for Applications" },
  assigned: { bg: "bg-amber-50", text: "text-amber-700", label: "In Progress" },
  completed: { bg: "bg-purple-50", text: "text-purple-700", label: "Evidence Submitted" },
  approved: { bg: "bg-emerald-100", text: "text-emerald-900", label: "Approved & Paid" },
  disputed: { bg: "bg-rose-50", text: "text-rose-700", label: "Disputed" },
  cancelled: { bg: "bg-stone-200", text: "text-stone-600", label: "Cancelled" },
};

export function TaskCard({ task, href, role = "supporter" }: TaskCardProps) {
  const statusInfo = STATUS_COLORS[task.status] || {
    bg: "bg-stone-100",
    text: "text-stone-700",
    label: task.status,
  };

  const categoryName = CATEGORY_LABELS[task.category] || task.category.replace(/_/g, " ");

  return (
    <div className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-emerald-500/50 hover:shadow-md">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-700">
            {categoryName}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}
          >
            {statusInfo.label}
          </span>
        </div>

        <h3 className="mt-3 text-lg font-bold text-stone-900 leading-snug">
          <Link href={href} className="hover:text-emerald-700">
            {task.title}
          </Link>
        </h3>

        <p className="mt-2 text-sm text-stone-600 line-clamp-2 leading-relaxed">
          {task.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-stone-500">
          <span className="flex items-center gap-1 font-medium text-stone-700">
            <MapPin className="h-3.5 w-3.5 text-stone-400" />
            {task.county}
            {task.ward ? `, ${task.ward}` : ""}
          </span>

          {task.deadline && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-stone-400" />
              Due: {shortDate(task.deadline)}
            </span>
          )}

          {task.verification_score !== null && task.verification_score !== undefined && (
            <span className="flex items-center gap-1 font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              AI Score: {Math.round(task.verification_score * 100)}%
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block">
            {role === "supporter" ? "Take-Home Reward" : "Escrow Escort"}
          </span>
          <span className="flex items-center gap-1 text-lg font-extrabold text-emerald-800">
            <Coins className="h-4 w-4 text-emerald-600" />
            KSh {task.reward_kes.toLocaleString()}
          </span>
        </div>

        <Link
          href={href}
          className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
        >
          <span>{role === "aspirant" ? "Manage Task" : "View Details"}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
