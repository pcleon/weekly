from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import WeekPeriod, WeeklyReport, Member


def get_or_create_current_period(db: Session) -> WeekPeriod:
    """获取或自动创建当前的周报周期。

    首先根据当前本地日期寻找是否已存在包含今天的周报周期（可包容跨周顺延）；
    若不存在，则计算本周对应的周期起止时间，并在数据库中创建并保存该周期的记录。

    Args:
        db: 数据库 Session 会话对象。

    Returns:
        当前的 WeekPeriod 周期实体对象。
    """
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
    """统计获取指定周报周期中所有活跃成员的提交状态。

    统计在当前周期内已提交和未提交周报的活跃成员名单、总人数及已提交人数。

    Args:
        db: 数据库 Session 会话对象。
        period: 需要统计的 WeekPeriod 目标周期对象。

    Returns:
        包含 "week_period", "submitted", "not_submitted", "total", "submitted_count" 的字典。
    """
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
