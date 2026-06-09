from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, echo=False, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    """所有 ORM 模型的基类，Alembic 通过此类发现模型"""
    pass


def get_db():
    """FastAPI 依赖注入：提供数据库 Session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


