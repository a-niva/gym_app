# ===== backend/routes.py =====
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database import get_db
from backend.models import User, Exercise, Workout, Set
from backend.ml_engine import FitnessMLEngine
from backend.schemas import UserCreate, WorkoutCreate, SetCreate, ProgramGenerationRequest, ProgramCreate, ProgramDayBase, ProgramExerciseBase
from backend.schemas import UserCommitmentCreate, UserCommitmentResponse, AdaptiveTargetsResponse, TrajectoryAnalysis
from backend.models import UserCommitment, AdaptiveTargets
from backend.ml_engine import RecoveryTracker, VolumeOptimizer, SessionBuilder, ProgressionAnalyzer, RealTimeAdapter
from datetime import datetime
import logging
logger = logging.getLogger(__name__)


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

# ========== ENDPOINTS SYSTÈME ADAPTATIF ==========

@router.post("/api/users/{user_id}/commitment")
async def create_user_commitment(
    user_id: int,
    commitment: UserCommitmentCreate,
    db: Session = Depends(get_db)
):
    """Créer ou mettre à jour l'engagement utilisateur"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Vérifier si un engagement existe déjà
    existing = db.query(UserCommitment).filter(
        UserCommitment.user_id == user_id
    ).first()
    
    if existing:
        # Mettre à jour
        for key, value in commitment.dict().items():
            setattr(existing, key, value)
        existing.updated_at = datetime.utcnow()
    else:
        # Créer nouveau
        new_commitment = UserCommitment(
            user_id=user_id,
            **commitment.dict()
        )
        db.add(new_commitment)
    
    db.commit()
    
    # Initialiser les targets adaptatifs
    volume_optimizer = VolumeOptimizer(db)
    muscles = ["chest", "back", "shoulders", "legs", "arms", "core"]
    
    for muscle in muscles:
        # Vérifier si existe déjà
        target = db.query(AdaptiveTargets).filter(
            AdaptiveTargets.user_id == user_id,
            AdaptiveTargets.muscle_group == muscle
        ).first()
        
        if not target:
            target = AdaptiveTargets(
                user_id=user_id,
                muscle_group=muscle,
                target_volume=volume_optimizer.calculate_optimal_volume(user, muscle),
                current_volume=0,
                recovery_debt=0,
                adaptation_rate=1.0
            )
            db.add(target)
    
    db.commit()
    
    return {"message": "Commitment created/updated successfully"}

@router.get("/api/users/{user_id}/commitment", response_model=UserCommitmentResponse)
async def get_user_commitment(user_id: int, db: Session = Depends(get_db)):
    """Récupérer l'engagement utilisateur"""
    commitment = db.query(UserCommitment).filter(
        UserCommitment.user_id == user_id
    ).first()
    
    if not commitment:
        raise HTTPException(status_code=404, detail="No commitment found")
    
    return commitment

@router.get("/api/users/{user_id}/adaptive-targets", response_model=List[AdaptiveTargetsResponse])
async def get_adaptive_targets(user_id: int, db: Session = Depends(get_db)):
    """Récupérer les objectifs adaptatifs"""
    targets = db.query(AdaptiveTargets).filter(
        AdaptiveTargets.user_id == user_id
    ).all()
    
    return targets

@router.get("/api/users/{user_id}/trajectory", response_model=TrajectoryAnalysis)
async def get_trajectory_analysis(user_id: int, db: Session = Depends(get_db)):
    """Analyser la trajectoire de progression"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    analyzer = ProgressionAnalyzer(db)
    analysis = analyzer.get_trajectory_status(user)
    
    return analysis

@router.post("/api/users/{user_id}/generate-adaptive-workout")
async def generate_adaptive_workout(
    user_id: int,
    time_available: int = 60,  # Minutes disponibles
    db: Session = Depends(get_db)
):
    """Générer une séance adaptative basée sur l'état actuel"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Analyser l'état actuel
    recovery_tracker = RecoveryTracker(db)
    volume_optimizer = VolumeOptimizer(db)
    session_builder = SessionBuilder(db)
    
    # Déterminer quels muscles entraîner
    muscle_readiness = {}
    volume_deficits = volume_optimizer.get_volume_deficit(user)
    
    for muscle in ["chest", "back", "shoulders", "legs", "arms", "core"]:
        readiness = recovery_tracker.get_muscle_readiness(muscle, user)
        deficit = volume_deficits.get(muscle, 0)
        
        # Score combiné (récupération + besoin de volume)
        priority_score = readiness * 0.4 + deficit * 0.6
        muscle_readiness[muscle] = priority_score
    
    # Sélectionner les 2-3 meilleurs muscles
    sorted_muscles = sorted(muscle_readiness.items(), key=lambda x: x[1], reverse=True)
    selected_muscles = [m[0] for m in sorted_muscles[:3] if m[1] > 0.3]
    
    if not selected_muscles:
        # Fallback : prendre les plus reposés
        selected_muscles = [m[0] for m in sorted_muscles[:2]]
    
    # Construire la séance
    workout = session_builder.build_session(
        muscles=selected_muscles,
        time_budget=time_available * 60,  # Convertir en secondes
        user=user
    )
    
    return {
        "muscles": selected_muscles,
        "exercises": workout,
        "estimated_duration": sum(ex["sets"] * (30 + ex["rest_time"]) for ex in workout) / 60,
        "readiness_scores": {m: round(s, 2) for m, s in muscle_readiness.items()}
    }

