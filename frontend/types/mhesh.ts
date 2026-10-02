export type MheshOffice =
  | "president"
  | "governor"
  | "senator"
  | "woman_rep"
  | "mp"
  | "mca";

export type AspirantTier = "free" | "verified" | "featured" | "setup";

export type TaskStatus =
  | "draft"
  | "funded"
  | "published"
  | "assigned"
  | "completed"
  | "approved"
  | "disputed"
  | "cancelled";

export type TaskCategory =
  | "print_merchandise"
  | "distribute_posters"
  | "distribute_merch"
  | "event_staffing"
  | "digital_amplification"
  | "canvassing";

export type EscrowStatus =
  | "pending"
  | "funded"
  | "released"
  | "refunded"
  | "disputed";

export type PartnerStatus = "pending" | "active" | "suspended";

export type OrderStatus =
  | "pending"
  | "funded"
  | "in_production"
  | "shipped"
  | "delivered"
  | "approved"
  | "disputed";

export type StyleTemplate =
  | "rally_podium"
  | "market_visit"
  | "church_service"
  | "development_project"
  | "youth_dialogue"
  | "portrait_formal"
  | "portrait_casual"
  | "community_hall"
  | "door_to_door"
  | "billboard";

export type OutputFormat =
  | "story"
  | "post"
  | "billboard"
  | "banner"
  | "tshirt"
  | "cap"
  | "umbrella"
  | "a3";

export interface ManifestoItem {
  title: string;
  description: string;
}

export interface AchievementItem {
  title: string;
  description: string;
  year?: number | null;
}

export interface AspirantProfile {
  id?: string;
  slug: string;
  display_name: string;
  official_name?: string | null;
  title_prefix?: string | null;
  photo_url?: string | null;
  party?: string | null;
  office: MheshOffice | string;
  county: string;
  constituency?: string | null;
  ward?: string | null;
  manifesto?: ManifestoItem[];
  achievements?: AchievementItem[];
  social_links?: Record<string, string>;
  whatsapp_public?: string | null;
  verified_mpesa?: boolean;
  trust_score: number;
  tier?: AspirantTier | string;
  featured_until?: string | null;
  follower_count?: number;
  share_count?: number;
  view_count?: number;
  created_at?: string;
}

export interface SupporterProfile {
  id: string;
  display_name: string;
  phone?: string;
  county?: string | null;
  ward?: string | null;
  verified_mpesa: boolean;
  trust_score: number;
  tasks_completed: number;
  tasks_disputed?: number;
  total_earned_kes: number;
}

export interface MheshTaskItem {
  id: string;
  aspirant_id?: string;
  title: string;
  description: string;
  category: TaskCategory | string;
  county: string;
  ward?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  reward_kes: number;
  escrow_fee_kes?: number;
  status: TaskStatus | string;
  deadline?: string | null;
  assigned_supporter_id?: string | null;
  evidence_urls?: string[];
  verification_score?: number | null;
  verification_flags?: Record<string, unknown>;
  created_at?: string;
  completed_at?: string | null;
  approved_at?: string | null;
}

export interface PrintPartner {
  id: string;
  slug: string;
  business_name: string;
  owner_name: string;
  phone?: string;
  county: string;
  ward?: string | null;
  capabilities: string[];
  pricing: Record<string, number>;
  capacity_per_day?: number | null;
  turnaround_days?: number | null;
  sample_urls?: string[];
  verified: boolean;
  status: PartnerStatus | string;
  rating: number;
  trust_score: number;
  orders_completed: number;
  orders_disputed?: number;
  featured_until?: string | null;
}

export interface PrintOrderItem {
  id: string;
  aspirant_id?: string;
  partner_id?: string;
  partner_name?: string;
  design_url: string;
  quantity: number;
  category: string;
  unit_price_kes: number;
  total_kes: number;
  referral_fee_kes?: number;
  status: OrderStatus | string;
  escrow_id?: string | null;
  delivery_evidence_urls?: string[];
  created_at?: string;
  delivered_at?: string | null;
  approved_at?: string | null;
}

export interface StudioImageItem {
  id?: string;
  url: string;
  title?: string;
  format?: OutputFormat | string;
  formats?: (OutputFormat | string)[];
  style_template?: StyleTemplate | string;
  is_ai?: boolean;
  created_at?: string;
}
