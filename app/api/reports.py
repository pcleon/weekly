from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from datetime import datetime

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
    """查询并获取周报记录列表。

    支持根据指定的周期 ID 或成员 ID 进行过滤，默认按照提交时间倒序排列。

    Args:
        week_period_id: 过滤的周期 ID。
        member_id: 过滤的成员 ID。
        db: 数据库 Session 对象。

    Returns:
        ReportOut 模式对应的周报列表。
    """
    query = db.query(WeeklyReport).options(
        joinedload(WeeklyReport.member),
        joinedload(WeeklyReport.personal_report)
    )
    if week_period_id:
        query = query.filter(WeeklyReport.week_period_id == week_period_id)
    if member_id:
        query = query.filter(WeeklyReport.member_id == member_id)
    return query.order_by(WeeklyReport.submitted_at.desc()).all()


@router.post("", response_model=ReportOut, status_code=201)
def create_report(data: ReportCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """提交保存个人的工作周报（包含公开团队周报与私密个人完整周报）。

    如果当前成员本周已提交过周报，则拒绝操作。
    提交成功后，如果本周期内所有活跃成员全部已提交完毕，则会触发后台异步任务自动生成本周 AI 汇总。

    Args:
        data: 提交内容的 ReportCreate 数据对象。
        background_tasks: FastAPI 的后台异步任务管理器。
        db: 数据库 Session 对象。

    Returns:
        保存的 WeeklyReport 周报对象。

    Raises:
        HTTPException: 当成员本周重复提交周报或保存数据库异常时抛出。
    """
    period = get_or_create_current_period(db)

    # 检查是否已提交过
    existing = db.query(WeeklyReport).filter(
        WeeklyReport.member_id == data.member_id,
        WeeklyReport.week_period_id == period.id,
    ).first()
    if existing:
        raise HTTPException(400, "该成员本周已提交周报，请使用编辑功能修改")

    from app.models import WeeklyPersonalReport
    try:
        report = WeeklyReport(
            member_id=data.member_id,
            template_id=data.template_id,
            week_period_id=period.id,
            content=data.content,
        )
        db.add(report)
        db.flush()

        personal_report = WeeklyPersonalReport(
            weekly_report_id=report.id,
            member_id=data.member_id,
            template_id=data.personal_template_id,
            week_period_id=period.id,
            content=data.personal_content,
        )
        db.add(personal_report)
        db.commit()
        db.refresh(report)

        # 检查是否可以触发自动生成汇总
        try:
            from app.models import WeeklySummary
            status = get_submission_status(db, period)
            if status["submitted_count"] == status["total"] and status["total"] > 0:
                existing = db.query(WeeklySummary).filter(WeeklySummary.week_period_id == period.id).first()
                if not existing:
                    from app.services.summary_service import generate_summary_task
                    background_tasks.add_task(generate_summary_task, period.id)
        except Exception as e:
            from loguru import logger
            logger.error(f"检查触发自动生成汇总失败: {e}", exc_info=True)

        return report
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"提交周报失败: {str(e)}")


@router.put("/{report_id}", response_model=ReportOut)
def update_report(report_id: int, data: ReportUpdate, db: Session = Depends(get_db)):
    """更新已提交的个人周报内容。

    允许且仅允许更新当前进行中周期的周报，历史周期的周报不允许被修改。

    Args:
        report_id: 周报记录的 ID。
        data: 包含更新内容的 ReportUpdate 数据对象。
        db: 数据库 Session 对象。

    Returns:
        修改后的 WeeklyReport 周报对象。

    Raises:
        HTTPException: 当周报不存在或试图修改历史周期周报时抛出。
    """
    report = db.query(WeeklyReport).options(joinedload(WeeklyReport.personal_report)).filter(WeeklyReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "周报不存在")
    current_period = get_or_create_current_period(db)
    if report.week_period_id != current_period.id:
        raise HTTPException(403, "历史周期的周报不允许修改")
    
    from app.models import WeeklyPersonalReport
    try:
        report.content = data.content
        report.submitted_at = datetime.now()
        
        if report.personal_report:
            report.personal_report.content = data.personal_content
        else:
            personal_report = WeeklyPersonalReport(
                weekly_report_id=report.id,
                member_id=report.member_id,
                template_id=None,
                week_period_id=report.week_period_id,
                content=data.personal_content,
            )
            db.add(personal_report)
        db.commit()
        db.refresh(report)
        return report
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"更新周报失败: {str(e)}")


@router.get("/status", response_model=SubmissionStatus)
def report_status(db: Session = Depends(get_db)):
    """获取当前周报周期的成员提交情况状态。

    Returns:
        包含已提交成员名单、未提交人员名单和提交总数的 SubmissionStatus 对象。
    """
    period = get_or_create_current_period(db)
    return get_submission_status(db, period)


@router.get("/periods", response_model=list)
def list_periods(db: Session = Depends(get_db)):
    """获取系统中的所有周报周期记录列表。

    默认以周起始日期倒序排列。

    Args:
        db: 数据库 Session 对象。

    Returns:
        包含所有周期信息列表。
    """
    from app.schemas import WeekPeriodOut
    periods = db.query(WeekPeriod).order_by(WeekPeriod.week_start.desc()).all()
    return [WeekPeriodOut.model_validate(p) for p in periods]

