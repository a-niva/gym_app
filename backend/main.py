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

@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

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
        
        # Calculate total volume - pour les exercices au poids du corps, utiliser le poids de l'utilisateur
        total_volume = 0
        for s in sets:
            if not s.skipped:
                # Récupérer l'exercice pour vérifier si c'est du bodyweight
                exercise = db.query(Exercise).filter(Exercise.id == s.exercise_id).first()
                if exercise and any('bodyweight' in eq for eq in exercise.equipment):
                    # Pour bodyweight, ajouter le poids du corps à la charge additionnelle
                    user = db.query(User).filter(User.id == user_id).first()
                    body_weight = user.weight if user else 75
                    effective_weight = body_weight + s.weight  # s.weight est le lest additionnel
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
            "total_sets": len(sets),
            "exercises": exercises
        })
    
    return history

@app.delete("/api/users/{user_id}/workout-history")
def delete_workout_history(user_id: int, db: Session = Depends(get_db)):
    """Supprime tout l'historique des séances d'un utilisateur"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Utiliser SQL brut pour éviter les problèmes de contraintes
        from sqlalchemy import text
        
        # Supprimer d'abord les sets
        db.execute(text("""
            DELETE FROM sets 
            WHERE workout_id IN (
                SELECT id FROM workouts WHERE user_id = :user_id
            )
        """), {"user_id": user_id})
        
        # Puis les workouts
        count = db.query(Workout).filter(Workout.user_id == user_id).count()
        db.execute(text("DELETE FROM workouts WHERE user_id = :user_id"), {"user_id": user_id})
        
        db.commit()
        
        return {
            "message": "Historique supprimé avec succès",
            "deleted_workouts": count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

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
    
    last_workout_date = "Jamais"
    if last_workout and last_workout.completed_at:
        last_workout_date = last_workout.completed_at.strftime("%d/%m")
    
    return {
        "total_workouts": total_workouts,
        "week_streak": 0,  # À implémenter selon votre logique
        "last_workout": last_workout_date
    }

# Set endpoints
@app.post("/api/sets/")
def create_set(set_data: SetCreate, db: Session = Depends(get_db)):
    # Filtrer uniquement les champs qui existent dans le modèle Set
    set_dict = set_data.dict()
    valid_fields = ['workout_id', 'exercise_id', 'set_number', 'target_reps', 
                    'actual_reps', 'weight', 'rest_time', 'fatigue_level', 
                    'perceived_exertion', 'skipped']
    filtered_data = {k: v for k, v in set_dict.items() if k in valid_fields}
    db_set = Set(**filtered_data)
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

# Analytics endpoints for stats page
@app.get("/api/users/{user_id}/muscle-progression")
def get_muscle_progression(user_id: int, period: str = "month", db: Session = Depends(get_db)):
    """Progression de charge par groupe musculaire"""
    from datetime import datetime, timedelta
    
    # Définir la période
    end_date = datetime.utcnow()
    if period == "week":
        start_date = end_date - timedelta(days=7)
    elif period == "month":
        start_date = end_date - timedelta(days=30)
    else:  # year
        start_date = end_date - timedelta(days=365)
    
    # Récupérer tous les sets de la période
    sets = db.query(Set).join(Workout).filter(
        Workout.user_id == user_id,
        Workout.status == "completed",
        Set.completed_at >= start_date,
        Set.completed_at <= end_date,
        Set.skipped == False
    ).all()
    
    if not sets:
        return {"dates": [], "muscle_groups": {}}
    
    # Grouper par date et muscle
    muscle_data = {}
    dates_set = set()
    
    for set_item in sets:
        exercise = db.query(Exercise).filter(Exercise.id == set_item.exercise_id).first()
        if not exercise:
            continue
            
        muscle = exercise.body_part
        date_str = set_item.completed_at.strftime("%Y-%m-%d")
        dates_set.add(date_str)
        
        if muscle not in muscle_data:
            muscle_data[muscle] = {}
        
        if date_str not in muscle_data[muscle]:
            muscle_data[muscle][date_str] = []
        
        muscle_data[muscle][date_str].append(set_item.weight)
    
    # Calculer la charge max par jour et muscle
    dates = sorted(list(dates_set))
    muscle_groups = {}
    
    for muscle, date_weights in muscle_data.items():
        muscle_groups[muscle] = []
        for date in dates:
            if date in date_weights:
                muscle_groups[muscle].append(max(date_weights[date]))
            else:
                muscle_groups[muscle].append(None)
    
    return {"dates": dates, "muscle_groups": muscle_groups}

@app.get("/api/users/{user_id}/muscle-recovery")
def get_muscle_recovery(user_id: int, db: Session = Depends(get_db)):
    """Dashboard de récupération musculaire"""
    from datetime import datetime, timedelta
    
    # Récupérer le dernier workout par groupe musculaire
    last_workouts = {}
    
    # Récupérer tous les sets des 30 derniers jours
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    sets = db.query(Set).join(Workout).filter(
        Workout.user_id == user_id,
        Workout.status == "completed",
        Workout.completed_at >= thirty_days_ago,
        Set.skipped == False
    ).order_by(Set.completed_at.desc()).all()
    
    for set_item in sets:
        exercise = db.query(Exercise).filter(Exercise.id == set_item.exercise_id).first()
        if exercise:
            muscle = exercise.body_part
            if muscle not in last_workouts:
                last_workouts[muscle] = set_item.completed_at
    
    # Calculer le temps de récupération
    recovery_data = []
    now = datetime.utcnow()
    
    all_muscles = ["Pectoraux", "Dos", "Épaules", "Biceps", "Triceps", "Jambes", "Abdominaux"]
    
    for muscle in all_muscles:
        if muscle in last_workouts:
            hours_since = (now - last_workouts[muscle]).total_seconds() / 3600
            recovery_data.append({
                "muscle": muscle,
                "hours_since_last": round(hours_since, 1),
                "status": "ready" if hours_since > 48 else "recovering" if hours_since > 24 else "fatigued"
            })
        else:
            recovery_data.append({
                "muscle": muscle,
                "hours_since_last": 999,
                "status": "ready"
            })
    
    return {"muscles": recovery_data}

@app.get("/api/users/{user_id}/muscle-volume")
def get_muscle_volume(user_id: int, period: str = "month", db: Session = Depends(get_db)):
    """Volume total par groupe musculaire"""
    from datetime import datetime, timedelta
    
    # Définir la période
    end_date = datetime.utcnow()
    if period == "week":
        start_date = end_date - timedelta(days=7)
    elif period == "month":
        start_date = end_date - timedelta(days=30)
    else:  # year
        start_date = end_date - timedelta(days=365)
    
    # Récupérer tous les sets de la période
    sets = db.query(Set).join(Workout).join(Exercise).filter(
        Workout.user_id == user_id,
        Workout.status == "completed",
        Set.completed_at >= start_date,
        Set.completed_at <= end_date,
        Set.skipped == False
    ).all()
    
    muscle_volumes = {}
    for set_item in sets:
        exercise = db.query(Exercise).filter(Exercise.id == set_item.exercise_id).first()
        if exercise:
            volume = set_item.weight * set_item.actual_reps
            muscle = exercise.body_part
            muscle_volumes[muscle] = muscle_volumes.get(muscle, 0) + volume
    
    return {"volumes": muscle_volumes}

@app.get("/api/users/{user_id}/equipment-usage")
def get_equipment_usage(user_id: int, period: str = "month", db: Session = Depends(get_db)):
    """Utilisation d'équipement en format sunburst"""
    from datetime import datetime, timedelta
    
    # Définir la période
    end_date = datetime.utcnow()
    if period == "week":
        start_date = end_date - timedelta(days=7)
    elif period == "month":
        start_date = end_date - timedelta(days=30)
    else:  # year
        start_date = end_date - timedelta(days=365)
    
    # Récupérer tous les sets de la période
    sets = db.query(Set).join(Workout).filter(
        Workout.user_id == user_id,
        Workout.status == "completed",
        Set.completed_at >= start_date,
        Set.completed_at <= end_date,
        Set.skipped == False
    ).all()
    
    # Structure pour sunburst
    equipment_data = {}
    
    for set_item in sets:
        exercise = db.query(Exercise).filter(Exercise.id == set_item.exercise_id).first()
        if not exercise:
            continue
        
        # Calculer le volume
        volume = set_item.weight * set_item.actual_reps
        
        # Organiser par équipement
        for equip in exercise.equipment:
            if equip not in equipment_data:
                equipment_data[equip] = {}
            
            if exercise.name_fr not in equipment_data[equip]:
                equipment_data[equip][exercise.name_fr] = 0
            
            equipment_data[equip][exercise.name_fr] += volume
    
    # Convertir en format sunburst
    sunburst_data = {
        "name": "Total",
        "children": []
    }
    
    for equip, exercises in equipment_data.items():
        equip_node = {
            "name": equip,
            "children": []
        }
        for exercise, volume in exercises.items():
            equip_node["children"].append({
                "name": exercise,
                "value": round(volume)
            })
        sunburst_data["children"].append(equip_node)
    
    return sunburst_data

