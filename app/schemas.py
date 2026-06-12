from datetime import datetime, date
from pydantic import BaseModel


# ── Member ──────────────────────────────────────────

class MemberCreate(BaseModel):
    """创建成员时的数据传输对象。"""
    name: str
    department: str = ""


class MemberUpdate(BaseModel):
    """更新成员信息时的数据传输对象。"""
    name: str | None = None
    department: str | None = None
    is_active: bool | None = None


class MemberOut(BaseModel):
    """查询成员时的统一输出格式。"""
    id: int
    name: str
    department: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── ReportTemplate ──────────────────────────────────

class TemplateCreate(BaseModel):
    """创建周报模板时的数据传输对象。"""
    name: str
    content: str = ""
    is_default: bool = False


class TemplateUpdate(BaseModel):
    """更新周报模板信息时的数据传输对象。"""
    name: str | None = None
    content: str | None = None
    is_default: bool | None = None


class TemplateOut(BaseModel):
    """查询周报模板时的统一输出格式。"""
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
        """将 ORM 对象转换为 TemplateOut 模型，并校验关联文件的存在性。

        Args:
            obj: 数据库 ReportTemplate ORM 对象。

        Returns:
            TemplateOut 数据传输模型实例。
        """
        data = cls.model_validate(obj)
        data.has_file = bool(obj.file_path)
        return data


# ── WeekPeriod ──────────────────────────────────────

class WeekPeriodOut(BaseModel):
    """查询周报周期时的统一输出格式。"""
    id: int
    week_start: date
    week_end: date
    deadline: datetime
    status: str

    model_config = {"from_attributes": True}


# ── WeeklyReport ───────────────────────────────────

class ReportCreate(BaseModel):
    """提交周报时的数据传输对象。"""
    member_id: int
    template_id: int | None = None
    content: str
    personal_template_id: int | None = None
    personal_content: str


class ReportUpdate(BaseModel):
    """更新修改周报时的数据传输对象。"""
    content: str
    personal_content: str


class ReportOut(BaseModel):
    """查询周报详情时的统一输出格式。"""
    id: int
    member_id: int
    template_id: int | None
    week_period_id: int
    content: str
    submitted_at: datetime
    updated_at: datetime
    member: MemberOut | None = None
    week_period: WeekPeriodOut | None = None
    personal_content: str | None = None
    personal_template_id: int | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        """扩展父类的序列化校验。

        除了映射基础属性外，还将关联的个人完整周报内容（personal_report）提取并映射到输出字段中。

        Args:
            obj: 数据库 WeeklyReport ORM 实体。
            *args: Pydantic 默认位置参数。
            **kwargs: Pydantic 默认关键字参数。

        Returns:
            ReportOut 数据传输模型实例。
        """
        data = super().model_validate(obj, *args, **kwargs)
        if hasattr(obj, "personal_report") and obj.personal_report:
            data.personal_content = obj.personal_report.content
            data.personal_template_id = obj.personal_report.template_id
        return data


# ── WeeklySummary ──────────────────────────────────

class SummaryUpdate(BaseModel):
    """更新修改 AI 汇总内容时的数据传输对象。"""
    summary_content: str


class SummaryOut(BaseModel):
    """查询 AI 汇总记录时的统一输出格式。"""
    id: int
    week_period_id: int
    summary_content: str
    generated_at: datetime
    week_period: WeekPeriodOut | None = None

    model_config = {"from_attributes": True}


# ── 提交状态 ────────────────────────────────────────

from typing import Any

class SubmissionStatus(BaseModel):
    """当前周报周期的成员提交状态输出类。"""
    week_period: WeekPeriodOut
    submitted: list[Any]
    not_submitted: list[MemberOut]
    total: int
    submitted_count: int
