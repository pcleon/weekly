from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import WeeklyReport, WeeklySummary, WeekPeriod, Member


DEFAULT_SUMMARY_PROMPT_TEMPLATE = """# 数据库团队工作周报

## 一、本周工作概述

**业务连续性**： ；**AK项目**： ；**平台研发**： ；**金融科技**： 。

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
- 。

## 三、问题与风险点

无

## 四、下周重点工作

- ；
- 。"""

import os

PROMPT_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "prompt_template.txt")
SYSTEM_PROMPT_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "system_prompt.txt")

DEFAULT_SYSTEM_PROMPT = """你是一个专业的团队周报汇总助手。请根据以下团队成员的周报内容，生成一份结构清晰的团队周报汇总。

在汇总“一、本周工作概述”部分时，不要将所有事项列出，要进行提炼与汇总，只选取具有较大影响或重要进展的部分进行概述。

**必须严格按照以下 Markdown 模板格式输出，不要改变或增删任何标题：**"""


def get_summary_prompt() -> str:
    """获取用户定义的周报汇总 Markdown 模板。

    若模板文件 prompt_template.txt 存在则从文件中读取；
    否则返回内置的默认 Markdown 模板框架。

    Returns:
        周报汇总模板的字符串内容。
    """
    if os.path.exists(PROMPT_FILE_PATH):
        with open(PROMPT_FILE_PATH, "r", encoding="utf-8") as f:
            return f.read()
    return DEFAULT_SUMMARY_PROMPT_TEMPLATE

def save_summary_prompt(content: str):
    """将更新后的用户周报汇总 Markdown 模板保存到本地文本中。

    Args:
        content: 模板框架的字符串内容。
    """
    with open(PROMPT_FILE_PATH, "w", encoding="utf-8") as f:
        f.write(content)

def get_system_prompt() -> str:
    """获取汇总助手的大模型系统角色设定提示词（System Prompt）。

    若系统提示词文件 system_prompt.txt 存在则从文件中读取；
    否则返回默认的系统角色预设。

    Returns:
        大模型系统提示词字符串内容。
    """
    if os.path.exists(SYSTEM_PROMPT_FILE_PATH):
        with open(SYSTEM_PROMPT_FILE_PATH, "r", encoding="utf-8") as f:
            return f.read()
    return DEFAULT_SYSTEM_PROMPT

def save_system_prompt(content: str):
    """将更新后的系统角色设定提示词保存到本地文本中。

    Args:
        content: 角色设定的提示词字符串内容。
    """
    with open(SYSTEM_PROMPT_FILE_PATH, "w", encoding="utf-8") as f:
        f.write(content)

def build_reports_text(reports: list[WeeklyReport]) -> str:
    """将目标周期的所有成员周报内容拼接合成为一段统一的文本。

    按成员姓名和所属部门组织成 Markdown 三级标题，并以横线分隔各成员的提交文本。

    Args:
        reports: 该周期下的个人周报（WeeklyReport）对象列表。

    Returns:
        合并后的所有成员周报纯文本。
    """
    parts = []
    for r in reports:
        member: Member = r.member
        parts.append(
            f"### {member.name}（{member.department}）\n\n{r.content}\n"
        )
    return "\n---\n".join(parts)


async def generate_summary(db: Session, period: WeekPeriod) -> WeeklySummary:
    """使用 LangChain 异步汇总指定周期的所有周报。

    Args:
        db: 数据库会话对象。
        period: 目标周报周期对象。

    Returns:
        生成的 WeeklySummary 汇总报告对象。

    Raises:
        ValueError: 当当前周期内没有成员提交周报时抛出。
    """
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
    system_prompt = get_system_prompt()
    
    # 组装用于存入数据库的原始 Prompt 记录
    human_content = f"""请严格按照如下模板格式来汇总：
{user_template}

---
以下是本周团队成员的周报原始内容：

周期：{period.week_start.isoformat()} 至 {period.week_end.isoformat()}

{reports_text}"""
    
    prompt_text = f"System: {system_prompt}\n\nUser:\n{human_content}"

    # 调用 LLM（OpenAI 兼容格式）
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage
        from loguru import logger
        import re

        logger.info(f"开始调用 LLM 生成周期 {period.week_start} 的汇总报告，模型：{settings.llm_model}")
        llm = ChatOpenAI(
            model=settings.llm_model,
            api_key=settings.llm_api_key,
            base_url=settings.llm_api_base,
            temperature=0.3,
        )
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_content)
        ]
        response = await llm.ainvoke(messages)
        summary_content = response.content
        
        # 清洗大模型可能多带的 markdown 代码块包裹标记
        if summary_content:
            summary_content = summary_content.strip()
            if summary_content.startswith("```markdown"):
                summary_content = re.sub(r"^```markdown\n?", "", summary_content)
                summary_content = re.sub(r"\n?```$", "", summary_content)
            elif summary_content.startswith("```"):
                summary_content = re.sub(r"^```\w*\n?", "", summary_content)
                summary_content = re.sub(r"\n?```$", "", summary_content)
            summary_content = summary_content.strip()
            
        logger.info("LLM 汇总报告生成成功")
    except Exception as e:
        from loguru import logger
        logger.error("LLM 调用失败: {}", e, exc_info=True)
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


def generate_summary_task(period_id: int):
    """后台异步执行周报汇总生成的任务函数。

    单独创建一个数据库 Session 会话，提取对应的 WeekPeriod 周期，并触发调用大模型生成汇总。
    用于在所有成员提交完毕后由 BackgroundTasks 异步调用。

    Args:
        period_id: 目标周期的 ID 值。
    """
    import asyncio
    from app.database import SessionLocal
    from loguru import logger
    db = SessionLocal()
    try:
        period = db.get(WeekPeriod, period_id)
        if period:
            asyncio.run(generate_summary(db, period))
    except Exception as e:
        logger.error(f"后台自动生成汇总失败: {e}", exc_info=True)
    finally:
        db.close()
