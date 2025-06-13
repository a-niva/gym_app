// ===== MODULES/WORKOUT.JS - GESTION DES SÉANCES D'ENTRAÎNEMENT =====

import { getState, setState } from '../core/state.js';
import { API_ENDPOINTS, STORAGE_KEYS, MESSAGES, TIMER_CONFIG } from '../core/config.js';
import { showToast } from './utils.js';
import { showView } from './ui.js';
import { loadDashboard } from './ui.js';
import { showExerciseSelector } from './exercises.js';

// Démarrage d'une séance
export async function startWorkout(type = 'free_time') {
    const currentUser = getState('currentUser');
    if (!currentUser) {
        showToast('Veuillez vous connecter', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.WORKOUTS}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                type: type
            })
        });
        
        if (response.ok) {
            const workout = await response.json();
            setState('currentWorkout', workout);
            setState('sessionHistory', []);
            
            localStorage.setItem(STORAGE_KEYS.CURRENT_WORKOUT, JSON.stringify(workout));
            localStorage.removeItem(STORAGE_KEYS.SESSION_HISTORY);
            localStorage.removeItem(STORAGE_KEYS.WORKOUT_HISTORY);
            
            startWorkoutMonitoring();
            
            showView('training');
            updateTrainingInterface();
            showToast(MESSAGES.SUCCESS.WORKOUT_STARTED, 'success');
        } else {
            showToast('Erreur lors du démarrage de la séance', 'error');
        }
    } catch (error) {
        console.error('Erreur démarrage workout:', error);
        showToast(MESSAGES.ERRORS.NETWORK, 'error');
    }
}

// Mise en pause de la séance
export async function pauseWorkout() {
    const currentWorkout = getState('currentWorkout');
    if (!currentWorkout) return;
    
    try {
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.WORKOUTS}/${currentWorkout.id}/pause`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            const result = await response.json();
            currentWorkout.status = 'paused';
            currentWorkout.paused_at = result.paused_at;
            
            setState('currentWorkout', currentWorkout);
            localStorage.setItem(STORAGE_KEYS.CURRENT_WORKOUT, JSON.stringify(currentWorkout));
            
            showToast('Séance mise en pause', 'info');
            updateTrainingInterface();
        }
    } catch (error) {
        console.error('Erreur pause workout:', error);
        
        // Sauvegarder localement même si le serveur ne répond pas
        currentWorkout.status = 'paused';
        currentWorkout.paused_at = new Date().toISOString();
        setState('currentWorkout', currentWorkout);
        localStorage.setItem(STORAGE_KEYS.CURRENT_WORKOUT, JSON.stringify(currentWorkout));
        
        showToast('Pause sauvegardée localement', 'warning');
    }
}

// Reprise de la séance
export async function resumeWorkout() {
    const currentWorkout = getState('currentWorkout');
    if (!currentWorkout) return;
    
    try {
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.WORKOUTS}/${currentWorkout.id}/resume`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            currentWorkout.status = 'started';
            currentWorkout.paused_at = null;
            
            setState('currentWorkout', currentWorkout);
            localStorage.setItem(STORAGE_KEYS.CURRENT_WORKOUT, JSON.stringify(currentWorkout));
            
            showToast('Séance reprise', 'success');
            updateTrainingInterface();
        }
    } catch (error) {
        console.error('Erreur reprise workout:', error);
        showToast(MESSAGES.ERRORS.NETWORK, 'error');
    }
}

// Fin de la séance
export async function completeWorkout() {
    const currentWorkout = getState('currentWorkout');
    if (!currentWorkout) return;
    
    if (!confirm('Terminer la séance ?')) return;
    
    try {
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.WORKOUTS}/${currentWorkout.id}/complete`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            showToast(MESSAGES.SUCCESS.WORKOUT_COMPLETED, 'success');
            cleanupWorkout();
            showView('dashboard');
            
            setTimeout(() => {
                loadDashboard();
            }, 500);
        }
    } catch (error) {
        console.error('Erreur fin workout:', error);
        showToast('Erreur, données sauvegardées localement', 'error');
    }
}

// Abandon de la séance
export async function abandonWorkout() {
    const currentWorkout = getState('currentWorkout');
    if (!currentWorkout) return;
    
    if (!confirm('Abandonner la séance ? Les données seront perdues.')) return;
    
    try {
        await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.WORKOUTS}/${currentWorkout.id}/abandon`, {
            method: 'PUT'
        });
        
        showToast('Séance abandonnée', 'info');
    } catch (error) {
        console.error('Erreur abandon workout:', error);
    }
    
    cleanupWorkout();
    showView('dashboard');
}

