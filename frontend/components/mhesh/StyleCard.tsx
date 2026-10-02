import React from "react";
import {
  Check,
  Megaphone,
  ShoppingBag,
  Heart,
  HardHat,
  Users2,
  Award,
  Smile,
  Landmark,
  Home,
  Tv,
  type LucideIcon,
} from "lucide-react";
import type { StyleTemplate } from "@/types/mhesh";

export interface StyleTemplateInfo {
  id: StyleTemplate;
  name: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
}

export const STYLE_TEMPLATES: StyleTemplateInfo[] = [
  {
    id: "rally_podium",
    name: "Rally Podium",
    description: "Addressing a vibrant, enthusiastic campaign rally from the main stage.",
    icon: Megaphone,
    badge: "High Energy",
  },
  {
    id: "market_visit",
    name: "Market Walkabout",
    description: "Engaging traders, mama mbogas, and shoppers in a lively open-air market.",
    icon: ShoppingBag,
    badge: "Grassroots",
  },
  {
    id: "church_service",
    name: "Church Fellowship",
    description: "Respectful church fellowship and community Sunday service greeting.",
    icon: Heart,
    badge: "Community",
  },
  {
    id: "development_project",
    name: "Development Inspection",
    description: "Inspecting completed water boreholes, school classrooms, or tarmac roads.",
    icon: HardHat,
    badge: "Action",
  },
  {
    id: "youth_dialogue",
    name: "Youth Dialogue",
    description: "Interactive town hall and open listening session with young people.",
    icon: Users2,
    badge: "Future",
  },
  {
    id: "portrait_formal",
    name: "Formal Official Portrait",
    description: "IEBC-ready studio portrait in formal suit with Kenyan national flag subtle backdrop.",
    icon: Award,
    badge: "Official",
  },
  {
    id: "portrait_casual",
    name: "Approachable Portrait",
    description: "Warm, approachable outdoor portrait in smart casual campaign polo.",
    icon: Smile,
    badge: "Friendly",
  },
  {
    id: "community_hall",
    name: "Baraza Hall",
    description: "Consulting elders and constituents inside a town community baraza hall.",
    icon: Landmark,
    badge: "Leadership",
  },
  {
    id: "door_to_door",
    name: "Door-to-Door",
    description: "Intimate voter listening session in a homestead or neighborhood doorsteps.",
    icon: Home,
    badge: "Voter Contact",
  },
  {
    id: "billboard",
    name: "Highway Billboard",
    description: "High-contrast billboard layout optimized for highway and roadside display.",
    icon: Tv,
    badge: "Visibility",
  },
];

export const CAMPAIGN_STYLES = STYLE_TEMPLATES;

export interface StyleCardProps {
  template?: StyleTemplate | StyleTemplateInfo;
  styleOption?: StyleTemplate | StyleTemplateInfo;
  selected?: boolean;
  isSelected?: boolean;
  onSelect?: (templateId: StyleTemplate) => void;
  className?: string;
}

export function StyleCard({
  template,
  styleOption,
  selected = false,
  isSelected,
  onSelect,
  className = "",
}: StyleCardProps) {
  const chosen = (template || styleOption) as StyleTemplate | StyleTemplateInfo;
  const isSel = isSelected !== undefined ? isSelected : selected;
  const info: StyleTemplateInfo =
    typeof chosen === "string"
      ? STYLE_TEMPLATES.find((t) => t.id === chosen) || {
          id: chosen as StyleTemplate,
          name: chosen.replace(/_/g, " "),
          description: "Campaign visual template",
          icon: Megaphone,
        }
      : chosen;

  const Icon = info.icon;

  return (
    <div
      onClick={() => onSelect?.(info.id)}
      className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
        isSel
          ? "border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/30 dark:border-emerald-500 dark:bg-emerald-950/20"
          : "border-black/10 bg-white hover:border-black/20 hover:bg-neutral-50/50 dark:border-white/10 dark:bg-neutral-900 dark:hover:border-white/20 dark:hover:bg-neutral-800/40"
      } ${className}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
              selected
                ? "bg-emerald-600 text-white"
                : "bg-neutral-100 text-neutral-700 group-hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            <Icon size={20} />
          </div>

          <div className="flex items-center gap-1.5">
            {info.badge && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {info.badge}
              </span>
            )}
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                selected
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-neutral-300 bg-transparent dark:border-neutral-700"
              }`}
            >
              {selected && <Check size={12} strokeWidth={3} />}
            </div>
          </div>
        </div>

        <h3 className="mt-3 text-sm font-bold text-neutral-900 dark:text-neutral-100">
          {info.name}
        </h3>

        <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          {info.description}
        </p>
      </div>
    </div>
  );
}
