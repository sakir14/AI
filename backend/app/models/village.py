from sqlalchemy import Integer, String, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Village(Base):
    __tablename__ = "villages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    area_hectare: Mapped[float] = mapped_column(Float, default=0)
    farmer_count: Mapped[int] = mapped_column(Integer, default=0)

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)