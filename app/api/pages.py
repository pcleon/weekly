from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Member, ReportTemplate, WeeklyReport, WeeklySummary, WeekPeriod
from app.services.report_service import get_or_create_current_period, get_submission_status
from app.schemas import WeekPeriodOut, ReportOut, SummaryOut, TemplateOut, MemberOut

from app.api.deps import get_current_user

router = APIRouter(prefix="/api/pages", tags=["页面聚合数据"], dependencies=[Depends(get_current_user)])

@router.get("/dashboard")
def get_dashboard_data(db: Session = Depends(get_db)):
    """获取仪表盘（Dashboard）页面所需的数据。

    包括当前激活的周报周期、成员周报提交状态统计（已交/未交名单），以及格式化后的截止日期文本。

    Args:
        db: 数据库 Session 对象。

    Returns:
        包含 "period", "status", "deadline_str" 聚合数据的字典。
    """
    period = get_or_create_current_period(db)
    status = get_submission_status(db, period)
    weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    deadline_str = f"{weekdays[period.deadline.weekday()]} {period.deadline.strftime('%H:%M')}"
    return {
        "period": WeekPeriodOut.model_validate(period),
        "status": status,
        "deadline_str": deadline_str,
    }

@router.get("/report-form")
def get_report_form_data(db: Session = Depends(get_db)):
    """获取填写周报（Report Form）页面所需的初始化数据。

    包括当前的周期对象、系统活跃成员列表、系统预设模板列表以及设定的默认模板对象。

    Args:
        db: 数据库 Session 对象。

    Returns:
        包含 "period", "members", "templates", "default_template" 聚合数据的字典。
    """
    period = get_or_create_current_period(db)
    active_members = db.query(Member).filter(Member.is_active == True).all()
    all_templates = db.query(ReportTemplate).all()
    default_tpl = next((t for t in all_templates if t.is_default), None)
    return {
        "period": WeekPeriodOut.model_validate(period),
        "members": [MemberOut.model_validate(m) for m in active_members],
        "templates": [TemplateOut.from_orm_with_file(t) for t in all_templates],
        "default_template": TemplateOut.from_orm_with_file(default_tpl) if default_tpl else None,
    }

@router.get("/reports")
def get_reports_page_data(
    period_id: int | None = None,
    member_id: int | None = None,
    db: Session = Depends(get_db)
):
    """获取周报归档列表页面（Reports Page）所需的聚合数据。

    支持对周报结果进行周期 ID 和成员 ID 过滤，并一并获取历史所有周期列表和活跃成员列表，
    用以前端筛选下拉菜单的数据绑定。

    Args:
        period_id: 选中的过滤周期 ID。
        member_id: 选中的过滤成员 ID。
        db: 数据库 Session 对象。

    Returns:
        包含 "reports", "periods", "members", "selected_period_id", "selected_member_id", "current_period_id" 的字典。
    """
    query = db.query(WeeklyReport).options(
        joinedload(WeeklyReport.member),
        joinedload(WeeklyReport.week_period),
        joinedload(WeeklyReport.personal_report),
    )
    if period_id:
        query = query.filter(WeeklyReport.week_period_id == period_id)
    if member_id:
        query = query.filter(WeeklyReport.member_id == member_id)
    all_reports = query.order_by(WeeklyReport.submitted_at.desc()).all()
    periods = db.query(WeekPeriod).order_by(WeekPeriod.week_start.desc()).all()
    active_members = db.query(Member).filter(Member.is_active == True).all()
    current_period = get_or_create_current_period(db)
    return {
        "reports": [ReportOut.model_validate(r) for r in all_reports],
        "periods": [WeekPeriodOut.model_validate(p) for p in periods],
        "members": [MemberOut.model_validate(m) for m in active_members],
        "selected_period_id": period_id,
        "selected_member_id": member_id,
        "current_period_id": current_period.id,
    }

@router.get("/summary")
def get_summary_page_data(db: Session = Depends(get_db)):
    """获取 AI 汇总管理页面（Summary Page）所需的聚合数据。

    返回历史所有的 AI 汇总记录、当前最新周期的 ID、当前周期最近一次生成的汇总详情，
    以及当前最新一次提交了周报的成员提交信息。

    Args:
        db: 数据库 Session 对象。

    Returns:
        包含 "summaries", "current_period_id", "current_summary", "last_report" 聚合数据的字典。
    """
    all_summaries = (
        db.query(WeeklySummary)
        .options(joinedload(WeeklySummary.week_period))
        .order_by(WeeklySummary.generated_at.desc())
        .all()
    )
    current_period = get_or_create_current_period(db)
    current_summary = next((s for s in all_summaries if s.week_period_id == current_period.id), None)
    
    last_report = (
        db.query(WeeklyReport)
        .filter(WeeklyReport.week_period_id == current_period.id)
        .options(joinedload(WeeklyReport.member))
        .order_by(WeeklyReport.submitted_at.desc())
        .first()
    )

    return {
        "summaries": [SummaryOut.model_validate(s) for s in all_summaries],
        "current_period_id": current_period.id,
        "current_period": WeekPeriodOut.model_validate(current_period),
        "current_summary": SummaryOut.model_validate(current_summary) if current_summary else None,
        "last_report": ReportOut.model_validate(last_report) if last_report else None,
    }
