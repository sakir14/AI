from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.village import Village
from app.security import get_current_user
from app.schemas.village import VillageResponse, VillageUpdate


router = APIRouter(
    prefix="/api/villages",
    tags=["Villages"],
)


@router.get("/", response_model=list[VillageResponse])
def get_villages(
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    villages = (
        db.query(Village)
        .order_by(Village.name.asc())
        .all()
    )

    return villages


@router.patch("/{village_id}", response_model=VillageResponse)
def update_village_profile(
    village_id: int,
    payload: VillageUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    village = db.get(Village, village_id)
    if village is None:
        raise HTTPException(status_code=404, detail="Desa tidak ditemukan.")

    if current_user.role != "admin" and current_user.assigned_village_id != village_id:
        raise HTTPException(
            status_code=403,
            detail="Petugas hanya dapat memperbarui profil desa tugasnya.",
        )

    village.area_hectare = payload.area_hectare
    village.farmer_count = payload.farmer_count
    db.commit()
    db.refresh(village)
    return village
