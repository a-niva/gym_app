// ===== GESTIONNAIRE DE SÉANCES =====
// Ce fichier gère le cycle de vie complet des séances d'entraînement
// Il coordonne la création, le suivi, la synchronisation et la fin des séances

import { 
    currentUser,
    currentWorkout,
    setCurrentWorkout,
    workoutCheckInterval,
    setWorkoutCheckInterval,
    lastSyncTime,
    setLastSyncTime,
    timerInterval,
    setTimerInterval,
    restTimerInterval,
    setRestTimerInterval,
    audioContext,
    setAudioContext,
    lastExerciseEndTime,
    setLastExerciseEndTime,
    interExerciseRestTime,
    setInterExerciseRestTime,
    getCurrentAdaptiveWorkout,
    clearSessionHistory,
    currentSetNumber
} from './app-state.js';
import { startGuidedWorkout } from './app-guided-workout.js';
import { showView, showProfileForm } from './app-navigation.js';
import { showToast } from './app-ui.js';
import { 
    createWorkout,
    getActiveWorkout,
    getWorkoutStatus,
    pauseWorkoutAPI,
    resumeWorkoutAPI,
    completeWorkoutAPI,
    abandonWorkoutAPI,
    createRestPeriod,
    createSet
} from './app-api.js';
import { finishExercise } from './app-exercises.js';
import { SYNC_INTERVAL } from './app-config.js';

// ===== DÉMARRAGE D'UNE SÉANCE =====
export async function startWorkout(type) {
    console.log(`🚀 Démarrage séance type: ${type}`);
    
    if (!currentUser) {
        showToast('Veuillez vous connecter', 'error');
        if (window.showProfileForm) {
            window.showProfileForm();
        }
        return;
    }
    
    // Nettoyer l'état précédent
    cleanupWorkout();
    
    // Vérifier s'il y a déjà une session active
    const activeWorkout = await checkActiveWorkout();
    if (activeWorkout) {
        console.log('🔄 Session active trouvée:', activeWorkout);
        setCurrentWorkout(activeWorkout);
        showView('training');
        updateTrainingInterface();
        showToast('Session en cours récupérée', 'info');
        return;
    }
    
    // Gestion spécifique des séances adaptatives
    if (type === 'adaptive') {
        const adaptiveData = getCurrentAdaptiveWorkout();
        if (!adaptiveData) {
            console.error('❌ Aucune donnée adaptative disponible');
            showToast('Aucune séance adaptative sélectionnée', 'error');
            return;
        }
        
        console.log('🎯 Données adaptatives trouvées:', adaptiveData);
        
        // Sauvegarder le plan avant de créer la séance
        localStorage.setItem('guidedWorkoutPlan', JSON.stringify(adaptiveData));
        localStorage.setItem('workoutType', 'adaptive');
    }
    
    try {
        // Créer la nouvelle séance
        const workout = await createWorkout(currentUser.id, type);
        
        if (!workout) {
            throw new Error('Impossible de créer la séance');
        }
        
        console.log('✅ Séance créée:', workout);
        
        // Configurer l'état global
        setCurrentWorkout(workout);
        
        // Démarrer la surveillance
        startWorkoutMonitoring();
        
        // Afficher l'interface
        showView('training');
        updateTrainingInterface();
        
        showToast(`Séance ${type === 'adaptive' ? 'adaptative' : 'libre'} démarrée !`, 'success');
        
    } catch (error) {
        console.error('❌ Erreur création séance:', error);
        showToast('Erreur lors de la création de la séance', 'error');
        
        // Nettoyer en cas d'erreur
        localStorage.removeItem('guidedWorkoutPlan');
        localStorage.removeItem('workoutType');
    }
}

