# ===== backend/models.py =====
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer)
    experience_level = Column(String)
    goals = Column(JSON)
    
    # NOUVELLE STRUCTURE ÉQUIPEMENT (prioritaire)
    equipment_config = Column(JSON)  # Structure complète nouvelle
    

    created_at = Column(DateTime, default=datetime.utcnow)
    
    workouts = relationship("Workout", back_populates="user")

class Exercise(Base):
    __tablename__ = "exercises"
    
    id = Column(Integer, primary_key=True, index=True)
    name_fr = Column(String, nullable=False)
    name_eng = Column(String, nullable=False)
    equipment = Column(JSON)  # Nouveau format: ["barbell_standard", "dumbbells"]
    level = Column(String)
    body_part = Column(String)
    sets_reps = Column(JSON)
    
    # NOUVEAU: Spécifications détaillées
    equipment_specs = Column(JSON)  # {"barbell_count": 1, "dumbbell_count": 2}

class Workout(Base):
    __tablename__ = "workouts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String, default="free_time")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    
    user = relationship("User", back_populates="workouts")
    sets = relationship("Set", back_populates="workout")

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