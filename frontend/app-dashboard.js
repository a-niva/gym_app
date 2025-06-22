// ===== MODULE TABLEAU DE BORD =====
// Ce fichier gère l'affichage du tableau de bord et des statistiques
// Il coordonne le chargement des données et leur affichage

import { loadWorkoutHistory } from './app-history.js';
import { showToast, showLoadingOverlay, hideLoadingOverlay } from './app-ui.js';
import { 
    getUserStats,
    getUserCommitment, 
    getTrajectoryAnalysis, 
    getAdaptiveTargets,
    generateAdaptiveWorkout,
    completeAdaptiveWorkout
} from './app-api.js';
import { 
    currentUser,
    userCommitment, 
    adaptiveTargets, 
    trajectoryAnalysis,
    currentAdaptiveWorkout,
    setCurrentWorkout,
    getCurrentProgram
} from './app-state.js';

import { showView } from './app-navigation.js';
import { showProgramGenerator } from './app-program-generator.js';

// ===== CHARGEMENT DU DASHBOARD =====
async function loadDashboard() {
    if (!currentUser) return;
    
    try {
        // Charger les données adaptatives en parallèle avec les stats existantes
        const [commitment, trajectory, targets] = await Promise.all([
            getUserCommitment(currentUser.id),
            getTrajectoryAnalysis(currentUser.id),
            getAdaptiveTargets(currentUser.id)
        ]);
        
        // Modifier le contenu du dashboard selon si l'utilisateur a des objectifs ou non
        const dashboardView = document.getElementById('dashboard');
        if (!dashboardView) return;
        
        // Si pas d'engagement, afficher l'ancien dashboard + bouton pour définir objectifs
        if (!commitment || !trajectory || trajectory.status === "no_commitment") {
            // Conserver l'ancien comportement
            updateWelcomeMessage();
            await loadUserStats();
            
            // Ajouter un bouton pour définir les objectifs
            const statsContainer = document.querySelector('.stats-grid');
            if (statsContainer) {
                const objectifsCard = document.createElement('div');
                objectifsCard.className = 'stat-card';
                objectifsCard.innerHTML = `
                    <h3>🎯 Définir mes objectifs</h3>
                    <p>Personnalisez votre entraînement</p>
                    <button class="btn" onclick="showCommitmentModal()" style="margin-top: 1rem;">
                        Commencer
                    </button>
                `;
                statsContainer.insertBefore(objectifsCard, statsContainer.firstChild);
            }
        } else {
            // Nouveau dashboard adaptatif
            dashboardView.innerHTML = `
                <div class="dashboard-header" style="margin-bottom: 2rem;">
                    <h1>Bonjour ${currentUser.name} ! 💪</h1>
                    <p style="color: var(--gray);">${new Date().toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</p>
                </div>
                
                <!-- Widget Trajectoire -->
                <div class="trajectory-widget ${trajectory.on_track ? 'on-track' : 'off-track'}">
                    <div class="trajectory-header">
                        <h3>${trajectory.on_track ? '✅ Sur la bonne voie !' : '⚠️ Ajustons le rythme'}</h3>
                        <span class="trajectory-badge">
                            ${trajectory.sessions_this_week}/${trajectory.sessions_target} séances
                        </span>
                    </div>
                    
                    <div class="trajectory-stats">
                        <div class="stat-item">
                            <span class="stat-label">Régularité (30j)</span>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${trajectory.consistency_score * 100}%"></div>
                            </div>
                            <span class="stat-value">${Math.round(trajectory.consistency_score * 100)}%</span>
                        </div>
                        
                        <div class="stat-item">
                            <span class="stat-label">Adhérence au volume</span>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${trajectory.volume_adherence * 100}%"></div>
                            </div>
                            <span class="stat-value">${Math.round(trajectory.volume_adherence * 100)}%</span>
                        </div>
                    </div>
                    
                    <!-- Insights personnalisés -->
                    ${trajectory.insights && trajectory.insights.length > 0 ? `
                        <div class="insights-section">
                            ${trajectory.insights.map(insight => `
                                <div class="insight-item">${insight}</div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <!-- Actions rapides -->
                <div class="quick-actions">
                    <button class="action-card" onclick="generateQuickWorkout()">
                        <div class="action-icon">🎯</div>
                        <div class="action-content">
                            <h4>Séance adaptative</h4>
                            <p>Générée selon votre état</p>
                        </div>
                    </button>
                    
                    <button class="action-card" onclick="showView('program-generator')">
                        <div class="action-icon">📋</div>
                        <div class="action-content">
                            <h4>Programme complet</h4>
                            <p>Planifiez vos semaines</p>
                        </div>
                    </button>
                    
                    <button class="action-card" onclick="showView('stats')">
                        <div class="action-icon">📊</div>
                        <div class="action-content">
                            <h4>Statistiques</h4>
                            <p>Analysez votre progression</p>
                        </div>
                    </button>
                </div>
                
                <!-- État des muscles -->
                <div class="muscle-status-widget">
                    <h3>État de récupération musculaire</h3>
                    <div class="muscle-grid">
                        ${renderMuscleStatus(targets)}
                    </div>
                </div>
                
                <!-- Stats classiques -->
                <div class="stats-grid" id="statsGrid"></div>
                
                <!-- Historique -->
                <div class="workout-history" id="workoutHistory">
                    <h3>Historique récent</h3>
                    <div id="historyList"></div>
                </div>
            `;
            
            // Charger les stats classiques dans la nouvelle structure
            await loadUserStats();
        }
        
        // Charger les prédictions ML (existant)
        try {
            const response = await fetch(`/api/users/${currentUser.id}/muscle-performance-prediction`);
            if (response.ok) {
                const predictions = await response.json();
                addPredictionCards(predictions);
            }
        } catch (error) {
            console.error('Erreur chargement prédictions:', error);
        }
        
        // Charger l'historique
        setTimeout(() => {
            loadWorkoutHistory();
        }, 1000);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Fallback vers l'ancien dashboard
        updateWelcomeMessage();
        await loadUserStats();
        setTimeout(() => {
            loadWorkoutHistory();
        }, 1000);
    }
}

// ========== NOUVELLES FONCTIONS DASHBOARD ADAPTATIF ==========

// Modal pour définir les objectifs
function showCommitmentModal() {
    // Rediriger vers l'onboarding à l'étape commitment
    showView('onboarding');
    // Aller directement à l'étape commitment
    setTimeout(() => {
        const commitmentStep = document.getElementById('step-commitment');
        if (commitmentStep) {
            document.querySelectorAll('.onboarding-step').forEach(step => {
                step.style.display = 'none';
            });
            commitmentStep.style.display = 'block';
        }
    }, 100);
}

// Fonction pour afficher l'état des muscles
async function renderMuscleStatus(targets) {
    if (!targets || targets.length === 0) return '<p style="color: var(--gray);">Aucune donnée disponible</p>';
    
    const muscleEmojis = {
        chest: '🎯',
        back: '🔙',
        shoulders: '💪',
        legs: '🦵',
        arms: '💪',
        core: '🎯'
    };
    
    const muscleNames = {
        chest: 'Pectoraux',
        back: 'Dos',
        shoulders: 'Épaules',
        legs: 'Jambes',
        arms: 'Bras',
        core: 'Abdos'
    };
    
    return targets.map(target => {
        const readiness = calculateReadiness(target);
        const statusClass = readiness > 0.7 ? 'ready' : readiness > 0.4 ? 'moderate' : 'tired';
        const volumePercent = target.target_volume > 0 
            ? Math.round((target.current_volume / target.target_volume) * 100)
            : 0;
        
        return `
            <div class="muscle-item ${statusClass}">
                <div class="muscle-header">
                    <span class="muscle-emoji">${muscleEmojis[target.muscle_group] || '💪'}</span>
                    <span class="muscle-name">${muscleNames[target.muscle_group] || target.muscle_group}</span>
                </div>
                <div class="muscle-stats">
                    <div class="mini-progress">
                        <div class="mini-progress-fill" style="width: ${volumePercent}%"></div>
                    </div>
                    <span class="volume-text">${volumePercent}% du volume</span>
                </div>
                ${target.last_trained ? `
                    <span class="last-trained">
                        ${getTimeSinceText(target.last_trained)}
                    </span>
                ` : '<span class="last-trained">Jamais entraîné</span>'}
            </div>
        `;
    }).join('');
}

// Fonction pour calculer la disponibilité d'un muscle
function calculateReadiness(target) {
    if (!target.last_trained) return 1.0;
    
    const hoursSince = (new Date() - new Date(target.last_trained)) / (1000 * 60 * 60);
    let readiness = Math.min(1.0, hoursSince / 48); // 48h pour récupération complète
    
    // Ajuster selon la dette de récupération
    if (target.recovery_debt > 0) {
        readiness *= Math.max(0.5, 1 - (target.recovery_debt / 10));
    }
    
    return readiness;
}

// Fonction pour formater le temps écoulé
function getTimeSinceText(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const hours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (hours < 1) return "À l'instant";
    if (hours < 24) return `Il y a ${hours}h`;
    if (hours < 48) return "Hier";
    if (hours < 168) return `Il y a ${Math.floor(hours / 24)}j`;
    return `Il y a ${Math.floor(hours / 168)} sem`;
}

// Fonction pour générer une séance rapide
async function generateQuickWorkout() {
    try {
        showLoadingOverlay('Génération de votre séance adaptative...');
        
        // Demander le temps disponible
        const timeAvailable = await showTimeSelectionModal();
        if (!timeAvailable) {
            hideLoadingOverlay();
            return;
        }
        
        const workout = await generateAdaptiveWorkout(currentUser.id, timeAvailable);
        
        hideLoadingOverlay();
        
        // Afficher la séance générée
        showAdaptiveWorkoutModal(workout);
        
    } catch (error) {
        hideLoadingOverlay();
        showToast('Erreur lors de la génération de la séance', 'error');
    }
}

// Modal pour sélectionner le temps disponible
async function showTimeSelectionModal() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <h3>Temps disponible aujourd'hui ?</h3>
                <div class="time-options">
                    <button class="time-option" data-time="30">
                        <span class="time-value">30</span>
                        <span class="time-label">minutes</span>
                    </button>
                    <button class="time-option" data-time="45">
                        <span class="time-value">45</span>
                        <span class="time-label">minutes</span>
                    </button>
                    <button class="time-option" data-time="60">
                        <span class="time-value">60</span>
                        <span class="time-label">minutes</span>
                    </button>
                    <button class="time-option" data-time="90">
                        <span class="time-value">90</span>
                        <span class="time-label">minutes</span>
                    </button>
                </div>
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                    Annuler
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelectorAll('.time-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const time = parseInt(btn.dataset.time);
                modal.remove();
                resolve(time);
            });
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(null);
            }
        });
    });
}

