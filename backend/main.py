# ===== backend/main.py - VERSION FINALE CORRIGÉE =====
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from sqlalchemy import func, distinct
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

# Configuration du mode développement
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"
DEV_USER_ID = 999  # ID fixe pour l'utilisateur de développement

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

@app.post("/api/dev/init")
async def init_dev_mode(db: Session = Depends(get_db)):
    """Initialise le mode développement avec un utilisateur de test persistant"""
    # Vérifier si on est en développement local
    if not (DEV_MODE or os.getenv("RENDER", None) is None):
        raise HTTPException(status_code=403, detail="Dev mode not enabled")
    
    # Chercher ou créer l'utilisateur dev
    dev_user = db.query(User).filter(User.id == DEV_USER_ID).first()
    
    if not dev_user:
        # Créer l'utilisateur avec un ID fixe
        dev_user = User(
            id=DEV_USER_ID,
            name="Dev User",
            birth_date=datetime(1990, 1, 1),
            height=175,
            weight=75,
            experience_level="intermediate",
            goals=["strength", "hypertrophy"],
            equipment_config={
                "barres": {
                    "olympique": {"available": True, "count": 1, "weight": 20},
                    "courte": {"available": True, "count": 1, "weight": 2.5},
                    "ez": {"available": False, "count": 0, "weight": 10}
                },
                "disques": {
                    "available": True,
                    "weights": {"20": 4, "10": 4, "5": 4, "2.5": 4, "1.25": 4}
                },
                "dumbbells": {
                    "available": True,
                    "weights": [5, 10, 15, 20, 25, 30]
                },
                "banc": {
                    "available": True,
                    "inclinable_haut": True,
                    "inclinable_bas": True
                }
            }
        )
        db.add(dev_user)
        db.commit()
        db.refresh(dev_user)
    
    # Générer un historique minimal si nécessaire
    existing_workouts = db.query(Workout).filter(Workout.user_id == DEV_USER_ID).count()
    
    if existing_workouts < 3:
        # Récupérer quelques exercices pour l'historique
        exercises = db.query(Exercise).filter(
            Exercise.body_part.in_(["Pectoraux", "Dos", "Jambes"])
        ).limit(6).all()
        
        if exercises:
            for days_ago in [7, 4, 2]:
                workout = Workout(
                    user_id=DEV_USER_ID,
                    type="free_time",
                    status="completed",
                    created_at=datetime.utcnow() - timedelta(days=days_ago),
                    completed_at=datetime.utcnow() - timedelta(days=days_ago, hours=1)
                )
                db.add(workout)
                db.commit()
                
                # Ajouter 2-3 exercices par workout
                for i, exercise in enumerate(exercises[:3]):
                    for set_num in range(1, 4):
                        base_weight = 40 + (i * 10)
                        weight_progression = base_weight + (7 - days_ago) * 2.5
                        
                        set_record = Set(
                            workout_id=workout.id,
                            exercise_id=exercise.id,
                            set_number=set_num,
                            target_reps=10,
                            actual_reps=10 - (set_num - 1),
                            weight=weight_progression,
                            rest_time=90,
                            fatigue_level=4 + set_num,
                            perceived_exertion=5 + (set_num - 1),
                            skipped=False,
                            completed_at=workout.created_at + timedelta(minutes=5*set_num)
                        )
                        db.add(set_record)
                
                db.commit()
    
    return {
        "user_id": DEV_USER_ID,
        "message": "Dev mode initialized",
        "workouts_count": existing_workouts
    }

@app.get("/api/dev/status")
async def get_dev_status():
    """Vérifie si le mode développement est actif"""
    return {
        "dev_mode": DEV_MODE or os.getenv("RENDER", None) is None,
        "dev_user_id": DEV_USER_ID
    }

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
        
        # Calculate total volume - pour les exercices au poids du corps, utiliser le poids de l'utilisateur
        total_volume = 0
        total_sets_count = 0
        for s in sets:
            if not s.skipped:
                total_sets_count += 1
                # Récupérer l'exercice pour vérifier le type
                exercise = db.query(Exercise).filter(Exercise.id == s.exercise_id).first()
                if exercise:
                    # Pour les exercices au poids du corps sans charge additionnelle
                    if 'bodyweight' in exercise.equipment and s.weight == 0:
                        user = db.query(User).filter(User.id == user_id).first()
                        effective_weight = user.weight if user else 75
                        total_volume += effective_weight * s.actual_reps
                    else:
                        total_volume += s.weight * s.actual_reps
        
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
            "total_sets": total_sets_count,
            "exercises": exercises
        })
    
    return history

