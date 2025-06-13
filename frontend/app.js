// ===== APP.JS - FICHIER PRINCIPAL D'ORCHESTRATION =====

// Import des modules core
import { getState, setState } from './modules/core/state.js';
import { DEV_CONFIG, STORAGE_KEYS } from './modules/core/config.js';

// Import des modules fonctionnels
import { 
    loadUser, 
    saveUser, 
    logout, 
    checkActiveWorkout, 
    loadDevProfile 
} from './modules/modules/auth.js';

import { 
    showProfileForm, 
    nextStep, 
    prevStep, 
    toggleGoal, 
    toggleEquipment,
    showStep,
    updateProgressBar
} from './modules/modules/onboarding.js';

import {
    updateBarbell,
    updateDisqueWeight,
    updateDumbbellWeight,
    updateKettlebellWeight,
    toggleBenchFeature,
    addElastique,
    removeElastique,
    updateElastiquesList,
    addCustomDumbbell,
    addCustomDisque,
    addCustomKettlebell,
    getColorHex,
    addLest,
    showConfigPanel
} from './modules/modules/equipment.js';

import {
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    completeWorkout,
    abandonWorkout,
    updateTrainingInterface,
    loadWorkoutHistory
} from './modules/modules/workout.js';

import {
    loadExercises,
    showExerciseSelector,
    selectExercise,
    filterExerciseList,
    adjustWeightToNext,
    adjustReps,
    validateWeight,
    selectFatigue,
    selectEffort,
    completeSet,
    skipSet,
    finishExercise
} from './modules/modules/exercises.js';

import {
    showView,
    showMainInterface,
    toggleSilentMode,
    showExerciseDetail
} from './modules/modules/ui.js';

import {
    showToast,
    skipRestPeriod,
    completeSetAndFinish,
    finishExerciseDuringRest,
    addRestToHistory
} from './modules/modules/utils.js';

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', async () => {
    await loadExercises();
    
    const userId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    const userProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    
    if (userId && userProfile) {
        try {
            const user = JSON.parse(userProfile);
            setState('currentUser', user);
            await loadUser(userId);
        } catch (error) {
            console.error('Erreur chargement profil:', error);
            showProfileForm();
        }
    } else {
        showProfileForm();
    }
    
    checkDevMode();
    console.log('Application initialisée');
});

// Vérification du mode développement
async function checkDevMode() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        try {
            const response = await fetch('/api/dev/check');
            if (response.ok) {
                setState('isDevMode', true);
                setupDevShortcuts();
            }
        } catch (error) {
            setState('isDevMode', false);
        }
    }
}

