from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # 数据库
    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = ""
    db_name: str = "weekly_report"

    # LLM
    llm_api_key: str = ""
    llm_api_base: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4"

    # 应用
    app_title: str = "周报汇总系统"
    timezone: str = "Asia/Shanghai"

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
            f"?charset=utf8mb4"
        )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()

import os
import json
from pydantic import BaseModel

DEADLINE_CONFIG_FILE = os.path.join(os.path.dirname(__file__), "..", "deadline.json")

class DeadlineConfig(BaseModel):
    day_of_week: int = 4  # 0=周一，4=周五，6=周日
    hour: int = 15
    minute: int = 0

def get_deadline_config() -> DeadlineConfig:
    if os.path.exists(DEADLINE_CONFIG_FILE):
        try:
            with open(DEADLINE_CONFIG_FILE, "r") as f:
                return DeadlineConfig(**json.load(f))
        except Exception:
            pass
    return DeadlineConfig()

def save_deadline_config(cfg: DeadlineConfig):
    with open(DEADLINE_CONFIG_FILE, "w", encoding="utf-8") as f:
        f.write(cfg.model_dump_json())
