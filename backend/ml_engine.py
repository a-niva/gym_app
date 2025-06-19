# ===== backend/ml_engine.py =====
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.models import User, Exercise, Workout, Set
import json

class FitnessMLEngine:
    """
    Moteur d'apprentissage automatique pour:
    - Calcul intelligent des poids
    - Prédiction de performance
    - Ajustement dynamique des programmes
    - Prévention des blessures
    """
    
    def __init__(self, db: Session):
        self.db = db
        
        # Coefficients pour les calculs
        self.FATIGUE_WEIGHTS = {
            1: 1.0,    # Pas fatigué
            2: 0.95,   # Légèrement fatigué
            3: 0.90,   # Modérément fatigué
            4: 0.85,   # Très fatigué
            5: 0.80    # Épuisé
        }
        
        self.EXPERIENCE_MULTIPLIERS = {
            "beginner": 0.7,
            "intermediate": 0.85,
            "advanced": 1.0,
            "elite": 1.1,
            "extreme": 1.2
        }
        
        self.GOAL_ADJUSTMENTS = {
            "strength": {"sets": 0.8, "reps": 0.7, "weight": 1.2},
            "hypertrophy": {"sets": 1.0, "reps": 1.0, "weight": 1.0},
            "endurance": {"sets": 1.2, "reps": 1.3, "weight": 0.8},
            "weight_loss": {"sets": 1.1, "reps": 1.2, "weight": 0.85},
            "cardio": {"sets": 1.3, "reps": 1.4, "weight": 0.7},
            "flexibility": {"sets": 0.9, "reps": 1.5, "weight": 0.6}
        }

        # Facteurs d'ajustement des répétitions selon la fatigue
        self.REPS_FATIGUE_ADJUSTMENTS = {
            1: 1.0,    # Pas fatigué - maintenir les reps
            2: 1.0,    # Légèrement fatigué - maintenir
            3: 0.95,   # Modérément fatigué - réduire légèrement
            4: 0.85,   # Très fatigué - réduire significativement
            5: 0.75    # Épuisé - réduire fortement
        }

    def _mean(self, values):
        """Calcule la moyenne d'une liste de valeurs"""
        return sum(values) / len(values) if values else 0

    def _linear_regression_slope(self, x_values, y_values):
        """Calcule la pente d'une régression linéaire simple"""
        if len(x_values) != len(y_values) or len(x_values) < 2:
            return 0
        
        n = len(x_values)
        sum_x = sum(x_values)
        sum_y = sum(y_values)
        sum_xy = sum(x * y for x, y in zip(x_values, y_values))
        sum_x2 = sum(x * x for x in x_values)
        
        # Formule: slope = (n*sum_xy - sum_x*sum_y) / (n*sum_x2 - sum_x^2)
        denominator = n * sum_x2 - sum_x * sum_x
        if denominator == 0:
            return 0
        
        return (n * sum_xy - sum_x * sum_y) / denominator
    
    def calculate_starting_weight(self, user: User, exercise: Exercise) -> float:
        """
        Calcule le poids de départ pour un exercice basé sur:
        - Le niveau d'expérience de l'utilisateur
        - Le type d'exercice
        - Les objectifs
        - L'historique (si disponible)
        """
        
        # Récupérer l'historique de cet exercice
        history = self.db.query(Set).join(Workout).filter(
            Workout.user_id == user.id,
            Set.exercise_id == exercise.id,
            Set.skipped == False
        ).order_by(Set.completed_at.desc()).limit(10).all()
        
        if history:
            # Utiliser la moyenne pondérée des dernières performances
            weights = []
            for i, set_record in enumerate(history):
                # Poids plus récents ont plus d'importance
                weight_factor = 1.0 - (i * 0.05)
                weights.append(set_record.weight * weight_factor)
            
            base_weight = self._mean(weights)
            
            # Ajuster selon la fatigue moyenne récente
            avg_fatigue = self._mean([s.fatigue_level for s in history[:3]])
            fatigue_adjustment = self.FATIGUE_WEIGHTS.get(int(avg_fatigue), 0.9)
            
            return round(base_weight * fatigue_adjustment, 2.5)
        
        else:
            # Estimation initiale basée sur le niveau et le type d'exercice
            return self._estimate_initial_weight(user, exercise)
    
    def predict_next_session_performance(
        self,
        user: User,
        exercise: Exercise,
        target_sets: int,
        target_reps: int
    ) -> Dict:
        """
        Prédit la performance pour la prochaine session
        """
        # Récupérer l'historique récent
        history = self.db.query(Set).join(Workout).filter(
            Workout.user_id == user.id,
            Set.exercise_id == exercise.id,
            Set.skipped == False
        ).order_by(Set.completed_at.desc()).limit(5).all()
        
        if history:
            # Utiliser le dernier poids comme base
            predicted_weight = history[0].weight
            
            # Ajuster selon la performance récente
            if history[0].actual_reps >= history[0].target_reps:
                predicted_weight *= 1.025  # Augmentation de 2.5%
        else:
            # Pas d'historique, utiliser le calcul de départ
            predicted_weight = self.calculate_starting_weight(user, exercise)
        
        return {
            "predicted_weight": round(predicted_weight, 2),
            "confidence": "high" if len(history) >= 3 else "low"
        }

    def _estimate_initial_weight(self, user: User, exercise: Exercise) -> float:
        """
        Estime le poids initial pour un nouvel exercice
        """
        # Poids de base selon le type d'exercice et le poids corporel
        body_weight = self._get_user_weight(user)
        
        # Mapping approximatif exercice -> pourcentage du poids corporel
        exercise_ratios = {
            "Développé couché": 0.6,
            "Squat": 0.8,
            "Soulevé de terre": 1.0,
            "Développé militaire": 0.4,
            "Curl biceps": 0.15,
            "Extension triceps": 0.12,
            "Rowing": 0.5,
            "Leg press": 1.5,
            "Curl poignet": 0.1,
        }
        
        # Chercher le ratio le plus proche
        ratio = 0.3  # Défaut
        for key, value in exercise_ratios.items():
            if key.lower() in exercise.name_fr.lower():
                ratio = value
                break
        
        # Calcul du poids de base
        base_weight = body_weight * ratio
        # Vérifier le poids minimum de la barre pour les exercices avec barbell
        if any('barbell' in eq for eq in exercise.equipment):
            min_bar_weight = 20  # Barre olympique par défaut
            if user.equipment_config and user.equipment_config.get('barres'):
                if user.equipment_config['barres'].get('courte', {}).get('available'):
                    min_bar_weight = 2.5
                elif user.equipment_config['barres'].get('ez', {}).get('available'):
                    min_bar_weight = 10
            
            # S'assurer que le poids suggéré n'est pas inférieur au poids de la barre
            if base_weight < min_bar_weight:
                base_weight = min_bar_weight
        
        # Ajuster selon l'expérience
        experience_mult = self.EXPERIENCE_MULTIPLIERS.get(user.experience_level, 0.85)
        
        # Ajuster selon les objectifs
        goal_mult = 1.0
        if user.goals:
            for goal in user.goals:
                if goal in self.GOAL_ADJUSTMENTS:
                    goal_mult *= self.GOAL_ADJUSTMENTS[goal]["weight"]
            goal_mult = goal_mult ** (1/len(user.goals))  # Moyenne géométrique
        
        # Si haltères, ajuster au poids disponible le plus proche
        if "dumbbells" in exercise.equipment and user.equipment_config and user.equipment_config.get("dumbbells", {}).get("weights"):
            target_weight = base_weight * experience_mult * goal_mult / 2
            available_weights = sorted(user.equipment_config["dumbbells"]["weights"])
            
            # Trouver le poids le plus proche
            if available_weights:
                closest_weight = min(available_weights, key=lambda x: abs(x - target_weight))
                return closest_weight * 2  # Multiplié par 2 pour la paire
        
        return round(base_weight * experience_mult * goal_mult, 2.5)
    
    def _get_user_weight(self, user: User) -> float:
        """Retourne le poids réel de l'utilisateur"""
        return user.weight
        
    def predict_next_session_performance(
        self, 
        user: User, 
        exercise: Exercise,
        target_sets: int,
        target_reps: int
    ) -> Dict:
        """
        Prédit la performance pour la prochaine session
        """
        recent_sets = self.db.query(Set).join(Workout).filter(
            Workout.user_id == user.id,
            Set.exercise_id == exercise.id,
            Set.skipped == False
        ).order_by(Set.completed_at.desc()).limit(20).all()
        
        if not recent_sets:
            # Première fois, utiliser les valeurs par défaut
            weight = self.calculate_starting_weight(user, exercise)
            return {
                "predicted_weight": weight,
                "predicted_reps": target_reps,
                "confidence": 0.5,
                "recommendation": "Première séance avec cet exercice. Commencez prudemment."
            }
        
        # Analyser la progression
        weights = [s.weight for s in recent_sets]
        reps = [s.actual_reps for s in recent_sets]
        fatigue_levels = [s.fatigue_level for s in recent_sets]
        
        # Calcul de la tendance (régression linéaire simple)
        if len(weights) >= 3:
            x_values = list(range(len(weights)))
            weight_trend = self._linear_regression_slope(x_values, weights)
            reps_trend = self._linear_regression_slope(x_values, reps)
            
            # Prédiction
            next_weight = weights[0] + weight_trend
            
            # Ajustement selon la fatigue moyenne récente
            recent_fatigue = self._mean(fatigue_levels[:5])
            fatigue_factor = self.FATIGUE_WEIGHTS.get(int(recent_fatigue), 0.9)
            
            # Ajustement selon la réussite des dernières séances
            success_rate = sum(1 for s in recent_sets[:5] if s.actual_reps >= s.target_reps) / min(5, len(recent_sets))
            
            if success_rate >= 0.8:
                # Augmenter le poids
                next_weight *= 1.025
                recommendation = "Performance excellente! Augmentation du poids recommandée."
            elif success_rate < 0.5:
                # Diminuer le poids
                next_weight *= 0.975
                recommendation = "Difficulté détectée. Réduction du poids recommandée."
            else:
                recommendation = "Maintenir le poids actuel et viser l'amélioration technique."
            
            # Arrondir au poids disponible le plus proche
            if (user.equipment_config and 
                user.equipment_config.get("dumbbells", {}).get("weights") and 
                "dumbbells" in exercise.equipment):
                target_per_dumbbell = next_weight / 2
                available = sorted(user.equipment_config["dumbbells"]["weights"])
                if available:
                    closest = min(available, key=lambda x: abs(x - target_per_dumbbell))
                    next_weight = closest * 2
            else:
                # Arrondir à 2.5kg près
                next_weight = round(next_weight / 2.5) * 2.5
            
            return {
                "predicted_weight": max(0, next_weight),
                "predicted_reps": int(target_reps * fatigue_factor),
                "confidence": min(0.9, 0.5 + len(recent_sets) * 0.02),
                "recommendation": recommendation,
                "fatigue_warning": "Attention: fatigue élevée détectée" if recent_fatigue > 3.5 else None
            }
        
        else:
            # Pas assez de données pour une tendance
            last_weight = weights[0]
            return {
                "predicted_weight": last_weight,
                "predicted_reps": target_reps,
                "confidence": 0.6,
                "recommendation": "Continuez avec le poids actuel pour établir une base."
            }
    
    def adjust_workout_in_progress(
        self,
        user: User,
        current_set: Set,
        remaining_sets: int
    ) -> Dict:
        """
        Ajuste la séance en cours selon la performance actuelle
        """
        # Analyser la performance de la série actuelle
        if current_set.target_reps > 0:
            performance_ratio = current_set.actual_reps / current_set.target_reps
        else:
            performance_ratio = 0
        
        recommendations = []
        adjustments = {}

        # Calculer l'ajustement des répétitions
        recent_sets = self.db.query(Set).join(Workout).filter(
            Workout.user_id == user.id,
            Set.exercise_id == current_set.exercise_id,
            Set.skipped == False
        ).order_by(Set.completed_at.desc()).limit(5).all()

        rep_suggestion = self.calculate_optimal_rep_range(
            user=user,
            exercise=self.db.query(Exercise).filter(
                Exercise.id == current_set.exercise_id
            ).first(),
            current_fatigue=current_set.fatigue_level / 2,  # Normaliser sur 5
            recent_performance=recent_sets,
            remaining_sets=remaining_sets
        )

        adjustments["suggested_reps"] = rep_suggestion["optimal_reps"]
        adjustments["rep_range"] = {
            "min": rep_suggestion["min_reps"],
            "max": rep_suggestion["max_reps"]
        }
        adjustments["rep_confidence"] = rep_suggestion["confidence"]

        # Ajouter une recommandation si les reps suggérées diffèrent significativement
        if current_set.target_reps > 0:
            rep_diff_ratio = rep_suggestion["optimal_reps"] / current_set.target_reps
            if rep_diff_ratio < 0.8:
                recommendations.append(f"Réduire à {rep_suggestion['optimal_reps']} reps pour maintenir la qualité")
            elif rep_diff_ratio > 1.2:
                recommendations.append(f"Augmenter à {rep_suggestion['optimal_reps']} reps si possible")
        
        if performance_ratio < 0.7:
            # Performance très en dessous
            adjustments["weight_multiplier"] = 0.9
            adjustments["rest_time_bonus"] = 30
            recommendations.append("Réduire le poids de 10% pour les prochaines séries")
            
        elif performance_ratio < 0.85:
            # Performance légèrement en dessous
            adjustments["weight_multiplier"] = 0.95
            adjustments["rest_time_bonus"] = 15
            recommendations.append("Légère réduction du poids recommandée")
            
        elif performance_ratio > 1.2:
            # Performance très au-dessus
            adjustments["weight_multiplier"] = 1.05
            recommendations.append("Excellente forme! Augmentation du poids possible")
            
        # Ajustement selon la fatigue
        if current_set.fatigue_level >= 4:
            adjustments["rest_time_bonus"] = adjustments.get("rest_time_bonus", 0) + 30
            recommendations.append("Fatigue élevée: repos supplémentaire recommandé")
            
            if remaining_sets > 2:
                adjustments["skip_sets"] = 1
                recommendations.append("Envisager de réduire le nombre de séries")
        
        # Prévention des blessures
        if current_set.perceived_exertion >= 9:
            adjustments["stop_workout"] = True
            recommendations.append("⚠️ Effort maximal atteint. Arrêt recommandé pour éviter les blessures.")
        
        return {
            "adjustments": adjustments,
            "recommendations": recommendations
        }
    
    def calculate_optimal_rep_range(
        self,
        user: User,
        exercise: Exercise,
        current_fatigue: float,
        recent_performance: List[Set],
        remaining_sets: int
    ) -> Dict:
        """
        Calcule la fourchette de répétitions optimale selon:
        - Les objectifs de l'utilisateur
        - Le niveau de fatigue actuel
        - L'historique récent de performance
        - Le nombre de séries restantes
        """
        # Récupérer les reps de base depuis l'exercice
        base_reps = 10  # Valeur par défaut
        if exercise.sets_reps:
            for config in exercise.sets_reps:
                if config.get("level") == user.experience_level:
                    base_reps = config.get("reps", 10)
                    break
        
        # Ajuster selon les objectifs
        goal_multiplier = 1.0
        if user.goals:
            for goal in user.goals:
                if goal in self.GOAL_ADJUSTMENTS:
                    goal_multiplier *= self.GOAL_ADJUSTMENTS[goal]["reps"]
            goal_multiplier = goal_multiplier ** (1/len(user.goals))
        
        # Ajuster selon la fatigue
        fatigue_multiplier = self.REPS_FATIGUE_ADJUSTMENTS.get(
            int(current_fatigue), 0.9
        )
        
        # Analyser la tendance de performance
        if recent_performance and len(recent_performance) >= 2:
            # Calculer le ratio de réussite moyen
            success_ratios = []
            for perf in recent_performance[-3:]:
                if perf.target_reps > 0:
                    ratio = perf.actual_reps / perf.target_reps
                    success_ratios.append(ratio)
            
            if success_ratios:
                avg_success = sum(success_ratios) / len(success_ratios)
                
                # Ajuster selon la performance
                if avg_success > 1.15:  # Dépassement constant
                    performance_adjustment = 1.1
                elif avg_success < 0.85:  # Sous-performance
                    performance_adjustment = 0.9
                else:
                    performance_adjustment = 1.0
            else:
                performance_adjustment = 1.0
        else:
            performance_adjustment = 1.0
        
        # Calculer les reps optimales
        optimal_reps = int(base_reps * goal_multiplier * fatigue_multiplier * performance_adjustment)
        
        # Définir la fourchette (±10-20%)
        min_reps = max(1, int(optimal_reps * 0.8))
        max_reps = int(optimal_reps * 1.2)
        
        # Ajustement spécial pour les dernières séries
        if remaining_sets <= 1 and current_fatigue >= 4:
            # Permettre de réduire plus sur la dernière série si très fatigué
            min_reps = max(1, int(min_reps * 0.8))
        
        return {
            "optimal_reps": optimal_reps,
            "min_reps": min_reps,
            "max_reps": max_reps,
            "confidence": 0.8 if len(recent_performance) >= 3 else 0.5,
            "adjustment_reason": self._get_adjustment_reason(
                goal_multiplier, fatigue_multiplier, performance_adjustment
            )
        }

    def _get_adjustment_reason(self, goal_mult, fatigue_mult, perf_mult):
        """Explique la raison de l'ajustement des reps"""
        reasons = []
        
        if goal_mult < 0.9:
            reasons.append("Objectif force: moins de reps")
        elif goal_mult > 1.1:
            reasons.append("Objectif endurance: plus de reps")
            
        if fatigue_mult < 0.9:
            reasons.append("Fatigue élevée détectée")
            
        if perf_mult > 1.05:
            reasons.append("Performance excellente récente")
        elif perf_mult < 0.95:
            reasons.append("Ajustement pour maintenir la qualité")
        
        return " - ".join(reasons) if reasons else "Répétitions standards"
    
    def generate_adaptive_program(
        self,
        user: User,
        duration_weeks: int = 4,
        frequency: int = 3  # Add this parameter
    ) -> List[Dict]:
        """
        Génère un programme adaptatif basé sur:
        - Les objectifs de l'utilisateur
        - Son équipement disponible
        - Son historique de performance
        - Les principes de périodisation
        """
        program = []
    
        # Vérifier que l'utilisateur a des objectifs
        if not user.goals:
            user.goals = ["hypertrophy"]  # Objectif par défaut

        # Valider la configuration
        if not user.equipment_config:
            # Programme minimal au poids du corps
            return [{
                "week": 1,
                "day": 1,
                "muscle_group": "Full body",
                "exercises": [{
                    "exercise_id": 0,
                    "exercise_name": "Configuration d'équipement requise",
                    "sets": 0,
                    "target_reps": 0,
                    "predicted_weight": 0,
                    "rest_time": 0
                }]
            }]
        
        # Récupérer les exercices disponibles selon l'équipement
        # Extraire l'équipement disponible depuis equipment_config
        available_equipment = []
        if user.equipment_config:
            config = user.equipment_config
            # Barres
            for barre_type, barre_config in config.get("barres", {}).items():
                if barre_config.get("available", False):
                    if barre_type == "olympique" or barre_type == "courte":
                        available_equipment.append("barbell_standard")
                    elif barre_type == "ez":
                        available_equipment.append("barbell_ez")
            # Haltères
            if config.get("dumbbells", {}).get("available", False):
                available_equipment.append("dumbbells")
            # Poids du corps toujours disponible
            available_equipment.append("bodyweight")
            # Autres équipements...
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
            if autres.get("kettlebell", {}).get("available", False):
                available_equipment.append("kettlebell")
            if autres.get("barre_traction", {}).get("available", False):
                available_equipment.append("barre_traction")

        # Récupérer TOUS les exercices et filtrer manuellement
        all_exercises = self.db.query(Exercise).all()
        available_exercises = []
        for exercise in all_exercises:
            exercise_equipment = exercise.equipment or []
            # Vérifier si l'équipement requis est disponible
            if all(eq in available_equipment for eq in exercise_equipment):
                available_exercises.append(exercise)
        
        # Grouper par partie du corps
        body_parts = {}
        for ex in available_exercises:
            if ex.body_part not in body_parts:
                body_parts[ex.body_part] = []
            body_parts[ex.body_part].append(ex)

        # Create rotation based on requested frequency
        if frequency == 3:
            split = ["Pectoraux/Triceps", "Dos/Biceps", "Jambes"]
        elif frequency == 4:
            split = ["Pectoraux/Triceps", "Dos/Biceps", "Jambes", "Épaules/Abdos"]
        elif frequency == 5:
            split = ["Pectoraux", "Dos", "Jambes", "Épaules", "Bras"]
        else:
            # Fallback for unexpected values
            split = ["Haut du corps", "Bas du corps", "Full body"]
        
        # Générer les séances pour chaque semaine
        for week in range(duration_weeks):
            # Ajouter un offset pour la rotation
            exercise_rotation_offset = week % 2  # Alterne entre 2 sélections # 0 ou 1
            week_intensity = 0.85 + (week * 0.05)  # Progression linéaire
            
            if week == duration_weeks - 1:
                # Semaine de deload
                week_intensity = 0.7
            
            week_program = []
            
            for day_num, muscle_group in enumerate(split):
                workout = {
                    "week": week + 1,
                    "day": day_num + 1,
                    "muscle_group": muscle_group,
                    "exercises": []
                }
                
                # Sélectionner les exercices pour ce jour
                selected_exercises = self._select_exercises_for_day(
                    body_parts, 
                    muscle_group, 
                    user.experience_level,
                    exercise_rotation_offset
                )
                
                for exercise in selected_exercises:
                    try:
                        # Obtenir les recommandations pour cet exercice
                        sets_reps = self._get_sets_reps_for_level(
                            exercise, 
                            user.experience_level,
                            user.goals
                        )
                        
                        # Prédire le poids
                        prediction = self.predict_next_session_performance(
                            user, 
                            exercise,
                            sets_reps["sets"],
                            sets_reps["reps"]
                        )
                        
                        workout["exercises"].append({
                            "exercise_id": exercise.id,
                            "exercise_name": exercise.name_fr,
                            "sets": int(sets_reps["sets"] * week_intensity),
                            "target_reps": sets_reps["reps"],
                            "predicted_weight": prediction["predicted_weight"],
                            "rest_time": 90 if user.goals and "strength" in user.goals else 60
                        })
                    except Exception as e:
                        # Log l'erreur mais continue avec les autres exercices
                        print(f"Erreur avec l'exercice {exercise.name_fr}: {str(e)}")
                        continue
                
                week_program.append(workout)
            
            program.extend(week_program)
        
        return program
    
    def _select_exercises_for_day(
        self,
        body_parts: Dict,
        muscle_group: str,
        experience_level: str,
        exercise_rotation_offset: int = 0
    ) -> List[Exercise]:
        """
        Sélectionne les exercices pour une journée
        """
        selected = []
        
        # Mapping des groupes musculaires
        muscle_mapping = {
            "Pectoraux/Triceps": ["Pectoraux", "Triceps"],
            "Dos/Biceps": ["Dos", "Biceps"],
            "Jambes": ["Quadriceps", "Ischio-jambiers", "Mollets"],
            "Épaules/Abdos": ["Épaules", "Abdominaux"],
            "Haut du corps": ["Pectoraux", "Dos", "Épaules"],
            "Bas du corps": ["Quadriceps", "Ischio-jambiers", "Mollets"],
            "Full body": ["Pectoraux", "Dos", "Jambes", "Épaules"],
            "Bras": ["Biceps", "Triceps"],
        }
        
        target_parts = muscle_mapping.get(muscle_group, [muscle_group])
        
        # Nombre d'exercices selon le niveau
        exercise_counts = {
            "beginner": 3,
            "intermediate": 4,
            "advanced": 5,
            "elite": 6,
            "extreme": 7
        }
        
        max_exercises = exercise_counts.get(experience_level, 4)
        exercises_per_part = max(2, max_exercises // len(target_parts))
        
        # Pour chaque partie musculaire
        for i, part in enumerate(target_parts):
            if part in body_parts:
                part_exercises = body_parts[part]
                
                # Appliquer la rotation
                if exercise_rotation_offset > 0 and len(part_exercises) > 3:
                    part_exercises = part_exercises[exercise_rotation_offset:] + part_exercises[:exercise_rotation_offset]
                
                # Séparer par niveau
                compound = [ex for ex in part_exercises if ex.level in ["basic", "advanced"]]
                isolation = [ex for ex in part_exercises if ex.level in ["isolation", "finition"]]
                
                # Sélection selon le type de muscle
                if part in ["Pectoraux", "Dos", "Quadriceps"]:
                    # Gros muscles : privilégier les composés
                    if compound:
                        selected.extend(compound[:min(2, exercises_per_part)])
                    if isolation and len(selected) < max_exercises:
                        remaining = max_exercises - len(selected)
                        selected.extend(isolation[:min(remaining, exercises_per_part-1)])
                else:
                    # Petits muscles : mélanger
                    mixed = compound + isolation
                    count = min(exercises_per_part, len(mixed))
                    if i == 0:  # Premier muscle = plus d'exercices
                        count = min(count + 1, len(mixed))
                    selected.extend(mixed[:count])
                
                if len(selected) >= max_exercises:
                    break
        
        # Assurer un minimum de 3 exercices
        if len(selected) < 3:
            all_available = []
            for exercises_list in body_parts.values():
                all_available.extend(exercises_list)
            remaining = [ex for ex in all_available if ex not in selected]
            selected.extend(remaining[:3 - len(selected)])
        
        return selected[:max_exercises]  # Ne jamais dépasser le max
        
    def _get_sets_reps_for_level(
        self,
        exercise: Exercise,
        level: str,
        goals: List[str]
    ) -> Dict:
        """
        Obtient les sets/reps recommandés
        """
        # Vérifier que sets_reps existe
        if not exercise.sets_reps:
            return {"sets": 3, "reps": 10}  # Valeurs par défaut
        
        # Trouver la configuration pour ce niveau
        sets_reps_config = None
        for config in exercise.sets_reps:
            if config["level"] == level:
                sets_reps_config = config
                break
        
        if not sets_reps_config:
            # Utiliser le niveau intermédiaire par défaut
            for config in exercise.sets_reps:
                if config["level"] == "intermediate":
                    sets_reps_config = config
                    break
        
        if not sets_reps_config:
            # Valeurs par défaut
            return {"sets": 3, "reps": 10}
        
        # Ajuster selon les objectifs
        sets = sets_reps_config["sets"]
        reps = sets_reps_config["reps"]
        
        if goals:
            for goal in goals:
                if goal in self.GOAL_ADJUSTMENTS:
                  sets = int(sets * self.GOAL_ADJUSTMENTS[goal]["sets"])
                  reps = int(reps * self.GOAL_ADJUSTMENTS[goal]["reps"])
        
        return {"sets": sets, "reps": reps}
    
    def analyze_injury_risk(self, user: User) -> Dict:
        """
        Analyse le risque de blessure basé sur:
        - Les patterns de fatigue
        - L'augmentation rapide des charges
        - Les zones de douleur signalées
        """
        # Récupérer l'historique récent
        recent_workouts = self.db.query(Workout).filter(
            Workout.user_id == user.id,
            Workout.created_at >= datetime.utcnow() - timedelta(days=14)
        ).all()
        
        risk_factors = []
        risk_level = "low"
        
        # Analyser la fréquence d'entraînement
        workout_days = len(set(w.created_at.date() for w in recent_workouts))
        if workout_days > 10:
            risk_factors.append("Fréquence d'entraînement très élevée")
            risk_level = "medium"
        
        # Analyser les niveaux de fatigue
        all_sets = []
        for workout in recent_workouts:
            all_sets.extend(workout.sets)
        
        if all_sets:
            avg_fatigue = self._mean([s.fatigue_level for s in all_sets if s.fatigue_level])
            if avg_fatigue > 3.5:
                risk_factors.append("Niveau de fatigue chronique élevé")
                risk_level = "high" if risk_level == "medium" else "medium"
            
            # Analyser l'augmentation des charges
            by_exercise = {}
            for s in all_sets:
                if s.exercise_id not in by_exercise:
                    by_exercise[s.exercise_id] = []
                by_exercise[s.exercise_id].append((s.completed_at, s.weight))
            
            for exercise_id, history in by_exercise.items():
                if len(history) >= 3:
                    history.sort(key=lambda x: x[0])
                    weights = [h[1] for h in history]
                    
                    # Calculer l'augmentation sur les 3 dernières séances
                    if weights[-1] > weights[-3] * 1.15:
                        risk_factors.append(f"Augmentation rapide de charge détectée")
                        risk_level = "high"
        
        recommendations = []
        if risk_level == "high":
            recommendations = [
                "⚠️ Risque élevé détecté",
                "Réduire l'intensité pendant 3-5 jours",
                "Privilégier la récupération active",
                "Consulter un professionnel si douleur"
            ]
        elif risk_level == "medium":
            recommendations = [
                "Surveillance recommandée",
                "Intégrer plus de jours de repos",
                "Focus sur la technique"
            ]
        else:
            recommendations = [
                "✅ Risque faible",
                "Continuer la progression actuelle",
                "Maintenir une bonne récupération"
            ]
        
        return {
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "recovery_days_recommended": 2 if risk_level == "high" else 1
        }