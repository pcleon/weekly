import logging
import sys
from loguru import logger

class InterceptHandler(logging.Handler):
    """
    默认的 logging 拦截器，将标准 logging 产生的日志转发给 loguru。
    """
    def emit(self, record):
        # 寻找调用来源，排除 logging 内部的调用
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())

def setup_logging():
    """配置 loguru 日志"""
    # 移除 loguru 默认的处理器
    logger.remove()
    
    # 增加控制台处理器
    logger.add(
        sys.stderr,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="INFO",
    )
    
    # 增加文件处理器（每天轮转，保留30天）
    logger.add(
        "logs/app_{time:YYYY-MM-DD}.log",
        rotation="00:00",
        retention="30 days",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level="INFO",
        encoding="utf-8"
    )

    # 拦截标准 logging (包括 uvicorn, fastapi 等)
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    
    for name in logging.root.manager.loggerDict.keys():
        logging.getLogger(name).handlers = []
        logging.getLogger(name).propagate = True
