import React from "react";
import {
  CheckCircle,
  Clock,
  Package,
  Truck,
  AlertTriangle,
  ExternalLink,
  Lock,
} from "lucide-react";
import { shortDate } from "@/lib/api";
import type { OrderStatus, PrintOrderItem } from "@/types/mhesh";

export interface OrderCardProps {
  order?: PrintOrderItem;
  id?: string;
  designUrl?: string;
  quantity?: number;
  category?: string;
  unitPriceKes?: number;
  totalKes?: number;
  status?: OrderStatus | string;
  partnerName?: string;
  createdAt?: string;
  role?: "aspirant" | "partner" | "admin";
  onFund?: () => void;
  onStartProduction?: () => void;
  onMarkDelivered?: () => void;
  onApprove?: () => void;
  onDispute?: () => void;
  className?: string;
}

export function OrderStatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const norm = status.toLowerCase();

  switch (norm) {
    case "pending":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 ${className}`}
        >
          <Clock size={12} />
          Pending Escrow
        </span>
      );
    case "funded":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-400/10 dark:text-blue-400 ${className}`}
        >
          <Lock size={12} />
          Escrow Funded
        </span>
      );
    case "in_production":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-400 ${className}`}
        >
          <Package size={12} />
          In Production
        </span>
      );
    case "shipped":
    case "delivered":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-400/10 dark:text-purple-400 ${className}`}
        >
          <Truck size={12} />
          {norm === "delivered" ? "Delivered" : "In Transit"}
        </span>
      );
    case "approved":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400 ${className}`}
        >
          <CheckCircle size={12} />
          Approved & Paid
        </span>
      );
    case "disputed":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-400/10 dark:text-red-400 ${className}`}
        >
          <AlertTriangle size={12} />
          Disputed
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 ${className}`}
        >
          {status}
        </span>
      );
  }
}

export function OrderCard({
  order,
  id: propId,
  designUrl: propDesignUrl,
  quantity: propQuantity,
  category: propCategory,
  unitPriceKes: propUnitPriceKes,
  totalKes: propTotalKes,
  status: propStatus,
  partnerName: propPartnerName,
  createdAt: propCreatedAt,
  role = "aspirant",
  onFund,
  onStartProduction,
  onMarkDelivered,
  onApprove,
  onDispute,
  className = "",
}: OrderCardProps) {
  const designUrl = order?.design_url ?? propDesignUrl ?? "";
  const quantity = order?.quantity ?? propQuantity ?? 0;
  const category = order?.category ?? propCategory ?? "Merchandise";
  const unitPriceKes = order?.unit_price_kes ?? propUnitPriceKes ?? 0;
  const totalKes = order?.total_kes ?? propTotalKes ?? 0;
  const status = order?.status ?? propStatus ?? "pending";
  const partnerName = order?.partner_name ?? propPartnerName;
  const createdAt = order?.created_at ?? propCreatedAt;

  const isPending = status === "pending";
  const isFunded = status === "funded";
  const isInProduction = status === "in_production";
  const isDelivered = status === "delivered" || status === "shipped";
  const isApproved = status === "approved";

  return (
    <div
      className={`flex flex-col justify-between overflow-hidden rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-neutral-900 ${className}`}
    >
      <div>
        {/* Top Header & Status */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {category.replace(/_/g, " ")}
            </span>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {quantity.toLocaleString()} units
            </h3>
            {partnerName && (
              <p className="mt-0.5 text-xs text-neutral-500">
                Partner: <span className="font-medium text-neutral-700 dark:text-neutral-300">{partnerName}</span>
              </p>
            )}
          </div>

          <OrderStatusBadge status={status} />
        </div>

        {/* Thumbnail & Pricing Breakdown */}
        <div className="mt-4 flex items-center gap-4 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-black/10 bg-neutral-200 dark:border-white/10">
            {designUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={designUrl}
                alt="Order Design"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-400">
                <Package size={24} />
              </div>
            )}
            {designUrl && (
              <a
                href={designUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100"
                title="View design full size"
              >
                <ExternalLink size={16} className="text-white" />
              </a>
            )}
          </div>

          <div className="flex-1 text-xs">
            <div className="flex justify-between text-neutral-500">
              <span>Unit Price:</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                KSh {unitPriceKes.toLocaleString()}
              </span>
            </div>
            <div className="mt-1 flex justify-between border-t border-black/5 pt-1 text-sm font-black text-neutral-900 dark:border-white/5 dark:text-neutral-100">
              <span>Total:</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                KSh {totalKes.toLocaleString()}
              </span>
            </div>
            {createdAt && (
              <div className="mt-1 text-[10px] text-neutral-400">
                Ordered: {shortDate(createdAt)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-black/5 pt-3 dark:border-white/5">
        {/* Aspirant actions */}
        {role === "aspirant" && isPending && onFund && (
          <button
            type="button"
            onClick={onFund}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
          >
            Deposit Escrow (M-Pesa)
          </button>
        )}

        {role === "aspirant" && isDelivered && (
          <>
            {onDispute && (
              <button
                type="button"
                onClick={onDispute}
                className="rounded-xl border border-red-300 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400"
              >
                Dispute Quality
              </button>
            )}
            {onApprove && (
              <button
                type="button"
                onClick={onApprove}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
              >
                Accept & Release Funds
              </button>
            )}
          </>
        )}

        {/* Partner actions */}
        {role === "partner" && isFunded && onStartProduction && (
          <button
            type="button"
            onClick={onStartProduction}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
          >
            Start Production
          </button>
        )}

        {role === "partner" && isInProduction && onMarkDelivered && (
          <button
            type="button"
            onClick={onMarkDelivered}
            className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700 active:scale-95"
          >
            Mark as Delivered
          </button>
        )}

        {isApproved && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={14} />
            Escrow Released
          </span>
        )}
      </div>
    </div>
  );
}
