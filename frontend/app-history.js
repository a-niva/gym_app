// ===== GESTIONNAIRE D'HISTORIQUE =====
// Ce fichier gère l'historique de la session en cours et l'historique global
// Il affiche les séries, les repos et la distribution musculaire

import {
    sessionHistory,
    addToSessionHistory as addToState,
    currentWorkout,
    currentUser
} from './app-state.js';

import {
    getBodyPartColor,
    BODY_PART_COLORS
} from './app-config.js';

import {
    getWorkoutHistory,
    getMuscleDistribution
} from './app-api.js';

// ===== AJOUT À L'HISTORIQUE DE SESSION =====
function addToSessionHistory(type, data) {
    const historyEntry = {
        type: type, // 'set', 'rest', 'exercise_change'
        timestamp: new Date(),
        data: data
    };
    
    addToState(historyEntry);
    
    // Sauvegarder également en localStorage pour récupération en cas de crash
    localStorage.setItem('currentSessionHistory', JSON.stringify(sessionHistory));
    
    // Reconstruire l'affichage complet
    updateHistoryDisplay();
}

// ===== MISE À JOUR DE L'AFFICHAGE DE L'HISTORIQUE =====
function updateHistoryDisplay() {
    const container = document.getElementById('previousSets');
    if (!container) return;
    
    container.innerHTML = '';
    let currentExercise = null;
    
    // Parcourir l'historique dans l'ordre chronologique inverse
    for (let i = sessionHistory.length - 1; i >= 0; i--) {
        const entry = sessionHistory[i];
        
        if (entry.type === 'exercise_change') {
            // Afficher un séparateur d'exercice
            const separator = document.createElement('div');
            separator.className = 'exercise-separator';
            separator.innerHTML = `
                <div class="exercise-change-indicator">
                    <span class="exercise-name">${entry.data.exerciseName}</span>
                    <span class="body-part-badge" style="background-color: ${getBodyPartColor(entry.data.bodyPart)}">
                        ${entry.data.bodyPart}
                    </span>
                </div>
            `;
            container.appendChild(separator);
            currentExercise = entry.data;
            
        } else if (entry.type === 'set') {
            const setElement = document.createElement('div');
            setElement.className = 'set-history-item';
            setElement.style.borderLeftColor = getBodyPartColor(entry.data.bodyPart);
            setElement.innerHTML = `
                <div class="set-number">Série ${entry.data.set_number}</div>
                <div class="set-details">
                    ${entry.data.weight}kg × ${entry.data.actual_reps} reps
                    ${entry.data.duration ? `<span class="set-duration">${entry.data.duration}s</span>` : ''}
                    <span class="fatigue-badge fatigue-${entry.data.fatigue_level}">
                        Fatigue: ${entry.data.fatigue_level}/10
                    </span>
                </div>
            `;
            container.appendChild(setElement);
            
        } else if (entry.type === 'rest') {
            const restElement = document.createElement('div');
            restElement.className = 'rest-history-item';
            restElement.innerHTML = `
                <div class="rest-indicator">
                    <span class="rest-icon">⏱️</span>
                    <span class="rest-duration">Repos: ${Math.floor(entry.data.duration / 60)}:${(entry.data.duration % 60).toString().padStart(2, '0')}</span>
                </div>
            `;
            container.appendChild(restElement);
        }
    }
}

