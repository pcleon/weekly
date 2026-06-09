# 周报汇总系统

# 兼容性修复：解决 SQLAlchemy 2.0.35 在 Python 3.14 下的 Union 类型解析错误
try:
    from typing import Union
    import sqlalchemy.util.typing as sql_typing
    
    try:
        sql_typing.make_union_type(int, str)
    except TypeError:
        # Python 3.14 兼容性补丁
        def patched_make_union_type(*types):
            return Union[types]
        sql_typing.make_union_type = patched_make_union_type
except Exception:
    pass
