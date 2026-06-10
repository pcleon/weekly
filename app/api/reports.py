from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import WeeklyReport, WeekPeriod, Member
from app.schemas import ReportCreate, ReportUpdate, ReportOut, SubmissionStatus
from app.services.report_service import get_or_create_current_period, get_submission_status

from app.api.deps import get_current_user

router = APIRouter(prefix="/api/reports", tags=["周报管理"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[ReportOut])
def list_reports(
    week_period_id: int | None = None,
    member_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(WeeklyReport).options(joinedload(WeeklyReport.member))
    if week_period_id:
        query = query.filter(WeeklyReport.week_period_id == week_period_id)
    if member_id:
        query = query.filter(WeeklyReport.member_id == member_id)
    return query.order_by(WeeklyReport.submitted_at.desc()).all()


@router.post("", response_model=ReportOut, status_code=201)
def create_report(data: ReportCreate, db: Session = Depends(get_db)):
    period = get_or_create_current_period(db)

    # 检查是否已提交
    existing = db.query(WeeklyReport).filter(
        WeeklyReport.member_id == data.member_id,
        WeeklyReport.week_period_id == period.id,
    ).first()
    if existing:
        raise HTTPException(400, "该成员本周已提交周报，请使用编辑功能修改")

    report = WeeklyReport(
        member_id=data.member_id,
        template_id=data.template_id,
        week_period_id=period.id,
        content=data.content,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.put("/{report_id}", response_model=ReportOut)
def update_report(report_id: int, data: ReportUpdate, db: Session = Depends(get_db)):
    report = db.get(WeeklyReport, report_id)
    if not report:
        raise HTTPException(404, "周报不存在")
    current_period = get_or_create_current_period(db)
    if report.week_period_id != current_period.id:
        raise HTTPException(403, "历史周期的周报不允许修改")
    report.content = data.content
    db.commit()
    db.refresh(report)
    return report


@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    report = db.get(WeeklyReport, report_id)
    if not report:
        raise HTTPException(404, "周报不存在")
    db.delete(report)
    db.commit()
    return {"message": "已删除"}


@router.post("/{report_id}/delete")
def delete_report_post(report_id: int, db: Session = Depends(get_db)):
    return delete_report(report_id, db)


@router.get("/status", response_model=SubmissionStatus)
def report_status(db: Session = Depends(get_db)):
    period = get_or_create_current_period(db)
    return get_submission_status(db, period)


@router.get("/periods", response_model=list)
def list_periods(db: Session = Depends(get_db)):
    """获取所有周期列表"""
    from app.schemas import WeekPeriodOut
    periods = db.query(WeekPeriod).order_by(WeekPeriod.week_start.desc()).all()
    return [WeekPeriodOut.model_validate(p) for p in periods]

