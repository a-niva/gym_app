// ===== GESTIONNAIRE API =====
// Ce fichier centralise tous les appels API avec gestion d'erreurs
// Pas de complexité inutile, juste des fonctions async/await simples

import { setAllExercises } from './app-state.js';
import { showToast } from './app-ui.js';

// ===== USERS API =====
async function saveUser(userData) {
    try {
        const response = await fetch('/api/users/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            console.error('Erreur serveur:', error);

            // Gérer les erreurs de validation (422)
            if (Array.isArray(error.detail)) {
                const errorMessages = error.detail.map(err => {
                    const field = err.loc ? err.loc[err.loc.length - 1] : 'Champ';
                    return `${field}: ${err.msg}`;
                }).join('\n');
                showToast(errorMessages || 'Erreur de validation', 'error');
            } else {
                showToast(error.detail || 'Erreur lors de la sauvegarde', 'error');
            }
            return null;
        }
    } catch (error) {
        console.error('Erreur réseau:', error);
        showToast('Erreur de connexion au serveur', 'error');
        return null;
    }
}

async function loadUserFromAPI(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Erreur chargement utilisateur:', error);
        return null;
    }
}

async function getUserStats(userId) {
    try {
        const response = await fetch(`/api/users/${userId}/stats`);
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Erreur chargement stats:', error);
        return null;
    }
}

// ===== EXERCISES API =====
async function loadExercises() {
    try {
        const response = await fetch('/api/exercises/');
        if (response.ok) {
            const exercises = await response.json();
            setAllExercises(exercises);
            console.log(`${exercises.length} exercices chargés`);
            return exercises;
        } else {
            console.error('Erreur chargement exercices:', response.status);
            return [];
        }
    } catch (error) {
        console.error('Erreur chargement exercices:', error);
        return [];
    }
}

async function getSuggestedWeight(userId, exerciseId) {
    try {
        const response = await fetch(`/api/users/${userId}/program/next-weight/${exerciseId}`);
        if (response.ok) {
            const data = await response.json();
            return data.weight;
        }
    } catch (error) {
        console.error('Erreur suggestion poids:', error);
    }
    return null;
}

// ===== WORKOUTS API =====
async function createWorkout(userId, type) {
    try {
        const response = await fetch('/api/workouts/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                type: type
            })
        });
        
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            showToast(error.detail || 'Erreur lors du démarrage', 'error');
            return null;
        }
    } catch (error) {
        console.error('Erreur démarrage séance:', error);
        showToast('Erreur de connexion au serveur', 'error');
        return null;
    }
}

async function getActiveWorkout(userId) {
    try {
        const response = await fetch(`/api/users/${userId}/active-workout`);
        if (response.ok) {
            const data = await response.json();
            return data.active_workout;
        }
    } catch (error) {
        console.error('Erreur vérification workout actif:', error);
    }
    return null;
}

async function getWorkoutStatus(workoutId) {
    try {
        const response = await fetch(`/api/workouts/${workoutId}/status`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Erreur status workout:', error);
    }
    return null;
}

async function pauseWorkoutAPI(workoutId) {
    try {
        const response = await fetch(`/api/workouts/${workoutId}/pause`, {
            method: 'PUT'
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Erreur pause workout:', error);
    }
    return null;
}

async function resumeWorkoutAPI(workoutId) {
    try {
        const response = await fetch(`/api/workouts/${workoutId}/resume`, {
            method: 'PUT'
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Erreur reprise workout:', error);
    }
    return null;
}

async function completeWorkoutAPI(workoutId) {
    try {
        const response = await fetch(`/api/workouts/${workoutId}/complete`, {
            method: 'PUT'
        });
        return response.ok;
    } catch (error) {
        console.error('Erreur fin workout:', error);
        return false;
    }
}

async function abandonWorkoutAPI(workoutId) {
    try {
        await fetch(`/api/workouts/${workoutId}/abandon`, {
            method: 'PUT'
        });
    } catch (error) {
        console.error('Erreur abandon workout:', error);
    }
}

async function getWorkoutHistory(userId) {
    try {
        const response = await fetch(`/api/workouts/${userId}/history`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Erreur chargement historique:', error);
    }
    return [];
}

async function checkFatigue(workoutId) {
    try {
        const response = await fetch(`/api/workouts/${workoutId}/fatigue-check`, {
            method: 'POST'
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Erreur check fatigue:', error);
    }
    return null;
}

async function getMuscleDistribution(workoutId) {
    try {
        const response = await fetch(`/api/workouts/${workoutId}/muscle-summary`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Erreur chargement distribution:', error);
    }
    return null;
}

// ===== SETS API =====
async function createSet(setData) {
    try {
        const response = await fetch('/api/sets/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(setData)
        });
        
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Erreur création set:', error);
        return null;
    }
}

async function updateSetRestTime(setId, restTime) {
    try {
        const response = await fetch(`/api/sets/${setId}/rest-time`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rest_time: restTime })
        });
        return response.ok;
    } catch (error) {
        console.error('Failed to update rest time:', error);
        return false;
    }
}

// ===== REST PERIODS API =====
async function createRestPeriod(restData) {
    try {
        const response = await fetch('/api/workouts/rest-periods/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(restData)
        });
        return response.ok;
    } catch (error) {
        console.error('Erreur sync repos inter-exercices:', error);
        return false;
    }
}

// ===== DEVELOPMENT API =====
async function checkDevMode() {
    try {
        const response = await fetch('/api/dev/status');
        if (response.ok) {
            const status = await response.json();
            return status.dev_mode;
        }
    } catch (error) {
        // Si l'endpoint n'existe pas, on est probablement en production
        return false;
    }
}

async function initDevMode() {
    try {
        const response = await fetch('/api/dev/init', { method: 'POST' });
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Erreur init mode dev:', error);
    }
    return null;
}

// Export pour les autres modules
export {
    saveUser,
    loadUserFromAPI,
    getUserStats,
    loadExercises,
    getSuggestedWeight,
    createWorkout,
    getActiveWorkout,
    getWorkoutStatus,
    pauseWorkoutAPI,
    resumeWorkoutAPI,
    completeWorkoutAPI,
    abandonWorkoutAPI,
    getWorkoutHistory,
    checkFatigue,
    getMuscleDistribution,
    createSet,
    updateSetRestTime,
    createRestPeriod,
    checkDevMode,
    initDevMode
};