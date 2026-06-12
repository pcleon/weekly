import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ReportTemplate
from app.schemas import TemplateUpdate, TemplateOut

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "templates")

from app.api.deps import get_current_user

router = APIRouter(prefix="/api/templates", tags=["模板管理"], dependencies=[Depends(get_current_user)])


def extract_docx_text(file_path: str) -> str:
    """从本地 Word (.docx) 文件中提取其中的所有纯文本内容。

    按段落读取文本，并用换行符连接。

    Args:
        file_path: 本地 .docx 文件的绝对路径。

    Returns:
        解析提取出来的纯文本字符串。
    """
    from docx import Document
    doc = Document(file_path)
    lines = []
    for para in doc.paragraphs:
        lines.append(para.text)
    return "\n".join(lines)


@router.get("", response_model=list[TemplateOut])
def list_templates(db: Session = Depends(get_db)):
    """获取所有已录入的周报模板列表。

    以模板 ID 升序排列。

    Args:
        db: 数据库 Session 对象。

    Returns:
        TemplateOut 模式对应的模板列表。
    """
    templates = db.query(ReportTemplate).order_by(ReportTemplate.id).all()
    return [TemplateOut.from_orm_with_file(t) for t in templates]


@router.get("/{template_id}", response_model=TemplateOut)
def get_template(template_id: int, db: Session = Depends(get_db)):
    """获取指定 ID 的周报模板详情。

    Args:
        template_id: 目标模板的 ID。
        db: 数据库 Session 对象。

    Returns:
        TemplateOut 对应的数据详情。

    Raises:
        HTTPException: 当模板不存在时抛出 404。
    """
    tpl = db.get(ReportTemplate, template_id)
    if not tpl:
        raise HTTPException(404, "模板不存在")
    return TemplateOut.from_orm_with_file(tpl)


@router.post("", response_model=TemplateOut, status_code=201)
async def create_template(
    name: str = Form(...),
    content: str = Form(""),
    is_default: bool = Form(False),
    system_prompt: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    """新建一个工作周报模板。

    支持直接输入富文本内容，也支持上传 .docx 模板附件文件。如果上传了附件，
    系统会自动对文件大小 (<=10MB)、Magic Number (PK..) 进行安全校验防范伪装，并提取文本填充内容。

    Args:
        name: 模板名称。
        content: 模板主体文本内容，若上传了文件且内容为空，则会自动解析并提取文件内容。
        is_default: 是否设为默认模板。若设为默认，系统会自动把之前的默认模板置为非默认。
        system_prompt: AI汇总系统设定提示词。
        file: 上传的模板文件附件 (仅限 .docx 格式)。
        db: 数据库 Session 对象。

    Returns:
        新创建并保存的 ReportTemplate 模板实体。

    Raises:
        HTTPException: 当文件格式非法、文件过大、内容为空或文件损坏时抛出。
    """
    file_path = None

    # 处理 docx 上传
    if file and file.filename:
        if not file.filename.lower().endswith(".docx"):
            raise HTTPException(400, "安全警告：仅支持 .docx 格式文件")
            
        file_data = await file.read()
        
        # 安全检查 1: 文件大小限制 (最大 10MB)
        MAX_SIZE = 10 * 1024 * 1024
        if len(file_data) > MAX_SIZE:
            raise HTTPException(413, "安全警告：文件大小不能超过 10MB")
            
        # 安全检查 2: 文件魔数 (Magic Number) 校验真实的 docx(zip) 文件头
        if len(file_data) < 4 or not file_data.startswith(b"PK"):
            raise HTTPException(400, "安全警告：非法的文件内容，文件可能被伪装")
            
        # 保存文件
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        filename = f"{uuid.uuid4().hex}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(file_data)
        # 提取文本内容
        if not content.strip():
            content = extract_docx_text(file_path)

    if not content.strip():
        raise HTTPException(400, "请提供模板内容或上传 docx 文件")

    if is_default:
        db.query(ReportTemplate).filter(
            ReportTemplate.is_default == True
        ).update({"is_default": False})

    tpl = ReportTemplate(
        name=name, content=content,
        file_path=file_path, is_default=is_default,
        system_prompt=system_prompt,
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return TemplateOut.from_orm_with_file(tpl)


@router.put("/{template_id}", response_model=TemplateOut)
def update_template(template_id: int, data: TemplateUpdate, db: Session = Depends(get_db)):
    """修改更新指定 ID 的周报模板信息。

    Args:
        template_id: 模板的 ID。
        data: 包含更新内容的 TemplateUpdate 数据对象。
        db: 数据库 Session 对象。

    Returns:
        修改后的 ReportTemplate 模板实体。

    Raises:
        HTTPException: 当模板不存在时抛出 404。
    """
    tpl = db.get(ReportTemplate, template_id)
    if not tpl:
        raise HTTPException(404, "模板不存在")
    updates = data.model_dump(exclude_unset=True)
    if updates.get("is_default"):
        db.query(ReportTemplate).filter(
            ReportTemplate.is_default == True, ReportTemplate.id != template_id
        ).update({"is_default": False})
    for field, value in updates.items():
        setattr(tpl, field, value)
    db.commit()
    db.refresh(tpl)
    return TemplateOut.from_orm_with_file(tpl)


@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    """删除指定的周报模板。

    物理删除模板记录，并会自动清理删除存储在本地磁盘上的关联 docx 文件。

    Args:
        template_id: 模板的 ID。
        db: 数据库 Session 对象。

    Returns:
        包含成功提示的字典。

    Raises:
        HTTPException: 当模板不存在时抛出 404。
    """
    tpl = db.get(ReportTemplate, template_id)
    if not tpl:
        raise HTTPException(404, "模板不存在")
    # 删除关联文件
    if tpl.file_path and os.path.exists(tpl.file_path):
        os.remove(tpl.file_path)
    db.delete(tpl)
    db.commit()
    return {"message": "已删除"}


@router.put("/{template_id}/default", response_model=TemplateOut)
def set_default(template_id: int, db: Session = Depends(get_db)):
    """将指定 ID 的周报模板设为系统默认模板。

    被设为默认后，系统会自动把之前的默认模板重置。

    Args:
        template_id: 模板的 ID。
        db: 数据库 Session 对象。

    Returns:
        设置为默认后的 ReportTemplate 模板实体。

    Raises:
        HTTPException: 当模板不存在时抛出 404。
    """
    tpl = db.get(ReportTemplate, template_id)
    if not tpl:
        raise HTTPException(404, "模板不存在")
    db.query(ReportTemplate).filter(
        ReportTemplate.is_default == True
    ).update({"is_default": False})
    tpl.is_default = True
    db.commit()
    db.refresh(tpl)
    return TemplateOut.from_orm_with_file(tpl)


@router.get("/{template_id}/download")
def download_template(template_id: int, db: Session = Depends(get_db)):
    """下载指定模板关联的 .docx 原始附件文件。

    Args:
        template_id: 模板的 ID。
        db: 数据库 Session 对象。

    Returns:
        文件流下载响应 (FileResponse)。

    Raises:
        HTTPException: 当模板不存在、未关联附件文件或本地文件损坏丢失时抛出。
    """
    tpl = db.get(ReportTemplate, template_id)
    if not tpl or not tpl.file_path:
        raise HTTPException(404, "该模板没有关联的 docx 文件")
    if not os.path.exists(tpl.file_path):
        raise HTTPException(404, "文件已丢失")
    return FileResponse(
        tpl.file_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=f"{tpl.name}.docx",
    )
