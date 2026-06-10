from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from itsdangerous import URLSafeTimedSerializer

from app.config import get_settings
from app.database import get_db
from app.models import Member

settings = get_settings()

def get_signer():
    return URLSafeTimedSerializer(settings.sso_secret_key)

def get_current_user(request: Request, db: Session = Depends(get_db)) -> Member:
    if not settings.enable_sso:
        # Development mode without SSO
        dummy = Member(id=0, name="开发模式", department="Dev", is_active=True)
        return dummy
        
    token = request.cookies.get("sso_token")
    if not token:
        raise HTTPException(status_code=401, detail="未登录")
        
    signer = get_signer()
    try:
        data = signer.loads(token, max_age=7 * 24 * 3600)
    except Exception:
        raise HTTPException(status_code=401, detail="凭证无效或已过期")
        
    member = db.query(Member).filter(Member.id == data["member_id"]).first()
    if not member or not member.is_active:
        raise HTTPException(status_code=401, detail="账号不存在或已被禁用")
        
    return member
