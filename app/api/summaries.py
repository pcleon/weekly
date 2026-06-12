from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel

from app.database import get_db
from app.models import WeeklySummary
from app.schemas import SummaryOut, SummaryUpdate
from app.services.report_service import get_or_create_current_period
from app.services.summary_service import generate_summary, get_summary_prompt, save_summary_prompt, get_system_prompt, save_system_prompt

from app.api.deps import get_current_user

router = APIRouter(prefix="/api/summaries", tags=["汇总管理"], dependencies=[Depends(get_current_user)])

class PromptUpdate(BaseModel):
    user_template: str
    system_prompt: str

@router.get("/prompt")
def get_prompt():
    """获取当前的周报汇总模版配置（包括用户模板和系统角色提示词）。

    Returns:
        包含 user_template 和 system_prompt 的字典。
    """
    return {
        "user_template": get_summary_prompt(),
        "system_prompt": get_system_prompt()
    }

@router.put("/prompt")
def update_prompt(data: PromptUpdate):
    """更新并保存周报汇总模板配置。

    Args:
        data: 包含更新内容的 PromptUpdate 数据传输对象。

    Returns:
        包含成功提示的字典。
    """
    save_summary_prompt(data.user_template)
    save_system_prompt(data.system_prompt)
    return {"message": "提示词配置已更新"}


@router.post("/generate", response_model=SummaryOut)
def trigger_summary(db: Session = Depends(get_db)):
    """手动触发生成当前周期的 AI 工作周报汇总。

    若当前周期没有任何成员提交周报，则拒绝生成。

    Args:
        db: 数据库 Session 对象。

    Returns:
        新生成的 WeeklySummary 汇总实体。

    Raises:
        HTTPException: 当无周报可汇总导致生成失败时抛出 400。
    """
    period = get_or_create_current_period(db)
    try:
        summary = generate_summary(db, period)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return summary


@router.get("", response_model=list[SummaryOut])
def list_summaries(db: Session = Depends(get_db)):
    """获取所有历史周报 AI 汇总结果列表。

    默认以生成时间倒序排列。

    Args:
        db: 数据库 Session 对象。

    Returns:
        WeeklySummary 汇总对象列表。
    """
    return (
        db.query(WeeklySummary)
        .options(joinedload(WeeklySummary.week_period))
        .order_by(WeeklySummary.generated_at.desc())
        .all()
    )


@router.get("/{summary_id}", response_model=SummaryOut)
def get_summary(summary_id: int, db: Session = Depends(get_db)):
    """获取指定 ID 的 AI 汇总记录详情。

    Args:
        summary_id: 汇总记录的 ID。
        db: 数据库 Session 对象。

    Returns:
        WeeklySummary 实体详情。

    Raises:
        HTTPException: 当寻找的汇总不存在时报 404。
    """
    summary = (
        db.query(WeeklySummary)
        .options(joinedload(WeeklySummary.week_period))
        .filter(WeeklySummary.id == summary_id)
        .first()
    )
    if not summary:
        raise HTTPException(404, "汇总不存在")
    return summary


@router.put("/{summary_id}", response_model=SummaryOut)
def update_summary(summary_id: int, data: SummaryUpdate, db: Session = Depends(get_db)):
    """编辑更新指定 ID 的 AI 汇总报告文本内容。

    Args:
        summary_id: 汇总记录的 ID。
        data: 修改内容的数据对象。
        db: 数据库 Session 对象。

    Returns:
        更新后的 WeeklySummary 实体对象。

    Raises:
        HTTPException: 当汇总不存在时抛出 404。
    """
    summary = db.get(WeeklySummary, summary_id)
    if not summary:
        raise HTTPException(404, "汇总不存在")
    summary.summary_content = data.summary_content
    db.commit()
    db.refresh(summary)
    return summary


@router.delete("/{summary_id}")
def delete_summary(summary_id: int, db: Session = Depends(get_db)):
    """删除指定的 AI 汇总记录。

    只允许删除当前周期的汇总，历史周期的汇总被保护且不允许被删除。

    Args:
        summary_id: 汇总记录的 ID。
        db: 数据库 Session 对象。

    Returns:
        包含成功提示的字典。

    Raises:
        HTTPException: 当汇总不存在或试图删除历史周期汇总时抛出。
    """
    summary = db.get(WeeklySummary, summary_id)
    if not summary:
        raise HTTPException(404, "汇总不存在")
    current_period = get_or_create_current_period(db)
    if summary.week_period_id != current_period.id:
        raise HTTPException(403, "历史周期的汇总不允许删除")
    db.delete(summary)
    db.commit()
    return {"message": "已删除"}


@router.get("/{summary_id}/download")
def download_summary(summary_id: int, db: Session = Depends(get_db)):
    """将指定 ID 的 AI 汇总报告导出并下载为 Word 格式（.docx）文档。

    从数据库中提取周报汇总 Markdown 文本，逐行解析其标题和列表结构，
    并使用 python-docx 动态排版、应用中西文字体（Times New Roman + 仿宋），
    最终以二进制文件流的形式返回给客户端。

    Args:
        summary_id: 汇总记录的 ID。
        db: 数据库 Session 对象。

    Returns:
        包含 .docx 文件流的 FastAPI Response 响应对象。

    Raises:
        HTTPException: 当汇总不存在时抛出 404。
    """
    import io
    import urllib.parse
    from fastapi.responses import Response
    from docx import Document

    summary = (
        db.query(WeeklySummary)
        .options(joinedload(WeeklySummary.week_period))
        .filter(WeeklySummary.id == summary_id)
        .first()
    )
    if not summary:
        raise HTTPException(404, "汇总不存在")
        
    from docx.oxml.ns import qn
    from docx.shared import RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    doc = Document()
    
    def apply_fonts(run):
        """设置文档运行段的字体属性。

        设置西文字体为 Times New Roman，中文字体为仿宋，颜色设为纯黑。

        Args:
            run: Word 文档的 Run 运行块对象。
        """
        run.font.name = 'Times New Roman'
        run.font.color.rgb = RGBColor(0, 0, 0)
        run._element.rPr.rFonts.set(qn('w:eastAsia'), '仿宋')

    for line in summary.summary_content.split('\n'):
        line = line.strip()
        if not line:
            continue
        if line.startswith('# '):
            p = doc.add_heading(line[2:], level=1)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                apply_fonts(r)
        elif line.startswith('## '):
            p = doc.add_heading(line[3:], level=2)
            for r in p.runs:
                apply_fonts(r)
        elif line.startswith('### '):
            p = doc.add_heading(line[4:], level=3)
            for r in p.runs:
                apply_fonts(r)
        elif line.startswith('- '):
            p = doc.add_paragraph(style='List Bullet')
            parts = line[2:].split('**')
            for i, part in enumerate(parts):
                run = p.add_run(part)
                if i % 2 == 1:
                    run.bold = True
                apply_fonts(run)
        else:
            p = doc.add_paragraph()
            parts = line.split('**')
            for i, part in enumerate(parts):
                run = p.add_run(part)
                if i % 2 == 1:
                    run.bold = True
                apply_fonts(run)

    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)
    
    start_str = summary.week_period.week_start.strftime('%Y%m%d')
    end_str = summary.week_period.week_end.strftime('%Y%m%d')
    filename = f"工作周报-数据库团队 {start_str}-{end_str}.docx"
    encoded_filename = urllib.parse.quote(filename)
    
    return Response(
        content=file_stream.read(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename*=utf-8''{encoded_filename}"
        }
    )
