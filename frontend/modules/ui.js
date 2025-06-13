// ===== MODULES/UI.JS - INTERFACE UTILISATEUR ET NAVIGATION =====

import { getState, setState } from '../core/state.js';
import { API_ENDPOINTS, STORAGE_KEYS } from '../core/config.js';
import { showToast } from './utils.js';
import { showProfileForm } from './onboarding.js';

// Affichage d'une vue spécifique
export function showView(viewName) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    const view = document.getElementById(viewName);
    if (view) {
        view.classList.add('active');
    }
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const navItem = document.querySelector(`.nav-item[onclick*="${viewName}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    if (viewName === 'dashboard') {
        loadDashboard();
        loadWorkoutHistory();
    } else if (viewName === 'exercises') {
        loadExercises();
        showExercisesList();
    } else if (viewName === 'profile') {
        showProfileInfo();
    }
}

// Affichage de l'interface principale
export function showMainInterface() {
    const currentUser = getState('currentUser');
    if (!currentUser) {
        console.error('Aucun utilisateur chargé');
        showProfileForm();
        return;
    }
    
    document.getElementById('onboarding').classList.remove('active');
    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('bottomNav').style.display = 'flex';
    
    const userInitial = document.getElementById('userInitial');
    if (userInitial) {
        userInitial.textContent = currentUser.name[0].toUpperCase();
        userInitial.style.display = 'flex';
    }
    
    showView('dashboard');
    loadDashboard();
}

// Chargement du tableau de bord
export async function loadDashboard() {
    const currentUser = getState('currentUser');
    if (!currentUser) return;
    
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement) {
        welcomeElement.textContent = `Bonjour ${currentUser.name} !`;
    }
    
    try {
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}/${currentUser.id}/stats`);
        if (response.ok) {
            const stats = await response.json();
            updateDashboardStats(stats);
        }
    } catch (error) {
        console.error('Erreur chargement stats:', error);
    }
}

// Mise à jour des statistiques du tableau de bord
function updateDashboardStats(stats) {
    const totalWorkoutsElement = document.getElementById('totalWorkouts');
    const weekStreakElement = document.getElementById('weekStreak');
    const lastWorkoutElement = document.getElementById('lastWorkout');
    
    if (totalWorkoutsElement) {
        totalWorkoutsElement.textContent = stats.total_workouts || '0';
    }
    
    if (weekStreakElement) {
        weekStreakElement.textContent = stats.week_streak || '0';
    }
    
    if (lastWorkoutElement) {
        lastWorkoutElement.textContent = stats.last_workout || 'Jamais';
    }
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
        const formattedDate = date.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit' 
        });
        
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

