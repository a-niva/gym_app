// ===== NAVIGATION ET VUES =====
// Ce fichier gère toute la navigation entre les vues et les étapes de l'onboarding

import { 
    currentStep, 
    totalSteps,
    setCurrentStep,
    getCurrentStep,
    currentUser,
    timerInterval,
    restTimerInterval,
    setTimerInterval,
    setRestTimerInterval
} from './app-state.js';
import { loadProfileInfo } from './app-profile.js';

// ===== NAVIGATION & VUES =====
function showView(viewName) {
    // Clean up any running timers when leaving training view
    if (viewName !== 'training') {
        if (timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
        }
        if (restTimerInterval) {
            clearInterval(restTimerInterval);
            setRestTimerInterval(null);
        }
    }
    
    // Masquer toutes les vues et l'onboarding
    document.querySelectorAll('.view, .onboarding').forEach(view => {
        view.classList.remove('active');
        view.style.display = '';
    });
    
    // Afficher la vue demandée
    const view = document.getElementById(viewName) || document.querySelector(`.${viewName}`);
    if (view) {
        view.classList.add('active');
        
        if (viewName === 'onboarding') {
            showStep(currentStep);
        }
    }
    
    // Si on va vers training, vérifier s'il y a une session active
    if (viewName === 'training' && window.currentWorkout && window.updateTrainingInterface) {
        setTimeout(() => {
            window.updateTrainingInterface();
        }, 100);
    }
    
    // Charger les graphiques stats quand on arrive sur la vue
    if (viewName === 'stats' && window.initializeStatsPage) {
        setTimeout(() => {
            window.initializeStatsPage();
        }, 100);
    }

    // Ajouter après l'affichage de la vue
    if (viewName === 'profile' && currentUser) {
        // Charger les informations du profil
        loadProfileInfo();
    }
}

function showStep(step) {
    document.querySelectorAll('.onboarding-step').forEach(s => {
        s.classList.remove('active');
    });
    document.getElementById(`step${step}`).classList.add('active');
}

// Navigation dans l'onboarding - version simple sans validation
function nextStepSimple() {
    if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
        showStep(currentStep);
        updateProgressBar();
    }
}

// Navigation avec validation (sera remplacée par app-onboarding.js)
function nextStep() {
    nextStepSimple();
}

function prevStep() {
    if (currentStep > 1) {
        setCurrentStep(currentStep - 1);
        showStep(currentStep);
        updateProgressBar();
    }
}

function updateProgressBar() {
    const progress = (currentStep - 1) / (totalSteps - 1) * 100;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

// Affichage de l'interface principale après connexion
function showMainInterface() {
    if (!currentUser) {
        console.error('Aucun utilisateur chargé');
        showProfileForm();
        return;
    }
    
    document.getElementById('onboarding').classList.remove('active');
    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('bottomNav').style.display = 'flex';
    
    if (currentUser) {
        document.getElementById('userInitial').textContent = currentUser.name[0].toUpperCase();
        document.getElementById('userInitial').style.display = 'flex';
    }
    
    showView('dashboard');
    // loadDashboard sera appelé depuis app-dashboard.js
    if (window.loadDashboard) {
        window.loadDashboard();
    }
}

function showProfileForm() {
    // Réinitialiser l'état est géré dans app-onboarding.js
    // Ici on gère juste l'affichage
    
    // Masquer l'interface principale
    document.getElementById('bottomNav').style.display = 'none';
    document.getElementById('userInitial').style.display = 'none';
    
    // Afficher l'onboarding avec la barre de progression
    document.getElementById('onboarding').classList.add('active');
    document.getElementById('progressContainer').style.display = 'block';
    
    // Réinitialiser les vues
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Afficher la première étape
    setCurrentStep(1);
    showStep(1);
    updateProgressBar();
}

// Export des fonctions pour utilisation globale dans le HTML
window.showView = showView;
window.showStep = showStep;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.showMainInterface = showMainInterface;
window.showProfileForm = showProfileForm;
window.updateProgressBar = updateProgressBar;

// Export pour les autres modules
export { 
    showView, 
    showStep, 
    nextStep,
    nextStepSimple,
    prevStep, 
    updateProgressBar,
    showMainInterface,
    showProfileForm
};