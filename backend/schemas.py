# ===== backend/schemas.py =====
from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime

# STRUCTURES ÉQUIPEMENT
class BarreConfig(BaseModel):
    available: bool = False
    weight: float = 20.0
    count: int = 1

class DisquesConfig(BaseModel):
    available: bool = False
    weights: Dict[str, int] = {}  # {"5.0": 4, "10.0": 2} - poids -> nombre

class DumbbellsConfig(BaseModel):
    available: bool = False
    weights: List[float] = []  # [5.0, 10.0, 15.0, 20.0]

class BancConfig(BaseModel):
    available: bool = False
    inclinable_haut: bool = True
    inclinable_bas: bool = False

class ElastiquesBand(BaseModel):
    color: str
    resistance: float  # en kg
    count: int = 1

class ElastiquesConfig(BaseModel):
    available: bool = False
    bands: List[ElastiquesBand] = []

class KettlebellConfig(BaseModel):
    available: bool = False
    weights: List[float] = []

class BarreTractionConfig(BaseModel):
    available: bool = False

class LestConfig(BaseModel):
    available: bool = False
    weights: List[float] = []

class AutresEquipmentConfig(BaseModel):
    kettlebell: KettlebellConfig = KettlebellConfig()
    barre_traction: BarreTractionConfig = BarreTractionConfig()
    lest_corps: LestConfig = LestConfig()
    lest_chevilles: LestConfig = LestConfig()
    lest_poignets: LestConfig = LestConfig()

class EquipmentConfig(BaseModel):
    barres: Dict[str, BarreConfig] = {
        "barbell_standard": BarreConfig(),
        "barbell_ez": BarreConfig(weight=10.0),
        "barbell_courte": BarreConfig(weight=2.5, count=2)
    }
    disques: DisquesConfig = DisquesConfig()
    dumbbells: DumbbellsConfig = DumbbellsConfig()
    banc: BancConfig = BancConfig()
    elastiques: ElastiquesConfig = ElastiquesConfig()
    autres: AutresEquipmentConfig = AutresEquipmentConfig()

# SCHEMAS UTILISATEUR
class UserCreate(BaseModel):
    name: str
    age: int
    experience_level: str
    goals: List[str]
    equipment_config: EquipmentConfig

class UserResponse(BaseModel):
    id: int
    name: str
    age: int
    experience_level: str
    goals: List[str]
    equipment_config: Optional[Dict[str, Any]] = None 
    created_at: datetime
    
    class Config:
        from_attributes = True

# SCHEMAS EXERCICES
class ExerciseSpecs(BaseModel):
    barbell_count: Optional[int] = 1
    dumbbell_count: Optional[int] = 2
    min_weight: Optional[float] = None
    max_weight: Optional[float] = None
    requires_rack: Optional[bool] = False
    requires_incline: Optional[bool] = False

class ExerciseResponse(BaseModel):
    id: int
    name_fr: str
    name_eng: str
    equipment: List[str]  # ["barbell_standard", "dumbbells", "bench_inclinable"]
    equipment_config: Optional[Dict[str, Any]] = None
    level: str
    body_part: str
    sets_reps: List[dict]
    
    class Config:
        from_attributes = True

# SCHEMAS WORKOUTS
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
    skipped: bool = False