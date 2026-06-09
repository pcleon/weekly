from datetime import datetime, date, timedelta
from sqlalchemy import (
    Integer, String, Text, Boolean, DateTime, Date, ForeignKey, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Member(Base):
    """团队成员"""
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    reports: Mapped[list["WeeklyReport"]] = relationship(back_populates="member")


class ReportTemplate(Base):
    """周报模板"""
    __tablename__ = "report_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    reports: Mapped[list["WeeklyReport"]] = relationship(back_populates="template")


class WeekPeriod(Base):
    """周期（以周为单位，周五15:00截止）"""
    __tablename__ = "week_periods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_start: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    week_end: Mapped[date] = mapped_column(Date, nullable=False)
    deadline: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="open", comment="open / closed"
    )

    reports: Mapped[list["WeeklyReport"]] = relationship(back_populates="week_period")
    summaries: Mapped[list["WeeklySummary"]] = relationship(back_populates="week_period")

    @staticmethod
    def calc_for_date(d: date) -> dict:
        """根据给定日期计算所属周期的起止和截止时间"""
        from datetime import timedelta, datetime
        from app.config import get_deadline_config

        # 周一为起始 (weekday() == 0)
        week_start = d - timedelta(days=d.weekday())
        week_end = week_start + timedelta(days=6)
        
        cfg = get_deadline_config()
        deadline_date = week_start + timedelta(days=cfg.day_of_week)
        deadline = datetime(deadline_date.year, deadline_date.month, deadline_date.day, cfg.hour, cfg.minute, 0)
        
        return {
            "week_start": week_start,
            "week_end": week_end,
            "deadline": deadline,
        }


class WeeklyReport(Base):
    """个人周报"""
    __tablename__ = "weekly_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("members.id"), nullable=False)
    template_id: Mapped[int | None] = mapped_column(
        ForeignKey("report_templates.id"), nullable=True
    )
    week_period_id: Mapped[int] = mapped_column(
        ForeignKey("week_periods.id"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    member: Mapped["Member"] = relationship(back_populates="reports")
    template: Mapped["ReportTemplate | None"] = relationship(back_populates="reports")
    week_period: Mapped["WeekPeriod"] = relationship(back_populates="reports")


class WeeklySummary(Base):
    """AI 汇总结果"""
    __tablename__ = "weekly_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_period_id: Mapped[int] = mapped_column(
        ForeignKey("week_periods.id"), nullable=False
    )
    summary_content: Mapped[str] = mapped_column(Text, nullable=False)
    raw_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    week_period: Mapped["WeekPeriod"] = relationship(back_populates="summaries")
