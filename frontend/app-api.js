// ===== GESTIONNAIRE API =====
// Ce fichier centralise tous les appels API avec gestion d'erreurs
// Pas de complexité inutile, juste des fonctions async/await simples

import { 
    currentUser,         
    setAllExercises, 
    setCurrentWorkout,
    setCurrentUser,
    setUserCommitment,
    setAdaptiveTargets,
    setTrajectoryAnalysis,
    setCurrentAdaptiveWorkout,
    setUserPrograms 
} from './app-state.js';
import { showToast } from './app-ui.js';

// Configuration de base pour les requêtes
const API_BASE_URL = '/api';
const REQUEST_TIMEOUT = 30000; // 30 secondes

// Variables pour la gestion de session
let isRefreshing = false;
let refreshSubscribers = [];

// Fonction helper pour les timeouts
function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout de la requête')), timeout)
        )
    ]);
}

// Fonction helper pour la gestion des tokens
function onRefreshed(token) {
    refreshSubscribers.forEach(callback => callback(token));
    refreshSubscribers = [];
}

function addRefreshSubscriber(callback) {
    refreshSubscribers.push(callback);
}

async function refreshAuthToken() {
    if (isRefreshing) {
        return new Promise((resolve) => {
            addRefreshSubscriber(() => resolve());
        });
    }
    
    isRefreshing = true;
    
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('authToken', data.access_token);
            if (data.refresh_token) {
                localStorage.setItem('refreshToken', data.refresh_token);
            }
            onRefreshed(data.access_token);
            return data.access_token;
        } else {
            throw new Error('Failed to refresh token');
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        // Rediriger vers login si le refresh échoue
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
        if (window.showProfileForm) {
            window.showProfileForm();
        }
        throw error;
    } finally {
        isRefreshing = false;
    }
}

// Fonction générique pour les appels API avec retry
async function apiCall(endpoint, options = {}, retries = 3) {
    let lastError;
    
    for (let i = 0; i < retries; i++) {
        try {
            // Ajouter le token d'authentification si disponible
            const authToken = localStorage.getItem('authToken');
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };
            
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }
            
            const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });
            
            // Gérer l'erreur 401 (non autorisé)
            if (response.status === 401 && authToken) {
                try {
                    await refreshAuthToken();
                    // Réessayer avec le nouveau token
                    const newToken = localStorage.getItem('authToken');
                    headers['Authorization'] = `Bearer ${newToken}`;
                    
                    const retryResponse = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
                        ...options,
                        headers
                    });
                    
                    if (!retryResponse.ok) {
                        throw new Error(`API Error: ${retryResponse.status}`);
                    }
                    
                    return await retryResponse.json();
                } catch (refreshError) {
                    throw new Error('Session expirée');
                }
            }
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: 'Erreur inconnue' }));
                throw new Error(error.detail || `Erreur HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            lastError = error;
            console.error(`Tentative ${i + 1}/${retries} échouée:`, error);
            
            // Ne pas réessayer pour certaines erreurs
            if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Session expirée')) {
                break;
            }
            
            // Attendre avant de réessayer (backoff exponentiel)
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
    }
    
    throw lastError;
}

// ===== USERS API =====
async function saveUser(userData) {
    try {
        const user = await apiCall('/users/', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        return user;
    } catch (error) {
        console.error('Erreur serveur:', error);
        
        // Gérer les erreurs de validation spécifiques
        if (error.message.includes('422')) {
            showToast('Données invalides, vérifiez le formulaire', 'error');
        } else {
            showToast(error.message || 'Erreur lors de la sauvegarde', 'error');
        }
        return null;
    }
}

async function loadUserFromAPI(userId) {
    try {
        return await apiCall(`/users/${userId}`);
    } catch (error) {
        console.error('Erreur chargement utilisateur:', error);
        return null;
    }
}

async function getUserStats(userId) {
    try {
        return await apiCall(`/users/${userId}/stats`);
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

// Récupérer les suggestions d'ajustement ML (poids + reps)
async function getWorkoutAdjustments(workoutId, setId, remainingSets) {
    console.log('getWorkoutAdjustments appelé avec:', {
        workoutId,
        setId,
        remainingSets
    });
    
    try {
        // Le backend attend remaining_sets comme paramètre de query
        const response = await fetch(`/api/workouts/${workoutId}/sets/${setId}/adjust?remaining_sets=${remainingSets}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
            // Pas de body, remaining_sets est dans l'URL
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erreur adjust workout:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            
            // Si c'est une 422, nettoyer l'ID invalide
            if (response.status === 422) {
                localStorage.removeItem('lastCompletedSetId');
            }
            
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.warn('Ajustements ML non disponibles:', error);
        return null;
    }
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

