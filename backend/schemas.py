# ===== backend/schemas.py =====
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    age: int
    experience_level: str
    goals: List[str]
    available_equipment: List[str]
    dumbbell_weights: List[float]

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