from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Member
from app.schemas import MemberCreate, MemberUpdate, MemberOut

from app.api.deps import get_current_user

router = APIRouter(prefix="/api/members", tags=["人员管理"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[MemberOut])
def list_members(active_only: bool = False, db: Session = Depends(get_db)):
    """获取所有团队成员列表。

    可以过滤只获取活跃（启用状态）的成员，以 ID 升序排列。

    Args:
        active_only: 为 True 时过滤仅返回活跃的成员，默认返回全部成员。
        db: 数据库 Session 对象。

    Returns:
        MemberOut 模式对应的成员列表。
    """
    query = db.query(Member)
    if active_only:
        query = query.filter(Member.is_active == True)
    return query.order_by(Member.id).all()


@router.post("", response_model=MemberOut, status_code=201)
def create_member(data: MemberCreate, db: Session = Depends(get_db)):
    """创建新的团队成员。

    根据成员姓名和部门创建新实体。

    Args:
        data: 创建成员的 MemberCreate 输入数据。
        db: 数据库 Session 对象。

    Returns:
        新创建并保存的 Member 成员对象。
    """
    member = Member(name=data.name, department=data.department)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.put("/{member_id}", response_model=MemberOut)
def update_member(member_id: int, data: MemberUpdate, db: Session = Depends(get_db)):
    """更新指定团队成员的信息。

    根据给定的成员 ID 寻得实体，并更新数据对象中不为空的属性。

    Args:
        member_id: 需要更新的成员 ID。
        data: 更新内容的 MemberUpdate 数据对象。
        db: 数据库 Session 对象。

    Returns:
        更新后的 Member 成员对象。

    Raises:
        HTTPException: 当寻找的成员不存在时抛出 404。
    """
    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(404, "成员不存在")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(member, field, value)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db)):
    """禁用（逻辑删除）指定的团队成员。

    并非物理删除，而是将其激活标志 `is_active` 置为 False。

    Args:
        member_id: 需要禁用的成员 ID。
        db: 数据库 Session 对象。

    Returns:
        包含成功提示信息的字典。

    Raises:
        HTTPException: 当寻找的成员不存在时抛出 404。
    """
    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(404, "成员不存在")
    member.is_active = False
    db.commit()
    return {"message": "已禁用"}
