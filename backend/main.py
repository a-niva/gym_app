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
async def create_workout(workout: WorkoutCreate, db: Session = Depends(get_db)):
    # Vérifier que l'utilisateur existe
    user = db.query(User).filter(User.id == workout.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Vérifier qu'il n'y a pas déjà une session active
    active_workout = db.query(Workout).filter(
        Workout.user_id == workout.user_id,
        Workout.status.in_(["started", "paused"])
    ).first()
    
    if active_workout:
        raise HTTPException(
            status_code=400, 
            detail=f"Session active existante (ID: {active_workout.id}). Terminez-la d'abord."
        )
    
    # Créer le workout
    db_workout = Workout(
        user_id=workout.user_id,
        type=workout.type,
        status="started"
    )
    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)
    
    return {
        "id": db_workout.id,
        "status": db_workout.status,
        "created_at": db_workout.created_at,
        "type": db_workout.type
    }

@app.get("/api/workouts/{user_id}/history")
def get_workout_history(user_id: int, limit: int = 20, db: Session = Depends(get_db)):
    workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.status == "completed"
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
    
    if workout.status == "completed":
        raise HTTPException(status_code=400, detail="Workout already completed")
    
    # Si en pause, calculer la durée de pause finale
    if workout.status == "paused" and workout.paused_at:
        pause_duration = (datetime.utcnow() - workout.paused_at).total_seconds()
        workout.total_pause_duration += int(pause_duration)
    
    workout.completed_at = datetime.utcnow()
    workout.status = "completed"
    db.commit()
    
    return {"status": "completed", "completed_at": workout.completed_at}

@app.put("/api/workouts/{workout_id}/pause")
def pause_workout(workout_id: int, db: Session = Depends(get_db)):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    if workout.status != "started":
        raise HTTPException(status_code=400, detail=f"Cannot pause workout in status: {workout.status}")
    
    workout.status = "paused"
    workout.paused_at = datetime.utcnow()
    db.commit()
    
    return {"status": "paused", "paused_at": workout.paused_at}

@app.put("/api/workouts/{workout_id}/resume")
def resume_workout(workout_id: int, db: Session = Depends(get_db)):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    if workout.status != "paused":
        raise HTTPException(status_code=400, detail=f"Cannot resume workout in status: {workout.status}")
    
    if workout.paused_at:
        pause_duration = (datetime.utcnow() - workout.paused_at).total_seconds()
        workout.total_pause_duration += int(pause_duration)
    
    workout.status = "started"
    workout.paused_at = None
    db.commit()
    
    return {"status": "resumed", "total_pause_duration": workout.total_pause_duration}

@app.put("/api/workouts/{workout_id}/abandon")
def abandon_workout(workout_id: int, db: Session = Depends(get_db)):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    if workout.status == "completed":
        raise HTTPException(status_code=400, detail="Workout already completed")
    
    workout.status = "abandoned"
    workout.completed_at = datetime.utcnow()
    db.commit()
    
    return {"status": "abandoned"}

@app.get("/api/workouts/{workout_id}/status")
def get_workout_status(workout_id: int, db: Session = Depends(get_db)):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    # Calculer la durée totale
    if workout.completed_at:
        total_duration = (workout.completed_at - workout.created_at).total_seconds()
    else:
        total_duration = (datetime.utcnow() - workout.created_at).total_seconds()
    
    active_duration = total_duration - workout.total_pause_duration
    
    return {
        "id": workout.id,
        "status": workout.status,
        "created_at": workout.created_at,
        "completed_at": workout.completed_at,
        "total_duration": int(total_duration),
        "active_duration": int(active_duration),
        "pause_duration": workout.total_pause_duration,
        "type": workout.type
    }

@app.patch("/api/sets/{set_id}/rest-time")
def update_set_rest_time(set_id: int, rest_time: int, db: Session = Depends(get_db)):
    """Update rest time for a completed set"""
    set_obj = db.query(Set).filter(Set.id == set_id).first()
    if not set_obj:
        raise HTTPException(status_code=404, detail="Set not found")
    
    set_obj.rest_time = rest_time
    db.commit()
    return {"updated": True, "set_id": set_id, "rest_time": rest_time}

@app.get("/api/users/{user_id}/active-workout")
def get_active_workout(user_id: int, db: Session = Depends(get_db)):
    """Récupère la session active d'un utilisateur s'il y en a une"""
    workout = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.status.in_(["started", "paused"])
    ).first()
    
    if not workout:
        return {"active_workout": None}
    
    return {
        "active_workout": {
            "id": workout.id,
            "status": workout.status,
            "type": workout.type,
            "created_at": workout.created_at
        }
    }

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