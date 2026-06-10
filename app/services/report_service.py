from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import WeekPeriod, WeeklyReport, Member


def get_or_create_current_period(db: Session) -> WeekPeriod:
    """获取或创建当前周期"""
    tz = ZoneInfo(get_settings().timezone)
    today = datetime.now(tz).date()
    
    # 优先查找是否有覆盖今天的跨周周期（如节假日顺延产生的）
    active_period = db.query(WeekPeriod).filter(
        WeekPeriod.week_start <= today,
        WeekPeriod.week_end >= today
    ).first()
    
    if active_period:
        return active_period

    info = WeekPeriod.calc_for_date(today)

    period = db.query(WeekPeriod).filter(
        WeekPeriod.week_start == info["week_start"]
    ).first()

    if not period:
        period = WeekPeriod(**info)
        db.add(period)
        db.commit()
        db.refresh(period)
    return period


def get_submission_status(db: Session, period: WeekPeriod) -> dict:
    """获取指定周期的提交状态"""
    all_members = db.query(Member).filter(Member.is_active == True).all()
    
    reports = db.query(WeeklyReport).filter(
        WeeklyReport.week_period_id == period.id
    ).order_by(WeeklyReport.submitted_at.desc()).all()
    
    submitted_ids = set()
    submitted = []
    
    member_dict = {m.id: m for m in all_members}
    for r in reports:
        if r.member_id in member_dict and r.member_id not in submitted_ids:
            submitted_ids.add(r.member_id)
            submitted.append({
                "member": member_dict[r.member_id],
                "submitted_at": r.submitted_at
            })
            
    not_submitted = [m for m in all_members if m.id not in submitted_ids]
    
    return {
        "week_period": period,
        "submitted": submitted,
        "not_submitted": not_submitted,
        "total": len(all_members),
        "submitted_count": len(submitted),
    }