// Affichage de la liste des exercices
export function showExercisesList() {
    const container = document.getElementById('exercises');
    if (!container) return;
    
    const exercises = getState('allExercises');
    if (!exercises || exercises.length === 0) {
        loadExercises().then(() => showExercisesList());
        return;
    }
    
    const grouped = exercises.reduce((acc, ex) => {
        if (!acc[ex.body_part]) acc[ex.body_part] = [];
        acc[ex.body_part].push(ex);
        return acc;
    }, {});
    
    container.innerHTML = `
        <h1>Bibliothèque d'exercices</h1>
        <div class="exercises-library">
            ${Object.entries(grouped).map(([part, exercises]) => `
                <div class="exercise-category">
                    <h2>${part}</h2>
                    <div class="exercise-list">
                        ${exercises.map(ex => `
                            <div class="exercise-card" onclick="showExerciseDetail(${ex.id})">
                                <h3>${ex.name_fr}</h3>
                                <p class="exercise-meta">${ex.equipment.join(', ')} • ${ex.level}</p>
                                <div class="exercise-tags">
                                    ${ex.equipment.map(eq => 
                                        `<span class="tag tag-equipment">${eq}</span>`
                                    ).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Affichage des détails d'un exercice
export function showExerciseDetail(exerciseId) {
    const exercises = getState('allExercises');
    const exercise = exercises.find(e => e.id === exerciseId);
    
    if (!exercise) return;
    
    console.log('Détails exercice:', exercise);
    // TODO: Implémenter la modal de détails
}

// Affichage des informations du profil
export function showProfileInfo() {
    const currentUser = getState('currentUser');
    if (!currentUser) return;
    
    const container = document.querySelector('#profile .profile-info');
    if (!container) return;
    
    const age = calculateAge(currentUser.birth_date);
    const bmi = (currentUser.weight / Math.pow(currentUser.height / 100, 2)).toFixed(1);
    
    const experienceLevels = {
        'beginner': 'Débutant',
        'intermediate': 'Intermédiaire',
        'advanced': 'Avancé',
        'elite': 'Élite',
        'extreme': 'Extrême'
    };
    
    const goalNames = {
        'strength': 'Force',
        'hypertrophy': 'Masse musculaire',
        'cardio': 'Cardio',
        'weight_loss': 'Perte de poids',
        'endurance': 'Endurance',
        'flexibility': 'Souplesse'
    };
    
    container.innerHTML = `
        <div class="profile-section">
            <h2>Informations personnelles</h2>
            <div class="profile-data">
                <div class="profile-row">
                    <span class="label">Nom</span>
                    <span class="value">${currentUser.name}</span>
                </div>
                <div class="profile-row">
                    <span class="label">Âge</span>
                    <span class="value">${age} ans</span>
                </div>
                <div class="profile-row">
                    <span class="label">Taille</span>
                    <span class="value">${currentUser.height} cm</span>
                </div>
                <div class="profile-row">
                    <span class="label">Poids</span>
                    <span class="value">${currentUser.weight} kg</span>
                </div>
                <div class="profile-row">
                    <span class="label">IMC</span>
                    <span class="value">${bmi}</span>
                </div>
                <div class="profile-row">
                    <span class="label">Niveau</span>
                    <span class="value">${experienceLevels[currentUser.experience_level]}</span>
                </div>
            </div>
        </div>
        
        <div class="profile-section">
            <h2>Objectifs</h2>
            <div class="goals-list">
                ${currentUser.goals.map(goal => 
                    `<span class="goal-chip">${goalNames[goal]}</span>`
                ).join('')}
            </div>
        </div>
        
        <div class="profile-section">
            <h2>Équipement</h2>
            <div class="equipment-summary">
                ${generateEquipmentSummary(currentUser.equipment_config)}
            </div>
        </div>
    `;
}

// Génération du résumé de l'équipement
function generateEquipmentSummary(config) {
    const summary = [];
    
    if (config.barres) {
        const barres = [];
        if (config.barres.olympique.available) barres.push('Olympique');
        if (config.barres.ez.available) barres.push('EZ');
        if (config.barres.courte.available) barres.push('Courte');
        
        if (barres.length > 0) {
            summary.push(`<div class="equipment-item">Barres: ${barres.join(', ')}</div>`);
        }
    }
    
    if (config.disques && Object.keys(config.disques).length > 0) {
        const weights = Object.keys(config.disques).sort((a, b) => a - b);
        summary.push(`<div class="equipment-item">Disques: ${weights.join('kg, ')}kg</div>`);
    }
    
    if (config.dumbbells && Object.keys(config.dumbbells).length > 0) {
        const weights = Object.keys(config.dumbbells).sort((a, b) => a - b);
        summary.push(`<div class="equipment-item">Haltères: ${weights.join('kg, ')}kg</div>`);
    }
    
    if (config.kettlebells && Object.keys(config.kettlebells).length > 0) {
        const weights = Object.keys(config.kettlebells).sort((a, b) => a - b);
        summary.push(`<div class="equipment-item">Kettlebells: ${weights.join('kg, ')}kg</div>`);
    }
    
    if (config.elastiques && config.elastiques.length > 0) {
        summary.push(`<div class="equipment-item">Élastiques: ${config.elastiques.length} bande(s)</div>`);
    }
    
    if (config.banc && config.banc.available) {
        const features = [];
        if (config.banc.inclinable) features.push('inclinable');
        if (config.banc.declinable) features.push('déclinable');
        
        const bancText = features.length > 0 ? 
            `Banc (${features.join(', ')})` : 'Banc';
        summary.push(`<div class="equipment-item">${bancText}</div>`);
    }
    
    if (config.autres) {
        if (config.autres.barre_traction) {
            summary.push(`<div class="equipment-item">Barre de traction</div>`);
        }
        
        if (config.autres.lest_corps && config.autres.lest_corps.length > 0) {
            summary.push(`<div class="equipment-item">Gilet lesté: ${config.autres.lest_corps.join('kg, ')}kg</div>`);
        }
    }
    
    return summary.join('');
}

// Utilitaires
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

// Mode silencieux
export function toggleSilentMode() {
    const isSilentMode = getState('isSilentMode');
    setState('isSilentMode', !isSilentMode);
    
    const icon = document.querySelector('.training-controls svg');
    if (icon) {
        icon.style.opacity = isSilentMode ? '1' : '0.5';
    }
    
    showToast(isSilentMode ? 'Sons activés' : 'Mode silencieux activé', 'info');
}

// Import des fonctions depuis autres modules
import { loadExercises } from './exercises.js';
import { startWorkout } from './workout.js';
import { logout } from './auth.js';

// Export des fonctions pour les événements HTML
export { startWorkout, logout };