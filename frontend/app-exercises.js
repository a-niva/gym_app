// ===== GESTIONNAIRE D'EXERCICES =====
// Ce fichier gère la sélection et l'affichage des exercices
// Il filtre les exercices disponibles selon l'équipement de l'utilisateur

import {
    currentUser,
    allExercises,
    currentExercise,
    setCurrentExercise,
    currentSetNumber,
    setCurrentSetNumber,
    setCurrentTargetReps,
    lastExerciseEndTime,
    setLastExerciseEndTime,
    interExerciseRestTime,
    setInterExerciseRestTime,
    currentWorkout,
    setSelectedFatigue,
    setSelectedEffort,
    setSetStartTime,
    setLastSetEndTime
} from './app-state.js';

import { filterExercisesByEquipment } from './app-equipment.js';
import { createRestPeriod } from './app-api.js';
import { addToSessionHistory } from './app-history.js';

// ===== AFFICHAGE DU SÉLECTEUR D'EXERCICES =====
function showExerciseSelector() {
    const container = document.getElementById('exerciseArea');
    if (!container) return;

    // Validation de la configuration d'équipement
    if (!currentUser?.equipment_config) {
        container.innerHTML = '<p style="color: var(--gray-light);">Configuration d\'équipement requise</p>';
        return;
    }
    
    // Filtrer les exercices disponibles selon l'équipement
    const availableExercises = filterExercisesByEquipment(allExercises);
    
    // Grouper par partie du corps
    const grouped = {};
    availableExercises.forEach(ex => {
        if (!grouped[ex.body_part]) grouped[ex.body_part] = [];
        grouped[ex.body_part].push(ex);
    });
    
    container.innerHTML = `
        <div class="exercise-selector">
            <h3>Sélectionner un exercice</h3>
            <input type="text" id="exerciseSearch" placeholder="Rechercher..." 
                   onkeyup="filterExerciseList()" class="form-input">
            
            <div id="exerciseListSelector" class="exercise-list-selector">
                ${Object.entries(grouped).map(([part, exercises]) => `
                    <div class="exercise-group">
                        <h4>${part}</h4>
                        ${exercises.map(ex => `
                            <div class="exercise-option" onclick="selectExercise(${ex.id})">
                                <div class="exercise-name">${ex.name_fr}</div>
                                <div class="exercise-equipment">${ex.equipment.join(', ')}</div>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ===== FILTRAGE DE LA LISTE D'EXERCICES =====
function filterExerciseList() {
    const searchInput = document.getElementById('exerciseSearch');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const groups = document.querySelectorAll('.exercise-group');
    
    groups.forEach(group => {
        const exercises = group.querySelectorAll('.exercise-option');
        let hasVisible = false;
        
        exercises.forEach(ex => {
            const name = ex.querySelector('.exercise-name').textContent.toLowerCase();
            if (name.includes(searchTerm)) {
                ex.style.display = 'block';
                hasVisible = true;
            } else {
                ex.style.display = 'none';
            }
        });
        
        group.style.display = hasVisible ? 'block' : 'none';
    });
}

// ===== SÉLECTION D'UN EXERCICE =====
function selectExercise(exerciseId) {
    // Calculer le repos inter-exercices si applicable
    if (lastExerciseEndTime) {
        const restTime = Math.floor((new Date() - lastExerciseEndTime) / 1000);
        setInterExerciseRestTime(restTime);
        
        if (restTime > 10) {
            // Ajouter le repos inter-exercices à l'historique
            addToSessionHistory('rest', {
                duration: restTime,
                type: 'inter_exercise'
            });
            
            const restData = {
                workout_id: currentWorkout.id,
                rest_type: 'inter_exercise',
                duration: restTime,
                timestamp: new Date().toISOString()
            };
            
            const interExerciseRests = JSON.parse(localStorage.getItem('interExerciseRests') || '[]');
            interExerciseRests.push(restData);
            localStorage.setItem('interExerciseRests', JSON.stringify(interExerciseRests));
            
            createRestPeriod(restData).catch(err => 
                console.error('Erreur sync repos inter-exercices:', err)
            );
        }
        
        setLastExerciseEndTime(null);
    }
    
    const exercise = allExercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;
    
    setCurrentExercise(exercise);
    // Nettoyer l'ID de la dernière série complétée (nouveau exercice)
    localStorage.removeItem('lastCompletedSetId');
    
    // Ajouter le changement d'exercice à l'historique
    addToSessionHistory('exercise_change', {
        exerciseId: exercise.id,
        exerciseName: exercise.name_fr,
        bodyPart: exercise.body_part
    });
    
    setCurrentSetNumber(1);
    
    // Déterminer les répétitions cibles selon le niveau de l'utilisateur
    if (currentUser && exercise.sets_reps) {
        const userLevel = currentUser.experience_level;
        const levelConfig = exercise.sets_reps.find(sr => sr.level === userLevel);
        if (levelConfig) {
            setCurrentTargetReps(levelConfig.reps);
        } else {
            setCurrentTargetReps(10);
        }
    }
    
    // Afficher l'interface de saisie des séries
    if (window.showSetInput) {
        window.showSetInput();
    }
}

// ===== FIN D'UN EXERCICE =====
function finishExercise() {
    // Nettoyer l'ID de la dernière série (exercice terminé)
    localStorage.removeItem('lastCompletedSetId');
    // Capturer le temps de fin de l'exercice
    setLastExerciseEndTime(new Date());
   
    // Arrêter les timers
    if (window.timerInterval) {
        clearInterval(window.timerInterval);
        window.setTimerInterval && window.setTimerInterval(null);
    }
    if (window.restTimerInterval) {
        clearInterval(window.restTimerInterval);
        window.setRestTimerInterval && window.setRestTimerInterval(null);
    }
   
    // Sauvegarder l'historique de l'exercice
    if (currentExercise && currentSetNumber > 1) {
        const exerciseHistory = {
            exerciseId: currentExercise.id,
            exerciseName: currentExercise.name_fr,
            totalSets: currentSetNumber - 1,
            timestamp: new Date().toISOString()
        };
        const workoutHistory = JSON.parse(localStorage.getItem('currentWorkoutHistory') || '[]');
        workoutHistory.push(exerciseHistory);
        localStorage.setItem('currentWorkoutHistory', JSON.stringify(workoutHistory));
    }
   
    // Réinitialiser
    setCurrentExercise(null);
    setCurrentSetNumber(1);
    setSetStartTime(null);
    setLastSetEndTime(null);
    setSelectedFatigue(3);
    setSelectedEffort(3);
   
    // VÉRIFIER D'ABORD si on est en mode guidé avec exerciseArea marqué
    const exerciseArea = document.getElementById('exerciseArea');
    if (exerciseArea && exerciseArea.getAttribute('data-guided-mode') === 'true') {
        // Nettoyer l'attribut
        exerciseArea.removeAttribute('data-guided-mode');
       
        // Retourner à l'interface guidée au lieu du sélecteur normal
        if (window.returnToGuidedInterface) {
            window.returnToGuidedInterface();
            return; // IMPORTANT : sortir ici pour ne pas exécuter le code suivant
        }
    }
    
    // ENSUITE vérifier le mode de séance normal
    if (currentWorkout && currentWorkout.status === 'started') {
        const guidedPlan = localStorage.getItem('guidedWorkoutPlan');
        if (currentWorkout.type === 'adaptive' && guidedPlan) {
            // Mode guidé - passer à l'exercice suivant
            if (typeof window.nextGuidedExercise === 'function') {
                window.nextGuidedExercise();
            } else {
                console.warn('nextGuidedExercise non disponible, retour au sélecteur');
                showExerciseSelector();
            }
        } else {
            // Mode libre - afficher le sélecteur
            showExerciseSelector();
        }
    }
}

// ===== AFFICHAGE DES DÉTAILS D'UN EXERCICE =====
function showExerciseDetail(exerciseId) {
    const exercise = allExercises.find(e => e.id === exerciseId);
    if (!exercise) return;
    
    // Afficher les détails de l'exercice dans une modal
    console.log('Détails exercice:', exercise);
    // TODO: Implémenter la modal de détails
}

// ===== EXPORT GLOBAL =====
window.showExerciseSelector = showExerciseSelector;
window.filterExerciseList = filterExerciseList;
window.selectExercise = selectExercise;
window.finishExercise = finishExercise;
window.showExerciseDetail = showExerciseDetail;

// Export pour les autres modules
export {
    showExerciseSelector,
    filterExerciseList,
    selectExercise,
    finishExercise,
    showExerciseDetail
};