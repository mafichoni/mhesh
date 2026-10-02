"""Mhesh tenant models. All datetimes are naive UTC, matching the shared models."""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

__all__ = [
    "MheshOffice", "MheshAspirantTier", "MheshTaskStatus", "MheshTaskCategory",
    "MheshEscrowStatus", "MheshPartnerStatus", "MheshOrderStatus",
    "MheshAspirant", "MheshFollower", "MheshImageGeneration", "MheshSupporter",
    "MheshTask", "MheshTaskApplication", "MheshEscrow", "MheshPartner",
    "MheshPrintOrder", "MheshRating", "MheshReport",
]


class MheshOffice(str, enum.Enum):
    PRESIDENT = "president"
    GOVERNOR = "governor"
    SENATOR = "senator"
    WOMAN_REP = "woman_rep"
    MP = "mp"
    MCA = "mca"


class MheshAspirantTier(str, enum.Enum):
    FREE = "free"
    VERIFIED = "verified"
    FEATURED = "featured"
    SETUP = "setup"


class MheshTaskStatus(str, enum.Enum):
    DRAFT = "draft"
    FUNDED = "funded"
    PUBLISHED = "published"
    ASSIGNED = "assigned"
    COMPLETED = "completed"
    APPROVED = "approved"
    DISPUTED = "disputed"
    CANCELLED = "cancelled"


class MheshTaskCategory(str, enum.Enum):
    PRINT_MERCHANDISE = "print_merchandise"
    DISTRIBUTE_POSTERS = "distribute_posters"
    DISTRIBUTE_MERCH = "distribute_merch"
    EVENT_STAFFING = "event_staffing"
    DIGITAL_AMPLIFICATION = "digital_amplification"
    CANVASSING = "canvassing"


class MheshEscrowStatus(str, enum.Enum):
    PENDING = "pending"
    FUNDED = "funded"
    RELEASED = "released"
    REFUNDED = "refunded"
    DISPUTED = "disputed"


class MheshPartnerStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"


class MheshOrderStatus(str, enum.Enum):
    PENDING = "pending"
    FUNDED = "funded"
    IN_PRODUCTION = "in_production"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    APPROVED = "approved"
    DISPUTED = "disputed"


def _enum(e: type[enum.Enum], name: str) -> Enum:
    return Enum(e, name=name, values_callable=lambda x: [m.value for m in x])


class MheshAspirant(Base):
    __tablename__ = "mhesh_aspirants"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(200))
    official_name: Mapped[str | None] = mapped_column(String(200))
    title_prefix: Mapped[str | None] = mapped_column(String(20))
    photo_r2_key: Mapped[str | None] = mapped_column(String(500))
    party: Mapped[str | None] = mapped_column(String(100))
    office: Mapped[MheshOffice] = mapped_column(_enum(MheshOffice, "mhesh_office"), index=True)
    county: Mapped[str] = mapped_column(String(50), index=True)
    constituency: Mapped[str | None] = mapped_column(String(100))
    ward: Mapped[str | None] = mapped_column(String(100))
    manifesto: Mapped[list] = mapped_column(JSON, default=list)
    achievements: Mapped[list] = mapped_column(JSON, default=list)
    social_links: Mapped[dict] = mapped_column(JSON, default=dict)
    whatsapp_public: Mapped[str | None] = mapped_column(String(20))
    verified_mpesa: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime)
    trust_score: Mapped[int] = mapped_column(Integer, default=0)
    tier: Mapped[MheshAspirantTier] = mapped_column(
        _enum(MheshAspirantTier, "mhesh_aspirant_tier"), default=MheshAspirantTier.FREE)
    featured_until: Mapped[datetime | None] = mapped_column(DateTime)
    follower_count: Mapped[int] = mapped_column(Integer, default=0)
    share_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    whatsapp_click_count: Mapped[int] = mapped_column(Integer, default=0)
    lora_key: Mapped[str | None] = mapped_column(String(500))
    lora_trained_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MheshFollower(Base):
    __tablename__ = "mhesh_followers"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    aspirant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mhesh_aspirants.id"), index=True)
    contact: Mapped[str] = mapped_column(String(200), index=True)
    contact_kind: Mapped[str] = mapped_column(String(10))  # "email" | "phone"
    verified_at: Mapped[datetime | None] = mapped_column(DateTime)
    verify_token: Mapped[str | None] = mapped_column(String(64), index=True)
    unsub_token: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MheshImageGeneration(Base):
    __tablename__ = "mhesh_ai_generations"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    aspirant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mhesh_aspirants.id"), index=True)
    style_template: Mapped[str] = mapped_column(String(50))
    prompt: Mapped[str] = mapped_column(Text)
    output_urls: Mapped[list] = mapped_column(JSON, default=list)
    model: Mapped[str] = mapped_column(String(100))
    lora_key: Mapped[str | None] = mapped_column(String(500))
    cost_kes: Mapped[int] = mapped_column(Integer, default=0)
    generation_ms: Mapped[int] = mapped_column(Integer, default=0)
    audit_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    rejected: Mapped[bool] = mapped_column(Boolean, default=False)
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class MheshSupporter(Base):
    __tablename__ = "mhesh_supporters"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(200))
    phone: Mapped[str] = mapped_column(String(20), index=True)
    county: Mapped[str | None] = mapped_column(String(50))
    ward: Mapped[str | None] = mapped_column(String(100))
    verified_mpesa: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime)
    trust_score: Mapped[int] = mapped_column(Integer, default=0)
    trust_computed_at: Mapped[datetime | None] = mapped_column(DateTime)
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0)
    tasks_disputed: Mapped[int] = mapped_column(Integer, default=0)
    total_earned_kes: Mapped[int] = mapped_column(BigInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MheshTask(Base):
    __tablename__ = "mhesh_tasks"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    aspirant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mhesh_aspirants.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[MheshTaskCategory] = mapped_column(_enum(MheshTaskCategory, "mhesh_task_category"), index=True)
    county: Mapped[str] = mapped_column(String(50))
    ward: Mapped[str | None] = mapped_column(String(100))
    location_lat: Mapped[float | None] = mapped_column(Float)
    location_lng: Mapped[float | None] = mapped_column(Float)
    reward_kes: Mapped[int] = mapped_column(Integer)
    escrow_fee_kes: Mapped[int] = mapped_column(Integer)
    deadline: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[MheshTaskStatus] = mapped_column(
        _enum(MheshTaskStatus, "mhesh_task_status"), default=MheshTaskStatus.DRAFT, index=True)
    assigned_supporter_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("mhesh_supporters.id"), nullable=True)
    evidence_urls: Mapped[list] = mapped_column(JSON, default=list)
    verification_score: Mapped[float | None] = mapped_column(Float)
    verification_flags: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)


