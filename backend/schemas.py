# ===== backend/schemas.py =====
from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime

# STRUCTURES ÉQUIPEMENT REFONDUES
class BarreConfig(BaseModel):
    available: bool = False
    count: int = 0
    weight: float = 20.0  # Poids par défaut en kg

class DisquesConfig(BaseModel):
    available: bool = False
    weights: Dict[str, int] = {}  # {"5.0": 4, "10.0": 2} - poids en kg -> nombre

class DumbbellsConfig(BaseModel):
    available: bool = False
    weights: List[float] = []  # Liste des poids disponibles

class BancConfig(BaseModel):
    available: bool = False
    inclinable_haut: bool = False
    inclinable_bas: bool = False

class ElastiquesBand(BaseModel):
    color: str
    resistance: float  # Résistance exacte en kg
    count: int = 1

class ElastiquesConfig(BaseModel):
    available: bool = False
    bands: List[ElastiquesBand] = []

class KettlebellConfig(BaseModel):
    available: bool = False
    weights: List[float] = []  # Liste des poids de kettlebells

class BarreTractionConfig(BaseModel):
    available: bool = False

class LestConfig(BaseModel):
    available: bool = False
    weights: List[float] = []  # Liste des poids disponibles

class AutresEquipmentConfig(BaseModel):
    kettlebell: KettlebellConfig = KettlebellConfig()
    barre_traction: BarreTractionConfig = BarreTractionConfig()
    lest_corps: LestConfig = LestConfig()
    lest_chevilles: LestConfig = LestConfig()
    lest_poignets: LestConfig = LestConfig()

class EquipmentConfig(BaseModel):
    barres: Dict[str, BarreConfig] = {
        "olympique": BarreConfig(weight=20.0),
        "ez": BarreConfig(weight=10.0),
        "courte": BarreConfig(weight=2.5)
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
    height: float
    weight: float
    experience_level: str
    goals: List[str]
    equipment_config: EquipmentConfig

class UserResponse(BaseModel):
    id: int
    name: str
    age: int
    experience_level: str
    goals: List[str]
    equipment_config: EquipmentConfig
    created_at: datetime
    
    class Config:
        from_attributes = True

# SCHEMAS EXERCICES
class ExerciseSpecs(BaseModel):
    barbell_count: Optional[int] = None  # Nombre de barres nécessaires
    dumbbell_count: Optional[int] = None  # Nombre d'haltères nécessaires
    requires_rack: Optional[bool] = False
    requires_incline: Optional[bool] = False
    requires_decline: Optional[bool] = False
    min_weight: Optional[float] = None
    max_weight: Optional[float] = None

class ExerciseResponse(BaseModel):
    id: int
    name_fr: str
    name_eng: str
    equipment: List[str]
    equipment_specs: Optional[ExerciseSpecs] = None
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

class SetResponse(BaseModel):
    id: int
    workout_id: int
    exercise_id: int
    set_number: int
    target_reps: int
    actual_reps: int
    weight: float
    rest_time: int
    fatigue_level: int
    perceived_exertion: int
    completed_at: datetime
    skipped: bool
    
    class Config:
        from_attributes = True

class WorkoutResponse(BaseModel):
    id: int
    user_id: int
    type: str
    created_at: datetime
    completed_at: Optional[datetime]
    sets: List[SetResponse] = []
    
    class Config:
        from_attributes = True

# SCHEMAS STATS
class UserStats(BaseModel):
    total_workouts: int
    week_streak: int
    last_workout: Optional[str]
    total_weight_lifted: float
    favorite_exercises: List[Dict[str, Any]]
    progress_data: Dict[str, List[Dict[str, Any]]]