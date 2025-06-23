// ===== MODULE SÉANCE GUIDÉE ADAPTATIVE =====

let currentExerciseIndex = 0;
let guidedWorkoutPlan = null;

// Fonction pour démarrer le mode guidé
function startGuidedWorkout(adaptiveWorkout) {
    console.log('🎯 Démarrage mode guidé avec:', adaptiveWorkout);
    
    guidedWorkoutPlan = adaptiveWorkout;
    currentExerciseIndex = 0;
    
    // Cacher l'interface standard et afficher l'interface guidée
    const standardInterface = document.getElementById('exerciseSelection');
    if (standardInterface) {
        standardInterface.style.display = 'none';
    }
    
    // Créer l'interface guidée
    showGuidedInterface();
}

// Afficher l'interface de progression guidée
function showGuidedInterface() {
    const container = document.getElementById('mainContent');
    if (!container || !guidedWorkoutPlan) return;
    
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
function startCurrentExercise() {
    const currentExercise = guidedWorkoutPlan.exercises[currentExerciseIndex];
    
    // Importer et utiliser l'interface de sets existante
    import('./app-exercises.js').then(module => {
        // Sélectionner l'exercice dans le système existant
        window.selectExercise(currentExercise.exercise_id);
        
        // Pré-remplir les paramètres suggérés
        // Note: Cette partie nécessitera une intégration avec app-sets.js
        
    }).catch(error => {
        console.error('Erreur import exercices:', error);
        showToast('Erreur lors du démarrage de l\'exercice', 'error');
    });
}

// Navigation entre exercices
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

// Exports globaux
window.startGuidedWorkout = startGuidedWorkout;
window.startCurrentExercise = startCurrentExercise;
window.nextExercise = nextExercise;
window.previousExercise = previousExercise;

// Export pour les autres modules
export {
    startGuidedWorkout,
    showGuidedInterface,
    startCurrentExercise
};