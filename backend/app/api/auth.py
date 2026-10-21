from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserSession
from app.models.village import Village
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from app.schemas.village import VillageResponse
from app.security import (
    bearer_scheme,
    create_session,
    get_current_user,
    hash_password,
    hash_session_token,
    verify_password,
)
from fastapi.security import HTTPAuthorizationCredentials


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


@router.get("/villages", response_model=list[VillageResponse])
def get_registration_villages(db: Session = Depends(get_db)):
    return db.query(Village).order_by(Village.name.asc()).all()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    village = db.get(Village, payload.village_id)
    if village is None:
        raise HTTPException(status_code=404, detail="Desa tidak ditemukan.")

    existing_user = db.query(User).filter(User.username == payload.username).first()
    if existing_user is not None:
        raise HTTPException(status_code=409, detail="Username sudah digunakan.")

    user = User(
        username=payload.username,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role="petugas",
        assigned_village_id=payload.village_id,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Username sudah digunakan.") from error

    db.refresh(user)
    token = create_session(db, user)
    return AuthResponse(access_token=token, user=user)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_session(db, user)
    return AuthResponse(access_token=token, user=user)


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(UserSession).filter(
        UserSession.token_hash == hash_session_token(credentials.credentials),
        UserSession.user_id == current_user.id,
    ).delete(synchronize_session=False)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