// ===== VÉRIFICATION DE SÉANCE ACTIVE =====
export async function checkActiveWorkout() {
    if (!currentUser) return null;
    
    try {
        // D'abord vérifier localStorage
        const savedWorkout = localStorage.getItem('currentWorkout');
        if (savedWorkout) {
            const workout = JSON.parse(savedWorkout);
            
            // Vérifier que c'est bien pour cet utilisateur
            if (workout.user_id === currentUser.id && workout.status !== 'completed') {
                // Vérifier avec le serveur que la session existe toujours
                const serverWorkout = await getWorkoutStatus(workout.id);
                if (serverWorkout && (serverWorkout.status === 'started' || serverWorkout.status === 'paused')) {
                    setCurrentWorkout(serverWorkout);
                    startWorkoutMonitoring();
                    syncPendingSets();
                    
                    // Récupérer l'historique de session si disponible
                    const savedHistory = localStorage.getItem('currentSessionHistory');
                    if (savedHistory) {
                        const history = JSON.parse(savedHistory);
                        history.forEach(entry => {
                            if (window.addToSessionHistory) {
                                window.addToSessionHistory(entry.type, entry.data);
                            }
                        });
                    }
                    
                    syncInterExerciseRests();
                    return serverWorkout;
                }
            }
            
            // Si pas valide, nettoyer
            localStorage.removeItem('currentWorkout');
        }
        
        // Vérifier côté serveur
        const activeWorkout = await getActiveWorkout(currentUser.id);
        if (activeWorkout) {
            setCurrentWorkout(activeWorkout);
            localStorage.setItem('currentWorkout', JSON.stringify(activeWorkout));
            startWorkoutMonitoring();
            syncPendingSets();
            
            // Récupérer l'historique de session si disponible
            const savedHistory = localStorage.getItem('currentSessionHistory');
            if (savedHistory) {
                const history = JSON.parse(savedHistory);
                history.forEach(entry => {
                    if (window.addToSessionHistory) {
                        window.addToSessionHistory(entry.type, entry.data);
                    }
                });
            }
            
            return activeWorkout;
        }
    } catch (error) {
        console.error('Erreur vérification workout actif:', error);
    }
    
    // Si on arrive ici, il n'y a pas de session active
    // Nettoyer le localStorage pour éviter des incohérences futures
    localStorage.removeItem('currentWorkout');
    localStorage.removeItem('currentSessionHistory');
    return null;
}

// ===== MONITORING DE LA SÉANCE =====
export function startWorkoutMonitoring() {
    // Sync toutes les 30 secondes pour gérer Render qui s'endort
    if (workoutCheckInterval) clearInterval(workoutCheckInterval);
    
    const interval = setInterval(async () => {
        if (currentWorkout && currentWorkout.status === 'started') {
            try {
                // Ping pour garder le serveur éveillé sur Render
                await getWorkoutStatus(currentWorkout.id);
                setLastSyncTime(new Date());
            } catch (error) {
                console.error('Erreur sync workout:', error);
                showToast('Connexion perdue, données en local', 'warning');
            }
        }
    }, SYNC_INTERVAL);
    
    setWorkoutCheckInterval(interval);
}

// ===== PAUSE DE LA SÉANCE =====
export async function pauseWorkout() {
    if (!currentWorkout) return;
    
    const result = await pauseWorkoutAPI(currentWorkout.id);
    
    if (result) {
        currentWorkout.status = 'paused';
        currentWorkout.paused_at = result.paused_at;
        
        localStorage.setItem('currentWorkout', JSON.stringify(currentWorkout));
        showToast('Séance mise en pause', 'info');
        updateTrainingInterface();
    } else {
        // Sauvegarder l'état localement même si le serveur ne répond pas
        currentWorkout.status = 'paused';
        currentWorkout.paused_at = new Date().toISOString();
        localStorage.setItem('currentWorkout', JSON.stringify(currentWorkout));
        showToast('Pause sauvegardée localement', 'warning');
    }
}

// ===== REPRISE DE LA SÉANCE =====
export async function resumeWorkout() {
    if (!currentWorkout) return;
    
    const result = await resumeWorkoutAPI(currentWorkout.id);
    
    if (result) {
        currentWorkout.status = 'started';
        currentWorkout.paused_at = null;
        
        localStorage.setItem('currentWorkout', JSON.stringify(currentWorkout));
        showToast('Séance reprise', 'success');
        updateTrainingInterface();
    } else {
        showToast('Erreur de connexion', 'error');
    }
}

// ===== FIN DE LA SÉANCE =====
export async function completeWorkout() {
    if (!currentWorkout) return;
    
    if (!confirm('Terminer la séance ?')) return;
    
    const success = await completeWorkoutAPI(currentWorkout.id);
    
    if (success) {
        showToast('Séance terminée !', 'success');
        cleanupWorkout();
        showView('dashboard');
        
        // Add delay to ensure server has processed the completion
        setTimeout(() => {
            if (window.loadDashboard) {
                window.loadDashboard(); // Rafraîchir les stats
            }
        }, 500);
    } else {
        showToast('Erreur, données sauvegardées localement', 'error');
        // TODO: implémenter une queue de sync pour plus tard
    }
}

