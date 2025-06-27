// ===== GESTIONNAIRE D'EXERCICES =====
// Version refactorisée - Architecture simplifiée
// Ce fichier gère la sélection et l'affichage des exercices

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
import { showToast } from './app-ui.js'; // CORRECTION: Import manquant ajouté

// ===== AFFICHAGE DU SÉLECTEUR D'EXERCICES =====
function showExerciseSelector() {
    const container = document.getElementById('exerciseArea');
    if (!container) return;

    // Validation de la configuration d'équipement
    if (!currentUser?.equipment_config) {
        container.innerHTML = createNoEquipmentMessage();
        return;
    }
    
    // Filtrer et grouper les exercices
    const availableExercises = filterExercisesByEquipment(allExercises);
    const grouped = groupExercisesByBodyPart(availableExercises);
    
    container.innerHTML = createExerciseSelectorHTML(grouped);
}

// ===== FONCTIONS UTILITAIRES =====

function createNoEquipmentMessage() {
    return `
        <div class="no-equipment-message">
            <div class="message-icon">⚙️</div>
            <h3>Configuration d'équipement requise</h3>
            <p>Veuillez configurer votre équipement pour voir les exercices disponibles.</p>
            <button class="btn btn-primary" onclick="showView('settings')">
                ⚙️ Configurer l'équipement
            </button>
        </div>
    `;
}

function groupExercisesByBodyPart(exercises) {
    const grouped = {};
    exercises.forEach(ex => {
        if (!grouped[ex.body_part]) {
            grouped[ex.body_part] = [];
        }
        grouped[ex.body_part].push(ex);
    });
    return grouped;
}

function createExerciseSelectorHTML(grouped) {
    return `
        <div class="exercise-selector">
            <div class="selector-header">
                <h3>Sélectionner un exercice</h3>
                <input type="text" id="exerciseSearch" 
                       placeholder="Rechercher..." 
                       onkeyup="filterExerciseList()" 
                       class="form-input">
            </div>
            
            <div id="exerciseListSelector" class="exercise-list-selector">
                ${createExerciseGroups(grouped)}
            </div>
        </div>
    `;
}

function createExerciseGroups(grouped) {
    return Object.entries(grouped).map(([part, exercises]) => `
        <div class="exercise-group">
            <h4 class="group-title">${part}</h4>
            <div class="exercise-list">
                ${exercises.map(exercise => createExerciseOption(exercise)).join('')}
            </div>
        </div>
    `).join('');
}

function createExerciseOption(exercise) {
    return `
        <div class="exercise-option" onclick="selectExercise(${exercise.id})">
            <div class="exercise-main">
                <div class="exercise-name">${exercise.name_fr}</div>
                <div class="exercise-level">${exercise.level}</div>
            </div>
            <div class="exercise-equipment">${exercise.equipment.join(', ')}</div>
        </div>
    `;
}

// ===== FILTRAGE DE LA LISTE =====
function filterExerciseList() {
    const searchInput = document.getElementById('exerciseSearch');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const groups = document.querySelectorAll('.exercise-group');
    
    groups.forEach(group => {
        const exercises = group.querySelectorAll('.exercise-option');
        let hasVisible = false;
        
        exercises.forEach(exerciseElement => {
            const name = exerciseElement.querySelector('.exercise-name').textContent.toLowerCase();
            const isVisible = name.includes(searchTerm);
            
            exerciseElement.style.display = isVisible ? 'block' : 'none';
            if (isVisible) hasVisible = true;
        });
        
        group.style.display = hasVisible ? 'block' : 'none';
    });
}

// ===== SÉLECTION D'UN EXERCICE =====
function selectExercise(exerciseId) {
    const exercise = allExercises.find(ex => ex.id === exerciseId);
    if (!exercise) {
        console.error('Exercice non trouvé:', exerciseId);
        return;
    }
    
    // Gérer le repos inter-exercices
    handleInterExerciseRest();
    
    // Configurer l'exercice
    setupExercise(exercise);
    
    // Afficher l'interface de saisie
    if (window.showSetInput) {
        window.showSetInput();
    }
}

