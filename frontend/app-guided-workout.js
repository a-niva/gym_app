// ===== GESTIONNAIRE DE SÉANCES GUIDÉES =====
import {
    currentUser,
    currentWorkout,
    currentExercise,
    setCurrentExercise,
    allExercises
} from './app-state.js';

import { showToast } from './app-ui.js';
import { selectExercise } from './app-exercises.js';

// Variables d'état pour la séance guidée
let currentPlanIndex = 0;
let guidedPlan = null;

// Afficher l'interface de séance guidée
function showGuidedExerciseInterface(plan) {
    guidedPlan = plan;
    const container = document.getElementById('exerciseArea');
    if (!container) return;
    
    // Récupérer l'index actuel depuis localStorage si reprise
    const savedIndex = localStorage.getItem('currentGuidedIndex');
    if (savedIndex !== null) {
        currentPlanIndex = parseInt(savedIndex);
    }
    
    updateGuidedDisplay();
}

// Mettre à jour l'affichage guidé
function updateGuidedDisplay() {
    const container = document.getElementById('exerciseArea');
    if (!container || !guidedPlan || !guidedPlan.exercises) return;
    
    const currentExerciseData = guidedPlan.exercises[currentPlanIndex];
    if (!currentExerciseData) {
        showToast('Séance terminée !', 'success');
        return;
    }
    
    // Trouver l'exercice complet dans la base
    const exercise = allExercises.find(ex => ex.name_fr === currentExerciseData.name);
    if (!exercise) {
        showToast('Exercice non trouvé', 'error');
        nextGuidedExercise();
        return;
    }
    
    container.innerHTML = `
        <div class="guided-workout-container">
            <div class="workout-progress">
                <h3>Exercice ${currentPlanIndex + 1} sur ${guidedPlan.exercises.length}</h3>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${((currentPlanIndex + 1) / guidedPlan.exercises.length) * 100}%"></div>
                </div>
            </div>
            
            <div class="current-exercise-card">
                <h2>${currentExerciseData.name}</h2>
                <div class="exercise-targets">
                    <div class="target-info">
                        <span class="label">Séries</span>
                        <span class="value">${currentExerciseData.sets}</span>
                    </div>
                    <div class="target-info">
                        <span class="label">Répétitions</span>
                        <span class="value">${currentExerciseData.reps}</span>
                    </div>
                    ${currentExerciseData.predicted_weight ? `
                        <div class="target-info">
                            <span class="label">Poids suggéré</span>
                            <span class="value">${currentExerciseData.predicted_weight}kg</span>
                        </div>
                    ` : ''}
                    <div class="target-info">
                        <span class="label">Repos</span>
                        <span class="value">${currentExerciseData.rest_time}s</span>
                    </div>
                </div>
                
                <div class="exercise-actions">
                    <button class="btn btn-primary" onclick="startGuidedExercise(${exercise.id})">
                        Commencer cet exercice
                    </button>
                    <button class="btn btn-secondary" onclick="skipGuidedExercise()">
                        Passer cet exercice
                    </button>
                </div>
            </div>
            
            <div class="upcoming-exercises">
                <h4>Exercices suivants :</h4>
                ${guidedPlan.exercises.slice(currentPlanIndex + 1, currentPlanIndex + 3).map(ex => 
                    `<div class="upcoming-exercise">${ex.name}</div>`
                ).join('')}
            </div>
        </div>
    `;
}

// Démarrer un exercice guidé
function startGuidedExercise(exerciseId) {
    // Sauvegarder les paramètres cibles dans localStorage
    const currentExerciseData = guidedPlan.exercises[currentPlanIndex];
    localStorage.setItem('guidedExerciseParams', JSON.stringify({
        targetSets: currentExerciseData.sets,
        targetReps: currentExerciseData.reps,
        suggestedWeight: currentExerciseData.predicted_weight,
        restTime: currentExerciseData.rest_time
    }));
    
    // Utiliser la fonction existante pour sélectionner l'exercice
    selectExercise(exerciseId);
}

// Passer à l'exercice suivant
function nextGuidedExercise() {
    currentPlanIndex++;
    localStorage.setItem('currentGuidedIndex', currentPlanIndex);
    
    if (currentPlanIndex >= guidedPlan.exercises.length) {
        // Séance terminée
        localStorage.removeItem('adaptiveWorkoutPlan');
        localStorage.removeItem('currentGuidedIndex');
        localStorage.removeItem('guidedExerciseParams');
        showToast('Séance adaptative terminée !', 'success');
        if (window.completeWorkout) {
            window.completeWorkout();
        }
    } else {
        updateGuidedDisplay();
    }
}

// Passer un exercice
function skipGuidedExercise() {
    if (confirm('Voulez-vous vraiment passer cet exercice ?')) {
        nextGuidedExercise();
    }
}

// Export global
window.showGuidedExerciseInterface = showGuidedExerciseInterface;
window.startGuidedExercise = startGuidedExercise;
window.nextGuidedExercise = nextGuidedExercise;
window.skipGuidedExercise = skipGuidedExercise;

export {
    showGuidedExerciseInterface,
    nextGuidedExercise
};