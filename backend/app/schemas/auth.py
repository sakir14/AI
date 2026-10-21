import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def normalize_username(value: str) -> str:
    username = value.strip().lower()
    if not re.fullmatch(r"[a-z0-9_.-]{3,32}", username):
        raise ValueError("Username harus berisi 3–32 huruf, angka, titik, garis bawah, atau tanda hubung.")
    return username


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=8, max_length=128)
    village_id: int = Field(gt=0)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if len(cleaned) < 2:
            raise ValueError("Nama lengkap minimal 2 karakter.")
        return cleaned

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        return normalize_username(value)


class UserCreateRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["admin", "petugas"]
    assigned_village_id: int | None = Field(default=None, gt=0)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if len(cleaned) < 2:
            raise ValueError("Nama lengkap minimal 2 karakter.")
        return cleaned

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        return normalize_username(value)

    @model_validator(mode="after")
    def validate_assignment(self):
        if self.role == "petugas" and self.assigned_village_id is None:
            raise ValueError("Petugas harus ditugaskan ke satu desa.")
        if self.role == "admin" and self.assigned_village_id is not None:
            raise ValueError("Akun Admin tidak ditugaskan ke desa tertentu.")
        return self


class UserUpdateRequest(BaseModel):
    assigned_village_id: int | None = Field(default=None, gt=0)
    is_active: bool | None = None


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        return normalize_username(value)


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    assigned_village_id: int | None = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
