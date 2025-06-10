# ===== backend/main.py =====
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

import json
import os

from backend.database import engine, get_db, SessionLocal
from backend.models import Base, User, Exercise, Workout, Set
from backend.routes import router as ml_router

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

app = FastAPI(title="Fitness Coach API", lifespan=lifespan)
app.include_router(ml_router)

# CORS for local network access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic schemas
class UserCreate(BaseModel):
    name: str
    age: int
    experience_level: str
    goals: List[str]
    available_equipment: List[str]
    dumbbell_weights: List[int]

class UserResponse(BaseModel):
    id: int
    name: str
    age: int
    experience_level: str
    goals: List[str]
    available_equipment: List[str]
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
    skipped: bool = False

class ExerciseResponse(BaseModel):
    id: int
    name_fr: str
    name_eng: str
    equipment: List[str]
    level: str
    body_part: str
    sets_reps: List[dict]
    
    class Config:
        from_attributes = True

# User endpoints
@app.post("/api/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = User(**user.dict())
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
    
    # Note: equipment filter would need JSON querying, simplified here
    exercises = query.offset(skip).limit(limit).all()
    return exercises

@app.get("/api/exercises/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(exercise_id: int, db: Session = Depends(get_db)):
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise

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

@app.get("/api/sets/last-weight/{user_id}/{exercise_id}")
def get_last_weight(user_id: int, exercise_id: int, db: Session = Depends(get_db)):
    # Get last non-skipped set for this exercise
    last_set = db.query(Set).join(Workout).filter(
        Workout.user_id == user_id,
        Set.exercise_id == exercise_id,
        Set.skipped == False
    ).order_by(Set.completed_at.desc()).first()
    
    if last_set:
        return {"weight": last_set.weight, "reps": last_set.actual_reps}
    return {"weight": None, "reps": None}

# Stats endpoint
@app.get("/api/stats/{user_id}")
def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    total_workouts = db.query(Workout).filter(Workout.user_id == user_id).count()
    
    # Total volume
    sets = db.query(Set).join(Workout).filter(
        Workout.user_id == user_id,
        Set.skipped == False
    ).all()
    total_volume = sum(s.weight * s.actual_reps for s in sets)
    
    # This week
    week_start = datetime.utcnow() - timedelta(days=7)
    week_workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.created_at >= week_start
    ).count()
    
    return {
        "total_workouts": total_workouts,
        "total_volume": total_volume,
        "week_workouts": week_workouts
    }

# Serve frontend
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
else:
    print(f"Warning: frontend folder not found at {frontend_path}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)