// ===== ABANDON DE LA SÉANCE =====
export async function abandonWorkout() {
    if (!currentWorkout) return;
    
    if (!confirm('Abandonner la séance ? Les données seront perdues.')) return;
    
    await abandonWorkoutAPI(currentWorkout.id);
    
    showToast('Séance abandonnée', 'info');
    cleanupWorkout();
    showView('dashboard');
}

// ===== NETTOYAGE DES DONNÉES =====
export function cleanupWorkout() {
    setCurrentWorkout(null);
    localStorage.removeItem('currentWorkout');
    
    if (workoutCheckInterval) {
        clearInterval(workoutCheckInterval);
        setWorkoutCheckInterval(null);
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
    }
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        setRestTimerInterval(null);
    }
    
    localStorage.removeItem('lastCompletedSetId');
    localStorage.removeItem('pendingSets');
    localStorage.removeItem('interExerciseRests');
    
    setLastExerciseEndTime(null);
    setInterExerciseRestTime(0);
    
    if (audioContext) {
        audioContext.close();
        setAudioContext(null);
    }
    
    // Nettoyer l'historique de session
    clearSessionHistory();
    localStorage.removeItem('currentSessionHistory');

    // Nettoyer les données de séance guidée
    localStorage.removeItem('guidedWorkoutPlan');
    localStorage.removeItem('guidedWorkoutProgress');
    localStorage.removeItem('workoutType');
}

// ===== GESTION DES ACTIONS FATIGUE =====
export function reduceSetsRemaining() {
    // Réduire le nombre de séries restantes
    if (currentSetNumber > 0) {
        showToast('Programme adapté - Réduction des séries', 'info');
        dismissFatigueModal();
        finishExercise(); // Terminer l'exercice actuel
    }
}

export function switchToLighterExercise() {
    // Proposer un exercice plus léger
    dismissFatigueModal();
    
    // Terminer l'exercice actuel
    if (currentSetNumber > 1) {
        finishExercise();
    }
    
    showToast('Sélectionnez un exercice plus adapté', 'info');
}

export function dismissFatigueModal() {
    const modals = document.querySelectorAll('.fatigue-modal');
    modals.forEach(modal => modal.remove());
}

// ===== SYNCHRONISATION DES DONNÉES EN ATTENTE =====
export async function syncPendingSets() {
    const pendingSets = JSON.parse(localStorage.getItem('pendingSets') || '[]');
    if (pendingSets.length === 0) return;
    
    const successfullySynced = [];
    const failedSets = [];
    
    for (const set of pendingSets) {
        try {
            const result = await createSet(set);
            if (result) {
                successfullySynced.push(set);
            } else {
                failedSets.push(set);
            }
        } catch (error) {
            console.error('Erreur sync set:', error);
            failedSets.push(set);
        }
    }
    
    // Ne conserver que les sets qui ont échoué
    if (failedSets.length > 0) {
        localStorage.setItem('pendingSets', JSON.stringify(failedSets));
    } else {
        localStorage.removeItem('pendingSets');
    }
    
    if (successfullySynced.length > 0) {
        showToast(`${successfullySynced.length} série(s) synchronisée(s)`, 'success');
    }
}

export async function syncInterExerciseRests() {
    const pendingRests = JSON.parse(localStorage.getItem('pendingInterExerciseRests') || '[]');
    
    if (pendingRests.length === 0) return;
    
    for (const rest of pendingRests) {
        const synced = await createRestPeriod(rest);
        if (synced) {
            // Retirer de la liste des repos en attente
            const remaining = pendingRests.filter(r => r !== rest);
            localStorage.setItem('pendingInterExerciseRests', JSON.stringify(remaining));
        }
    }
}

