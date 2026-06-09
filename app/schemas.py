from datetime import datetime, date
from pydantic import BaseModel


# ── Member ──────────────────────────────────────────

class MemberCreate(BaseModel):
    name: str
    department: str = ""


class MemberUpdate(BaseModel):
    name: str | None = None
    department: str | None = None
    is_active: bool | None = None


class MemberOut(BaseModel):
    id: int
    name: str
    department: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── ReportTemplate ──────────────────────────────────

class TemplateCreate(BaseModel):
    name: str
    content: str = ""
    is_default: bool = False


class TemplateUpdate(BaseModel):
    name: str | None = None
    content: str | None = None
    is_default: bool | None = None


class TemplateOut(BaseModel):
    id: int
    name: str
    content: str
    file_path: str | None = None
    has_file: bool = False
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_file(cls, obj):
        data = cls.model_validate(obj)
        data.has_file = bool(obj.file_path)
        return data


# ── WeekPeriod ──────────────────────────────────────

class WeekPeriodOut(BaseModel):
    id: int
    week_start: date
    week_end: date
    deadline: datetime
    status: str

    model_config = {"from_attributes": True}


# ── WeeklyReport ───────────────────────────────────

class TypoCheckRequest(BaseModel):
    content: str


class TypoCheckResponse(BaseModel):
    has_typos: bool
    corrected_content: str
    explanation: str


class ReportCreate(BaseModel):
    member_id: int
    template_id: int | None = None
    content: str


class ReportUpdate(BaseModel):
    content: str


class ReportOut(BaseModel):
    id: int
    member_id: int
    template_id: int | None
    week_period_id: int
    content: str
    submitted_at: datetime
    updated_at: datetime
    member: MemberOut | None = None

    model_config = {"from_attributes": True}


# ── WeeklySummary ──────────────────────────────────

class SummaryUpdate(BaseModel):
    summary_content: str


class SummaryOut(BaseModel):
    id: int
    week_period_id: int
    summary_content: str
    generated_at: datetime
    week_period: WeekPeriodOut | None = None

    model_config = {"from_attributes": True}


# ── 提交状态 ────────────────────────────────────────

class SubmissionStatus(BaseModel):
    """当前周期的提交状态"""
    week_period: WeekPeriodOut
    submitted: list[MemberOut]
    not_submitted: list[MemberOut]
    total: int
    submitted_count: int