@router.post("/api/workouts/{workout_id}/complete-adaptive")
async def complete_adaptive_workout(
    workout_id: int,
    db: Session = Depends(get_db)
):
    """Marquer une séance comme terminée et adapter les objectifs"""
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    # Marquer comme complété
    workout.status = "completed"
    workout.completed_at = datetime.utcnow()
    db.commit()
    
    # Adapter en temps réel
    adapter = RealTimeAdapter(db)
    adapter.handle_session_completed(workout)
    
    return {"message": "Workout completed and targets adapted"}

@router.post("/api/users/{user_id}/skip-session")
async def skip_session(
    user_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Gérer une séance ratée intelligemment"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    adapter = RealTimeAdapter(db)
    adapter.handle_session_skipped(user, reason)
    
    # Générer un message encourageant
    reminder = adapter.get_smart_reminder(user)
    
    return {
        "message": "Session skipped handled",
        "reminder": reminder
    }

@router.get("/api/programs/{program_id}/adjustments")
async def get_program_adjustments(
    program_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Obtenir les suggestions d'ajustement pour un programme"""
    ml_engine = FitnessMLEngine(db)
    
    try:
        suggestions = ml_engine.suggest_program_adjustments(user_id, program_id)
        return suggestions
    except Exception as e:
        logger.error(f"Error getting adjustments: {str(e)}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@router.post("/api/users/{user_id}/adaptive-workout")
async def generate_adaptive_workout(
    user_id: int,
    request: dict,
    db: Session = Depends(get_db)
    ):
    """Génère une séance adaptative basée sur le temps disponible"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    time_available = request.get("time_available", 60)
    
    try:
        # Utiliser le ML Engine directement pour générer une séance adaptative
        ml_engine = FitnessMLEngine(db)
        
        # Récupérer les muscles à entraîner selon la récupération
        recovery_tracker = RecoveryTracker(db)
        volume_optimizer = VolumeOptimizer(db)
        
        muscle_readiness = {}
        volume_deficits = volume_optimizer.get_volume_deficit(user)
        
        # Mapping des groupes musculaires
        muscle_mapping = {
            "chest": "Pectoraux",
            "back": "Trapèzes",
            "shoulders": "Deltoïdes", 
            "legs": "Quadriceps",
            "arms": "Biceps",
            "core": "Abdominaux"
        }
        
        for muscle_key, muscle_name in muscle_mapping.items():
            readiness = recovery_tracker.get_muscle_readiness(muscle_key, user)
            deficit = volume_deficits.get(muscle_key, 0)
            priority_score = readiness * 0.4 + deficit * 0.6
            muscle_readiness[muscle_key] = priority_score
        
        # Sélectionner les 2-3 meilleurs muscles
        sorted_muscles = sorted(muscle_readiness.items(), key=lambda x: x[1], reverse=True)
        selected_muscles = [muscle_mapping[m[0]] for m in sorted_muscles[:3] if m[1] > 0.3]
        
        if not selected_muscles:
            selected_muscles = ["Pectoraux", "Biceps"]  # Fallback
        
        # Générer les exercices via le ML Engine
        exercises = []
        for muscle in selected_muscles:
            muscle_exercises = db.query(Exercise).filter(
                Exercise.body_part == muscle
            ).limit(2).all()
            
            for ex in muscle_exercises:
                if ex:
                    sets_reps = ml_engine.get_sets_reps_for_level(
                        ex, user.experience_level, user.goals
                    )
                    weight = ml_engine.calculate_starting_weight(user, ex)
                    
                    exercises.append({
                        "exercise_id": ex.id,
                        "exercise_name": ex.name_fr,
                        "body_part": ex.body_part,
                        "sets": sets_reps["sets"],
                        "target_reps": sets_reps["reps"],
                        "suggested_weight": weight,
                        "rest_time": 90 if "strength" in user.goals else 60
                    })
        
        return {
            "muscles": selected_muscles,
            "exercises": exercises,
            "estimated_duration": time_available,
            "readiness_scores": {m: round(s, 2) for m, s in muscle_readiness.items()}
        }
        
    except Exception as e:
        logger.error(f"Error generating adaptive workout: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate workout")