// Configuration des raccourcis développement
function setupDevShortcuts() {
    const devBadge = document.createElement('div');
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
    `;
    devBadge.textContent = 'DEV MODE';
    document.body.appendChild(devBadge);
    
    document.addEventListener('keydown', async (e) => {
        // Alt+Shift+D : Charger le profil dev
        if (e.altKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            await loadDevProfile();
        }
        
        // Alt+Shift+H : Afficher l'historique dans la console
        if (e.altKey && e.shiftKey && e.key === 'H') {
            e.preventDefault();
            console.log('State:', getState());
        }
        
        // Alt+Shift+R : Reset le workout en cours
        if (e.altKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            const currentWorkout = getState('currentWorkout');
            if (currentWorkout && confirm('Réinitialiser le workout en cours ?')) {
                await abandonWorkout();
                showMainInterface();
            }
        }
    });
}

// Exposition des fonctions pour les événements HTML onclick
window.nextStep = nextStep;
window.prevStep = prevStep;
window.toggleGoal = toggleGoal;
window.toggleEquipment = toggleEquipment;
window.showView = showView;
window.saveUser = saveUser;
window.startWorkout = startWorkout;
window.logout = logout;

// Fonctions de configuration d'équipement
window.updateBarbell = updateBarbell;
window.updateDisqueWeight = updateDisqueWeight;
window.updateDumbbellWeight = updateDumbbellWeight;
window.updateKettlebellWeight = updateKettlebellWeight;
window.toggleBenchFeature = toggleBenchFeature;
window.addElastique = addElastique;
window.removeElastique = removeElastique;
window.addCustomDumbbell = addCustomDumbbell;
window.addCustomDisque = addCustomDisque;
window.addCustomKettlebell = addCustomKettlebell;
window.updateElastiquesList = updateElastiquesList;
window.getColorHex = getColorHex;
window.addLest = addLest;
window.showConfigPanel = showConfigPanel;

// Fonctions de tracking d'exercices
window.showExerciseSelector = showExerciseSelector;
window.selectExercise = selectExercise;
window.filterExerciseList = filterExerciseList;
window.adjustWeightToNext = adjustWeightToNext;
window.adjustReps = adjustReps;
window.validateWeight = validateWeight;
window.selectFatigue = selectFatigue;
window.selectEffort = selectEffort;
window.completeSet = completeSet;
window.skipSet = skipSet;
window.finishExercise = finishExercise;

// Fonctions de gestion des séances
window.pauseWorkout = pauseWorkout;
window.resumeWorkout = resumeWorkout;
window.completeWorkout = completeWorkout;
window.abandonWorkout = abandonWorkout;

// Fonctions utilitaires
window.toggleSilentMode = toggleSilentMode;
window.completeSetAndFinish = completeSetAndFinish;
window.finishExerciseDuringRest = finishExerciseDuringRest;
window.skipRestPeriod = skipRestPeriod;
window.addRestToHistory = addRestToHistory;
window.showExerciseDetail = showExerciseDetail;

// Service Worker pour PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('Service Worker enregistré'))
        .catch(error => console.error('Erreur Service Worker:', error));
}

// Gestion du raccourci de lancement PWA
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    const deferredPrompt = e;
    
    // Créer un bouton d'installation si nécessaire
    const installButton = document.createElement('button');
    installButton.textContent = 'Installer l\'app';
    installButton.className = 'btn btn-primary install-button';
    installButton.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 1000;
        display: none;
    `;
    
    installButton.addEventListener('click', async () => {
        installButton.style.display = 'none';
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Installation ${outcome === 'accepted' ? 'acceptée' : 'refusée'}`);
    });
    
    document.body.appendChild(installButton);
    
    // Afficher le bouton après 30 secondes
    setTimeout(() => {
        installButton.style.display = 'block';
    }, 30000);
});

// Gestion des paramètres URL pour les raccourcis PWA
const urlParams = new URLSearchParams(window.location.search);
const action = urlParams.get('action');

if (action === 'new-workout') {
    // Attendre que l'app soit chargée puis démarrer une séance
    window.addEventListener('load', () => {
        setTimeout(() => {
            const currentUser = getState('currentUser');
            if (currentUser) {
                startWorkout('free_time');
            }
        }, 1000);
    });
} else if (action === 'program') {
    // Attendre que l'app soit chargée puis afficher le programme
    window.addEventListener('load', () => {
        setTimeout(() => {
            const currentUser = getState('currentUser');
            if (currentUser) {
                showView('program');
            }
        }, 1000);
    });
}

// Export des modules pour débogage en développement
if (DEV_CONFIG.SHORTCUTS_ENABLED && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.AppModules = {
        state: { getState, setState },
        auth: { loadUser, saveUser, logout, checkActiveWorkout, loadDevProfile },
        onboarding: { showProfileForm, nextStep, prevStep, toggleGoal, toggleEquipment },
        equipment: { updateBarbell, updateDisqueWeight, updateDumbbellWeight },
        workout: { startWorkout, pauseWorkout, resumeWorkout, completeWorkout, abandonWorkout },
        exercises: { loadExercises, showExerciseSelector, selectExercise, completeSet },
        ui: { showView, showMainInterface, toggleSilentMode },
        utils: { showToast, skipRestPeriod }
    };
    
    console.log('Modules exposés dans window.AppModules pour le débogage');
}