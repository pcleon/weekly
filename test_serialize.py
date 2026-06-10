from app.database import SessionLocal
from app.models import WeeklyReport
from app.schemas import ReportOut
from sqlalchemy.orm import joinedload

db = SessionLocal()
report = db.query(WeeklyReport).options(joinedload(WeeklyReport.week_period)).first()
if report:
    out = ReportOut.model_validate(report)
    print(out.model_dump_json())
else:
    print("No report")
