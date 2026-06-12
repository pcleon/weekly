from datetime import datetime, date, timedelta
from sqlalchemy import (
    Integer, String, Text, Boolean, DateTime, Date, ForeignKey, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Member(Base):
    """团队成员实体模型。

    维护团队内成员的信息，包括所属部门和启用激活状态。
    """
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # 关联关系
    reports: Mapped[list["WeeklyReport"]] = relationship(back_populates="member")


class ReportTemplate(Base):
    """周报模板实体模型。

    定义预设的工作周报模板内容，可供成员提交周报时选择参考。
    """
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

    # 关联关系
    reports: Mapped[list["WeeklyReport"]] = relationship(back_populates="template")


class WeekPeriod(Base):
    """周期实体模型。

    定义以周为单位的周报汇总统计周期，记录提交的截止时间及周期的开放状态。
    """
    __tablename__ = "week_periods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_start: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    week_end: Mapped[date] = mapped_column(Date, nullable=False)
    deadline: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="open", comment="open / closed"
    )

    # 关联关系
    reports: Mapped[list["WeeklyReport"]] = relationship(back_populates="week_period")
    summaries: Mapped[list["WeeklySummary"]] = relationship(back_populates="week_period")

    @staticmethod
    def calc_for_date(d: date) -> dict:
        """根据给定的目标日期计算其所属周期的起止时间与截止提交时间。

        周一为周期起始。截止提交时间（默认周五 15:00）从 deadline.json 中读取配置。

        Args:
            d: 目标日期（Date 类型）。

        Returns:
            包含 "week_start", "week_end", "deadline" 三个键的字典。
        """
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
    """个人工作周报实体模型。

    记录团队成员提交的单周团队周报内容（公开汇总）。
    """
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

    # 关联关系
    member: Mapped["Member"] = relationship(back_populates="reports")
    template: Mapped["ReportTemplate | None"] = relationship(back_populates="reports")
    week_period: Mapped["WeekPeriod"] = relationship(back_populates="reports")
    personal_report: Mapped["WeeklyPersonalReport | None"] = relationship(
        back_populates="weekly_report", uselist=False, cascade="all, delete-orphan"
    )


class WeeklyPersonalReport(Base):
    """完整个人周报实体模型（包含发送给领导的私密汇报内容）。"""
    __tablename__ = "weekly_personal_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    weekly_report_id: Mapped[int] = mapped_column(
        ForeignKey("weekly_reports.id", ondelete="CASCADE"), nullable=False
    )
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

    # 关联关系
    weekly_report: Mapped["WeeklyReport"] = relationship(back_populates="personal_report")
    member: Mapped["Member"] = relationship()
    template: Mapped["ReportTemplate | None"] = relationship()
    week_period: Mapped["WeekPeriod"] = relationship()


class WeeklySummary(Base):
    """AI 汇总结果实体模型。

    保存每一周期通过大模型自动生成的团队工作周报合并总结内容。
    """
    __tablename__ = "weekly_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_period_id: Mapped[int] = mapped_column(
        ForeignKey("week_periods.id"), nullable=False
    )
    summary_content: Mapped[str] = mapped_column(Text, nullable=False)
    raw_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # 关联关系
    week_period: Mapped["WeekPeriod"] = relationship(back_populates="summaries")

