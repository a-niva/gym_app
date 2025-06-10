from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
from datetime import datetime

class EquipmentDetails(BaseModel):
    standard_bar: Optional[float] = 20.0
    ez_bar: Optional[float] = 10.0
    plates: List[float] = []

class ResistanceBand(BaseModel):
    color: str
    resistance: float  # en kg

class UserCreate(BaseModel):
    name: str
    age: int
    experience_level: str
    goals: List[str]
    available_equipment: List[str]
    dumbbell_weights: List[float]  # Changé de int à float
    barbell_weights: Optional[EquipmentDetails] = None
    resistance_bands: Optional[List[ResistanceBand]] = []
    
    @validator('dumbbell_weights', pre=True)
    def validate_dumbbell_weights(cls, v):
        if isinstance(v, list):
            return [float(w) for w in v]
        return v

class UserResponse(BaseModel):
    id: int
    name: str
    age: int
    experience_level: str
    goals: List[str]
    available_equipment: List[str]
    dumbbell_weights: List[float]
    barbell_weights: Optional[Dict[str, Any]]
    resistance_bands: Optional[List[Dict[str, Any]]]
    created_at: datetime
    
    class Config:
        from_attributes = True

class WorkoutCreate(BaseModel):
    user_id: int
    type: str = "free_time"

class SetCreate(BaseModel):
    workout_id: int
    exercise_id: int
    set_number: int
    target_reps: int
    actual_reps: int
    weight: float
    rest_time: int
    fatigue_level: int
    perceived_exertion: int