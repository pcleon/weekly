from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.database import get_db
from app.models import Member, ReportTemplate, WeeklyReport, WeeklySummary, WeekPeriod
from app.services.report_service import get_or_create_current_period, get_submission_status

from app.api import members, templates, reports, summaries, pages
from app.logger import setup_logging

# 初始化日志配置
setup_logging()

settings = get_settings()

app = FastAPI(title=settings.app_title)

# 静态文件
import os
app.mount("/static", StaticFiles(directory="app/static"), name="static")

frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
frontend_assets = os.path.join(frontend_dist, "assets")
os.makedirs(frontend_assets, exist_ok=True)
app.mount("/assets", StaticFiles(directory=frontend_assets), name="assets")

# 注册 API 路由
from starlette.middleware.sessions import SessionMiddleware
app.add_middleware(SessionMiddleware, secret_key=settings.sso_secret_key or "secret-key")

from app.api import auth
app.include_router(auth.router, prefix="/api")

app.include_router(members.router)
app.include_router(templates.router)
app.include_router(reports.router)
app.include_router(summaries.router)
app.include_router(pages.router)

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


# ── 页面路由 (React SPA Catch-all) ──────────────────────────────────
from fastapi.responses import HTMLResponse

@app.get("/{full_path:path}")
def serve_react_app(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
        
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    return HTMLResponse(content="React app not built yet. Run 'npm run build' in frontend directory.", status_code=404)
