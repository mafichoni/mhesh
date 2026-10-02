from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.mhesh_models import MheshOffice, MheshTaskCategory

KENYAN_PHONE = r"^(\+?254|0)?[17]\d{8}$"

StyleTemplate = Literal[
    "rally_podium", "market_visit", "church_service", "development_project",
    "youth_dialogue", "portrait_formal", "portrait_casual", "community_hall",
    "door_to_door", "billboard",
]
OutputFormat = Literal["story", "post", "billboard", "banner", "tshirt", "cap", "umbrella", "a3"]


class PhonePayload(BaseModel):
    phone: str = Field(pattern=KENYAN_PHONE)


class ManifestoItem(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=20, max_length=1000)


class AchievementItem(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=600)
    year: int | None = None


class AspirantCreate(BaseModel):
    display_name: str = Field(min_length=2, max_length=200)
    official_name: str | None = Field(default=None, max_length=200)
    title_prefix: str | None = Field(default=None, max_length=20)
    party: str | None = Field(default=None, max_length=100)
    office: MheshOffice
    county: str = Field(min_length=2, max_length=50)
    constituency: str | None = Field(default=None, max_length=100)
    ward: str | None = Field(default=None, max_length=100)
    whatsapp_public: str | None = Field(default=None, pattern=KENYAN_PHONE)


class AspirantUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=2, max_length=200)
    official_name: str | None = Field(default=None, max_length=200)
    title_prefix: str | None = Field(default=None, max_length=20)
    party: str | None = Field(default=None, max_length=100)
    office: MheshOffice | None = None
    county: str | None = Field(default=None, max_length=50)
    constituency: str | None = Field(default=None, max_length=100)
    ward: str | None = Field(default=None, max_length=100)
    whatsapp_public: str | None = Field(default=None, pattern=KENYAN_PHONE)
    manifesto: list[ManifestoItem] | None = Field(default=None, max_length=20)
    achievements: list[AchievementItem] | None = Field(default=None, max_length=30)
    social_links: dict[str, str] | None = None
    photo_r2_key: str | None = Field(default=None, max_length=500)


class AspirantPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    slug: str
    display_name: str
    title_prefix: str | None
    photo_url: str | None
    party: str | None
    office: str
    county: str
    constituency: str | None
    ward: str | None
    manifesto: list
    achievements: list
    social_links: dict
    whatsapp_public: str | None
    verified_mpesa: bool
    trust_score: int
    tier: str
    featured_until: datetime | None
    follower_count: int
    share_count: int
    view_count: int
    created_at: datetime


class AspirantOwner(AspirantPublic):
    official_name: str | None
    whatsapp_click_count: int
    lora_key: str | None
    lora_trained_at: datetime | None


class FollowerCreate(BaseModel):
    contact: str = Field(min_length=5, max_length=200)
    contact_kind: Literal["email", "phone"]

    @model_validator(mode="after")
    def validate_contact(self) -> "FollowerCreate":
        import re
        if self.contact_kind == "email":
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", self.contact):
                raise ValueError("Invalid email")
            self.contact = self.contact.lower().strip()
        elif not re.match(KENYAN_PHONE, self.contact):
            raise ValueError("Invalid phone")
        return self


class SubscribeRequest(BaseModel):
    tier: Literal["verified", "featured"]
    phone: str = Field(pattern=KENYAN_PHONE)


class StudioGenerateRequest(BaseModel):
    style_template: StyleTemplate
    custom_prompt: str | None = Field(default=None, max_length=300)
    num_images: int = Field(default=1, ge=1, le=4)
    output_formats: list[OutputFormat] = Field(default_factory=lambda: ["story"], min_length=1, max_length=8)


class StudioGenerateOut(BaseModel):
    generation_id: UUID
    output_urls: list[str]
    cost_kes: int
    generation_ms: int


class StudioTrainRequest(BaseModel):
    reference_keys: list[str] = Field(min_length=5, max_length=10)


