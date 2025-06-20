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

# SCHEMAS EXERCICES
class ExerciseSpecs(BaseModel):
    barbell_count: Optional[int] = None  # Nombre de barres nécessaires
    dumbbell_count: Optional[int] = None  # Nombre d'haltères nécessaires
    requires_rack: Optional[bool] = False
    requires_incline: Optional[bool] = False
    requires_decline: Optional[bool] = False
    min_weight: Optional[float] = None
    max_weight: Optional[float] = None


# SCHEMAS STATS
class UserStats(BaseModel):
    total_workouts: int
    week_streak: int
    last_workout: Optional[str]
    total_weight_lifted: float
    favorite_exercises: List[Dict[str, Any]]
    progress_data: Dict[str, List[Dict[str, Any]]]


# SCHEMAS UTILISATEUR
class UserCreate(BaseModel):
    name: str
    birth_date: datetime
    height: float
    weight: float
    experience_level: str
    goals: List[str]
    equipment_config: EquipmentConfig

class UserResponse(BaseModel):
    id: int
    name: str
    birth_date: datetime
    experience_level: str
    goals: List[str]
    equipment_config: EquipmentConfig
    created_at: datetime
    
    class Config:
        from_attributes = True

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
    initial_exercise_id: Optional[int] = None  # Premier exercice prévu

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
    # Nouveaux champs optionnels
    is_bodyweight: Optional[bool] = False
    is_time_based: Optional[bool] = False
    body_weight: Optional[float] = None

class SetRestTimeUpdate(BaseModel):
    rest_time: int

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
    status: str
    paused_at: Optional[datetime]
    total_pause_duration: int
    created_at: datetime
    completed_at: Optional[datetime]
    sets: List[SetResponse] = []
    
    class Config:
        from_attributes = True

class ProgramGenerationRequest(BaseModel):
    weeks: int = 4
    frequency: Optional[int] = 3  # Le frontend envoie aussi frequency

# SCHEMAS PROGRAMMES
class ProgramExerciseBase(BaseModel):
    exercise_id: int
    sets: int
    target_reps: int
    rest_time: int
    order_index: int
    predicted_weight: Optional[float] = None

class ProgramDayBase(BaseModel):
    week_number: int
    day_number: int
    muscle_group: str
    exercises: List[ProgramExerciseBase]

class ProgramCreate(BaseModel):
    name: str
    duration_weeks: int
    frequency: int
    program_days: List[ProgramDayBase]

class ProgramExerciseResponse(BaseModel):
    id: int
    exercise_id: int
    exercise: ExerciseResponse
    sets: int
    target_reps: int
    rest_time: int
    order_index: int
    predicted_weight: Optional[float]
    
    class Config:
        from_attributes = True

class ProgramDayResponse(BaseModel):
    id: int
    week_number: int
    day_number: int
    muscle_group: str
    exercises: List[ProgramExerciseResponse]
    
    class Config:
        from_attributes = True

class ProgramResponse(BaseModel):
    id: int
    user_id: int
    name: str
    duration_weeks: int
    frequency: int
    created_at: datetime
    is_active: bool
    program_days: List[ProgramDayResponse]
    
    class Config:
        from_attributes = True

# SCHEMAS ENGAGEMENT ADAPTATIF
class UserCommitmentCreate(BaseModel):
    sessions_per_week: int
    focus_muscles: Dict[str, str]
    time_per_session: int

class UserCommitmentResponse(BaseModel):
    user_id: int
    sessions_per_week: int
    focus_muscles: Dict[str, str]
    time_per_session: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AdaptiveTargetsResponse(BaseModel):
    id: int
    muscle_group: str
    target_volume: float
    current_volume: float
    recovery_debt: float
    last_trained: Optional[datetime]
    adaptation_rate: float
    
    class Config:
        from_attributes = True

class TrajectoryAnalysis(BaseModel):
    on_track: bool
    sessions_this_week: int
    sessions_target: int
    volume_adherence: float
    consistency_score: float
    muscle_balance: Dict[str, float]
    insights: List[str]