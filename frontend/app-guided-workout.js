// ===== MODULE SÉANCE GUIDÉE ADAPTATIVE =====
import { showToast } from './app-ui.js';
import { showView } from './app-navigation.js';

let currentExerciseIndex = 0;
let guidedWorkoutPlan = null;


// Make functions available for onclick handlers in HTML
window.nextExercise = () => nextExercise();
window.previousExercise = () => previousExercise();
window.startCurrentExercise = () => startCurrentExercise();
window.completeWorkout = () => {
    if (window.completeWorkout) {
        window.completeWorkout();
    }
};


// Point d'entrée unique pour démarrer le mode guidé
function startGuidedWorkout(adaptiveWorkout) {
    console.log('🎯 Démarrage mode guidé avec:', adaptiveWorkout);
    
    guidedWorkoutPlan = adaptiveWorkout;
    currentExerciseIndex = 0;
    
    // Cacher l'interface standard
    const standardInterface = document.getElementById('exerciseSelection');
    if (standardInterface) {
        standardInterface.style.display = 'none';
    }
    
    // Afficher l'interface guidée
    showGuidedInterface();
}

// Afficher l'interface de progression guidée
function showGuidedInterface() {
    // Ensure we're in the training view
    if (!document.getElementById('training-view')) {
        console.error('❌ Vue training non active');
        showView('training');
        setTimeout(() => showGuidedInterface(), 100);
        return;
    }
    // Chercher d'abord dans training-view, sinon dans workout
    let container = document.querySelector('#training-view #mainContent');
    if (!container) {
        container = document.querySelector('#workout #mainContent');
    }
    if (!container) {
        container = document.getElementById('mainContent');
    }
    
    if (!container || !guidedWorkoutPlan) {
        console.error('❌ Container ou plan manquant:', { container, guidedWorkoutPlan });
        return;
    }
    
    const currentExercise = guidedWorkoutPlan.exercises[currentExerciseIndex];
    const totalExercises = guidedWorkoutPlan.exercises.length;
    const progressPercent = ((currentExerciseIndex) / totalExercises) * 100;
    
    container.innerHTML = `
        <div class="guided-workout-container" style="
            max-width: 600px;
            margin: 0 auto;
            padding: 1rem;
        ">
            <!-- Header avec progression -->
            <div style="
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                border-radius: 16px;
                padding: 2rem;
                text-align: center;
                margin-bottom: 2rem;
                color: white;
            ">
                <h2 style="margin: 0 0 1rem 0;">🎯 Séance Adaptative</h2>
                
                <!-- Barre de progression -->
                <div style="
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                    height: 8px;
                    margin: 1rem 0;
                    overflow: hidden;
                ">
                    <div style="
                        background: #10b981;
                        height: 100%;
                        width: ${progressPercent}%;
                        transition: width 0.3s ease;
                    "></div>
                </div>
                
                <div style="opacity: 0.9;">
                    Exercice ${currentExerciseIndex + 1} sur ${totalExercises}
                </div>
            </div>
            
            <!-- Exercice actuel -->
            <div style="
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                padding: 2rem;
                margin-bottom: 2rem;
            ">
                <h3 style="
                    color: #f3f4f6;
                    margin: 0 0 1rem 0;
                    font-size: 1.5rem;
                ">${currentExercise.exercise_name}</h3>
                
                <div style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 1rem;
                    margin-bottom: 2rem;
                ">
                    <div style="text-align: center;">
                        <div style="color: #10b981; font-size: 2rem; font-weight: 700;">
                            ${currentExercise.sets}
                        </div>
                        <div style="color: #9ca3af; font-size: 0.9rem;">Séries</div>
                    </div>
                    
                    <div style="text-align: center;">
                        <div style="color: #3b82f6; font-size: 2rem; font-weight: 700;">
                            ${currentExercise.target_reps}
                        </div>
                        <div style="color: #9ca3af; font-size: 0.9rem;">Répétitions</div>
                    </div>
                    
                    <div style="text-align: center;">
                        <div style="color: #f59e0b; font-size: 2rem; font-weight: 700;">
                            ${currentExercise.suggested_weight}kg
                        </div>
                        <div style="color: #9ca3af; font-size: 0.9rem;">Poids suggéré</div>
                    </div>
                    
                    <div style="text-align: center;">
                        <div style="color: #6b7280; font-size: 2rem; font-weight: 700;">
                            ${Math.floor(currentExercise.rest_time / 60)}'${currentExercise.rest_time % 60 < 10 ? '0' : ''}${currentExercise.rest_time % 60}"
                        </div>
                        <div style="color: #9ca3af; font-size: 0.9rem;">Repos</div>
                    </div>
                </div>
                
                <button onclick="startCurrentExercise()" style="
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    border: none;
                    border-radius: 12px;
                    padding: 1rem 2rem;
                    color: white;
                    font-weight: 700;
                    font-size: 1.1rem;
                    cursor: pointer;
                    width: 100%;
                    transition: all 0.2s;
                "
                onmouseover="this.style.transform='translateY(-2px)'"
                onmouseout="this.style.transform='translateY(0)'"
                >
                    🚀 Commencer cet exercice
                </button>
            </div>
            
            <!-- Navigation -->
            <div style="
                display: flex;
                gap: 1rem;
                justify-content: space-between;
            ">
                <button onclick="previousExercise()" 
                    ${currentExerciseIndex === 0 ? 'disabled' : ''}
                    style="
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 8px;
                        padding: 0.75rem 1.5rem;
                        color: white;
                        cursor: pointer;
                        opacity: ${currentExerciseIndex === 0 ? '0.5' : '1'};
                    ">
                    ← Précédent
                </button>
                
                <button onclick="nextExercise()" 
                    ${currentExerciseIndex === totalExercises - 1 ? 'disabled' : ''}
                    style="
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 8px;
                        padding: 0.75rem 1.5rem;
                        color: white;
                        cursor: pointer;
                        opacity: ${currentExerciseIndex === totalExercises - 1 ? '0.5' : '1'};
                    ">
                    Suivant →
                </button>
            </div>
        </div>
    `;
}

