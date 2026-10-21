import os

from app.database import Base, SessionLocal, engine, ensure_schema_extensions
from app.models.irrigation import IrrigationData
from app.models.user import User
from app.models.village import Village
from app.security import hash_password


VILLAGES = [
    "Mundu",
    "Kaplonganlor",
    "Tanjungpura",
    "Tanjungsari",
    "Pringgacala",
    "Benda",
    "Sendang",
    "Karangampel Kidul",
    "Karangampel",
    "Dukuh Jeruk",
    "Dukuh Tengah",
]


def ensure_default_users():
    accounts = [
        (
            os.getenv("IRRIGATION_ADMIN_USERNAME", "admin").strip().lower(),
            os.getenv("IRRIGATION_ADMIN_PASSWORD", "AdminDemo2026!"),
            "Administrator Karangampel",
            "admin",
        ),
        (
            os.getenv("IRRIGATION_FIELD_USERNAME", "petugas").strip().lower(),
            os.getenv("IRRIGATION_FIELD_PASSWORD", "PetugasDemo2026!"),
            "Petugas Lapangan",
            "petugas",
        ),
    ]
    db = SessionLocal()

    try:
        for username, password, full_name, role in accounts:
            existing = db.query(User).filter(User.username == username).first()
            if existing is None:
                db.add(
                    User(
                        username=username,
                        password_hash=hash_password(password),
                        full_name=full_name,
                        role=role,
                    )
                )
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def seed_villages():
    Base.metadata.create_all(bind=engine)
    ensure_schema_extensions()
    db = SessionLocal()

    try:
        for village_name in VILLAGES:
            existing = (
                db.query(Village)
                .filter(Village.name == village_name)
                .first()
            )

            if existing is None:
                db.add(Village(name=village_name))

        db.commit()

        print("Data desa berhasil disimpan.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_villages()
    ensure_default_users()