@app.delete("/api/users/{user_id}/workout-history")
def delete_workout_history(user_id: int, db: Session = Depends(get_db)):
    """Supprime tout l'historique des séances d'un utilisateur"""
    # Vérifier que l'utilisateur existe
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Récupérer tous les workouts de l'utilisateur
    workouts = db.query(Workout).filter(Workout.user_id == user_id).all()
    
    # Supprimer toutes les séries associées
    for workout in workouts:
        db.query(Set).filter(Set.workout_id == workout.id).delete()
    
    # Supprimer tous les workouts
    db.query(Workout).filter(Workout.user_id == user_id).delete()
    
    db.commit()
    
    return {
        "message": "Historique supprimé avec succès",
        "deleted_workouts": len(workouts)
    }

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

@app.get("/api/users/{user_id}/program/next-weight/{exercise_id}")
def get_next_weight(user_id: int, exercise_id: int, db: Session = Depends(get_db)):
    """Endpoint optimisé pour Render Free - calcul rapide sans ML lourd"""
    
    # Récupérer les 3 dernières séries
    recent_sets = db.query(Set).join(Workout).filter(
        Workout.user_id == user_id,
        Set.exercise_id == exercise_id,
        Set.skipped == False
    ).order_by(Set.completed_at.desc()).limit(3).all()
    
    if not recent_sets:
        # Poids par défaut selon le type d'exercice
        exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
        default_weights = {
            "Pectoraux": 40,
            "Dos": 50,
            "Jambes": 60,
            "Épaules": 20,
            "Biceps": 15,
            "Triceps": 20
        }
        return {"weight": default_weights.get(exercise.body_part, 20) if exercise else 20}
    
    # Calcul simple de progression
    last_set = recent_sets[0]
    
    # Si la dernière série était facile, augmenter
    if last_set.fatigue_level <= 4 and last_set.actual_reps >= last_set.target_reps:
        suggested = last_set.weight * 1.025
    # Si c'était dur, maintenir ou réduire
    elif last_set.fatigue_level >= 8 or last_set.actual_reps < last_set.target_reps * 0.8:
        suggested = last_set.weight * 0.95
    else:
        suggested = last_set.weight
    
    return {"weight": round(suggested, 2.5)}

@app.post("/api/workouts/{workout_id}/fatigue-check")
def check_workout_fatigue(workout_id: int, db: Session = Depends(get_db)):
    """Analyse rapide de fatigue pour éviter le surmenage"""
    
    sets = db.query(Set).filter(
        Set.workout_id == workout_id
    ).order_by(Set.completed_at.desc()).limit(10).all()
    
    if len(sets) < 3:
        return {"risk": "low", "message": "Continuez !"}
    
    # Moyenne de fatigue sur les 3 dernières séries
    recent_fatigue = sum(s.fatigue_level for s in sets[:3]) / 3
    
    # Tendance de fatigue
    if len(sets) >= 5:
        early_fatigue = sum(s.fatigue_level for s in sets[-5:-2]) / 3
        fatigue_increase = recent_fatigue - early_fatigue
    else:
        fatigue_increase = 0
    
    if recent_fatigue >= 8 or fatigue_increase > 3:
        return {
            "risk": "high",
            "message": "Fatigue élevée détectée. Pensez à terminer bientôt.",
            "recommendation": "reduce_weight"
        }
    elif recent_fatigue >= 6:
        return {
            "risk": "medium",
            "message": "Fatigue modérée. Restez vigilant.",
            "recommendation": "maintain"
        }
    else:
        return {
            "risk": "low",
            "message": "Bonne forme ! Continuez.",
            "recommendation": "increase_weight"
        }

