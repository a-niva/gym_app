// ===== MODULE SÉANCE GUIDÉE ADAPTATIVE =====
// Version refactorisée - Architecture simplifiée

import { showToast } from './app-ui.js';
import { showView } from './app-navigation.js';
import { allExercises, currentSetNumber } from './app-state.js';

// ===== VARIABLES GLOBALES =====
let currentExerciseIndex = 0;
let guidedWorkoutPlan = null;

// ===== POINT D'ENTRÉE PRINCIPAL =====
function startGuidedWorkout(adaptiveWorkout) {
    console.log('🎯 Démarrage mode guidé');
    
    guidedWorkoutPlan = adaptiveWorkout;
    currentExerciseIndex = 0;
    
    // Sauvegarder le plan
    localStorage.setItem('guidedWorkoutPlan', JSON.stringify(adaptiveWorkout));
    localStorage.setItem('guidedWorkoutProgress', JSON.stringify({
        currentIndex: 0,
        completedExercises: 0
    }));
    
    // Navigation vers training
    if (window.showView) {
        window.showView('training');
        setTimeout(() => showGuidedInterface(), 200);
    } else {
        showGuidedInterface();
    }
    
    // Cacher l'interface standard
    const standardInterface = document.getElementById('exerciseSelection');
    if (standardInterface) {
        standardInterface.style.display = 'none';
    }
}

// ===== AFFICHAGE DE L'INTERFACE GUIDÉE =====
function showGuidedInterface() {
    const container = getGuidedContainer();
    if (!container) {
        showGuidedError('Container non trouvé');
        return;
    }
    
    // Vérifier le plan
    if (!validateGuidedPlan()) {
        return;
    }
    
    const currentExercise = guidedWorkoutPlan.exercises[currentExerciseIndex];
    const totalExercises = guidedWorkoutPlan.exercises.length;
    const progressPercent = ((currentExerciseIndex) / totalExercises) * 100;
    
    // Marquer le mode guidé
    window.isGuidedMode = true;
    
    // Rendu de l'interface
    container.innerHTML = createGuidedInterfaceHTML(currentExercise, totalExercises, progressPercent);
}

// ===== FONCTIONS UTILITAIRES =====

function getGuidedContainer() {
    // Recherche simplifiée du container
    const candidates = [
        'workoutInterface #mainContent',
        '#mainContent',
        '#training .content',
        '#workoutInterface'
    ];
    
    for (const selector of candidates) {
        const container = document.querySelector(selector);
        if (container) {
            container.style.display = 'block';
            return container;
        }
    }
    
    // Créer container en dernier recours
    const training = document.getElementById('training');
    if (training) {
        const container = document.createElement('div');
        container.id = 'mainContent';
        container.style.cssText = 'width: 100%; padding: 1rem;';
        training.appendChild(container);
        return container;
    }
    
    return null;
}

function validateGuidedPlan() {
    // Récupérer le plan si manquant
    if (!guidedWorkoutPlan) {
        const savedPlan = localStorage.getItem('guidedWorkoutPlan');
        if (savedPlan) {
            guidedWorkoutPlan = JSON.parse(savedPlan);
        }
    }
    
    // Vérifier la validité
    if (!guidedWorkoutPlan?.exercises?.length) {
        showGuidedError('Plan de séance non disponible');
        return false;
    }
    
    if (currentExerciseIndex >= guidedWorkoutPlan.exercises.length) {
        showGuidedError('Index exercice invalide');
        return false;
    }
    
    return true;
}

function createGuidedInterfaceHTML(currentExercise, totalExercises, progressPercent) {
    return `
        <div class="guided-workout-container">
            ${createProgressSection(totalExercises, progressPercent)}
            ${createExerciseSection(currentExercise)}
            ${createNavigationSection(totalExercises)}
        </div>
    `;
}

function createProgressSection(totalExercises, progressPercent) {
    return `
        <div class="guided-progress">
            <div class="progress-header">
                <h3>Séance Adaptative</h3>
                <span class="progress-counter">${currentExerciseIndex + 1}/${totalExercises}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
        </div>
    `;
}

function createExerciseSection(exercise) {
    return `
        <div class="guided-exercise">
            <h2>${exercise.exercise_name}</h2>
            
            <div class="exercise-targets">
                <div class="target-item">
                    <span class="target-label">Séries</span>
                    <span class="target-value">${exercise.sets || 3}</span>
                </div>
                <div class="target-item">
                    <span class="target-label">Répétitions</span>
                    <span class="target-value">${exercise.target_reps || '8-12'}</span>
                </div>
                <div class="target-item">
                    <span class="target-label">Poids suggéré</span>
                    <span class="target-value">${exercise.suggested_weight ? exercise.suggested_weight + ' kg' : 'À déterminer'}</span>
                </div>
            </div>
            
            <button onclick="startCurrentExercise()" class="btn-start-exercise">
                🎯 Commencer cet exercice
            </button>
        </div>
    `;
}

