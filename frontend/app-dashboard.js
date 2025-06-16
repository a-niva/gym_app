// ===== MODULE TABLEAU DE BORD =====
// Ce fichier gère l'affichage du tableau de bord et des statistiques
// Il coordonne le chargement des données et leur affichage

import { currentUser, setCurrentUser } from './app-state.js';
import { getUserStats } from './app-api.js';
import { loadWorkoutHistory } from './app-history.js';
import { loadAllCharts, initializePeriodSelectors } from './app-charts.js';
import { showView } from './app-navigation.js';
import { showToast } from './app-ui.js';

// ===== CHARGEMENT DU DASHBOARD =====
async function loadDashboard() {
    if (!currentUser) return;
    
    // Message de bienvenue
    updateWelcomeMessage();
    
    // Charger les statistiques
    await loadUserStats();
    
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
            // Vérifier que la date est valide
            if (!isNaN(date.getTime())) {
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
        } else {
            lastWorkoutElement.textContent = 'Jamais';
        }
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
async function showDetailedStats() {
    // Réinitialiser l'état des sélecteurs avant de changer de vue
    if (window.resetPeriodSelectors) {
        window.resetPeriodSelectors();
    }
    
    showView('stats');
    
    // Attendre que la vue soit complètement chargée
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // Charger les graphiques et initialiser les sélecteurs
    await loadAllCharts();
    initializePeriodSelectors();
}

// ===== SUPPRESSION DE L'HISTORIQUE =====
async function clearWorkoutHistory() {
    if (!currentUser) return;
    
    // Double confirmation pour éviter les erreurs
    const firstConfirm = confirm(
        "⚠️ ATTENTION ⚠️\n\n" +
        "Voulez-vous vraiment supprimer TOUT l'historique de vos séances ?\n\n" +
        "Cette action est IRRÉVERSIBLE et supprimera :\n" +
        "- Toutes vos séances enregistrées\n" +
        "- Toutes vos séries et performances\n" +
        "- Tous vos records personnels\n\n" +
        "Êtes-vous sûr ?"
    );
    
    if (!firstConfirm) return;
    
    const secondConfirm = confirm(
        "🔴 DERNIÈRE CONFIRMATION 🔴\n\n" +
        "Cliquez sur OK pour supprimer définitivement tout votre historique.\n\n" +
        "Cette action ne peut pas être annulée."
    );
    
    if (!secondConfirm) return;
    
    try {
        const response = await fetch(`/api/users/${currentUser.id}/workout-history`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(`${result.deleted_workouts} séances supprimées`, 'success');
            
            // Recharger le dashboard pour mettre à jour les stats
            await loadDashboard();
            
            // Si on est sur la vue stats, recharger les graphiques
            if (document.querySelector('.view.active')?.id === 'stats') {
                await loadAllCharts();
            }
        } else {
            showToast('Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        console.error('Erreur suppression historique:', error);
        showToast('Erreur de connexion', 'error');
    }
}

// Export global
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
    displayStats
};