// ===== CHARGEMENT DE L'HISTORIQUE DES SÉANCES =====
async function loadWorkoutHistory() {
    if (!currentUser) return;
    
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
        try {
            const history = await getWorkoutHistory(currentUser.id);
            if (history) {
                displayWorkoutHistory(history);
                return;
            }
        } catch (error) {
            console.error(`Erreur chargement historique (tentative ${retries + 1}):`, error);
        }
        retries++;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

// ===== AFFICHAGE DE L'HISTORIQUE DES SÉANCES =====
function displayWorkoutHistory(history) {
    const container = document.getElementById('workoutHistory');
    if (!container) return;
    
    if (history.length === 0) {
        container.innerHTML = '<p class="no-history">Aucune séance enregistrée</p>';
        return;
    }
    
    container.innerHTML = history.map(workout => `
        <div class="workout-history-item">
            <div class="workout-date">
                ${new Date(workout.date).toLocaleDateString('fr-FR', { 
                    weekday: 'short', 
                    day: 'numeric', 
                    month: 'short' 
                })}
            </div>
            <div class="workout-details">
                <div class="workout-type">${workout.type === 'program' ? 'Programme' : 'Libre'}</div>
                <div class="workout-stats">
                    ${workout.total_sets} séries • ${workout.total_volume ? Math.round(workout.total_volume) : 0}kg total
                </div>
                <div class="workout-exercises">
                    ${workout.exercises.join(', ')}
                </div>
            </div>
        </div>
    `).join('');
}

// ===== MISE À JOUR DE LA DISTRIBUTION MUSCULAIRE =====
async function updateMuscleDistribution() {
    if (!currentWorkout) return;
    
    const data = await getMuscleDistribution(currentWorkout.id);
    if (data) {
        displayMuscleHeatmap(data);
    }
}

// ===== AFFICHAGE DE LA HEATMAP MUSCULAIRE =====
function displayMuscleHeatmap(data) {
    const container = document.getElementById('muscleDistribution');
    if (!container) {
        const workoutInterface = document.getElementById('workoutInterface');
        if (!workoutInterface) return;
        
        const heatmapDiv = document.createElement('div');
        heatmapDiv.id = 'muscleDistribution';
        heatmapDiv.className = 'muscle-heatmap';
        workoutInterface.appendChild(heatmapDiv);
    }
    
    const heatmap = document.getElementById('muscleDistribution');
    const maxVolume = Math.max(...Object.values(data.volumes), 1);
    
    heatmap.innerHTML = `
        <h4>Muscles travaillés</h4>
        <div class="muscle-bars">
            ${Object.entries(data.volumes).map(([muscle, volume]) => {
                const percentage = (volume / maxVolume) * 100;
                const color = percentage > 70 ? '#ef4444' : 
                             percentage > 40 ? '#f97316' : '#22c55e';
                return `
                    <div class="muscle-bar">
                        <span class="muscle-name">${muscle}</span>
                        <div class="muscle-progress">
                            <div class="muscle-fill" style="width: ${percentage}%; background: ${color}"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        ${data.warning ? `<p class="muscle-warning">⚠️ ${data.warning}</p>` : ''}
    `;
}

// ===== STATISTIQUES DE LA SESSION =====
function getSessionStats() {
    const stats = {
        totalSets: 0,
        totalVolume: 0,
        muscleGroups: {},
        duration: 0
    };
    
    sessionHistory.forEach(entry => {
        if (entry.type === 'set' && !entry.data.skipped) {
            stats.totalSets++;
            stats.totalVolume += (entry.data.weight * entry.data.actual_reps);
            
            const muscle = entry.data.bodyPart;
            if (!stats.muscleGroups[muscle]) {
                stats.muscleGroups[muscle] = 0;
            }
            stats.muscleGroups[muscle] += (entry.data.weight * entry.data.actual_reps);
        }
    });
    
    if (sessionHistory.length > 0) {
        const firstEntry = sessionHistory[0];
        const lastEntry = sessionHistory[sessionHistory.length - 1];
        stats.duration = Math.floor((lastEntry.timestamp - firstEntry.timestamp) / 1000 / 60); // minutes
    }
    
    return stats;
}

// ===== EXPORT GLOBAL =====
window.addToSessionHistory = addToSessionHistory;
window.updateHistoryDisplay = updateHistoryDisplay;
window.loadWorkoutHistory = loadWorkoutHistory;
window.updateMuscleDistribution = updateMuscleDistribution;

// Export pour les autres modules
export {
    addToSessionHistory,
    updateHistoryDisplay,
    loadWorkoutHistory,
    displayWorkoutHistory,
    updateMuscleDistribution,
    displayMuscleHeatmap,
    getSessionStats
};