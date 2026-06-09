from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel

from app.database import get_db
from app.models import WeeklySummary
from app.schemas import SummaryOut, SummaryUpdate
from app.services.report_service import get_or_create_current_period
from app.services.summary_service import generate_summary, get_summary_prompt, save_summary_prompt

router = APIRouter(prefix="/api/summaries", tags=["汇总管理"])

class PromptUpdate(BaseModel):
    content: str

@router.get("/prompt")
def get_prompt():
    return {"content": get_summary_prompt()}

@router.put("/prompt")
def update_prompt(data: PromptUpdate):
    save_summary_prompt(data.content)
    return {"message": "提示词已更新"}


@router.post("/generate", response_model=SummaryOut)
def trigger_summary(db: Session = Depends(get_db)):
    period = get_or_create_current_period(db)
    try:
        summary = generate_summary(db, period)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return summary


@router.get("", response_model=list[SummaryOut])
def list_summaries(db: Session = Depends(get_db)):
    return (
        db.query(WeeklySummary)
        .options(joinedload(WeeklySummary.week_period))
        .order_by(WeeklySummary.generated_at.desc())
        .all()
    )


@router.get("/{summary_id}", response_model=SummaryOut)
def get_summary(summary_id: int, db: Session = Depends(get_db)):
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
    summary = db.get(WeeklySummary, summary_id)
    if not summary:
        raise HTTPException(404, "汇总不存在")
    summary.summary_content = data.summary_content
    db.commit()
    db.refresh(summary)
    return summary


@router.delete("/{summary_id}")
def delete_summary(summary_id: int, db: Session = Depends(get_db)):
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
