from pydantic import BaseModel, Field


class VillageUpdate(BaseModel):
    area_hectare: float = Field(ge=0)
    farmer_count: int = Field(ge=0)


class VillageResponse(BaseModel):
    id: int
    name: str
    area_hectare: float
    farmer_count: int
    latitude: float | None = None
    longitude: float | None = None

    model_config = {
        "from_attributes": True
    }