// Modal pour afficher la séance adaptative
function showAdaptiveWorkoutModal(workout) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <h3>Votre séance adaptative 🎯</h3>
            <p class="workout-duration">Durée estimée : ${Math.round(workout.estimated_duration)} minutes</p>
            
            <div class="workout-muscles">
                <strong>Muscles ciblés :</strong> ${workout.muscles.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}
            </div>
            
            <div class="exercises-list">
                ${workout.exercises.map((ex, idx) => `
                    <div class="exercise-item">
                        <span class="exercise-number">${idx + 1}</span>
                        <div class="exercise-details">
                            <h4>${ex.exercise.name_fr}</h4>
                            <div class="exercise-specs">
                                <span>${ex.sets} séries</span>
                                <span>${ex.target_reps} reps</span>
                                <span>${ex.rest_time}s repos</span>
                                ${ex.predicted_weight ? `<span>${ex.predicted_weight}kg</span>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                    Modifier
                </button>
                <button class="btn" onclick="startAdaptiveWorkout()">
                    Commencer la séance
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Fonction pour démarrer la séance adaptative
async function startAdaptiveWorkout() {
    if (!currentAdaptiveWorkout) return;
    
    // Créer la séance
    const workoutData = {
        user_id: currentUser.id,
        type: "adaptive"
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/workouts/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workoutData)
        });
        
        const workout = await response.json();
        setCurrentWorkout(workout);
        
        // Préparer les exercices pour la vue workout
        state.selectedExercises = currentAdaptiveWorkout.exercises.map(ex => ex.exercise);
        state.currentExerciseIndex = 0;
        
        // Fermer le modal et afficher la vue workout
        document.querySelector('.modal-overlay')?.remove();
        showView('workout');
        
    } catch (error) {
        console.error('Error starting workout:', error);
        showToast('Erreur lors du démarrage de la séance', 'error');
    }
}

