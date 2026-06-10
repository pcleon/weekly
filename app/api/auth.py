from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from itsdangerous import URLSafeTimedSerializer

from app.config import get_settings
from app.database import get_db
from app.models import Member

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

oauth = OAuth()

if settings.enable_sso:
    oauth.register(
        name="sso",
        client_id=settings.sso_client_id,
        client_secret=settings.sso_client_secret,
        server_metadata_url=settings.sso_userinfo_url.replace("/userinfo", "/.well-known/openid-configuration") if settings.sso_userinfo_url else None,
        authorize_url=settings.sso_authorize_url,
        access_token_url=settings.sso_token_url,
        userinfo_endpoint=settings.sso_userinfo_url,
        client_kwargs={"scope": "openid profile email"},
    )

def get_signer():
    return URLSafeTimedSerializer(settings.sso_secret_key)

@router.get("/login")
async def login(request: Request):
    if not settings.enable_sso:
        return RedirectResponse(url="/")
    redirect_uri = request.url_for("auth_callback")
    # For local development behind proxy, ensure https or correct domain if needed
    # redirect_uri = "http://localhost:8000/api/auth/callback" 
    return await oauth.sso.authorize_redirect(request, str(redirect_uri))

@router.get("/callback")
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    if not settings.enable_sso:
        return RedirectResponse(url="/")
        
    try:
        token = await oauth.sso.authorize_access_token(request)
        userinfo = token.get("userinfo") or await oauth.sso.userinfo(token=token)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SSO Auth Failed: {str(e)}")

    name = userinfo.get("name") or userinfo.get("preferred_username") or userinfo.get("email", "").split("@")[0]
    email = userinfo.get("email", "")

    if not name:
        raise HTTPException(status_code=400, detail="Cannot get user name from SSO")

    # Auto-create or find user
    member = db.query(Member).filter(Member.name == name).first()
    if not member:
        member = Member(name=name, department="自动创建(SSO)")
        db.add(member)
        db.commit()
        db.refresh(member)

    if not member.is_active:
        raise HTTPException(status_code=403, detail="账号已被禁用")

    signer = get_signer()
    # Create token valid for 7 days
    token_str = signer.dumps({"member_id": member.id, "name": member.name})
    
    response = RedirectResponse(url="/")
    response.set_cookie(
        key="sso_token",
        value=token_str,
        httponly=True,
        max_age=7 * 24 * 3600,
        samesite="lax"
    )
    return response

@router.post("/logout")
async def logout():
    response = {"message": "已退出登录"}
    res = RedirectResponse(url="/login")
    res.delete_cookie("sso_token")
    return res

@router.get("/me")
async def get_me(request: Request, db: Session = Depends(get_db)):
    if not settings.enable_sso:
        return {"id": 0, "name": "开发模式免登录", "department": "Dev"}
        
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
        
    return {"id": member.id, "name": member.name, "department": member.department}
