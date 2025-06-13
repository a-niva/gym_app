// ===== MODULES/AUTH.JS - AUTHENTIFICATION ET PROFIL UTILISATEUR =====

import { getState, setState } from '../../core/state.js';
import { API_ENDPOINTS, STORAGE_KEYS, MESSAGES } from '../core/config.js';
import { showToast } from './utils.js';
import { showView, showMainInterface } from './ui.js';

// Chargement d'un utilisateur existant
export async function loadUser(userId) {
    try {
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}/${userId}`);
        if (response.ok) {
            const user = await response.json();
            setState('currentUser', user);
            
            localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
            
            const activeWorkout = await checkActiveWorkout();
            if (activeWorkout) {
                showToast('Session en cours récupérée', 'info');
                showView('training');
                updateTrainingInterface();
            } else {
                showMainInterface();
            }
            
            return user;
        } else {
            throw new Error('Utilisateur non trouvé');
        }
    } catch (error) {
        console.error('Erreur chargement utilisateur:', error);
        showToast(MESSAGES.ERRORS.NETWORK, 'error');
        return null;
    }
}

// Sauvegarde du profil utilisateur
export async function saveUser() {
    const userName = document.getElementById('userName').value?.trim();
    const birthDate = document.getElementById('userBirthDate').value;
    const height = parseInt(document.getElementById('userHeight').value);
    const weight = parseFloat(document.getElementById('userWeight').value);
    const experienceLevel = document.getElementById('experienceLevel').value;
    
    if (!userName || !birthDate || !height || !weight || !experienceLevel) {
        showToast('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    const goals = getState('selectedGoals');
    const equipment = getState('selectedEquipment');
    const equipmentConfig = getState('equipmentConfig');
    
    if (goals.length === 0) {
        showToast('Veuillez sélectionner au moins un objectif', 'error');
        return;
    }
    
    const userData = {
        name: userName,
        birth_date: birthDate,
        height: height,
        weight: weight,
        experience_level: experienceLevel,
        goals: goals,
        equipment_config: equipmentConfig
    };
    
    try {
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            const user = await response.json();
            setState('currentUser', user);
            
            localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id.toString());
            
            showMainInterface();
            showToast(MESSAGES.SUCCESS.PROFILE_SAVED, 'success');
        } else {
            const error = await response.json();
            handleSaveError(error);
        }
    } catch (error) {
        console.error('Erreur réseau:', error);
        showToast(MESSAGES.ERRORS.NETWORK, 'error');
    }
}

// Gestion des erreurs de sauvegarde
function handleSaveError(error) {
    console.error('Erreur serveur:', error);
    
    if (Array.isArray(error.detail)) {
        const errorMessages = error.detail.map(err => {
            const field = err.loc ? err.loc[err.loc.length - 1] : 'Champ';
            return `${field}: ${err.msg}`;
        }).join('\n');
        showToast(errorMessages || MESSAGES.ERRORS.VALIDATION, 'error');
    } else {
        showToast(error.detail || MESSAGES.ERRORS.GENERIC, 'error');
    }
}

// Déconnexion
export function logout() {
    if (!confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) return;
    
    const currentWorkout = getState('currentWorkout');
    if (currentWorkout) {
        if (!confirm('Une séance est en cours. Les données non synchronisées seront perdues. Continuer ?')) {
            return;
        }
    }
    
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKOUT);
    localStorage.removeItem(STORAGE_KEYS.SESSION_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.WORKOUT_HISTORY);
    
    setState('currentUser', null);
    setState('currentWorkout', null);
    
    window.location.reload();
}

// Vérification d'une session active
export async function checkActiveWorkout() {
    const currentUser = getState('currentUser');
    if (!currentUser) return null;
    
    try {
        const localWorkout = localStorage.getItem(STORAGE_KEYS.CURRENT_WORKOUT);
        if (localWorkout) {
            const workout = JSON.parse(localWorkout);
            if (workout.status === 'started' || workout.status === 'paused') {
                const serverWorkout = await verifyWorkoutOnServer(workout.id);
                if (serverWorkout) {
                    setState('currentWorkout', serverWorkout);
                    
                    // Import dynamique pour éviter les dépendances circulaires
                    const workoutModule = await import('./workout.js');
                    workoutModule.startWorkoutMonitoring();
                    workoutModule.syncPendingSets();
                    
                    const savedHistory = localStorage.getItem(STORAGE_KEYS.SESSION_HISTORY);
                    if (savedHistory) {
                        setState('sessionHistory', JSON.parse(savedHistory));
                    }
                    
                    return serverWorkout;
                }
            }
            
            localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKOUT);
        }
        
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}/${currentUser.id}/active-workout`);
        if (response.ok) {
            const data = await response.json();
            if (data.active_workout) {
                setState('currentWorkout', data.active_workout);
                localStorage.setItem(STORAGE_KEYS.CURRENT_WORKOUT, JSON.stringify(data.active_workout));
                
                // Import dynamique pour éviter les dépendances circulaires
                const workoutModule = await import('./workout.js');
                workoutModule.startWorkoutMonitoring();
                workoutModule.syncPendingSets();
                
                return data.active_workout;
            }
        }
    } catch (error) {
        console.error('Erreur vérification workout actif:', error);
    }
    
    return null;
}

// Vérification côté serveur
async function verifyWorkoutOnServer(workoutId) {
    try {
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.WORKOUTS}/${workoutId}/status`);
        if (response.ok) {
            const status = await response.json();
            if (status.status === 'started' || status.status === 'paused') {
                return status;
            }
        }
    } catch (error) {
        console.error('Erreur vérification serveur:', error);
    }
    return null;
}

// Mode développement
export async function loadDevProfile() {
    try {
        const initResponse = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.DEV_INIT}`, { 
            method: 'POST' 
        });
        
        if (!initResponse.ok) {
            throw new Error('Impossible d\'initialiser le mode dev');
        }
        
        const devData = await initResponse.json();
        
        const userResponse = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}/${devData.user_id}`);
        if (!userResponse.ok) {
            throw new Error('Impossible de charger le profil dev');
        }
        
        const user = await userResponse.json();
        setState('currentUser', user);
        
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id.toString());
        
        showMainInterface();
        showToast(`Profil dev chargé (${devData.workouts_count} workouts historiques)`, 'success');
        
    } catch (error) {
        console.error('Erreur chargement profil dev:', error);
        showToast('Erreur lors du chargement du profil dev', 'error');
    }
}

// Les imports de fonctions depuis d'autres modules seront faits dynamiquement
// pour éviter les dépendances circulaires