// Ajouter les exports pour les nouvelles fonctions
window.showCommitmentModal = showCommitmentModal;
window.generateQuickWorkout = generateQuickWorkout;
window.startAdaptiveWorkout = startAdaptiveWorkout;


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

    // Carte suggestions d'adaptation du programme
    if (getCurrentProgram()) {
        (async () => {
            try {
                const response = await fetch(
                    `/api/programs/${getCurrentProgram().id}/adjustments?user_id=${currentUser.id}`
                );
                
                if (response.ok) {
                    const suggestions = await response.json();
                    
                    if (suggestions.status === 'ready') {
                        const adaptCard = document.createElement('div');
                        adaptCard.className = 'stat-card adaptation-card';
                        
                        let suggestionsHTML = '<h3 style="color: var(--primary); margin-bottom: 1rem;">🔧 Adaptation du programme</h3>';
                        
                        // Recommandations globales
                        if (suggestions.global_recommendations && suggestions.global_recommendations.length > 0) {
                            suggestionsHTML += '<div class="alert" style="background: rgba(255,193,7,0.1); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">';
                            suggestions.global_recommendations.forEach(rec => {
                                suggestionsHTML += `
                                    <p style="margin: 0.5rem 0;"><strong>${rec.action}</strong></p>
                                    <small style="color: var(--gray-light);">${rec.reason}</small>
                                `;
                            });
                            suggestionsHTML += '</div>';
                        }
                        
                        // Suggestions par muscle (max 3)
                        const muscleEntries = Object.entries(suggestions.muscle_specific || {}).slice(0, 3);
                        if (muscleEntries.length > 0) {
                            suggestionsHTML += '<div class="muscle-suggestions">';
                            muscleEntries.forEach(([muscle, recs]) => {
                                suggestionsHTML += `<h5 style="color: var(--gray-light); text-transform: uppercase; font-size: 0.85rem;">${muscle}</h5>`;
                                recs.forEach(rec => {
                                    const iconMap = {
                                        'increase_volume': '📈',
                                        'change_exercises': '🔄',
                                        'reduce_volume': '📉'
                                    };
                                    suggestionsHTML += `
                                        <p style="margin: 0.5rem 0;">
                                            ${iconMap[rec.type] || '•'} ${rec.action}
                                        </p>
                                    `;
                                });
                            });
                            suggestionsHTML += '</div>';
                        }
                        
                        // Changements d'exercices suggérés
                        if (suggestions.exercises_to_change && suggestions.exercises_to_change.length > 0) {
                            suggestionsHTML += '<div style="margin-top: 1rem;">';
                            suggestionsHTML += '<h5 style="color: var(--gray-light); font-size: 0.85rem;">EXERCICES À VARIER</h5>';
                            suggestions.exercises_to_change.slice(0, 2).forEach(change => {
                                suggestionsHTML += `
                                    <p style="margin: 0.5rem 0; font-size: 0.9rem;">
                                        • ${change.current[0]} → ${change.alternatives[0]}
                                    </p>
                                `;
                            });
                            suggestionsHTML += '</div>';
                        }
                        
                        // Bouton d'action
                        suggestionsHTML += `
                            <button class="btn btn-primary" onclick="showProgramAdjustments()" style="margin-top: 1.5rem; width: 100%;">
                                🔧 Voir toutes les suggestions
                            </button>
                        `;
                        
                        adaptCard.innerHTML = suggestionsHTML;
                        container.appendChild(adaptCard);
                    }
                }
            } catch (error) {
                console.error('Erreur chargement suggestions adaptation:', error);
            }
        })();
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


// ===== AFFICHER LES AJUSTEMENTS DE PROGRAMME =====
async function showProgramAdjustments() {
    // Pour l'instant, rediriger vers le générateur
    // TODO: Créer une interface dédiée pour les ajustements
    showProgramGenerator();
    showToast('Analysez votre programme actuel depuis cette page', 'info');
}

// ===== EXPORT GLOBAL =====
window.clearWorkoutHistory = clearWorkoutHistory;
window.loadDashboard = loadDashboard;
window.refreshDashboard = refreshDashboard;
window.showDetailedStats = showDetailedStats;
window.showProgramAdjustments = showProgramAdjustments;

// Export pour les autres modules
export {
    loadDashboard,
    refreshDashboard,
    updateWelcomeMessage,
    loadUserStats,
    displayStats,
    addPredictionCards
};