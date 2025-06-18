// ===== MODULE TABLEAU DE BORD =====
// Ce fichier gère l'affichage du tableau de bord et des statistiques
// Il coordonne le chargement des données et leur affichage

import { currentUser } from './app-state.js';
import { getUserStats } from './app-api.js';
import { loadWorkoutHistory } from './app-history.js';
import { showToast } from './app-ui.js';

// ===== CHARGEMENT DU DASHBOARD =====
async function loadDashboard() {
    if (!currentUser) return;
    
    // Message de bienvenue
    updateWelcomeMessage();
    
    // Charger les statistiques
    await loadUserStats();
    
    // AJOUTER ICI : Charger les prédictions ML
    try {
        const response = await fetch(`/api/users/${currentUser.id}/muscle-performance-prediction`);
        if (response.ok) {
            const predictions = await response.json();
            addPredictionCards(predictions);
        }
    } catch (error) {
        console.error('Erreur chargement prédictions:', error);
    }
    
    // Charger l'historique avec un délai pour s'assurer que la séance est bien terminée
    setTimeout(() => {
        loadWorkoutHistory();
    }, 1000);
}

// ===== MISE À JOUR DU MESSAGE DE BIENVENUE =====
function updateWelcomeMessage() {
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement && currentUser) {
        welcomeElement.textContent = `Bonjour ${currentUser.name} !`;
    }
}

function updateProfileSummary() {
    const summaryEl = document.getElementById('profileSummary');
    if (summaryEl && currentUser) {
        summaryEl.textContent = `${currentUser.height}cm • ${currentUser.weight}kg`;
    }
}

// ===== CHARGEMENT DES STATISTIQUES UTILISATEUR =====
async function loadUserStats() {
    if (!currentUser) return;
    
    const stats = await getUserStats(currentUser.id);
    
    if (stats) {
        displayStats(stats);
    } else {
        // Valeurs par défaut si erreur
        displayStats({
            total_workouts: 0,
            week_streak: 0,
            last_workout: null
        });
    }
}

// ===== AFFICHAGE DES STATISTIQUES =====
function displayStats(stats) {
    // Total des séances
    const totalWorkoutsElement = document.getElementById('totalWorkouts');
    if (totalWorkoutsElement) {
        totalWorkoutsElement.textContent = stats.total_workouts || '0';
    }
    
    // Série hebdomadaire
    const weekStreakElement = document.getElementById('weekStreak');
    if (weekStreakElement) {
        weekStreakElement.textContent = stats.week_streak || '0';
    }
    
    // Dernière séance
    const lastWorkoutElement = document.getElementById('lastWorkout');
    if (lastWorkoutElement) {
        if (stats.last_workout) {
            const date = new Date(stats.last_workout);
            const today = new Date();
            const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
                lastWorkoutElement.textContent = "Aujourd'hui";
            } else if (diffDays === 1) {
                lastWorkoutElement.textContent = "Hier";
            } else if (diffDays < 7) {
                lastWorkoutElement.textContent = `Il y a ${diffDays} jours`;
            } else {
                lastWorkoutElement.textContent = date.toLocaleDateString('fr-FR');
            }
        } else {
            lastWorkoutElement.textContent = 'Jamais';
        }
    }
}

// ===== AFFICHAGE DES CARTES DE PRÉDICTION =====
function addPredictionCards(predictions) {
    const container = document.querySelector('.dashboard-grid');
    if (!container || !predictions.predictions) return;
    
    // Créer une carte pour les tendances musculaires
    const trendCard = document.createElement('div');
    trendCard.className = 'stat-card prediction-card';
    trendCard.innerHTML = `
        <h3 style="color: var(--primary); margin-bottom: 1rem;">
            📈 Tendances sur 30 jours
        </h3>
        <div class="prediction-grid">
            ${Object.entries(predictions.predictions)
                .filter(([muscle, data]) => data.trend === 'improving')
                .slice(0, 3)
                .map(([muscle, data]) => `
                    <div class="trend-item">
                        <span class="muscle-name">${muscle}</span>
                        <span class="trend-indicator" style="color: #22c55e;">
                            ↗ +${((data.predicted_max - data.current_max) / data.current_max * 100).toFixed(0)}%
                        </span>
                    </div>
                `).join('')}
        </div>
    `;
    
    // Ajouter la carte seulement s'il y a des tendances positives
    const improvingMuscles = Object.entries(predictions.predictions)
        .filter(([muscle, data]) => data.trend === 'improving');
    
    if (improvingMuscles.length > 0) {
        container.appendChild(trendCard);
    }
    
    // Créer une carte pour les muscles à surveiller
    const declineMuscles = Object.entries(predictions.predictions)
        .filter(([muscle, data]) => data.trend === 'declining');
    
    if (declineMuscles.length > 0) {
        const warningCard = document.createElement('div');
        warningCard.className = 'stat-card warning-card';
        warningCard.innerHTML = `
            <h3 style="color: var(--warning); margin-bottom: 1rem;">
                ⚠️ À surveiller
            </h3>
            <div class="prediction-grid">
                ${declineMuscles.map(([muscle, data]) => `
                    <div class="trend-item">
                        <span class="muscle-name">${muscle}</span>
                        <span class="trend-indicator" style="color: #ef4444;">
                            ↘ ${((data.predicted_max - data.current_max) / data.current_max * 100).toFixed(0)}%
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(warningCard);
    }
}

function logout() {
    localStorage.clear();
    setCurrentUser(null);
    showView('onboarding');
}
window.logout = logout;

// ===== RAFRAÎCHISSEMENT DU DASHBOARD =====
async function refreshDashboard() {
    await loadDashboard();
}

// ===== AFFICHAGE DES STATISTIQUES DÉTAILLÉES =====
function showDetailedStats() {
    // TODO: Implémenter une vue détaillée des statistiques
    console.log('Statistiques détaillées à implémenter');
}

async function clearWorkoutHistory() {
    if (!currentUser) return;
    
    // Double confirmation
    const firstConfirm = confirm(
        "⚠️ ATTENTION ⚠️\n\n" +
        "Voulez-vous vraiment supprimer TOUT l'historique de vos séances ?\n\n" +
        "Cette action est IRRÉVERSIBLE."
    );
    
    if (!firstConfirm) return;
    
    const secondConfirm = confirm("Dernière confirmation - Cette action ne peut pas être annulée.");
    
    if (!secondConfirm) return;
    
    try {
        const response = await fetch(`/api/users/${currentUser.id}/workout-history`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(`${result.deleted_workouts} séances supprimées`, 'success');
            await loadDashboard();
        } else {
            showToast('Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        console.error('Erreur suppression historique:', error);
        showToast('Erreur de connexion', 'error');
    }
}

window.clearWorkoutHistory = clearWorkoutHistory;

// ===== EXPORT GLOBAL =====
window.loadDashboard = loadDashboard;
window.refreshDashboard = refreshDashboard;
window.showDetailedStats = showDetailedStats;

// Export pour les autres modules
export {
    loadDashboard,
    refreshDashboard,
    updateWelcomeMessage,
    loadUserStats,
    displayStats,
    addPredictionCards
};