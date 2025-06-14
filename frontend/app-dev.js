// ===== MODULE DÉVELOPPEMENT =====
// Ce fichier gère le mode développement et les outils de debug
// Il fournit des raccourcis et des fonctions utiles pour le développement

import {
    setCurrentUser,
    setIsDevMode,
    currentUser,
    currentWorkout,
    sessionHistory,
    isDevMode
} from './app-state.js';

import { showMainInterface } from './app-navigation.js';
import { showToast } from './app-ui.js';
import { checkDevMode as checkDevAPI, initDevMode, loadUserFromAPI } from './app-api.js';

// ===== VÉRIFICATION DU MODE DÉVELOPPEMENT =====
async function checkDevMode() {
    const devMode = await checkDevAPI();
    setIsDevMode(devMode);
    
    if (devMode) {
        console.log('Mode développement activé');
        setupDevShortcuts();
    }
}

// ===== CONFIGURATION DES RACCOURCIS DÉVELOPPEMENT =====
function setupDevShortcuts() {
    // Afficher un indicateur visuel du mode dev
    const devBadge = document.createElement('div');
    devBadge.id = 'devModeBadge';
    devBadge.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #f59e0b;
        color: white;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 9999;
        cursor: pointer;
    `;
    devBadge.textContent = 'DEV MODE';
    devBadge.onclick = showDevMenu;
    document.body.appendChild(devBadge);
    
    // Raccourcis clavier
    document.addEventListener('keydown', async (e) => {
        // Ctrl+D : Charger le profil dev
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            await loadDevProfile();
        }
        
        // Ctrl+H : Afficher l'historique dans la console
        if (e.ctrlKey && e.key === 'h') {
            e.preventDefault();
            logState();
        }
        
        // Ctrl+R : Reset le workout en cours (sans recharger la page)
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            if (confirm('Réinitialiser le workout en cours ?')) {
                resetCurrentWorkout();
            }
        }
        
        // Ctrl+L : Logger localStorage
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            logLocalStorage();
        }
        
        // Ctrl+S : Simuler une série
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            simulateSet();
        }
    });
}

// ===== MENU DÉVELOPPEMENT =====
function showDevMenu() {
    const menu = document.createElement('div');
    menu.style.cssText = `
        position: fixed;
        top: 50px;
        right: 10px;
        background: white;
        border: 2px solid #f59e0b;
        border-radius: 8px;
        padding: 15px;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        min-width: 200px;
    `;
    
    menu.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #f59e0b;">Outils Dev</h3>
        <button onclick="loadDevProfile()" style="display: block; margin: 5px 0; width: 100%;">
            Charger profil dev
        </button>
        <button onclick="logState()" style="display: block; margin: 5px 0; width: 100%;">
            Log état complet
        </button>
        <button onclick="logLocalStorage()" style="display: block; margin: 5px 0; width: 100%;">
            Log localStorage
        </button>
        <button onclick="clearLocalStorage()" style="display: block; margin: 5px 0; width: 100%;">
            Clear localStorage
        </button>
        <button onclick="simulateSet()" style="display: block; margin: 5px 0; width: 100%;">
            Simuler une série
        </button>
        <button onclick="this.parentElement.remove()" style="display: block; margin: 5px 0; width: 100%;">
            Fermer
        </button>
    `;
    
    document.body.appendChild(menu);
    
    // Fermer le menu en cliquant ailleurs
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && e.target.id !== 'devModeBadge') {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

// ===== CHARGEMENT DU PROFIL DÉVELOPPEMENT =====
async function loadDevProfile() {
    try {
        // Initialiser le profil dev côté serveur
        const devData = await initDevMode();
        
        if (!devData) {
            throw new Error('Impossible d\'initialiser le mode dev');
        }
        
        // Charger l'utilisateur dev
        const user = await loadUserFromAPI(devData.user_id);
        
        if (!user) {
            throw new Error('Impossible de charger le profil dev');
        }
        
        setCurrentUser(user);
        localStorage.setItem('userProfile', JSON.stringify(user));
        localStorage.setItem('userId', user.id);
        
        showMainInterface();
        showToast(`Profil dev chargé (${devData.workouts_count} workouts historiques)`, 'success');
        
    } catch (error) {
        console.error('Erreur chargement profil dev:', error);
        showToast('Erreur lors du chargement du profil dev', 'error');
    }
}

// ===== LOGGING DE L'ÉTAT =====
function logState() {
    console.group('🔧 État de l\'application');
    console.log('Current User:', currentUser);
    console.log('Current Workout:', currentWorkout);
    console.log('Session History:', sessionHistory);
    console.log('Workout History (localStorage):', localStorage.getItem('currentWorkoutHistory'));
    console.log('Pending Sets:', localStorage.getItem('pendingSets'));
    console.log('Dev Mode:', isDevMode);
    console.groupEnd();
}

// ===== LOGGING DU LOCALSTORAGE =====
function logLocalStorage() {
    console.group('💾 LocalStorage');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        console.log(`${key}:`, value);
    }
    console.groupEnd();
}

// ===== NETTOYAGE DU LOCALSTORAGE =====
function clearLocalStorage() {
    if (confirm('Effacer tout le localStorage ?')) {
        localStorage.clear();
        showToast('LocalStorage effacé', 'success');
        console.log('LocalStorage cleared');
    }
}

// ===== RESET DU WORKOUT EN COURS =====
function resetCurrentWorkout() {
    if (currentWorkout && window.abandonWorkout) {
        window.abandonWorkout();
    }
    showMainInterface();
    showToast('Workout réinitialisé', 'info');
}

// ===== SIMULATION D'UNE SÉRIE =====
function simulateSet() {
    if (!currentWorkout) {
        showToast('Aucune séance active', 'error');
        return;
    }
    
    if (!window.currentExercise) {
        showToast('Sélectionnez d\'abord un exercice', 'error');
        return;
    }
    
    // Remplir automatiquement les champs
    const weightInput = document.getElementById('setWeight');
    const repsInput = document.getElementById('setReps');
    
    if (weightInput && repsInput) {
        weightInput.value = 60; // Poids par défaut
        repsInput.value = 10; // Reps par défaut
        
        // Sélectionner fatigue et effort moyens
        if (window.selectFatigue) window.selectFatigue(3);
        if (window.selectEffort) window.selectEffort(3);
        
        showToast('Série pré-remplie - Cliquez sur Valider', 'info');
    } else {
        showToast('Interface de série non trouvée', 'error');
    }
}

// ===== EXPORT GLOBAL POUR LE MENU DEV =====
window.loadDevProfile = loadDevProfile;
window.logState = logState;
window.logLocalStorage = logLocalStorage;
window.clearLocalStorage = clearLocalStorage;
window.simulateSet = simulateSet;
window.showDevMenu = showDevMenu;

// ===== AUTO-INITIALISATION =====
// Vérifier automatiquement le mode dev au chargement
checkDevMode();

// Export pour les autres modules
export {
    checkDevMode,
    setupDevShortcuts,
    loadDevProfile,
    logState
};