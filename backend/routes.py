# ===== backend/routes.py =====
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models import User, Exercise, Workout, Set
from backend.ml_engine import FitnessMLEngine
from backend.schemas import UserCreate, WorkoutCreate, SetCreate, ProgramGenerationRequest

router = APIRouter()

@router.post("/api/users/{user_id}/program")
async def generate_program(
    user_id: int, 
    request: ProgramGenerationRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    ml_engine = FitnessMLEngine(db)
    program = ml_engine.generate_adaptive_program(user, request.weeks, request.frequency)
    
    return {"program": program}

@router.get("/api/users/{user_id}/injury-risk")
async def check_injury_risk(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    ml_engine = FitnessMLEngine(db)
    risk_analysis = ml_engine.analyze_injury_risk(user)
    
    return risk_analysis

@router.post("/api/workouts/{workout_id}/sets/{set_id}/adjust")
async def adjust_workout(
    workout_id: int, 
    set_id: int,
    remaining_sets: int,
    db: Session = Depends(get_db)
):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    current_set = db.query(Set).filter(Set.id == set_id).first()
    
    if not workout or not current_set:
        raise HTTPException(status_code=404, detail="Workout or set not found")
    
    ml_engine = FitnessMLEngine(db)
    adjustments = ml_engine.adjust_workout_in_progress(
        workout.user,
        current_set,
        remaining_sets
    )
    
    return adjustments