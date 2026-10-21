from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class IrrigationCreate(BaseModel):
    village_id: int = Field(gt=0)
    planting_season: str = Field(min_length=1, max_length=50)
    plant_age: int = Field(ge=0, le=365)
    water_availability: float = Field(ge=0, le=100)
    water_demand: float = Field(ge=0, le=100)
    water_demand_m3: float | None = Field(default=None, ge=0)
    canal_condition: Literal["baik", "sedang", "buruk"]
    rainfall: float | None = Field(default=None, ge=0)
    recorded_at: date


class IrrigationResponse(BaseModel):
    id: int
    village_id: int
    planting_season: str
    plant_age: int
    water_availability: float
    water_demand: float
    water_demand_m3: float | None = None
    canal_condition: str
    rainfall: float | None
    recorded_at: date
    created_by_id: int | None = None
    created_by_username: str | None = None
    validation_status: str = "validated"
    validated_by_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


class IrrigationValidationRequest(BaseModel):
    validation_status: Literal["validated", "rejected"]
