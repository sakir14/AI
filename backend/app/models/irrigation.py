from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class IrrigationData(Base):
    __tablename__ = "irrigation_data"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    village_id: Mapped[int] = mapped_column(
        ForeignKey("villages.id"),
        nullable=False,
        index=True,
    )

    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    validation_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="validated", server_default="validated"
    )

    validated_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    planting_season: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    plant_age: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    water_availability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    water_demand: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    water_demand_m3: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    canal_condition: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    rainfall: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    recorded_at: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
