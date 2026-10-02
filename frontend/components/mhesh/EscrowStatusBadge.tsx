import React from "react";
import {
  Clock,
  CheckCircle2,
  Lock,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import type { EscrowStatus } from "@/types/mhesh";

export interface EscrowStatusBadgeProps {
  status: EscrowStatus | string;
  size?: "sm" | "md";
  className?: string;
}

export function EscrowStatusBadge({
  status,
  size = "md",
  className = "",
}: EscrowStatusBadgeProps) {
  const normStatus = status.toLowerCase();

  const sizeClasses = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
  };

  const iconSizes = {
    sm: 11,
    md: 13,
  };

  switch (normStatus) {
    case "funded":
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/30 ${sizeClasses[size]} ${className}`}
          title="Escrow is locked in Daraja till supporter completes task"
        >
          <Lock size={iconSizes[size]} className="text-emerald-600 dark:text-emerald-400" />
          Escrow Funded
        </span>
      );

    case "released":
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400 dark:border-blue-400/30 ${sizeClasses[size]} ${className}`}
          title="Funds disbursed to supporter via M-Pesa B2C"
        >
          <CheckCircle2 size={iconSizes[size]} className="text-blue-600 dark:text-blue-400" />
          Released
        </span>
      );

    case "refunded":
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 ${sizeClasses[size]} ${className}`}
          title="Escrow returned to candidate campaign account"
        >
          <RotateCcw size={iconSizes[size]} />
          Refunded
        </span>
      );

    case "disputed":
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/30 ${sizeClasses[size]} ${className}`}
          title="Task or order is under dispute resolution"
        >
          <AlertTriangle size={iconSizes[size]} className="text-amber-600 dark:text-amber-400" />
          Disputed
        </span>
      );

    case "pending":
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 ${sizeClasses[size]} ${className}`}
          title="Waiting for campaign STK funding"
        >
          <Clock size={iconSizes[size]} className="text-neutral-500" />
          Pending Escrow
        </span>
      );
  }
}