@app.get("/api/users/{user_id}/muscle-performance-prediction")
def get_muscle_performance_prediction(user_id: int, db: Session = Depends(get_db)):
    """Prédiction de performance par groupe musculaire"""
    from datetime import datetime, timedelta
    
    predictions = {}
    
    # Pour chaque groupe musculaire
    muscles = ["Pectoraux", "Dos", "Épaules", "Biceps", "Triceps", "Jambes"]
    
    for muscle in muscles:
        # Récupérer l'historique des 30 derniers jours
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        sets = db.query(Set).join(Workout).join(Exercise).filter(
            Workout.user_id == user_id,
            Workout.status == "completed",
            Exercise.body_part == muscle,
            Set.completed_at >= thirty_days_ago,
            Set.skipped == False
        ).order_by(Set.completed_at).all()
        
        if len(sets) < 3:
            predictions[muscle] = {
                "current_max": 0,
                "predicted_max": 0,
                "confidence": 0,
                "trend": "stable"
            }
            continue
        
        # Extraire les charges max par séance
        workout_maxes = {}
        for set_item in sets:
            workout_id = set_item.workout_id
            if workout_id not in workout_maxes:
                workout_maxes[workout_id] = 0
            workout_maxes[workout_id] = max(workout_maxes[workout_id], set_item.weight)
        
        weights = list(workout_maxes.values())
        
        if weights:
            current_max = max(weights)
            
            # Calcul simple de tendance
            if len(weights) >= 3:
                recent_avg = sum(weights[-3:]) / 3
                older_avg = sum(weights[:3]) / 3 if len(weights) > 3 else weights[0]
                
                trend_percent = ((recent_avg - older_avg) / older_avg) * 100 if older_avg > 0 else 0
                
                # Prédiction simple basée sur la tendance
                if trend_percent > 5:
                    predicted_max = current_max * 1.05
                    trend = "improving"
                elif trend_percent < -5:
                    predicted_max = current_max * 0.98
                    trend = "declining"
                else:
                    predicted_max = current_max * 1.02
                    trend = "stable"
                
                confidence = min(90, 50 + len(weights) * 5)
            else:
                predicted_max = current_max
                trend = "stable"
                confidence = 30
            
            predictions[muscle] = {
                "current_max": round(current_max, 1),
                "predicted_max": round(predicted_max, 1),
                "confidence": confidence,
                "trend": trend
            }
        else:
            predictions[muscle] = {
                "current_max": 0,
                "predicted_max": 0,
                "confidence": 0,
                "trend": "stable"
            }
    
    return {"predictions": predictions}


# Static files
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
