from fastapi import FastAPI, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.database import get_db
from app.models import Member, ReportTemplate, WeeklyReport, WeeklySummary, WeekPeriod
from app.services.report_service import get_or_create_current_period, get_submission_status

from app.api import members, templates, reports, summaries
from app.logger import setup_logging

# 初始化日志配置
setup_logging()

settings = get_settings()

app = FastAPI(title=settings.app_title)

# 静态文件和模板
app.mount("/static", StaticFiles(directory="app/static"), name="static")
jinja_templates = Jinja2Templates(directory="app/templates")

# 注册 API 路由
app.include_router(members.router)
app.include_router(templates.router)
app.include_router(reports.router)
app.include_router(summaries.router)

from app.config import DeadlineConfig, get_deadline_config, save_deadline_config

@app.get("/api/settings/deadline")
def api_get_deadline():
    return get_deadline_config()

@app.put("/api/settings/deadline")
def api_update_deadline(cfg: DeadlineConfig, db: Session = Depends(get_db)):
    save_deadline_config(cfg)
    current_period = get_or_create_current_period(db)
    info = WeekPeriod.calc_for_date(current_period.week_start)
    current_period.deadline = info["deadline"]
    db.commit()
    return {"message": "截止时间已更新", "new_deadline": current_period.deadline.isoformat()}


from pydantic import BaseModel
class PeriodExtendParams(BaseModel):
    weeks: int

@app.post("/api/settings/period/extend")
def api_extend_period(params: PeriodExtendParams, db: Session = Depends(get_db)):
    from datetime import timedelta
    current_period = get_or_create_current_period(db)
    current_period.week_end += timedelta(days=7 * params.weeks)
    current_period.deadline += timedelta(days=7 * params.weeks)
    db.commit()
    db.refresh(current_period)
    return {
        "message": f"已将当前周期{'顺延' if params.weeks > 0 else '缩短'} {abs(params.weeks)} 周",
        "week_end": current_period.week_end.isoformat(),
        "deadline": current_period.deadline.isoformat()
    }


# ── 页面路由 ──────────────────────────────────

@app.get("/")
def page_index(request: Request, db: Session = Depends(get_db)):
    period = get_or_create_current_period(db)
    status = get_submission_status(db, period)
    weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    deadline_str = f"{weekdays[period.deadline.weekday()]} {period.deadline.strftime('%H:%M')}"
    return jinja_templates.TemplateResponse("index.html", {
        "request": request,
        "active_page": "index",
        "period": period,
        "status": status,
        "deadline_str": deadline_str,
    })


@app.get("/members")
def page_members(request: Request, db: Session = Depends(get_db)):
    all_members = db.query(Member).order_by(Member.id).all()
    return jinja_templates.TemplateResponse("members.html", {
        "request": request,
        "active_page": "members",
        "members": all_members,
    })


@app.get("/report/new")
def page_report_form(request: Request, db: Session = Depends(get_db)):
    period = get_or_create_current_period(db)
    active_members = db.query(Member).filter(Member.is_active == True).all()
    all_templates = db.query(ReportTemplate).all()
    default_tpl = db.query(ReportTemplate).filter(ReportTemplate.is_default == True).first()
    return jinja_templates.TemplateResponse("report_form.html", {
        "request": request,
        "active_page": "report_form",
        "period": period,
        "members": active_members,
        "templates": all_templates,
        "default_template": default_tpl,
    })


@app.get("/reports")
def page_reports(request: Request, period_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(WeeklyReport).options(
        joinedload(WeeklyReport.member),
        joinedload(WeeklyReport.week_period),
    )
    if period_id:
        query = query.filter(WeeklyReport.week_period_id == period_id)
    all_reports = query.order_by(WeeklyReport.submitted_at.desc()).all()
    periods = db.query(WeekPeriod).order_by(WeekPeriod.week_start.desc()).all()
    current_period = get_or_create_current_period(db)
    return jinja_templates.TemplateResponse("reports.html", {
        "request": request,
        "active_page": "reports",
        "reports": all_reports,
        "periods": periods,
        "selected_period_id": period_id,
        "current_period_id": current_period.id,
    })


@app.get("/templates")
def page_templates(request: Request, db: Session = Depends(get_db)):
    all_templates = db.query(ReportTemplate).order_by(ReportTemplate.id).all()
    return jinja_templates.TemplateResponse("templates_mgmt.html", {
        "request": request,
        "active_page": "templates",
        "templates": all_templates,
    })


@app.get("/summary")
def page_summary(request: Request, db: Session = Depends(get_db)):
    all_summaries = (
        db.query(WeeklySummary)
        .options(joinedload(WeeklySummary.week_period))
        .order_by(WeeklySummary.generated_at.desc())
        .all()
    )
    current_period = get_or_create_current_period(db)
    current_summary = next((s for s in all_summaries if s.week_period_id == current_period.id), None)

    return jinja_templates.TemplateResponse("summary.html", {
        "request": request,
        "active_page": "summary",
        "summaries": all_summaries,
        "current_period_id": current_period.id,
        "current_summary": current_summary,
    })