class MheshTaskApplication(Base):
    __tablename__ = "mhesh_task_applications"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mhesh_tasks.id"), index=True)
    supporter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mhesh_supporters.id"), index=True)
    message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MheshEscrow(Base):
    __tablename__ = "mhesh_escrow"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kind: Mapped[str] = mapped_column(String(20))  # "task" | "print_order"
    ref_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    aspirant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mhesh_aspirants.id"), index=True)
    # Aspirant's designated campaign account (the paying M-Pesa line). Funds are never pooled.
    campaign_account_ref: Mapped[str | None] = mapped_column(String(100))
    amount_kes: Mapped[int] = mapped_column(Integer)
    status: Mapped[MheshEscrowStatus] = mapped_column(
        _enum(MheshEscrowStatus, "mhesh_escrow_status"), default=MheshEscrowStatus.PENDING, index=True)
    checkout_request_id: Mapped[str | None] = mapped_column(String(100), index=True)
    mpesa_receipt: Mapped[str | None] = mapped_column(String(50), index=True)
    released_to_phone: Mapped[str | None] = mapped_column(String(20))
    released_at: Mapped[datetime | None] = mapped_column(DateTime)
    b2c_receipt: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MheshPartner(Base):
    __tablename__ = "mhesh_partners"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    slug: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    business_name: Mapped[str] = mapped_column(String(200))
    owner_name: Mapped[str] = mapped_column(String(200))
    phone: Mapped[str] = mapped_column(String(20), index=True)
    county: Mapped[str] = mapped_column(String(50), index=True)
    ward: Mapped[str | None] = mapped_column(String(100))
    capabilities: Mapped[list] = mapped_column(JSONB, default=list)
    pricing: Mapped[dict] = mapped_column(JSON, default=dict)
    capacity_per_day: Mapped[int | None] = mapped_column(Integer)
    turnaround_days: Mapped[int | None] = mapped_column(Integer)
    sample_urls: Mapped[list] = mapped_column(JSON, default=list)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[MheshPartnerStatus] = mapped_column(
        _enum(MheshPartnerStatus, "mhesh_partner_status"), default=MheshPartnerStatus.PENDING, index=True)
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    trust_score: Mapped[int] = mapped_column(Integer, default=0)
    orders_completed: Mapped[int] = mapped_column(Integer, default=0)
    orders_disputed: Mapped[int] = mapped_column(Integer, default=0)
    featured_until: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MheshPrintOrder(Base):
    __tablename__ = "mhesh_print_orders"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    aspirant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mhesh_aspirants.id"), index=True)
    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mhesh_partners.id"), index=True)
    design_url: Mapped[str] = mapped_column(String(500))
    quantity: Mapped[int] = mapped_column(Integer)
    category: Mapped[str] = mapped_column(String(50))
    unit_price_kes: Mapped[int] = mapped_column(Integer)
    total_kes: Mapped[int] = mapped_column(Integer)
    referral_fee_kes: Mapped[int] = mapped_column(Integer)
    status: Mapped[MheshOrderStatus] = mapped_column(
        _enum(MheshOrderStatus, "mhesh_order_status"), default=MheshOrderStatus.PENDING, index=True)
    escrow_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("mhesh_escrow.id"), nullable=True)
    delivery_evidence_urls: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)


class MheshRating(Base):
    __tablename__ = "mhesh_ratings"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kind: Mapped[str] = mapped_column(String(20))  # "task" | "print_order"
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    rater_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    rater_kind: Mapped[str] = mapped_column(String(20))  # "aspirant" | "supporter" | "partner"
    stars: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MheshReport(Base):
    __tablename__ = "mhesh_reports"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kind: Mapped[str] = mapped_column(String(20))  # "profile" | "image" | "task" | "partner"
    subject_id: Mapped[str] = mapped_column(String(100))
    reporter_contact: Mapped[str | None] = mapped_column(String(200))
    reason: Mapped[str] = mapped_column(Text)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