// Nettoyage après une séance
export function cleanupWorkout() {
    setState('currentWorkout', null);
    setState('currentExercise', null);
    setState('sessionHistory', []);
    setState('currentSetNumber', 1);
    setState('lastExerciseEndTime', null);
    setState('interExerciseRestTime', 0);
    
    localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKOUT);
    localStorage.removeItem(STORAGE_KEYS.SESSION_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.WORKOUT_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.LAST_COMPLETED_SET);
    localStorage.removeItem(STORAGE_KEYS.PENDING_SETS);
    localStorage.removeItem(STORAGE_KEYS.INTER_EXERCISE_RESTS);
    
    const workoutCheckInterval = getState('workoutCheckInterval');
    const timerInterval = getState('timerInterval');
    const restTimerInterval = getState('restTimerInterval');
    const audioContext = getState('audioContext');
    
    if (workoutCheckInterval) {
        clearInterval(workoutCheckInterval);
        setState('workoutCheckInterval', null);
    }
    
    if (timerInterval) {
        clearInterval(timerInterval);
        setState('timerInterval', null);
    }
    
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        setState('restTimerInterval', null);
    }
    
    if (audioContext) {
        audioContext.close();
        setState('audioContext', null);
    }
}

// Surveillance de la séance
export function startWorkoutMonitoring() {
    const existingInterval = getState('workoutCheckInterval');
    if (existingInterval) {
        clearInterval(existingInterval);
    }
    
    const interval = setInterval(async () => {
        const currentWorkout = getState('currentWorkout');
        if (currentWorkout && currentWorkout.status === 'started') {
            await checkWorkoutStatus();
            await syncPendingSets();
            await syncInterExerciseRests();
        }
    }, TIMER_CONFIG.WORKOUT_CHECK_INTERVAL);
    
    setState('workoutCheckInterval', interval);
}

// Vérification du statut
async function checkWorkoutStatus() {
    const currentWorkout = getState('currentWorkout');
    if (!currentWorkout) return;
    
    try {
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.WORKOUTS}/${currentWorkout.id}/status`);
        if (response.ok) {
            const status = await response.json();
            if (status.status !== currentWorkout.status) {
                currentWorkout.status = status.status;
                setState('currentWorkout', currentWorkout);
                localStorage.setItem(STORAGE_KEYS.CURRENT_WORKOUT, JSON.stringify(currentWorkout));
                updateTrainingInterface();
            }
        }
    } catch (error) {
        console.error('Erreur check status:', error);
    }
}

// Synchronisation des sets en attente
export async function syncPendingSets() {
    const pendingSets = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_SETS) || '[]');
    if (pendingSets.length === 0) return;
    
    const successfullySynced = [];
    
    for (const set of pendingSets) {
        try {
            const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.SETS}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(set)
            });
            
            if (response.ok) {
                successfullySynced.push(set);
            }
        } catch (error) {
            console.error('Erreur sync set:', error);
        }
    }
    
    const remaining = pendingSets.filter(s => !successfullySynced.includes(s));
    localStorage.setItem(STORAGE_KEYS.PENDING_SETS, JSON.stringify(remaining));
    
    if (successfullySynced.length > 0) {
        showToast(`${successfullySynced.length} série(s) synchronisée(s)`, 'success');
    }
}

// Synchronisation des repos inter-exercices
export async function syncInterExerciseRests() {
    const interExerciseRests = JSON.parse(localStorage.getItem(STORAGE_KEYS.INTER_EXERCISE_RESTS) || '[]');
    if (interExerciseRests.length === 0) return;
    
    for (const rest of interExerciseRests) {
        try {
            await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.WORKOUTS}/rest-periods/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rest)
            });
        } catch (error) {
            console.error('Erreur sync repos:', error);
        }
    }
    
    localStorage.removeItem(STORAGE_KEYS.INTER_EXERCISE_RESTS);
}

// Mise à jour de l'interface d'entraînement
export function updateTrainingInterface() {
    const currentWorkout = getState('currentWorkout');
    const container = document.getElementById('workoutInterface');
    
    if (!container || !currentWorkout) return;
    
    let content = '';
    
    if (currentWorkout.status === 'started') {
        const currentExercise = getState('currentExercise');
        if (!currentExercise) {
            content = `
                <div class="workout-status">
                    <h3>Séance ${currentWorkout.type === 'program' ? 'Programme' : 'Libre'}</h3>
                    <button class="btn btn-secondary" onclick="pauseWorkout()">Mettre en pause</button>
                    <button class="btn btn-danger" onclick="abandonWorkout()">Abandonner</button>
                </div>
                <div id="exerciseArea"></div>
            `;
            
            setTimeout(() => showExerciseSelector(), 100);
        } else {
            content = `
                <div class="workout-status">
                    <h3>Séance en cours</h3>
                    <button class="btn btn-secondary" onclick="pauseWorkout()">Pause</button>
                    <button class="btn btn-success" onclick="completeWorkout()">Terminer</button>
                </div>
                <div id="exerciseArea"></div>
            `;
        }
    } else if (currentWorkout.status === 'paused') {
        content = `
            <div class="workout-status paused">
                <h3>⏸️ Séance en pause</h3>
                <button class="btn btn-primary" onclick="resumeWorkout()">Reprendre</button>
                <button class="btn btn-danger" onclick="abandonWorkout()">Abandonner</button>
            </div>
        `;
    }
    
    container.innerHTML = content;
}

// Chargement de l'historique des séances
export async function loadWorkoutHistory() {
    const currentUser = getState('currentUser');
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}/${currentUser.id}/workouts?limit=10`);
        if (response.ok) {
            const workouts = await response.json();
            displayWorkoutHistory(workouts);
        }
    } catch (error) {
        console.error('Erreur chargement historique:', error);
        showToast('Erreur lors du chargement de l\'historique', 'error');
    }
}