function createNavigationSection(totalExercises) {
    return `
        <div class="guided-navigation">
            <button onclick="previousExercise()" 
                ${currentExerciseIndex === 0 ? 'disabled' : ''}
                class="btn btn-secondary">
                ← Précédent
            </button>
            
            <button onclick="nextExercise()" 
                ${currentExerciseIndex === totalExercises - 1 ? 'disabled' : ''}
                class="btn btn-secondary">
                Suivant →
            </button>
        </div>
    `;
}

// ===== GESTION D'ERREURS SIMPLIFIÉE =====
function showGuidedError(message) {
    console.error('❌ Erreur guidée:', message);
    
    const container = document.getElementById('workoutInterface') || 
                     document.getElementById('mainContent') || 
                     document.body;
    
    const errorHTML = `
        <div class="guided-error">
            <div class="error-icon">⚠️</div>
            <h3>Erreur de chargement</h3>
            <p>${message}</p>
            <div class="error-actions">
                <button onclick="location.reload()" class="btn btn-primary">
                    🔄 Recharger
                </button>
                <button onclick="showView('dashboard')" class="btn btn-secondary">
                    📊 Dashboard
                </button>
            </div>
        </div>
    `;
    
    if (container.tagName === 'BODY') {
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = errorHTML;
        container.appendChild(errorDiv);
    } else {
        container.innerHTML = errorHTML;
    }
}

// ===== DÉMARRAGE D'EXERCICE =====
async function startCurrentExercise() {
    if (!validateGuidedPlan()) return;
    
    const currentExercise = guidedWorkoutPlan.exercises[currentExerciseIndex];
    
    try {
        // Masquer l'interface guidée
        const guidedContainer = document.querySelector('.guided-workout-container');
        if (guidedContainer) {
            guidedContainer.style.display = 'none';
        }
        
        // Préparer l'interface d'exercice
        const exerciseArea = await prepareExerciseArea();
        
        // Charger l'exercice
        const exerciseModule = await import('./app-exercises.js');
        if (exerciseModule.selectExercise) {
            exerciseModule.selectExercise(currentExercise.exercise_id);
            
            // Pré-configurer après un délai
            setTimeout(() => {
                preConfigureExercise(currentExercise);
            }, 300);
        }
        
    } catch (error) {
        console.error('❌ Erreur démarrage exercice:', error);
        showToast('Erreur lors du démarrage', 'error');
        
        // Réafficher l'interface guidée
        const guidedContainer = document.querySelector('.guided-workout-container');
        if (guidedContainer) {
            guidedContainer.style.display = 'block';
        }
    }
}

async function prepareExerciseArea() {
    let exerciseArea = document.getElementById('exerciseArea');
    
    if (!exerciseArea) {
        const workoutInterface = document.getElementById('workoutInterface');
        if (!workoutInterface) {
            throw new Error('WorkoutInterface non trouvé');
        }
        
        // Masquer mainContent
        const mainContent = workoutInterface.querySelector('#mainContent');
        if (mainContent) {
            mainContent.style.display = 'none';
        }
        
        // Créer exerciseArea
        exerciseArea = document.createElement('div');
        exerciseArea.id = 'exerciseArea';
        exerciseArea.style.cssText = 'width: 100%; padding: 1rem;';
        workoutInterface.appendChild(exerciseArea);
    }
    
    exerciseArea.innerHTML = '';
    exerciseArea.style.display = 'block';
    exerciseArea.setAttribute('data-guided-mode', 'true');
    
    return exerciseArea;
}

function preConfigureExercise(exerciseData) {
    // Sauvegarder les paramètres guidés
    localStorage.setItem('guidedExerciseParams', JSON.stringify({
        targetSets: exerciseData.sets,
        targetReps: exerciseData.target_reps,
        suggestedWeight: exerciseData.suggested_weight,
        restTime: exerciseData.rest_time
    }));
    
    // Pré-remplir les champs si disponibles
    setTimeout(() => {
        const weightInput = document.getElementById('setWeight');
        if (weightInput && exerciseData.suggested_weight) {
            weightInput.value = exerciseData.suggested_weight;
            
            // Déclencher la mise à jour de visualisation
            const event = new Event('input', { bubbles: true });
            weightInput.dispatchEvent(event);
            
            if (window.updateBarbellVisualization) {
                window.updateBarbellVisualization();
            }
        }
        
        const repsInput = document.getElementById('setReps');
        if (repsInput && exerciseData.target_reps) {
            repsInput.value = exerciseData.target_reps;
        }
        
        addReturnToGuidedButton();
    }, 100);
}

