from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import WeekPeriod, WeeklyReport, Member


def get_or_create_current_period(db: Session) -> WeekPeriod:
    """获取或创建当前周期"""
    tz = ZoneInfo(get_settings().timezone)
    today = datetime.now(tz).date()
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
    submitted_ids = {
        r.member_id
        for r in db.query(WeeklyReport.member_id).filter(
            WeeklyReport.week_period_id == period.id
        ).all()
    }
    submitted = [m for m in all_members if m.id in submitted_ids]
    not_submitted = [m for m in all_members if m.id not in submitted_ids]
    return {
        "week_period": period,
        "submitted": submitted,
        "not_submitted": not_submitted,
        "total": len(all_members),
        "submitted_count": len(submitted),
    }