@app.get("/api/workouts/{workout_id}/muscle-summary")
def get_muscle_summary(workout_id: int, db: Session = Depends(get_db)):
    """Résumé des muscles travaillés avec calcul de volume adapté"""
    
    sets = db.query(Set).filter(Set.workout_id == workout_id).all()
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    user = db.query(User).filter(User.id == workout.user_id).first() if workout else None
    
    muscle_volumes = {}
    for set_item in sets:
        if set_item.skipped:
            continue
            
        exercise = db.query(Exercise).filter(Exercise.id == set_item.exercise_id).first()
        if exercise:
            # Déterminer le type d'exercice
            is_bodyweight = "bodyweight" in exercise.equipment
            is_time_based = any(keyword in exercise.name_fr.lower() 
                               for keyword in ['gainage', 'planche', 'plank', 'vacuum'])
            
            # Calculer le volume selon le type
            if is_time_based:
                # Pour les exercices temporels : durée × (1 + charge/100)
                volume = set_item.actual_reps * (1 + set_item.weight / 100)
            elif is_bodyweight and set_item.weight == 0:
                # Exercice au poids du corps sans charge : utiliser le poids de l'utilisateur
                body_weight = user.weight if user else 75
                volume = body_weight * set_item.actual_reps
            else:
                # Calcul standard
                volume = set_item.weight * set_item.actual_reps
            
            muscle = exercise.body_part
            muscle_volumes[muscle] = muscle_volumes.get(muscle, 0) + volume
    
    # Détecter les déséquilibres
    warning = None
    if muscle_volumes:
        max_volume = max(muscle_volumes.values())
        avg_volume = sum(muscle_volumes.values()) / len(muscle_volumes)
        
        if max_volume > avg_volume * 2:
            dominant_muscle = max(muscle_volumes, key=muscle_volumes.get)
            warning = f"Attention : {dominant_muscle} très sollicité aujourd'hui"
    
    return {
        "volumes": muscle_volumes,
        "warning": warning
    }

@app.get("/api/users/{user_id}/stats")
def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Compter les workouts
    total_workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.status == "completed"
    ).count()
    
    # Calculer le streak (simplifié)
    last_workout = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.status == "completed"
    ).order_by(Workout.completed_at.desc()).first()

    last_workout_date = None
    if last_workout and last_workout.completed_at:
        last_workout_date = last_workout.completed_at.isoformat()

    return {
        "total_workouts": total_workouts,
        "week_streak": 0,  # À implémenter selon votre logique
        "last_workout": last_workout_date  # Retourner la date ISO ou None
    }

@app.get("/api/users/{user_id}/progression")
def get_user_progression(
    user_id: int, 
    exercise_id: int = None,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Récupère la progression de l'utilisateur sur une période donnée"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    query = db.query(
        func.date(Set.created_at).label('date'),
        func.max(Set.weight*(1 + Set.actual_reps * 0.033)).label('estimated_1rm')
    ).join(
        Exercise, Set.exercise_id == Exercise.id
    ).join(
        Workout, Set.workout_id == Workout.id
    ).filter(
        Workout.user_id == user_id,
        Workout.status == "completed",
        Set.created_at >= start_date
    )
    
    if exercise_id:
        query = query.filter(Set.exercise_id == exercise_id)
    
    results = query.group_by(func.date(Set.created_at)).order_by('date').all()
    if not results:
        return {"dates": [], "weights": []}

    return {
        "dates": [r.date.isoformat() for r in results],
        "weights": [round(r.estimated_1rm, 1) for r in results]
    }