// ===== MISE À JOUR DE L'INTERFACE DE TRAINING =====
export function updateTrainingInterface() {
    const container = document.getElementById('workoutInterface');
    if (!container || !currentWorkout) return;
    
    const isPaused = currentWorkout.status === 'paused';
    
    // Interface de base commune
    container.innerHTML = `
        <div class="workout-status">
            <h2>Séance ${getWorkoutTypeLabel()}</h2>
            <div class="status-badge status-${currentWorkout.status}">
                ${currentWorkout.status === 'started' ? '🟢 En cours' : '⏸️ En pause'}
            </div>
        </div>
        
        <div class="workout-controls">
            ${isPaused ? 
                `<button class="btn btn-primary" onclick="resumeWorkout()">
                    ▶️ Reprendre
                </button>` :
                `<button class="btn btn-secondary" onclick="pauseWorkout()">
                    ⏸️ Pause
                </button>`
            }
            
            <button class="btn btn-primary" onclick="completeWorkout()">
                ✅ Terminer
            </button>
            
            <button class="btn btn-secondary" onclick="abandonWorkout()">
                ❌ Abandonner
            </button>
        </div>
        
        <div class="sync-status">
            ${lastSyncTime ? 
                `Dernière sync: ${new Date(lastSyncTime).toLocaleTimeString()}` : 
                'En attente de synchronisation...'
            }
        </div>
        
        <div id="exerciseArea"></div>
        <div id="mainContent"></div>
    `;
    
    // LOGIQUE DE ROUTAGE SELON LE TYPE DE SÉANCE
    const guidedPlan = localStorage.getItem('guidedWorkoutPlan');
    const isAdaptiveType = currentWorkout.type === 'adaptive';
    
    if (isAdaptiveType && guidedPlan) {
        console.log('🎯 Mode adaptatif détecté');
        // Import direct et appel de la fonction
        import('./app-guided-workout.js').then(module => {
            module.startGuidedWorkout(JSON.parse(guidedPlan));
        }).catch(error => {
            console.error('Erreur chargement mode guidé:', error);
            showToast('Erreur chargement interface guidée', 'error');
            initializeFreeMode();
        });
    } else {
        initializeFreeMode();
    }
}

// ===== FONCTIONS HELPERS =====
function getWorkoutTypeLabel() {
    if (!currentWorkout) return 'Inconnue';
    
    switch(currentWorkout.type) {
        case 'adaptive': return 'Adaptative';
        case 'program': return 'Programme';
        case 'free': return 'Libre';
        default: return 'Libre';
    }
}

function initializeFreeMode() {
    // Charger l'interface de sélection d'exercices standard
    if (typeof window.showExerciseSelector === 'function') {
        window.showExerciseSelector();
    } else {
        // Import de secours si la fonction n'est pas disponible
        import('./app-exercises.js').then(module => {
            if (module.showExerciseSelector) {
                module.showExerciseSelector();
            } else {
                console.error('❌ Interface exercices non disponible');
                showToast('Erreur interface exercices', 'error');
            }
        }).catch(error => {
            console.error('❌ Erreur import module exercices:', error);
            showFallbackInterface();
        });
    }
}

function showFallbackInterface() {
    const exerciseArea = document.getElementById('exerciseArea');
    if (exerciseArea) {
        exerciseArea.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h3>⚠️ Erreur de chargement</h3>
                <p>L'interface n'a pas pu se charger correctement.</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    🔄 Recharger la page
                </button>
            </div>
        `;
    }
}

// ===== NAVIGATION VERS L'ENTRAINEMENT =====
export async function handleTrainingNavigation() {
    if (!currentUser) {
        showToast('Veuillez vous connecter', 'error');
        showProfileForm();
        return;
    }
    
    // Vérifier s'il y a une session active
    const activeWorkout = await checkActiveWorkout();
    if (activeWorkout) {
        setCurrentWorkout(activeWorkout);
        showView('training');
        updateTrainingInterface();
    } else {
        showView('training');
    }
}

// ===== EXPORTS GLOBAUX (window) =====
window.handleTrainingNavigation = handleTrainingNavigation;
window.startWorkout = startWorkout;
window.pauseWorkout = pauseWorkout;
window.resumeWorkout = resumeWorkout;
window.completeWorkout = completeWorkout;
window.abandonWorkout = abandonWorkout;
window.reduceSetsRemaining = reduceSetsRemaining;
window.switchToLighterExercise = switchToLighterExercise;
window.dismissFatigueModal = dismissFatigueModal;