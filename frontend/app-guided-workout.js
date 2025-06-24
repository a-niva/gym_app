// ===== MODULE SÉANCE GUIDÉE ADAPTATIVE =====
import { showToast } from './app-ui.js';
import { showView } from './app-navigation.js';

let currentExerciseIndex = 0;
let guidedWorkoutPlan = null;


// Make functions available for onclick handlers in HTML
window.nextExercise = () => nextExercise();
window.previousExercise = () => previousExercise();
window.startCurrentExercise = () => startCurrentExercise();


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
    console.log('🎯 [DEBUG] Début showGuidedInterface');
    console.log('🎯 [DEBUG] guidedWorkoutPlan disponible:', !!guidedWorkoutPlan);
    console.log('🎯 [DEBUG] currentExerciseIndex:', currentExerciseIndex);
    
    // Vérification préalable du plan
    if (!guidedWorkoutPlan || !guidedWorkoutPlan.exercises || guidedWorkoutPlan.exercises.length === 0) {
        console.error('❌ [ERROR] Plan de séance guidée manquant ou vide');
        showToast('Erreur : Plan de séance non disponible', 'error');
        showGuidedWorkoutError('Plan de séance non disponible');
        return;
    }
    
    // Recherche exhaustive du container avec diagnostic détaillé
    let container = null;
    
    // 1. Recherche dans workoutInterface
    const workoutInterface = document.getElementById('workoutInterface');
    console.log('🎯 [DEBUG] workoutInterface trouvé:', !!workoutInterface);
    
    if (workoutInterface) {
        container = workoutInterface.querySelector('#mainContent');
        console.log('🎯 [DEBUG] mainContent dans workoutInterface:', !!container);
        
        if (!container) {
            // Créer mainContent s'il n'existe pas dans workoutInterface
            container = document.createElement('div');
            container.id = 'mainContent';
            workoutInterface.appendChild(container);
            console.log('🎯 [DEBUG] mainContent créé dans workoutInterface');
        }
    }
    
    // 2. Fallback : chercher mainContent global
    if (!container) {
        container = document.getElementById('mainContent');
        console.log('🎯 [DEBUG] mainContent global trouvé:', !!container);
    }
    
    // 3. Fallback : chercher dans l'interface training
    if (!container) {
        const trainingView = document.getElementById('training');
        if (trainingView) {
            container = trainingView.querySelector('#mainContent, .main-content, .content');
            console.log('🎯 [DEBUG] container dans training view:', !!container);
        }
    }
    
    // 4. Fallback : créer dans le body si rien trouvé
    if (!container) {
        console.warn('⚠️ [WARNING] Aucun container trouvé, création forcée');
        
        // Essayer de créer dans workoutInterface s'il existe
        if (workoutInterface) {
            container = document.createElement('div');
            container.id = 'mainContent';
            container.style.width = '100%';
            container.style.minHeight = '400px';
            workoutInterface.appendChild(container);
            console.log('🎯 [DEBUG] Container créé de force dans workoutInterface');
        } else {
            // Dernière chance : créer une interface de fortune
            showGuidedWorkoutError('Interface non disponible - Redirection dashboard');
            return;
        }
    }
    
    console.log('✅ [SUCCESS] Container trouvé/créé, rendu de l\'interface guidée');
    
    // Vérification finale des données nécessaires
    if (currentExerciseIndex >= guidedWorkoutPlan.exercises.length) {
        console.error('❌ [ERROR] Index exercice invalide:', currentExerciseIndex, '/', guidedWorkoutPlan.exercises.length);
        showToast('Erreur : Exercice non trouvé', 'error');
        showGuidedWorkoutError('Exercice non trouvé');
        return;
    }
    
    const currentExercise = guidedWorkoutPlan.exercises[currentExerciseIndex];
    const totalExercises = guidedWorkoutPlan.exercises.length;
    const progressPercent = ((currentExerciseIndex) / totalExercises) * 100;
    
    console.log('🎯 [DEBUG] Exercice actuel:', currentExercise?.exercise_name || 'INCONNU');
    console.log('🎯 [DEBUG] Progression:', `${currentExerciseIndex + 1}/${totalExercises} (${progressPercent.toFixed(1)}%)`);
    
    // Vérification de l'exercice
    if (!currentExercise || !currentExercise.exercise_name) {
        console.error('❌ [ERROR] Données exercice manquantes:', currentExercise);
        showToast('Erreur : Données d\'exercice manquantes', 'error');
        showGuidedWorkoutError('Données d\'exercice incomplètes');
        return;
    }
    
    // Rendu de l'interface guidée
    try {
        container.innerHTML = `
            <div class="guided-workout-container" style="
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                border-radius: 12px;
                padding: 1.5rem;
                margin-bottom: 1rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
            ">
                <!-- Progression globale -->
                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h3 style="color: white; margin: 0;">Séance Adaptative</h3>
                        <span style="color: #3b82f6; font-weight: 600;">
                            ${currentExerciseIndex + 1}/${totalExercises}
                        </span>
                    </div>
                    <div style="
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                        height: 8px;
                        overflow: hidden;
                    ">
                        <div style="
                            background: linear-gradient(90deg, #3b82f6, #06b6d4);
                            height: 100%;
                            width: ${progressPercent}%;
                            transition: width 0.3s ease;
                        "></div>
                    </div>
                </div>
                
                <!-- Exercice actuel -->
                <div style="
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                ">
                    <h2 style="color: white; margin-bottom: 1rem; font-size: 1.25rem;">
                        ${currentExercise.exercise_name}
                    </h2>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                        <div style="text-align: center;">
                            <div style="color: #9ca3af; font-size: 0.8rem;">Séries</div>
                            <div style="color: #3b82f6; font-weight: 600; font-size: 1.1rem;">
                                ${currentExercise.sets || 3}
                            </div>
                        </div>
                        <div style="text-align: center;">
                            <div style="color: #9ca3af; font-size: 0.8rem;">Répétitions</div>
                            <div style="color: #10b981; font-weight: 600; font-size: 1.1rem;">
                                ${currentExercise.target_reps || '8-12'}
                            </div>
                        </div>
                        <div style="text-align: center;">
                            <div style="color: #9ca3af; font-size: 0.8rem;">Poids suggéré</div>
                            <div style="color: #f59e0b; font-weight: 600; font-size: 1.1rem;">
                                ${currentExercise.suggested_weight ? currentExercise.suggested_weight + ' kg' : 'À déterminer'}
                            </div>
                        </div>
                    </div>
                    
                    <button onclick="startCurrentExercise()" style="
                        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                        border: none;
                        border-radius: 8px;
                        padding: 1rem 2rem;
                        color: white;
                        font-weight: 600;
                        cursor: pointer;
                        width: 100%;
                        font-size: 1rem;
                        transition: transform 0.2s;
                    "
                    onmouseover="this.style.transform='scale(1.02)'"
                    onmouseout="this.style.transform='scale(1)'">
                        🎯 Commencer cet exercice
                    </button>
                </div>
                
                <!-- Navigation -->
                <div style="display: flex; gap: 1rem; justify-content: space-between;">
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
        
        console.log('✅ [SUCCESS] Interface guidée rendue avec succès');
        
    } catch (error) {
        console.error('❌ [ERROR] Erreur lors du rendu de l\'interface:', error);
        showToast('Erreur d\'affichage de l\'interface', 'error');
        showGuidedWorkoutError('Erreur technique d\'affichage');
    }
}


// Nouvelle fonction pour gérer les erreurs avec interface visible
function showGuidedWorkoutError(message) {
    console.log('🚨 [ERROR] Affichage erreur guidée:', message);
    
    // Chercher un container de secours
    let errorContainer = document.getElementById('workoutInterface') || 
                        document.getElementById('mainContent') || 
                        document.querySelector('.container');
    
    if (errorContainer) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            color: white;
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
            margin: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;
        
        errorDiv.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h3>Erreur de chargement</h3>
            <p style="margin: 1rem 0; opacity: 0.9;">${message}</p>
            <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem;">
                <button onclick="location.reload()" style="
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                ">
                    🔄 Recharger
                </button>
                <button onclick="showView('dashboard')" style="
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                ">
                    📊 Retour Dashboard
                </button>
            </div>
        `;
        
        // Remplacer le contenu ou ajouter l'erreur
        if (errorContainer.id === 'workoutInterface') {
            errorContainer.appendChild(errorDiv);
        } else {
            errorContainer.innerHTML = '';
            errorContainer.appendChild(errorDiv);
        }
    } else {
        // Dernier recours : alert
        alert(`Erreur de chargement : ${message}\nVeuillez recharger la page.`);
    }
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

// ===== EXPORTS GLOBAUX POUR ACCESSIBILITÉ =====
window.startGuidedWorkout = startGuidedWorkout;
window.showGuidedInterface = showGuidedInterface;
window.showGuidedWorkoutError = showGuidedWorkoutError;
window.nextGuidedExercise = nextGuidedExercise;

// ===== EXPORTS MODULE =====
export {
    startGuidedWorkout,
    showGuidedInterface,
    showGuidedWorkoutError,
    nextGuidedExercise,
    nextExercise,
    previousExercise,
    startCurrentExercise,
    returnToGuidedInterface
};