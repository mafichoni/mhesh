import React from "react";
import { Check, Users, ShoppingBag, Landmark, Wrench, GraduationCap, Award, Smile, Home, Flag } from "lucide-react";

export interface StyleOption {
  id: string;
  name: string;
  swahili: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CAMPAIGN_STYLES: StyleOption[] = [
  {
    id: "rally_podium",
    name: "Rally Podium",
    swahili: "Mkutano wa Hadhara",
    description: "Addressing a vibrant, energized crowd with microphones and campaign banners.",
    icon: Flag,
  },
  {
    id: "market_visit",
    name: "Market Visit",
    swahili: "Ziara ya Soko",
    description: "Interacting warmly with traders, Mama Mboga, and shoppers in a busy marketplace.",
    icon: ShoppingBag,
  },
  {
    id: "church_service",
    name: "Faith Gathering",
    swahili: "Ibada & Ushirika",
    description: "Community worship, fellowship, or church event in modest respectful attire.",
    icon: Landmark,
  },
  {
    id: "development_project",
    name: "Development Inspection",
    swahili: "Miradi ya Maendeleo",
    description: "Inspecting community boreholes, infrastructure, roads, or school construction.",
    icon: Wrench,
  },
  {
    id: "youth_dialogue",
    name: "Youth Dialogue",
    swahili: "Mjadala wa Vijana",
    description: "Townhall with young innovators, university students, and bodaboda operators.",
    icon: GraduationCap,
  },
  {
    id: "portrait_formal",
    name: "Formal Official Portrait",
    swahili: "Picha Rasmi ya Uongozi",
    description: "Polished studio portrait with national flag tones, suitable for posters and ballots.",
    icon: Award,
  },
  {
    id: "portrait_casual",
    name: "Grassroots Portrait",
    swahili: "Picha ya Nyanjani",
    description: "Warm, approachable outdoor portrait in branded polo or casual campaign shirt.",
    icon: Smile,
  },
  {
    id: "community_hall",
    name: "Elders Baraza",
    swahili: "Baraza la Wazee",
    description: "Engaging village elders and community leaders in consultative dialogue.",
    icon: Users,
  },
  {
    id: "door_to_door",
    name: "Door-to-Door",
    swahili: "Kutembelea Boma",
    description: "Authentic, respectful visit to rural and peri-urban homesteads.",
    icon: Home,
  },
  {
    id: "billboard",
    name: "Hero Billboard",
    swahili: "Bango Kuu la Ushindi",
    description: "Dynamic low-angle leadership shot designed for highway billboards and super-screens.",
    icon: Flag,
  },
];

interface StyleCardProps {
  styleOption: StyleOption;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function StyleCard({ styleOption, isSelected, onSelect }: StyleCardProps) {
  const IconComponent = styleOption.icon;

  return (
    <div
      onClick={() => onSelect(styleOption.id)}
      className={`relative cursor-pointer rounded-lg border p-4 transition-all duration-200 select-none ${
        isSelected
          ? "border-emerald-600 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-600/30"
          : "border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            isSelected ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-700"
          }`}
        >
          <IconComponent className="h-5 w-5" />
        </div>
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
            isSelected
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-stone-300 bg-white"
          }`}
        >
          {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
        </div>
      </div>

      <div className="mt-3">
        <h4 className="font-semibold text-stone-900 text-sm">{styleOption.name}</h4>
        <p className="text-xs font-medium text-emerald-800/80 italic">{styleOption.swahili}</p>
        <p className="mt-1 text-xs text-stone-600 line-clamp-2 leading-relaxed">
          {styleOption.description}
        </p>
      </div>
    </div>
  );
}
