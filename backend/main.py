# ===== backend/main.py - VERSION FINALE CORRIGÉE =====
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

import json
import os

from backend.database import engine, get_db, SessionLocal
from backend.models import Base, User, Exercise, Workout, Set
from backend.routes import router as ml_router
from backend.schemas import UserCreate, UserResponse, WorkoutCreate, SetCreate, ExerciseResponse

# Create tables
Base.metadata.create_all(bind=engine)

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db = SessionLocal()
    try:
        # Check if exercises already imported
        if db.query(Exercise).count() == 0:
            # Import from JSON
            json_path = os.path.join(os.path.dirname(__file__), "..", "exercises.json")
            if os.path.exists(json_path):
                with open(json_path, "r", encoding="utf-8") as f:
                    exercises_data = json.load(f)
                    for ex_data in exercises_data:
                        exercise = Exercise(**ex_data)
                        db.add(exercise)
                    db.commit()
                    print(f"Imported {len(exercises_data)} exercises")
            else:
                print(f"Warning: {json_path} not found. Please add your exercises.json file.")
    finally:
        db.close()
    
    yield
    # Shutdown (nothing to do)

app = FastAPI(title="Gym Coach API", lifespan=lifespan)
app.include_router(ml_router)

# CORS for local network access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# User endpoints
@app.post("/api/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    user_data = user.dict()
    
    # Créer l'utilisateur avec la nouvelle structure
    db_user = User(**user_data)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/api/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Exercise endpoints
@app.get("/api/exercises/", response_model=List[ExerciseResponse])
def get_exercises(
    skip: int = 0,
    limit: int = 1000,
    body_part: Optional[str] = None,
    equipment: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Exercise)
    
    if body_part:
        query = query.filter(Exercise.body_part == body_part)
    
    exercises = query.offset(skip).limit(limit).all()
    return exercises

@app.get("/api/exercises/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(exercise_id: int, db: Session = Depends(get_db)):
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise

# NOUVEAU: Endpoint pour exercices disponibles selon équipement utilisateur
@app.get("/api/users/{user_id}/available-exercises", response_model=List[ExerciseResponse])
def get_available_exercises(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.equipment_config:
        return []
    
    # Analyser l'équipement disponible
    config = user.equipment_config
    available_equipment = []
    
    # Barres
    for barre_type, barre_config in config.get("barres", {}).items():
        if barre_config.get("available", False):
            available_equipment.append(barre_type)
    
    # Haltères
    if config.get("dumbbells", {}).get("available", False):
        available_equipment.append("dumbbells")
    
    # Banc
    if config.get("banc", {}).get("available", False):
        available_equipment.append("bench_plat")
        if config["banc"].get("inclinable_haut", False):
            available_equipment.append("bench_inclinable")
        if config["banc"].get("inclinable_bas", False):
            available_equipment.append("bench_declinable")
    
    # Élastiques
    if config.get("elastiques", {}).get("available", False):
        available_equipment.append("elastiques")
    
    # Autres équipements
    autres = config.get("autres", {})
    for equip_type, equip_config in autres.items():
        if equip_config.get("available", False):
            available_equipment.append(equip_type)
    
    # Poids du corps toujours disponible
    available_equipment.append("bodyweight")
    
    # Filtrer les exercices
    all_exercises = db.query(Exercise).all()
    compatible_exercises = []
    
    for exercise in all_exercises:
        exercise_equipment = exercise.equipment or []
        # Vérifier si tous les équipements requis sont disponibles
        if all(eq in available_equipment for eq in exercise_equipment):
            compatible_exercises.append(exercise)
    
    return compatible_exercises

# Workout endpoints
@app.post("/api/workouts/")
def create_workout(workout: WorkoutCreate, db: Session = Depends(get_db)):
    db_workout = Workout(**workout.dict())
    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)
    return {"id": db_workout.id, "created_at": db_workout.created_at}

@app.get("/api/workouts/{user_id}/history")
def get_workout_history(user_id: int, limit: int = 20, db: Session = Depends(get_db)):
    workouts = db.query(Workout).filter(
        Workout.user_id == user_id
    ).order_by(Workout.created_at.desc()).limit(limit).all()
    
    history = []
    for workout in workouts:
        sets = db.query(Set).filter(Set.workout_id == workout.id).all()
        
        # Calculate total volume
        total_volume = sum(s.weight * s.actual_reps for s in sets if not s.skipped)
        
        # Get unique exercises
        exercise_ids = list(set(s.exercise_id for s in sets))
        exercises = []
        for ex_id in exercise_ids[:3]:  # First 3 exercises
            ex = db.query(Exercise).filter(Exercise.id == ex_id).first()
            if ex:
                exercises.append(ex.name_fr)
        
        history.append({
            "id": workout.id,
            "date": workout.created_at,
            "type": workout.type,
            "total_volume": total_volume,
            "total_sets": len(sets),
            "exercises": exercises
        })
    
    return history

@app.put("/api/workouts/{workout_id}/complete")
def complete_workout(workout_id: int, db: Session = Depends(get_db)):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    workout.completed_at = datetime.utcnow()
    db.commit()
    return {"status": "completed"}

# Set endpoints
@app.post("/api/sets/")
def create_set(set_data: SetCreate, db: Session = Depends(get_db)):
    db_set = Set(**set_data.dict())
    db.add(db_set)
    db.commit()
    db.refresh(db_set)
    return {"id": db_set.id, "created": True}

@app.get("/api/sets/{workout_id}")
def get_workout_sets(workout_id: int, db: Session = Depends(get_db)):
    sets = db.query(Set).filter(Set.workout_id == workout_id).all()
    return sets

# Static files
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")