// Affichage de l'historique
function displayWorkoutHistory(workouts) {
    const historyContainer = document.getElementById('workoutHistory');
    if (!historyContainer) return;
    
    if (workouts.length === 0) {
        historyContainer.innerHTML = '<div class="no-history">Aucune séance enregistrée</div>';
        return;
    }
    
    historyContainer.innerHTML = workouts.map(workout => {
        const date = new Date(workout.completed_at || workout.created_at);
        const formattedDate = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        
        return `
            <div class="workout-history-item">
                <div class="workout-date">${formattedDate}</div>
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
        `;
    }).join('');
}

// Chargement de l'historique des séances
export async function loadWorkoutHistory() {
    const currentUser = getState('currentUser');
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}/${currentUser.id}/workouts?limit=5`);
        if (response.ok) {
            const workouts = await response.json();
            displayWorkoutHistory(workouts);
        }
    } catch (error) {
        console.error('Erreur chargement historique:', error);
    }
}

// Affichage de l'historique
function displayWorkoutHistory(workouts) {
    const container = document.getElementById('workoutHistory');
    if (!container) return;
    
    if (workouts.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune séance enregistrée</p>';
        return;
    }
    
    const html = workouts.map(workout => `
        <div class="workout-history-item">
            <div class="workout-date">${formatDate(workout.created_at)}</div>
            <div class="workout-info">
                <span>${workout.type === 'program' ? 'Programme' : 'Libre'}</span>
                <span>${workout.sets_count || 0} séries</span>
                <span>${formatDuration(workout.duration || 0)}</span>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Formatage de la date
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
        return "Hier";
    } else {
        return date.toLocaleDateString('fr-FR', { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short' 
        });
    }
}

// Formatage de la durée
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
}

// Démarrage du monitoring
export function startWorkoutMonitoring() {
    const interval = setInterval(() => {
        const currentWorkout = getState('currentWorkout');
        if (currentWorkout && currentWorkout.status === 'started') {
            // Mise à jour de l'interface si nécessaire
            updateWorkoutTimer();
        }
    }, TIMER_CONFIG.WORKOUT_CHECK_INTERVAL);
    
    setState('workoutCheckInterval', interval);
}

// Mise à jour du timer de séance
function updateWorkoutTimer() {
    const currentWorkout = getState('currentWorkout');
    if (!currentWorkout) return;
    
    const startTime = new Date(currentWorkout.created_at);
    const now = new Date();
    const elapsed = Math.floor((now - startTime) / 1000);
    
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    const timerElement = document.getElementById('workoutTimer');
    if (timerElement) {
        timerElement.textContent = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Synchronisation des sets en attente
export async function syncPendingSets() {
    const pendingSets = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_SETS) || '[]');
    if (pendingSets.length === 0) return;
    
    for (const setData of pendingSets) {
        try {
            const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.SETS}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(setData)
            });
            
            if (response.ok) {
                // Retirer de la liste en attente
                const updatedPending = pendingSets.filter(s => s !== setData);
                localStorage.setItem(STORAGE_KEYS.PENDING_SETS, JSON.stringify(updatedPending));
            }
        } catch (error) {
            console.error('Erreur sync set:', error);
        }
    }
}