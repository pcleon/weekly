from fastapi import FastAPI, Request, Depends, HTTPException
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

# 前端静态资源挂载
import os
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
frontend_assets = os.path.join(frontend_dist, "assets")
os.makedirs(frontend_assets, exist_ok=True)

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


@app.post("/api/mock-mail")
async def mock_mail(request: Request):
    """模拟邮件发送服务的 HTTP 接口。

    解析多部分表单数据中的邮件主题、正文、收件人和附件信息并打印日志。

    Args:
        request: FastAPI 请求对象。

    Returns:
        包含成功状态及邮件主题的字典。
    """
    form_data = await request.form()
    subject = form_data.get("subject")
    body = form_data.get("body")
    to_list = form_data.getlist("to")
    token = request.headers.get("token")

    # 处理附件名
    attachments = []
    from loguru import logger
    logger.info(f"[Mock Mail] Form keys: {list(form_data.keys())}")
    
    # Iterate through all items in form_data
    for key, value in form_data.items():
        logger.info(f"[Mock Mail] Item key: {key}, Type: {type(value)}, Value: {value}")
        
    upload_files = form_data.getlist("attach")
    for uf in upload_files:
        if hasattr(uf, "filename"):
            attachments.append(uf.filename)
        elif hasattr(uf, "name"):
            attachments.append(uf.name)
        else:
            attachments.append(str(uf))

    logger.info(
        f"[Mock Mail] 收到邮件发送请求: 主题='{subject}', "
        f"收件人={to_list}, Token='{token}', 附件数={len(attachments)} {attachments}"
    )
    return {
        "status": "success",
        "message": "Mail sent successfully via mock service",
        "subject": subject,
        "to": to_list
    }


# ── 页面路由 (React SPA Catch-all) ──────────────────────────────────
from fastapi.responses import HTMLResponse, FileResponse

@app.get("/{full_path:path}")
def serve_react_app(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
        
    # 如果请求的是实际存在的静态文件（例如 fonts/Inter-700.woff2, favicon.svg 等），则直接返回该文件
    file_path = os.path.join(frontend_dist, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
        
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    return HTMLResponse(content="React app not built yet. Run 'npm run build' in frontend directory.", status_code=404)