// ===== PROGRAMMES =====
export async function saveProgram(programData) {
    try {
        const response = await fetch(`/api/programs/?user_id=${currentUser.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(programData)
        });
        
        if (!response.ok) throw new Error('Erreur sauvegarde programme');
        
        const result = await response.json();
        showToast('Programme sauvegardé !', 'success');
        return result;
    } catch (error) {
        console.error('Erreur sauvegarde programme:', error);
        showToast('Erreur lors de la sauvegarde du programme', 'error');
        return null;
    }
}

export async function loadUserPrograms(userId) {
    try {
        const response = await fetch(`/api/users/${userId}/programs`);
        if (!response.ok) throw new Error('Erreur chargement programmes');
        
        const programs = await response.json();
        setUserPrograms(programs);
        return programs;
    } catch (error) {
        console.error('Erreur chargement programmes:', error);
        return [];
    }
}

export async function activateProgram(programId) {
    try {
        const response = await fetch(`/api/programs/${programId}/activate`, {
            method: 'PUT'
        });
        
        if (!response.ok) throw new Error('Erreur activation programme');
        
        showToast('Programme activé !', 'success');
        return true;
    } catch (error) {
        console.error('Erreur activation programme:', error);
        showToast('Erreur lors de l\'activation du programme', 'error');
        return false;
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
        } else {
            // Gestion des erreurs spécifiques
            if (response.status === 422) {
                console.error('Données de série invalides');
            }
            return null;
        }
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

// ========== API SYSTÈME ADAPTATIF ==========

async function saveUserCommitment(userId, commitment) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/commitment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(commitment)
        });
        
        if (!response.ok) throw new Error('Failed to save commitment');
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error saving commitment:', error);
        showToast('Erreur lors de la sauvegarde des objectifs', 'error');
        throw error;
    }
}

async function getUserCommitment(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/commitment`);
        
        if (response.status === 404) {
            return null;
        }
        
        if (!response.ok) throw new Error('Failed to get commitment');
        
        const data = await response.json();
        setUserCommitment(data);
        return data;
    } catch (error) {
        console.error('Error getting commitment:', error);
        return null;
    }
}

async function getAdaptiveTargets(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/adaptive-targets`);
        
        if (!response.ok) throw new Error('Failed to get adaptive targets');
        
        const data = await response.json();
        setAdaptiveTargets(data);
        return data;
    } catch (error) {
        console.error('Error getting adaptive targets:', error);
        return [];
    }
}

async function getTrajectoryAnalysis(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/trajectory`);
        
        if (!response.ok) {
            // Retourner des données par défaut au lieu de throw
            return {
                status: "error",
                on_track: false,
                sessions_this_week: 0,
                sessions_target: 0,
                volume_adherence: 0.0,
                consistency_score: 0.0,
                muscle_balance: {},
                insights: ["Données non disponibles"]
            };
        }
        
        const data = await response.json();
        setTrajectoryAnalysis(data);
        return data;
    } catch (error) {
        console.error('Error getting trajectory:', error);
        // Retourner des données par défaut
        return {
            status: "error",
            on_track: false,
            sessions_this_week: 0,
            sessions_target: 0,
            volume_adherence: 0.0,
            consistency_score: 0.0,
            muscle_balance: {},
            insights: ["Erreur de connexion"]
        };
    }
}

async function generateAdaptiveWorkout(userId, timeAvailable = 60) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/users/${userId}/generate-adaptive-workout?time_available=${timeAvailable}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );
        
        if (!response.ok) throw new Error('Failed to generate adaptive workout');
        
        const data = await response.json();
        setCurrentAdaptiveWorkout(data);
        return data;
    } catch (error) {
        console.error('Error generating adaptive workout:', error);
        showToast('Erreur lors de la génération de la séance', 'error');
        throw error;
    }
}

async function completeAdaptiveWorkout(workoutId) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/workouts/${workoutId}/complete-adaptive`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );
        
        if (!response.ok) throw new Error('Failed to complete adaptive workout');
        
        const data = await response.json();
        
        // Rafraîchir les données
        await getTrajectoryAnalysis(currentUser.id);
        await getAdaptiveTargets(currentUser.id);
        
        return data;
    } catch (error) {
        console.error('Error completing adaptive workout:', error);
        throw error;
    }
}

async function skipSession(userId, reason = null) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/users/${userId}/skip-session`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason })
            }
        );
        
        if (!response.ok) throw new Error('Failed to skip session');
        
        const data = await response.json();
        
        // Afficher le rappel intelligent
        if (data.reminder) {
            showToast(data.reminder, 'info');
        }
        
        return data;
    } catch (error) {
        console.error('Error skipping session:', error);
        throw error;
    }
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
    getWorkoutAdjustments,
    getUserCommitment,
    getAdaptiveTargets,
    getTrajectoryAnalysis,
    generateAdaptiveWorkout,
    completeAdaptiveWorkout,
    saveUserCommitment,
    skipSession
};

// Export des nouvelles fonctions du système adaptatif pour utilisation globale
window.saveUserCommitment = saveUserCommitment;
window.getUserCommitment = getUserCommitment;
window.getAdaptiveTargets = getAdaptiveTargets;
window.getTrajectoryAnalysis = getTrajectoryAnalysis;
window.generateAdaptiveWorkout = generateAdaptiveWorkout;
window.completeAdaptiveWorkout = completeAdaptiveWorkout;
window.skipSession = skipSession;