function handleInterExerciseRest() {
    if (!lastExerciseEndTime) return;
    
    const restTime = Math.floor((new Date() - lastExerciseEndTime) / 1000);
    setInterExerciseRestTime(restTime);
    
    if (restTime > 10) {
        // Enregistrer le repos inter-exercices
        const restData = {
            workout_id: currentWorkout.id,
            rest_type: 'inter_exercise',
            duration: restTime,
            timestamp: new Date().toISOString()
        };
        
        // Historique local
        addToSessionHistory('rest', {
            duration: restTime,
            type: 'inter_exercise'
        });
        
        // Sauvegarde locale pour sync
        const interExerciseRests = JSON.parse(localStorage.getItem('interExerciseRests') || '[]');
        interExerciseRests.push(restData);
        localStorage.setItem('interExerciseRests', JSON.stringify(interExerciseRests));
        
        // Sync avec le serveur
        createRestPeriod(restData).catch(err => 
            console.error('Erreur sync repos inter-exercices:', err)
        );
    }
    
    setLastExerciseEndTime(null);
}

function setupExercise(exercise) {
    setCurrentExercise(exercise);
    setCurrentSetNumber(1);
    
    // Nettoyer les données de la série précédente
    localStorage.removeItem('lastCompletedSetId');
    
    // Historique du changement d'exercice
    addToSessionHistory('exercise_change', {
        exerciseId: exercise.id,
        exerciseName: exercise.name_fr,
        bodyPart: exercise.body_part
    });
    
    // Configurer les répétitions cibles
    setTargetRepsForUser(exercise);
}

function setTargetRepsForUser(exercise) {
    if (!currentUser?.experience_level || !exercise.sets_reps) {
        setCurrentTargetReps(10); // Valeur par défaut
        return;
    }
    
    const userLevel = currentUser.experience_level;
    const levelConfig = exercise.sets_reps.find(sr => sr.level === userLevel);
    
    if (levelConfig) {
        setCurrentTargetReps(levelConfig.reps);
    } else {
        setCurrentTargetReps(10);
    }
}

// ===== FIN D'UN EXERCICE =====
function finishExercise() {
    // Nettoyer les données d'exercice
    cleanupExerciseData();
    
    // Arrêter tous les timers
    stopAllTimers();
    
    // Sauvegarder l'historique
    saveExerciseHistory();
    
    // Réinitialiser l'état
    resetExerciseState();
    
    // Déterminer la prochaine interface à afficher
    handlePostExerciseNavigation();
}

function cleanupExerciseData() {
    localStorage.removeItem('lastCompletedSetId');
    setLastExerciseEndTime(new Date());
}

function stopAllTimers() {
    if (window.timerInterval) {
        clearInterval(window.timerInterval);
        if (window.setTimerInterval) {
            window.setTimerInterval(null);
        }
    }
    
    if (window.restTimerInterval) {
        clearInterval(window.restTimerInterval);
        if (window.setRestTimerInterval) {
            window.setRestTimerInterval(null);
        }
    }
}

function saveExerciseHistory() {
    if (!currentExercise || currentSetNumber <= 1) return;
    
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

function resetExerciseState() {
    setCurrentExercise(null);
    setCurrentSetNumber(1);
    setSetStartTime(null);
    setLastSetEndTime(null);
    setSelectedFatigue(3);
    setSelectedEffort(3);
}

function handlePostExerciseNavigation() {
    // Vérifier d'abord si on est en mode guidé via l'attribut data
    const exerciseArea = document.getElementById('exerciseArea');
    if (exerciseArea?.getAttribute('data-guided-mode') === 'true') {
        exerciseArea.removeAttribute('data-guided-mode');
        
        if (window.returnToGuidedInterface) {
            window.returnToGuidedInterface();
            return;
        }
    }
    
    // Ensuite vérifier le type de séance
    if (currentWorkout?.status === 'started') {
        if (isGuidedWorkout()) {
            handleGuidedWorkoutNavigation();
        } else {
            showExerciseSelector();
        }
    } else {
        showExerciseSelector();
    }
}

function isGuidedWorkout() {
    return currentWorkout?.type === 'adaptive' && 
           localStorage.getItem('guidedWorkoutPlan');
}

function handleGuidedWorkoutNavigation() {
    if (typeof window.nextGuidedExercise === 'function') {
        window.nextGuidedExercise();
    } else {
        console.warn('nextGuidedExercise non disponible, retour au sélecteur');
        showExerciseSelector();
    }
}

// ===== DÉTAILS D'EXERCICE =====
function showExerciseDetail(exerciseId) {
    const exercise = allExercises.find(e => e.id === exerciseId);
    if (!exercise) {
        console.error('Exercice non trouvé pour détails:', exerciseId);
        return;
    }
    
    // TODO: Implémenter la modal de détails d'exercice
    console.log('Détails exercice:', exercise);
    showToast(`Détails pour ${exercise.name_fr}`, 'info');
}

// ===== EXPORTS GLOBAUX =====
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