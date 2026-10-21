from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine, ensure_schema_extensions
from app.models.village import Village
from app.models.irrigation import IrrigationData
from app.api.villages import router as villages_router
from app.api.irrigation import router as irrigation_router
from app.api.analysis import router as analysis_router
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.models.user import User, UserSession
from app.models.analysis_run import AnalysisRun
from app.seed import ensure_default_users, seed_villages

Base.metadata.create_all(bind=engine)
ensure_schema_extensions()
seed_villages()
ensure_default_users()


app = FastAPI(
    title="Karangampel Irrigation AI",
    description="Sistem Pendukung Keputusan Prioritas Distribusi Air Irigasi Kecamatan Karangampel",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(villages_router)
app.include_router(irrigation_router)
app.include_router(analysis_router)
app.include_router(auth_router)
app.include_router(users_router)

@app.get("/")
def root():
    return {
        "application": "Karangampel Irrigation AI",
        "status": "running",
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "ai_engine": ["mamdani_fuzzy", "a_star_simulation_graph"],
        "database": "connected",
    }
