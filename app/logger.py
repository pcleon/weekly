import logging
import sys
from loguru import logger

class InterceptHandler(logging.Handler):
    """自定义的标准 logging 日志拦截器。

    将 Python 原生 logging 模块产生的日志流重定向并转发到 loguru 进行统一格式化输出。
    """
    def emit(self, record):
        """发送日志记录。

        将拦截到的标准 logging 日志包装成 loguru 所需的级别、调用栈深度，然后输出。

        Args:
            record: 原生 logging 产生的 LogRecord 对象。
        """
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
    """初始化并配置全局日志管理器。

    1. 清理 loguru 默认处理器。
    2. 注册带颜色的标准错误流（Console）处理器。
    3. 注册每日自动轮转的文件日志处理器。
    4. 劫持并清空所有底层库（如 uvicorn, fastapi 等）的标准 logging 拦截处理器，防范日志多重输出。
    """
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