class TaskCreate(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=20, max_length=3000)
    category: MheshTaskCategory
    county: str
    ward: str | None = None
    location_lat: float | None = Field(default=None, ge=-5, le=5.5)
    location_lng: float | None = Field(default=None, ge=33.5, le=42)
    reward_kes: int = Field(ge=100, le=1_000_000)
    deadline: datetime | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    aspirant_id: UUID
    title: str
    description: str
    category: str
    county: str
    ward: str | None
    location_lat: float | None
    location_lng: float | None
    reward_kes: int
    escrow_fee_kes: int
    status: str
    deadline: datetime | None
    assigned_supporter_id: UUID | None
    evidence_urls: list
    verification_score: float | None
    verification_flags: dict
    created_at: datetime
    completed_at: datetime | None
    approved_at: datetime | None


class TaskApply(BaseModel):
    message: str | None = Field(default=None, max_length=1000)


class TaskAssign(BaseModel):
    supporter_id: UUID


class TaskDispute(BaseModel):
    reason: str = Field(min_length=10, max_length=2000)


class ApplicationOut(BaseModel):
    id: UUID
    supporter_id: UUID
    display_name: str
    trust_score: int
    tasks_completed: int
    verified_mpesa: bool
    message: str | None
    created_at: datetime


class SupporterCreate(BaseModel):
    display_name: str = Field(min_length=2, max_length=200)
    phone: str = Field(pattern=KENYAN_PHONE)
    county: str | None = None
    ward: str | None = None


class SupporterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    display_name: str
    county: str | None
    ward: str | None
    verified_mpesa: bool
    trust_score: int
    tasks_completed: int
    tasks_disputed: int
    total_earned_kes: int


class EvidenceSubmit(BaseModel):
    evidence_urls: list[str] = Field(min_length=1, max_length=20)
    note: str | None = Field(default=None, max_length=1000)
    lat: float | None = None
    lng: float | None = None


class PartnerApply(BaseModel):
    business_name: str = Field(min_length=2, max_length=200)
    owner_name: str = Field(min_length=2, max_length=200)
    phone: str = Field(pattern=KENYAN_PHONE)
    county: str
    ward: str | None = None
    capabilities: list[str] = Field(min_length=1)
    pricing: dict[str, int]
    capacity_per_day: int | None = None
    turnaround_days: int | None = None
    sample_urls: list[str] = Field(default_factory=list, max_length=5)


class PartnerUpdate(BaseModel):
    capabilities: list[str] | None = Field(default=None, min_length=1)
    pricing: dict[str, int] | None = None
    capacity_per_day: int | None = None
    turnaround_days: int | None = None
    sample_urls: list[str] | None = Field(default=None, max_length=5)
    ward: str | None = None


class PartnerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    slug: str
    business_name: str
    owner_name: str
    county: str
    ward: str | None
    capabilities: list
    pricing: dict
    capacity_per_day: int | None
    turnaround_days: int | None
    sample_urls: list
    verified: bool
    status: str
    rating: float
    trust_score: int
    orders_completed: int
    featured_until: datetime | None


class PrintOrderCreate(BaseModel):
    partner_id: UUID
    design_url: str = Field(max_length=500)
    quantity: int = Field(ge=1, le=100_000)
    category: str = Field(max_length=50)
    unit_price_kes: int = Field(ge=10, le=100_000)


class PrintOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    aspirant_id: UUID
    partner_id: UUID
    design_url: str
    quantity: int
    category: str
    unit_price_kes: int
    total_kes: int
    referral_fee_kes: int
    status: str
    escrow_id: UUID | None
    delivery_evidence_urls: list
    created_at: datetime
    delivered_at: datetime | None
    approved_at: datetime | None


class DeliverySubmit(BaseModel):
    evidence_urls: list[str] = Field(min_length=1, max_length=20)


class RatingCreate(BaseModel):
    stars: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class ReportCreate(BaseModel):
    kind: Literal["profile", "image", "task", "partner"]
    subject_id: str = Field(min_length=1, max_length=100)
    reason: str = Field(min_length=10, max_length=2000)
    reporter_contact: str | None = Field(default=None, max_length=200)
