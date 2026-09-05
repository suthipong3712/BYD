"""
ระบบยืนยันตัวตน: เข้ารหัสรหัสผ่านแบบ PBKDF2 (ใช้ของที่มากับ Python เลย
ไม่ต้องติดตั้ง library เพิ่ม) + token แบบสุ่ม เก็บใน DB (ตาราง auth_tokens)
"""
import hashlib
import secrets

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models import AuthToken, User

bearer_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 100_000)
    return f"{salt}:{digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt, hex_digest = stored.split(":")
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 100_000)
    return secrets.compare_digest(digest.hex(), hex_digest)


def create_token() -> str:
    return secrets.token_urlsafe(32)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token_value = credentials.credentials
    token = db.query(AuthToken).filter(AuthToken.token == token_value).first()
    if token is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if not token.user.active:
        raise HTTPException(status_code=403, detail="User is inactive")
    return token.user


def require_roles(*roles: str):
    """admin ผ่านได้เสมอ ไม่ว่าจะระบุ role อะไรไว้"""
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role != "admin" and user.role not in roles:
            raise HTTPException(status_code=403, detail="Not permitted for this role")
        return user
    return checker