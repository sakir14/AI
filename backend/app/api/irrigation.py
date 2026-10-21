from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.analysis_run import AnalysisRun
from app.models.irrigation import IrrigationData
from app.models.user import User
from app.models.village import Village
from app.schemas.irrigation import (
    IrrigationCreate,
    IrrigationResponse,
    IrrigationValidationRequest,
)
from app.security import get_admin_user, get_current_user


router = APIRouter(
    prefix="/api/irrigation",
    tags=["Irrigation"],
)


def _ensure_village_access(current_user, village_id: int):
    if current_user.role != "admin" and current_user.assigned_village_id != village_id:
        raise HTTPException(
            status_code=403,
            detail="Petugas hanya dapat mengakses desa yang ditugaskan kepadanya.",
        )


def _invalidate_analysis_snapshot(db: Session):
    db.query(AnalysisRun).delete(synchronize_session=False)


@router.get("/", response_model=list[IrrigationResponse])
def get_irrigation_data(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(IrrigationData, User.username).outerjoin(
        User, IrrigationData.created_by_id == User.id
    )
    if current_user.role != "admin":
        if current_user.assigned_village_id is None:
            return []
        query = query.filter(IrrigationData.village_id == current_user.assigned_village_id)
    rows = query.order_by(IrrigationData.recorded_at.desc(), IrrigationData.id.desc()).all()
    return [
        {
            **{
                column.name: getattr(record, column.name)
                for column in IrrigationData.__table__.columns
            },
            "created_by_username": username,
        }
        for record, username in rows
    ]


@router.post("/", response_model=IrrigationResponse, status_code=201)
def create_irrigation_data(
    payload: IrrigationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_village_access(current_user, payload.village_id)
    village = db.get(Village, payload.village_id)
    if village is None:
        raise HTTPException(status_code=404, detail="Desa tidak ditemukan.")

    is_admin = current_user.role == "admin"
    record = IrrigationData(
        **payload.model_dump(),
        created_by_id=current_user.id,
        validation_status="validated" if is_admin else "pending",
        validated_by_id=current_user.id if is_admin else None,
    )
    db.add(record)
    if is_admin:
        _invalidate_analysis_snapshot(db)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{record_id}", response_model=IrrigationResponse)
def update_irrigation_data(
    record_id: int,
    payload: IrrigationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    record = db.get(IrrigationData, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Catatan irigasi tidak ditemukan.")

    _ensure_village_access(current_user, record.village_id)
    _ensure_village_access(current_user, payload.village_id)
    was_validated = record.validation_status == "validated"

    village = db.get(Village, payload.village_id)
    if village is None:
        raise HTTPException(status_code=404, detail="Desa tidak ditemukan.")

    for field, value in payload.model_dump().items():
        setattr(record, field, value)
    if current_user.role == "admin":
        record.validation_status = "validated"
        record.validated_by_id = current_user.id
    else:
        record.validation_status = "pending"
        record.validated_by_id = None
    if was_validated or current_user.role == "admin":
        _invalidate_analysis_snapshot(db)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_irrigation_data(
    record_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    record = db.get(IrrigationData, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Catatan irigasi tidak ditemukan.")

    if record.validation_status == "validated":
        _invalidate_analysis_snapshot(db)
    db.delete(record)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/")
def delete_all_irrigation_data(
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    deleted_count = db.query(IrrigationData).delete(synchronize_session=False)
    _invalidate_analysis_snapshot(db)
    db.commit()
    return {"deleted_count": deleted_count}


@router.patch("/{record_id}/validation", response_model=IrrigationResponse)
def validate_irrigation_data(
    record_id: int,
    payload: IrrigationValidationRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    record = db.get(IrrigationData, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Catatan irigasi tidak ditemukan.")

    previous_status = record.validation_status
    record.validation_status = payload.validation_status
    record.validated_by_id = admin.id
    if previous_status == "validated" or payload.validation_status == "validated":
        _invalidate_analysis_snapshot(db)
    db.commit()
    db.refresh(record)
    return record
