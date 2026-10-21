import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserSession


bearer_scheme = HTTPBearer(auto_error=False)
SESSION_DURATION = timedelta(hours=12)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    password_hash = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
        dklen=64,
        maxmem=64 * 1024 * 1024,
    )
    return f"scrypt${salt.hex()}${password_hash.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, salt_hex, expected_hex = stored_hash.split("$", maxsplit=2)
        if algorithm != "scrypt":
            return False
        actual_hash = hashlib.scrypt(
            password.encode("utf-8"),
            salt=bytes.fromhex(salt_hex),
            n=2**14,
            r=8,
            p=1,
            dklen=64,
            maxmem=64 * 1024 * 1024,
        )
        return hmac.compare_digest(actual_hash.hex(), expected_hex)
    except (ValueError, TypeError):
        return False


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + SESSION_DURATION
    db.add(
        UserSession(
            user_id=user.id,
            token_hash=hash_session_token(token),
            expires_at=expires_at,
        )
    )
    db.commit()
    return token


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesi tidak valid atau sudah berakhir. Silakan masuk kembali.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    token_hash = hash_session_token(credentials.credentials)
    session = (
        db.query(UserSession)
        .filter(
            UserSession.token_hash == token_hash,
            UserSession.expires_at > datetime.now(timezone.utc).replace(tzinfo=None),
        )
        .first()
    )
    if session is None:
        raise unauthorized

    user = db.get(User, session.user_id)
    if user is None or not user.is_active:
        raise unauthorized
    return user


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Fitur ini hanya dapat digunakan oleh Admin.",
        )
    return current_user
