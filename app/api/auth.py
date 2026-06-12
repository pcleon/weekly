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
    # 构造 SSO 注册配置参数，优先使用标准的 OIDC 发现文档地址。
    # 若配置了 sso_server_metadata_url，则 Authlib 会自动加载所有关联端点。
    # 否则，回退到原有的自定义端点和兼容替换逻辑。
    sso_config = {
        "name": "sso",
        "client_id": settings.sso_client_id,
        "client_secret": settings.sso_client_secret,
        "client_kwargs": {"scope": "openid profile email"},
    }
    if settings.sso_server_metadata_url:
        sso_config["server_metadata_url"] = settings.sso_server_metadata_url
    else:
        sso_config["server_metadata_url"] = (
            settings.sso_userinfo_url.replace("/userinfo", "/.well-known/openid-configuration")
            if settings.sso_userinfo_url
            else None
        )
        sso_config["authorize_url"] = settings.sso_authorize_url
        sso_config["access_token_url"] = settings.sso_token_url
        sso_config["userinfo_endpoint"] = settings.sso_userinfo_url

    oauth.register(**sso_config)

def get_signer():
    """获取 URL 安全的数据签名序列化器。

    使用 settings.sso_secret_key 进行签名，保障 Session Token 的完整性。

    Returns:
        URLSafeTimedSerializer 实例。
    """
    return URLSafeTimedSerializer(settings.sso_secret_key)

@router.get("/login")
async def login(request: Request):
    """单点登录 (SSO) 认证重定向入口。

    若系统未开启 SSO，则直接重定向到主页；
    若开启 SSO，则跳转至 SSO 服务商的授权页面。

    Args:
        request: FastAPI 的 HTTP 请求对象。

    Returns:
        重定向响应 (RedirectResponse)。
    """
    if not settings.enable_sso:
        return RedirectResponse(url="/")
    redirect_uri = request.url_for("auth_callback")
    # For local development behind proxy, ensure https or correct domain if needed
    # redirect_uri = "http://localhost:8000/api/auth/callback" 
    return await oauth.sso.authorize_redirect(request, str(redirect_uri))

@router.get("/callback")
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    """SSO 单点登录成功后的回调处理接口。

    根据 SSO 授权码换取 Token 并提取用户信息。若用户首次登录且在 members 表中不存在，
    则会自动为其创建 Member 记录。登录成功后为其颁发 7 天有效的签名 Cookie 并重定向至主页。

    Args:
        request: FastAPI 的 HTTP 请求对象。
        db: 数据库 Session 对象。

    Returns:
        携带安全 Cookie 的重定向响应。

    Raises:
        HTTPException: 当 SSO 校验失败或用户账号被禁用时抛出。
    """
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

    # 自动创建或查找用户
    member = db.query(Member).filter(Member.name == name).first()
    if not member:
        member = Member(name=name, department="自动创建(SSO)")
        db.add(member)
        db.commit()
        db.refresh(member)

    if not member.is_active:
        raise HTTPException(status_code=403, detail="账号已被禁用")

    signer = get_signer()
    # 颁发有效期为 7 天的 Token
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
async def logout(request: Request):
    """退出登录接口。

    清除本地的 sso_token Cookie。如果开启了 SSO 且支持 OIDC 登出端点，
    则重定向到 SSO 提供商的登出页面以清除 SSO 会话；否则直接重定向到本地登录页面。

    Args:
        request: FastAPI 请求对象。

    Returns:
        重定向响应。
    """
    res = RedirectResponse(url="/login", status_code=303)
    res.delete_cookie("sso_token")

    if settings.enable_sso:
        try:
            metadata = await oauth.sso.load_server_metadata()
            end_session_endpoint = metadata.get("end_session_endpoint")
            if end_session_endpoint:
                from urllib.parse import quote
                post_logout_redirect_uri = f"{request.base_url}login"
                logout_url = (
                    f"{end_session_endpoint}"
                    f"?post_logout_redirect_uri={quote(post_logout_redirect_uri)}"
                    f"&client_id={settings.sso_client_id}"
                )
                res = RedirectResponse(url=logout_url, status_code=303)
                res.delete_cookie("sso_token")
        except Exception:
            pass

    return res

@router.get("/me")
async def get_me(request: Request, db: Session = Depends(get_db)):
    """获取当前已登录的用户信息。

    如果未开启 SSO，则默认返回免登录的开发人员 Mock 信息。
    如果开启了 SSO，则验证客户端传来的 sso_token 签名并返回用户详情。

    Args:
        request: FastAPI 的 HTTP 请求对象。
        db: 数据库 Session 对象。

    Returns:
        包含当前成员 ID、姓名及所属部门的字典。

    Raises:
        HTTPException: 当未登录、签名校验失效或用户被禁用时抛出 401。
    """
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