// Fonction pour commencer l'exercice actuel
async function startCurrentExercise() {
    if (!guidedWorkoutPlan || currentExerciseIndex >= guidedWorkoutPlan.exercises.length) {
        showToast('Exercice non disponible', 'error');
        return;
    }
    
    const currentExercise = guidedWorkoutPlan.exercises[currentExerciseIndex];
    console.log('🎯 Démarrage exercice guidé:', currentExercise);
    
    try {
        // Masquer l'interface guidée
        const guidedContainer = document.querySelector('.guided-workout-container');
        if (guidedContainer) {
            guidedContainer.style.display = 'none';
        }
        
        // Charger l'interface d'exercice avec pré-configuration
        const exerciseModule = await import('./app-exercises.js');
        
        if (exerciseModule.selectExercise) {
            // Sélectionner l'exercice
            exerciseModule.selectExercise(currentExercise.exercise_id);
            
            // Attendre que l'interface soit chargée puis pré-configurer
            setTimeout(() => {
                preConfigureExerciseInterface(currentExercise);
            }, 500);
            
        } else {
            throw new Error('Module exercices incomplet');
        }
        
    } catch (error) {
        console.error('❌ Erreur démarrage exercice:', error);
        showToast('Erreur lors du démarrage de l\'exercice', 'error');
        
        // Réafficher l'interface guidée en cas d'erreur
        const guidedContainer = document.querySelector('.guided-workout-container');
        if (guidedContainer) {
            guidedContainer.style.display = 'block';
        }
    }
}

// Pré-configurer l'interface avec les paramètres guidés
function preConfigureExerciseInterface(exerciseData) {
    console.log('⚙️ Pré-configuration interface:', exerciseData);
    
    // Afficher les objectifs guidés
    const exerciseInfo = document.querySelector('.exercise-info');
    if (exerciseInfo) {
        const targetInfo = document.createElement('div');
        targetInfo.className = 'guided-targets';
        targetInfo.innerHTML = `
            <strong>🎯 Objectifs :</strong> 
            ${exerciseData.sets} séries × ${exerciseData.target_reps} reps @ ${exerciseData.suggested_weight}kg
            <br>
            <small>Repos : ${Math.round(exerciseData.rest_time / 60)}min entre séries</small>
        `;
        exerciseInfo.appendChild(targetInfo);
    }
    
    // Pré-remplir le poids suggéré
    const weightInput = document.getElementById('weightInput');
    if (weightInput && exerciseData.suggested_weight) {
        weightInput.value = exerciseData.suggested_weight;
    }
    
    // Pré-remplir les répétitions cibles
    const repsInput = document.getElementById('repsInput');
    if (repsInput && exerciseData.target_reps) {
        repsInput.value = exerciseData.target_reps;
    }
    
    // Ajouter un bouton de retour vers l'interface guidée
    addReturnToGuidedButton();
}

// Ajouter bouton retour interface guidée
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

// Retour à l'interface guidée
function returnToGuidedInterface() {
    // Masquer l'interface d'exercice
    const exerciseArea = document.getElementById('exerciseArea');
    if (exerciseArea) {
        exerciseArea.innerHTML = '';
    }
    
    // Réafficher l'interface guidée
    showGuidedInterface();
}

// Navigation simple entre exercices
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

// Navigation avec progression (appelée après fin d'exercice)
function nextGuidedExercise() {
    if (currentExerciseIndex < guidedWorkoutPlan.exercises.length - 1) {
        currentExerciseIndex++;
        
        // Sauvegarder la progression
        localStorage.setItem('guidedWorkoutProgress', JSON.stringify({
            currentIndex: currentExerciseIndex,
            completedExercises: currentExerciseIndex
        }));
        
        showGuidedInterface();
        showToast(`Exercice ${currentExerciseIndex + 1}/${guidedWorkoutPlan.exercises.length}`, 'info');
    } else {
        // Tous les exercices terminés
        showWorkoutCompletion();
    }
}

// Interface de fin de séance guidée
function showWorkoutCompletion() {
    const container = document.getElementById('mainContent');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
            <h2>Séance adaptative terminée !</h2>
            <p>Félicitations ! Vous avez complété tous les exercices.</p>
            
            <div style="margin: 2rem 0;">
                <div class="stat-card" style="display: inline-block; margin: 0 1rem;">
                    <h3>Exercices</h3>
                    <p class="stat-value">${guidedWorkoutPlan.exercises.length}</p>
                </div>
                <div class="stat-card" style="display: inline-block; margin: 0 1rem;">
                    <h3>Durée estimée</h3>
                    <p class="stat-value">${guidedWorkoutPlan.estimated_duration}min</p>
                </div>
            </div>
            
            <button class="btn btn-primary" onclick="completeWorkout()" style="margin: 0.5rem;">
                ✅ Terminer la séance
            </button>
            
            <button class="btn btn-secondary" onclick="returnToGuidedInterface()" style="margin: 0.5rem;">
                ← Revoir les exercices
            </button>
        </div>
    `;
}

// ES6 Module exports
export {
    startGuidedWorkout,
    showGuidedInterface,
    startCurrentExercise,
    preConfigureExerciseInterface,
    addReturnToGuidedButton,
    returnToGuidedInterface,
    nextGuidedExercise,
    showWorkoutCompletion
};