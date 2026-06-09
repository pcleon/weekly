import json
from loguru import logger
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.config import get_settings

TYPO_SYSTEM_PROMPT = """你是一个专业的中文文本纠错助手。
请检查用户提供的周报内容（Markdown 格式），查找其中是否有错别字或低级语法错误（如错别字、漏字、标点错误等）。

你必须仅输出一个标准的 JSON 对象，格式如下：
{
  "has_typos": true 或 false,
  "corrected_content": "纠错后的完整文本内容（保持原有的 Markdown 结构和换行格式）",
  "explanation": "简要说明修改了哪些地方，例如：'修正了“错别子”->“错别字”'；若没有修改，则为空。"
}

请绝对不要包含任何 Markdown 格式包裹（如 ```json ... ```），只返回纯 JSON 字符串本身。"""

def check_typos(content: str) -> tuple[bool, str, str]:
    settings = get_settings()
    if not settings.llm_api_key:
        logger.warning("LLM API Key 未配置，跳过错别字检查。")
        return False, content, ""

    try:
        llm = ChatOpenAI(
            model=settings.llm_model,
            api_key=settings.llm_api_key,
            base_url=settings.llm_api_base,
            temperature=0.1,
        )
        response = llm.invoke([
            SystemMessage(content=TYPO_SYSTEM_PROMPT),
            HumanMessage(content=f"请检查并纠错以下周报：\n\n{content}")
        ])
        
        raw_text = response.content.strip()
        
        # 尝试清理可能包含的 markdown 代码块包裹
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip().startswith("```"):
                lines = lines[:-1]
            raw_text = "\n".join(lines).strip()
            
        data = json.loads(raw_text)
        has_typos = bool(data.get("has_typos", False))
        corrected_content = data.get("corrected_content", content)
        explanation = data.get("explanation", "")
        
        if has_typos:
            logger.info(f"AI 检测到错别字并进行了修正: {explanation}")
        else:
            logger.info("AI 未检测到错别字。")
            
        return has_typos, corrected_content, explanation
        
    except Exception as e:
        logger.error("AI 纠错服务调用失败: {}", e, exc_info=True)
        return False, content, ""