function addReturnToGuidedButton() {
    const exerciseControls = document.querySelector('.exercise-controls');
    if (exerciseControls && !document.getElementById('returnToGuided')) {
        const returnButton = document.createElement('button');
        returnButton.id = 'returnToGuided';
        returnButton.className = 'btn btn-secondary';
        returnButton.innerHTML = '← Retour au plan';
        returnButton.onclick = returnToGuidedInterface;
        
        exerciseControls.insertBefore(returnButton, exerciseControls.firstChild);
    }
}

// ===== NAVIGATION =====
function returnToGuidedInterface() {
    const workoutInterface = document.getElementById('workoutInterface');
    if (workoutInterface) {
        const mainContent = workoutInterface.querySelector('#mainContent');
        if (mainContent) {
            mainContent.style.display = 'block';
        }
    }
    
    const exerciseArea = document.getElementById('exerciseArea');
    if (exerciseArea) {
        exerciseArea.innerHTML = '';
        exerciseArea.style.display = 'none';
    }
    
    showGuidedInterface();
}

function nextExercise() {
    if (currentExerciseIndex < guidedWorkoutPlan.exercises.length - 1) {
        currentExerciseIndex++;
        showGuidedInterface();
    }
}

function previousExercise() {
    if (currentExerciseIndex > 0) {
        currentExerciseIndex--;
        showGuidedInterface();
    }
}

function nextGuidedExercise() {
    if (currentExerciseIndex < guidedWorkoutPlan.exercises.length - 1) {
        currentExerciseIndex++;
        
        // Sauvegarder la progression
        localStorage.setItem('guidedWorkoutProgress', JSON.stringify({
            currentIndex: currentExerciseIndex,
            completedExercises: currentExerciseIndex
        }));
        
        showGuidedInterface();
        
        // Notification
        const nextExercise = guidedWorkoutPlan.exercises[currentExerciseIndex];
        showToast(`➡️ ${nextExercise.exercise_name} (${currentExerciseIndex + 1}/${guidedWorkoutPlan.exercises.length})`, 'info');
    } else {
        showWorkoutCompletion();
    }
}

// ===== FIN DE SÉANCE =====
function showWorkoutCompletion() {
    const container = document.getElementById('mainContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="workout-completion">
            <div class="completion-icon">🎉</div>
            <h2>Séance adaptative terminée !</h2>
            <p>Félicitations ! Vous avez complété tous les exercices.</p>
            
            <div class="completion-stats">
                <div class="stat-item">
                    <span class="stat-label">Exercices</span>
                    <span class="stat-value">${guidedWorkoutPlan.exercises.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Durée estimée</span>
                    <span class="stat-value">${guidedWorkoutPlan.estimated_duration}min</span>
                </div>
            </div>
            
            <div class="completion-actions">
                <button class="btn btn-primary" onclick="completeWorkout()">
                    ✅ Terminer la séance
                </button>
                <button class="btn btn-secondary" onclick="returnToGuidedInterface()">
                    ← Revoir les exercices
                </button>
            </div>
        </div>
    `;
}

// ===== UTILITAIRES =====
function skipCurrentExercise() {
    if (!validateGuidedPlan()) return;
    
    const currentExercise = guidedWorkoutPlan.exercises[currentExerciseIndex];
    showToast(`Exercice "${currentExercise.exercise_name}" passé`, 'info');
    
    addToSessionHistory('exercise_skipped', {
        exerciseId: currentExercise.exercise_id,
        exerciseName: currentExercise.exercise_name,
        reason: 'user_skip'
    });
    
    nextGuidedExercise();
}

function finishWorkoutEarly() {
    if (!confirm('Terminer la séance maintenant ? Les exercices restants seront ignorés.')) {
        return;
    }
    
    showToast('Séance terminée plus tôt', 'info');
    showWorkoutCompletion();
}

function addToSessionHistory(type, data) {
    const history = JSON.parse(localStorage.getItem('currentSessionHistory') || '[]');
    history.push({
        type,
        data,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('currentSessionHistory', JSON.stringify(history));
}

// ===== EXPORTS GLOBAUX =====
window.nextExercise = nextExercise;
window.previousExercise = previousExercise;
window.startCurrentExercise = startCurrentExercise;
window.nextGuidedExercise = nextGuidedExercise;
window.startGuidedWorkout = startGuidedWorkout;
window.returnToGuidedInterface = returnToGuidedInterface;
window.skipCurrentExercise = skipCurrentExercise;
window.finishWorkoutEarly = finishWorkoutEarly;

// Export pour les autres modules
export {
    startGuidedWorkout,
    nextGuidedExercise,
    showGuidedInterface,
    returnToGuidedInterface,
    skipCurrentExercise,
    finishWorkoutEarly
};