# ===== backend/routes.py =====
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models import User, Exercise, Workout, Set
from backend.ml_engine import FitnessMLEngine
from backend.schemas import UserCreate, WorkoutCreate, SetCreate, ProgramGenerationRequest, ProgramCreate, ProgramDayBase, ProgramExerciseBase
import logging
router = APIRouter()

#@router.post("/api/users/{user_id}/program")
#async def generate_program(
 #   user_id: int, 
 #   request: ProgramGenerationRequest,
 #   db: Session = Depends(get_db)
#:
 #   user = db.query(User).filter(User.id == user_id).first()
 #   if not user:
 #       raise HTTPException(status_code=404, detail="User not found")
 #   
 #   ml_engine = FitnessMLEngine(db)

 #   logger = logging.getLogger(__name__)

 #   try:
 #       program = ml_engine.generate_adaptive_program(user, request.weeks, request.frequency)
 #   except Exception as e:
 #       logger.error(f"Program generation failed for user {user_id}: {str(e)}")
 #       raise HTTPException(status_code=500, detail="Program generation failed")
 #       
 #   # Transformer le format pour la sauvegarde
 #   program_data = ProgramCreate(
 #       name=f"Programme {request.weeks} semaines - {request.frequency}j/sem",
 #       duration_weeks=request.weeks,
 #       frequency=request.frequency,
 #       program_days=[]
 #   )

 #   # Transformer le format du programme généré
 #   for item in program:
 #       # Trouver ou créer le ProgramDay
 #       day_exists = False
 #       for day in program_data.program_days:
 #           if day.week_number == item["week"] and day.day_number == item["day"]:
 #               day_exists = True
 #               # Ajouter l'exercice à ce jour
 #               for i, ex in enumerate(item["exercises"]):
 #                   day.exercises.append(ProgramExerciseBase(
 #                       exercise_id=ex["exercise_id"],
 #                       sets=ex["sets"],
 #                       target_reps=ex["target_reps"],
 #                       rest_time=ex["rest_time"],
 #                       order_index=i,
 #                       predicted_weight=ex["predicted_weight"]
 #                   ))
 #               break
 #       
 #       if not day_exists:
 #           # Créer un nouveau jour avec ses exercices
 #           exercises = []
 #           for i, ex in enumerate(item["exercises"]):
 #               exercises.append(ProgramExerciseBase(
 #                   exercise_id=ex["exercise_id"],
 #                   sets=ex["sets"],
 #                   target_reps=ex["target_reps"],
 #                   rest_time=ex["rest_time"],
 #                   order_index=i,
 #                   predicted_weight=ex["predicted_weight"]
 #               ))
 #           
 #           program_data.program_days.append(ProgramDayBase(
 #               week_number=item["week"],
 #               day_number=item["day"],
 #               muscle_group=item["muscle_group"],
 #               exercises=exercises
 #           ))

 #   # Sauvegarder en base
 #   saved_program = create_program(program_data, db)

 #   return {
 #       "program": program,
 #       "saved_program_id": saved_program.id
 #   }

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

    logger = logging.getLogger(__name__)

    try:
        program = ml_engine.generate_adaptive_program(user, request.weeks, request.frequency)
    except Exception as e:
        logger.error(f"Program generation failed for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Program generation failed")
    
    # Retourner uniquement le programme généré pour l'instant
    # La sauvegarde sera gérée côté frontend
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