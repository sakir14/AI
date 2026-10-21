from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.user import UserSession
from app.models.village import Village
from app.schemas.auth import UserCreateRequest, UserResponse, UserUpdateRequest
from app.security import get_admin_user, hash_password


router = APIRouter(
    prefix="/api/users",
    tags=["User Management"],
)


@router.get("/", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    return db.query(User).order_by(User.created_at.desc(), User.id.desc()).all()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    if db.query(User).filter(User.username == payload.username).first() is not None:
        raise HTTPException(status_code=409, detail="Username sudah digunakan.")

    if payload.assigned_village_id is not None:
        village = db.get(Village, payload.assigned_village_id)
        if village is None:
            raise HTTPException(status_code=404, detail="Desa tidak ditemukan.")

    user = User(
        username=payload.username,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
        assigned_village_id=payload.assigned_village_id,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Username sudah digunakan.") from error
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Akun tidak ditemukan.")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=422, detail="Tidak ada perubahan akun.")

    if "assigned_village_id" in updates:
        if user.role != "petugas":
            raise HTTPException(
                status_code=422,
                detail="Penugasan desa hanya berlaku untuk akun Petugas.",
            )
        village_id = updates["assigned_village_id"]
        if village_id is None:
            raise HTTPException(
                status_code=422,
                detail="Petugas harus ditugaskan ke satu desa.",
            )
        if db.get(Village, village_id) is None:
            raise HTTPException(status_code=404, detail="Desa tidak ditemukan.")

    if updates.get("is_active") is False and user.id == admin.id:
        raise HTTPException(status_code=422, detail="Admin tidak dapat menonaktifkan akunnya sendiri.")

    if updates.get("is_active") is False and user.role == "admin":
        active_admins = (
            db.query(User)
            .filter(User.role == "admin", User.is_active.is_(True))
            .count()
        )
        if active_admins <= 1:
            raise HTTPException(
                status_code=422,
                detail="Admin aktif terakhir tidak dapat dinonaktifkan.",
            )

    for field, value in updates.items():
        setattr(user, field, value)
    if updates.get("is_active") is False:
        db.query(UserSession).filter(UserSession.user_id == user.id).delete(
            synchronize_session=False
        )
    db.commit()
    db.refresh(user)
    return user
