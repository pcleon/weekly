from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Member, ReportTemplate, WeeklyReport, WeeklySummary, WeekPeriod
from app.services.report_service import get_or_create_current_period, get_submission_status
from app.schemas import WeekPeriodOut, ReportOut, SummaryOut, TemplateOut, MemberOut

router = APIRouter(prefix="/api/pages", tags=["页面聚合数据"])

@router.get("/dashboard")
def get_dashboard_data(db: Session = Depends(get_db)):
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
def get_reports_page_data(period_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(WeeklyReport).options(
        joinedload(WeeklyReport.member),
        joinedload(WeeklyReport.week_period),
    )
    if period_id:
        query = query.filter(WeeklyReport.week_period_id == period_id)
    all_reports = query.order_by(WeeklyReport.submitted_at.desc()).all()
    periods = db.query(WeekPeriod).order_by(WeekPeriod.week_start.desc()).all()
    current_period = get_or_create_current_period(db)
    return {
        "reports": [ReportOut.model_validate(r) for r in all_reports],
        "periods": [WeekPeriodOut.model_validate(p) for p in periods],
        "selected_period_id": period_id,
        "current_period_id": current_period.id,
    }

@router.get("/summary")
def get_summary_page_data(db: Session = Depends(get_db)):
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
        "current_summary": SummaryOut.model_validate(current_summary) if current_summary else None,
        "last_report": ReportOut.model_validate(last_report) if last_report else None,
    }
