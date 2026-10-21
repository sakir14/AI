from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    run_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    result_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
