from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.astar import find_route
from app.ai.fuzzy import analyze_priority
from app.database import get_db
from app.models.irrigation import IrrigationData
from app.models.analysis_run import AnalysisRun
from app.models.village import Village
from app.security import get_admin_user, get_current_user


router = APIRouter(
    prefix="/api/analysis",
    tags=["AI Analysis"],
)


class SimulationRequest(BaseModel):
    availability_scale: float = Field(ge=0, le=1)


def _build_analysis(db: Session, current_user, availability_scale: float = 1.0) -> dict:
    query = db.query(IrrigationData).filter(
        IrrigationData.validation_status == "validated"
    )
    if current_user.role != "admin":
        if current_user.assigned_village_id is None:
            records = []
        else:
            records = (
                query.filter(IrrigationData.village_id == current_user.assigned_village_id)
                .order_by(IrrigationData.recorded_at.desc(), IrrigationData.id.desc())
                .all()
            )
    else:
        records = (
            query
            .order_by(IrrigationData.recorded_at.desc(), IrrigationData.id.desc())
            .all()
        )
    latest_by_village = {}
    for record in records:
        latest_by_village.setdefault(record.village_id, record)

    villages = db.query(Village).order_by(Village.name.asc()).all()
    results = []
    for village in villages:
        record = latest_by_village.get(village.id)
        if record is None:
            continue

        adjusted_availability = min(
            100.0, record.water_availability * availability_scale
        )
        fuzzy = analyze_priority(adjusted_availability, record.water_demand)
        route = find_route(village.name)
        results.append(
            {
                "village_id": village.id,
                "village_name": village.name,
                "recorded_at": record.recorded_at.isoformat(),
                "inputs": {
                    "water_availability": round(adjusted_availability, 2),
                    "original_water_availability": record.water_availability,
                    "water_demand": record.water_demand,
                    "planting_season": record.planting_season,
                    "plant_age": record.plant_age,
                    "canal_condition": record.canal_condition,
                    "rainfall": record.rainfall,
                },
                "score": fuzzy["score"],
                "category": fuzzy["category"],
                "input_membership": fuzzy["input_membership"],
                "active_rules": fuzzy["active_rules"],
                "defuzzification": fuzzy["defuzzification"],
                "astar_route": route,
            }
        )

    results.sort(key=lambda item: (-item["score"], item["village_name"]))
    for rank, result in enumerate(results, start=1):
        result["rank"] = rank

    top_result = results[0] if results else None
    return {
        "methods": ["Mamdani Fuzzy Logic", "A* Search"],
        "scenario": {
            "availability_scale": availability_scale,
            "is_simulation": availability_scale != 1.0,
        },
        "notice": (
            "Prioritas dihitung dari catatan terbaru tiap desa. "
            "Rute A* memakai graf abstrak simulasi, bukan peta saluran nyata. "
            "Hasil tidak menghitung volume alokasi air."
        ),
        "results": results,
        "recommended_target": (
            {
                "village_id": top_result["village_id"],
                "village_name": top_result["village_name"],
                "score": top_result["score"],
                "category": top_result["category"],
            }
            if top_result
            else None
        ),
        "route": top_result["astar_route"] if top_result else None,
    }


def _empty_analysis() -> dict:
    return {
        "methods": ["Mamdani Fuzzy Logic", "A* Search"],
        "scenario": {"availability_scale": 1.0, "is_simulation": False},
        "notice": "Admin belum menjalankan analisis untuk data tervalidasi.",
        "results": [],
        "recommended_target": None,
        "route": None,
        "generated_at": None,
    }


def _visible_snapshot(snapshot: AnalysisRun, current_user) -> dict:
    result = dict(snapshot.result_payload)
    results = list(result.get("results", []))
    if current_user.role != "admin":
        results = [
            item
            for item in results
            if item["village_id"] == current_user.assigned_village_id
        ]

    for rank, item in enumerate(results, start=1):
        item["rank"] = rank
    result["results"] = results
    top_result = results[0] if results else None
    result["recommended_target"] = (
        {
            "village_id": top_result["village_id"],
            "village_name": top_result["village_name"],
            "score": top_result["score"],
            "category": top_result["category"],
        }
        if top_result
        else None
    )
    result["route"] = top_result["astar_route"] if top_result else None
    result["generated_at"] = snapshot.created_at.isoformat()
    return result


@router.get("/")
def get_analysis(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    snapshot = (
        db.query(AnalysisRun)
        .order_by(AnalysisRun.created_at.desc(), AnalysisRun.id.desc())
        .first()
    )
    if snapshot is None:
        if current_user.role == "admin":
            result = _build_analysis(db, current_user)
            result["generated_at"] = None
            if result["results"]:
                result["notice"] = (
                    "Hasil dihitung dari data tervalidasi terbaru. Klik Jalankan analisis "
                    "untuk menyimpan hasil dan menampilkannya kepada Petugas."
                )
            return result
        return _empty_analysis()
    return _visible_snapshot(snapshot, current_user)


@router.post("/run")
def run_analysis(
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    snapshot = AnalysisRun(
        run_by_id=admin.id,
        result_payload=_build_analysis(db, admin),
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return _visible_snapshot(snapshot, admin)


@router.post("/simulate")
def simulate_analysis(
    payload: SimulationRequest,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    return _build_analysis(db, _admin, payload.availability_scale)