@app.get("/api/users/{user_id}/muscle-volume")
def get_muscle_volume(
    user_id: int,
    period: str = "week",
    db: Session = Depends(get_db)
):
    """Récupère la répartition du volume par groupe musculaire"""
    if period == "week":
        start_date = datetime.utcnow() - timedelta(days=7)
    elif period == "month":
        start_date = datetime.utcnow() - timedelta(days=30)
    else:
        start_date = None
    
    query = db.query(
        Exercise.body_part,
        func.sum(Set.weight * Set.actual_reps).label('volume')
    ).join(
        Exercise, Set.exercise_id == Exercise.id
    ).join(
        Workout, Set.workout_id == Workout.id
    ).filter(
        Workout.user_id == user_id,
        Workout.status == "completed"
    )
    
    if start_date:
        query = query.filter(Set.created_at >= start_date)
    
    results = query.group_by(Exercise.body_part).all()
    
    volumes = {r.body_part: float(r.volume or 0) for r in results}
    total = sum(volumes.values())

    if total == 0:
        return {
            "volumes": {},
            "total": 0,
            "percentages": {}
        }

    return {
        "volumes": volumes,
        "total": total,
        "percentages": {k: round(v/total*100, 1) for k, v in volumes.items()}
    }

@app.get("/api/users/{user_id}/fatigue-trends")
def get_fatigue_trends(
    user_id: int,
    days: int = 14,
    db: Session = Depends(get_db)
):
    """Récupère les tendances de fatigue et performance"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    results = db.query(
        func.date(Workout.created_at).label('date'),
        func.avg(Set.fatigue_level).label('avg_fatigue'),
        func.avg(Set.perceived_exertion).label('avg_exertion'),
        func.count(func.distinct(Workout.id)).label('workout_count')
    ).join(
        Set, Workout.id == Set.workout_id
    ).filter(
        Workout.user_id == user_id,
        Workout.status == "completed",
        Workout.created_at >= start_date
    ).group_by(
        func.date(Workout.created_at)
    ).order_by('date').all()
    
    # Calculer la performance relative (inverse de la fatigue)
    dates = []
    fatigue = []
    performance = []
    
    for r in results:
        dates.append(r.date.isoformat())
        fatigue.append(round(r.avg_fatigue or 5, 1))
        # Performance = 100% - (fatigue * 10)
        perf = 100 - (r.avg_fatigue or 5) * 10
        performance.append(max(0, min(100, perf)))
    
    return {
        "dates": dates,
        "fatigue": fatigue,
        "performance": performance
    }

@app.get("/api/users/{user_id}/personal-records")
def get_personal_records(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Récupère les records personnels par exercice"""
    # Sous-requête pour obtenir le max par exercice
    subquery = db.query(
        Set.exercise_id,
        func.max(Set.weight).label('max_weight')
    ).join(
        Workout, Set.workout_id == Workout.id
    ).filter(
        Workout.user_id == user_id,
        Workout.status == "completed"
    ).group_by(Set.exercise_id).subquery()
    
    # Requête principale avec jointure sur les exercices
    results = db.query(
        Exercise.name_fr,
        subquery.c.max_weight,
        Exercise.body_part
    ).join(
        subquery, Exercise.id == subquery.c.exercise_id
    ).order_by(subquery.c.max_weight.desc()).limit(10).all()
    
    # Vérifier s'il y a des résultats
    if not results:
        return {
            "exercises": [],
            "current_records": [],
            "targets": []
        }
    
    exercises = []
    current_records = []
    targets = []
    
    for r in results:
        exercises.append(r.name_fr)
        current_records.append(float(r.max_weight))
        # Objectif = record actuel + 10%
        targets.append(round(float(r.max_weight) * 1.1, 1))
    
    return {
        "exercises": exercises,
        "current_records": current_records,
        "targets": targets
    }

@app.get("/api/exercises", response_model=List[ExerciseResponse])
def get_exercises(db: Session = Depends(get_db)):
    """Récupère la liste des exercices"""
    exercises = db.query(Exercise).all()
    return exercises


# Set endpoints
@app.post("/api/sets/")
def create_set(set_data: SetCreate, db: Session = Depends(get_db)):
    db_set = Set(**set_data.dict())
    db.add(db_set)
    db.commit()
    db.refresh(db_set)
    return {"id": db_set.id, "created": True}


@app.get("/api/users/")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "name": u.name, "created_at": u.created_at} for u in users]


@app.get("/api/sets/{workout_id}")
def get_workout_sets(workout_id: int, db: Session = Depends(get_db)):
    sets = db.query(Set).filter(Set.workout_id == workout_id).all()
    return sets

# Static files
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
