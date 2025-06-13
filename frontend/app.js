// ===== APP.JS - FICHIER PRINCIPAL D'ORCHESTRATION =====

// Import des modules core
import { getState, setState } from './core/state.js';
import { DEV_CONFIG, STORAGE_KEYS } from './core/config.js';

// Import des modules fonctionnels
import { 
    loadUser, 
    saveUser, 
    logout, 
    checkActiveWorkout, 
    loadDevProfile 
} from './modules/auth.js';

import { 
    showProfileForm, 
    nextStep, 
    prevStep, 
    toggleGoal, 
    toggleEquipment,
    updateProfileSummary
} from './modules/onboarding.js';

import {
    updateBarbell,
    updateDisqueWeight,
    updateDumbbellWeight,
    updateKettlebellWeight,
    toggleBenchFeature,
    addElastique,
    removeElastique,
    addCustomDumbbell,
    addCustomDisque,
    addCustomKettlebell,
    addLest,
    generateDetailedEquipmentConfig
} from './modules/equipment.js';

import {
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    completeWorkout,
    abandonWorkout
} from './modules/workout.js';

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
} from './modules/exercises.js';

import {
    showView,
    showMainInterface,
    toggleSilentMode,
    showExerciseDetail
} from './modules/ui.js';

import {
    showToast,
    skipRestPeriod,
    completeSetAndFinish,
    finishExerciseDuringRest
} from './modules/utils.js';

// Exposition globale des fonctions pour les événements HTML
window.nextStep = nextStep;
window.prevStep = prevStep;
window.toggleGoal = toggleGoal;
window.toggleEquipment = toggleEquipment;
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
window.addLest = addLest;
window.saveUser = saveUser;
window.startWorkout = startWorkout;
window.pauseWorkout = pauseWorkout;
window.resumeWorkout = resumeWorkout;
window.completeWorkout = completeWorkout;
window.abandonWorkout = abandonWorkout;
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
window.showView = showView;
window.toggleSilentMode = toggleSilentMode;
window.showExerciseDetail = showExerciseDetail;
window.logout = logout;
window.showToast = showToast;
window.skipRestPeriod = skipRestPeriod;
window.completeSetAndFinish = completeSetAndFinish;
window.finishExerciseDuringRest = finishExerciseDuringRest;
window.loadDevProfile = loadDevProfile;
window.generateDetailedEquipmentConfig = generateDetailedEquipmentConfig;
window.updateProfileSummary = updateProfileSummary;

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initialisation de l\'application...');
    
    // Charger les exercices en premier
    await loadExercises();
    
    // Vérifier si un utilisateur est déjà connecté
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
    setupPWA();
    
    console.log('Application initialisée avec succès');
});

// Vérification du mode développement
async function checkDevMode() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        try {
            const response = await fetch('/api/dev/check');
            if (response.ok) {
                setState('isDevMode', true);
                setupDevShortcuts();
                console.log('Mode développement activé');
            }
        } catch {
            console.log('API non disponible en local');
        }
    }
}

// Configuration des raccourcis développement
function setupDevShortcuts() {
    if (!DEV_CONFIG.SHORTCUTS_ENABLED) return;
    
    // Créer un bouton de chargement du profil dev
    const devButton = document.createElement('button');
    devButton.textContent = 'Dev Profile';
    devButton.className = 'dev-button';
    devButton.onclick = loadDevProfile;
    devButton.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        padding: 10px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 9999;
    `;
    document.body.appendChild(devButton);
    
    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey) {
            switch(e.key) {
                case 'D':
                    loadDevProfile();
                    break;
                case 'L':
                    logout();
                    break;
                case 'W':
                    startWorkout('free_time');
                    break;
            }
        }
    });
}

// Configuration PWA
function setupPWA() {
    // Enregistrement du service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('SW enregistré:', registration.scope);
                
                // Écouter les changements d'état
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            console.log('SW installé avec succès');
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Erreur SW détaillée:', error);
                console.error('Message:', error.message);
                console.error('Stack:', error.stack);
            });
    }
    
    // Gestion de l'installation PWA
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Afficher le bouton d'installation après un délai
        setTimeout(() => {
            showInstallButton(deferredPrompt);
        }, 30000);
    });
}

// Affichage du bouton d'installation PWA
function showInstallButton(deferredPrompt) {
    const installButton = document.createElement('button');
    installButton.className = 'install-button';
    installButton.innerHTML = `
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
        </svg>
        Installer l'app
    `;
    
    installButton.onclick = async () => {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Installation ${outcome === 'accepted' ? 'acceptée' : 'refusée'}`);
        if (outcome === 'accepted') {
            installButton.remove();
        }
    };
    
    document.body.appendChild(installButton);
}

// Gestion des paramètres URL pour les raccourcis PWA
function handlePWAShortcuts() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'new-workout') {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const currentUser = getState('currentUser');
                if (currentUser) {
                    startWorkout('free_time');
                }
            }, 1000);
        });
    } else if (action === 'program') {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const currentUser = getState('currentUser');
                if (currentUser) {
                    showView('program');
                }
            }, 1000);
        });
    }
}

// Appeler la gestion des raccourcis PWA
handlePWAShortcuts();

// Export des modules pour débogage en développement
if (DEV_CONFIG.SHORTCUTS_ENABLED && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.AppModules = {
        state: { getState, setState },
        auth: { loadUser, saveUser, logout, checkActiveWorkout, loadDevProfile },
        onboarding: { showProfileForm, nextStep, prevStep, toggleGoal, toggleEquipment, updateProfileSummary },
        equipment: { updateBarbell, updateDisqueWeight, updateDumbbellWeight, generateDetailedEquipmentConfig },
        workout: { startWorkout, pauseWorkout, resumeWorkout, completeWorkout, abandonWorkout },
        exercises: { loadExercises, showExerciseSelector, selectExercise, completeSet },
        ui: { showView, showMainInterface, toggleSilentMode },
        utils: { showToast, skipRestPeriod }
    };
    
    console.log('Modules exposés dans window.AppModules pour le débogage');
}