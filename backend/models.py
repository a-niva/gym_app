# ===== backend/models.py =====
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    birth_date = Column(DateTime)
    height = Column(Float)  # en cm
    weight = Column(Float)  # en kg
    experience_level = Column(String)
    goals = Column(JSON)
    equipment_config = Column(JSON)  # Structure complète nouvelle
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # AJOUTER cascade="all, delete-orphan" à toutes les relations
    workouts = relationship("Workout", back_populates="user", cascade="all, delete-orphan")
    programs = relationship("Program", back_populates="user", cascade="all, delete-orphan")
    commitment = relationship("UserCommitment", back_populates="user", uselist=False, cascade="all, delete-orphan")
    adaptive_targets = relationship("AdaptiveTargets", back_populates="user", cascade="all, delete-orphan")

class Exercise(Base):
    __tablename__ = "exercises"
    
    id = Column(Integer, primary_key=True, index=True)
    name_fr = Column(String, nullable=False)
    name_eng = Column(String, nullable=False)
    equipment = Column(JSON)  # ["barre_olympique"]
    level = Column(String)
    body_part = Column(String)
    sets_reps = Column(JSON)
    equipment_specs = Column(JSON)  # {"barbell_count": 1, "dumbbell_count": 2}
    progression_metadata = Column(JSON)  # Métadonnées de progression
    muscle_groups = Column(JSON)  # Groupes musculaires primaires/secondaires
    fatigue_profile = Column(JSON)  # Profil de fatigue
    recovery_hours = Column(Integer)  # Heures de récupération
    injury_risk_zones = Column(JSON)  # Zones à risque de blessure
    can_superset_with = Column(JSON)  # Exercices compatibles en superset

class Workout(Base):
    __tablename__ = "workouts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String, default="free_time")
    status = Column(String, default="started")  # started, paused, completed, abandoned
    paused_at = Column(DateTime, nullable=True)
    total_pause_duration = Column(Integer, default=0)  # en secondes
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    
    user = relationship("User", back_populates="workouts")
    sets = relationship("Set", back_populates="workout", cascade="all, delete-orphan")

class Set(Base):
    __tablename__ = "sets"
    
    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(Integer, ForeignKey("workouts.id"))
    exercise_id = Column(Integer, ForeignKey("exercises.id"))
    set_number = Column(Integer)
    target_reps = Column(Integer)
    actual_reps = Column(Integer)
    weight = Column(Float)
    rest_time = Column(Integer)
    fatigue_level = Column(Integer)
    perceived_exertion = Column(Integer)
    completed_at = Column(DateTime, default=datetime.utcnow)
    skipped = Column(Boolean, default=False)
    
    workout = relationship("Workout", back_populates="sets")

class Program(Base):
    __tablename__ = "programs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    duration_weeks = Column(Integer, nullable=False)
    frequency = Column(Integer, nullable=False)  # jours par semaine
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    user = relationship("User", back_populates="programs")
    program_days = relationship("ProgramDay", back_populates="program", cascade="all, delete-orphan")

class ProgramDay(Base):
    __tablename__ = "program_days"
    
    id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("programs.id"))
    week_number = Column(Integer, nullable=False)
    day_number = Column(Integer, nullable=False)
    muscle_group = Column(String, nullable=False)
    
    program = relationship("Program", back_populates="program_days")
    exercises = relationship("ProgramExercise", back_populates="program_day", cascade="all, delete-orphan")

class ProgramExercise(Base):
    __tablename__ = "program_exercises"
    
    id = Column(Integer, primary_key=True, index=True)
    program_day_id = Column(Integer, ForeignKey("program_days.id"))
    exercise_id = Column(Integer, ForeignKey("exercises.id"))
    sets = Column(Integer, nullable=False)
    target_reps = Column(Integer, nullable=False)
    rest_time = Column(Integer, nullable=False)
    order_index = Column(Integer, nullable=False)
    predicted_weight = Column(Float, nullable=True)
    
    program_day = relationship("ProgramDay", back_populates="exercises")
    exercise = relationship("Exercise")

class UserCommitment(Base):
    """L'engagement initial de l'utilisateur"""
    __tablename__ = "user_commitments"
    
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    sessions_per_week = Column(Integer, nullable=False)
    focus_muscles = Column(JSON)  # {"Pectoraux": "priority", "Jambes": "maintain"}
    time_per_session = Column(Integer)  # Minutes moyennes souhaitées
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="commitment")

class AdaptiveTargets(Base):
    """Objectifs glissants auto-ajustés sur fenêtre de 7 jours"""
    __tablename__ = "adaptive_targets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    muscle_group = Column(String, nullable=False)
    target_volume = Column(Float)  # Volume optimal calculé
    current_volume = Column(Float, default=0)  # Volume réalisé (fenêtre 7j)
    recovery_debt = Column(Float, default=0)  # Fatigue accumulée
    last_trained = Column(DateTime, nullable=True)
    adaptation_rate = Column(Float, default=1.0)  # Vitesse d'adaptation
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="adaptive_targets")