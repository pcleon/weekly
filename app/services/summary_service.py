from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import WeeklyReport, WeeklySummary, WeekPeriod, Member


DEFAULT_SUMMARY_PROMPT_TEMPLATE = """# 数据库团队工作周报

## 一、本周工作概述

**业务连续性**：  
**AK项目**：  
**平台研发**：  
**金融科技**：  

## 二、本周重点工作

### 1. 业务连续性

- ；
- 。

### 2. AK项目

- ；
- 。

### 3. 数据库运维研发

- ；
- 。

### 4. 金融科技

- ；
- **。**

## 三、问题与风险点

无

## 四、下周重点工作

- ；
- 。"""

import os

PROMPT_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "prompt_template.txt")

def get_summary_prompt() -> str:
    if os.path.exists(PROMPT_FILE_PATH):
        with open(PROMPT_FILE_PATH, "r", encoding="utf-8") as f:
            return f.read()
    return DEFAULT_SUMMARY_PROMPT_TEMPLATE

def save_summary_prompt(content: str):
    with open(PROMPT_FILE_PATH, "w", encoding="utf-8") as f:
        f.write(content)

def build_reports_text(reports: list[WeeklyReport]) -> str:
    """拼接所有周报内容为文本"""
    parts = []
    for r in reports:
        member: Member = r.member
        parts.append(
            f"### {member.name}（{member.department}）\n\n{r.content}\n"
        )
    return "\n---\n".join(parts)


def generate_summary(db: Session, period: WeekPeriod) -> WeeklySummary:
    """使用 LangChain 汇总指定周期的所有周报"""
    settings = get_settings()

    # 获取本周期所有周报
    reports = (
        db.query(WeeklyReport)
        .filter(WeeklyReport.week_period_id == period.id)
        .all()
    )
    if not reports:
        raise ValueError("当前周期暂无周报可汇总")

    reports_text = build_reports_text(reports)
    user_template = get_summary_prompt()
    
    prompt_text = f"""你是一个专业的团队周报汇总助手。请根据以下团队成员的周报内容，生成一份结构清晰的团队周报汇总。

**必须严格按照以下 Markdown 模板格式输出，不要改变或增删任何标题：**

{user_template}

---
以下是本周团队成员的周报原始内容：

周期：{period.week_start.isoformat()} 至 {period.week_end.isoformat()}

{reports_text}
"""

    # 调用 LLM（OpenAI 兼容格式）
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import HumanMessage
        from loguru import logger

        logger.info(f"开始调用 LLM 生成周期 {period.week_start} 的汇总报告，模型：{settings.llm_model}")
        llm = ChatOpenAI(
            model=settings.llm_model,
            api_key=settings.llm_api_key,
            base_url=settings.llm_api_base,
            temperature=0.3,
        )
        response = llm.invoke([HumanMessage(content=prompt_text)])
        summary_content = response.content
        logger.info("LLM 汇总报告生成成功")
    except Exception as e:
        from loguru import logger
        logger.error(f"LLM 调用失败: {str(e)}", exc_info=True)
        # LLM 调用失败时回退到简单拼接
        summary_content = f"（LLM 调用失败: {e}）\n\n{reports_text}"

    summary = WeeklySummary(
        week_period_id=period.id,
        summary_content=summary_content,
        raw_prompt=prompt_text,
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    from loguru import logger
    logger.success(f"已保存周期 {period.week_start} 的汇总报告记录，ID: {summary.id}")
    return summary
