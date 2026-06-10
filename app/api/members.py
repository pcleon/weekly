from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Member
from app.schemas import MemberCreate, MemberUpdate, MemberOut

from app.api.deps import get_current_user

router = APIRouter(prefix="/api/members", tags=["人员管理"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[MemberOut])
def list_members(active_only: bool = False, db: Session = Depends(get_db)):
    query = db.query(Member)
    if active_only:
        query = query.filter(Member.is_active == True)
    return query.order_by(Member.id).all()


@router.post("", response_model=MemberOut, status_code=201)
def create_member(data: MemberCreate, db: Session = Depends(get_db)):
    member = Member(name=data.name, department=data.department)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.put("/{member_id}", response_model=MemberOut)
def update_member(member_id: int, data: MemberUpdate, db: Session = Depends(get_db)):
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
    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(404, "成员不存在")
    member.is_active = False
    db.commit()
    return {"message": "已禁用"}
