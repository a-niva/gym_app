// ===== MODULE NAVIGATION =====
// Ce fichier gère la navigation entre les vues et les étapes
import { currentUser, setCurrentStep, getCurrentStep } from './app-state.js';

// ===== GESTION DES VUES =====
function showView(viewId) {
    // Récupérer la vue active actuelle
    const previousView = document.querySelector('.view.active')?.id;
    
    // Masquer toutes les vues
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Afficher la vue demandée
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    // Mettre à jour la navigation active
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Déterminer quel élément de navigation activer
    const navMapping = {
        'dashboard': 0,
        'exercises': 1,
        'stats': 2,
        'training': 3,
        'profile': 4
    };
    
    const navIndex = navMapping[viewId];
    if (navIndex !== undefined) {
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems[navIndex]) {
            navItems[navIndex].classList.add('active');
        }
    }
    
    // Nettoyer les graphiques quand on quitte la vue stats
    if (previousView === 'stats' && viewId !== 'stats' && window.cleanupCharts) {
        window.cleanupCharts();
    }
}

// ===== GESTION DES ÉTAPES D'ONBOARDING =====
function showStep(stepNumber) {
    // Masquer toutes les étapes
    document.querySelectorAll('.onboarding-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Afficher l'étape demandée
    const targetStep = document.getElementById(`step${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
    }
    
    // Mettre à jour l'état
    setCurrentStep(stepNumber);
    
    // Mettre à jour la barre de progression
    updateProgressBar();
}

// ===== NAVIGATION ENTRE LES ÉTAPES =====
function nextStep() {
    const currentStep = getCurrentStep();
    
    if (currentStep === 1 && !validateStep1()) {
        return;
    }
    
    if (currentStep === 2 && !validateStep2()) {
        return;
    }
    
    if (currentStep === 4 && !validateStep4()) {
        return;
    }
    
    showStep(currentStep + 1);
}

function nextStepSimple() {
    const currentStep = getCurrentStep();
    showStep(currentStep + 1);
}

function prevStep() {
    const currentStep = getCurrentStep();
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
}

// ===== VALIDATION DES ÉTAPES =====
function validateStep1() {
    const name = document.getElementById('userName').value.trim();
    const birthDate = document.getElementById('userBirthDate').value;
    
    if (!name || !birthDate) {
        if (window.showToast) {
            window.showToast('Veuillez remplir tous les champs', 'error');
        }
        return false;
    }
    
    const birthYear = new Date(birthDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    
    if (age < 16 || age > 100) {
        if (window.showToast) {
            window.showToast('L\'âge doit être entre 16 et 100 ans', 'error');
        }
        return false;
    }
    
    return true;
}

function validateStep2() {
    const height = document.getElementById('userHeight').value;
    const weight = document.getElementById('userWeight').value;
    
    if (!height || !weight) {
        if (window.showToast) {
            window.showToast('Veuillez remplir tous les champs', 'error');
        }
        return false;
    }
    
    if (height < 120 || height > 250) {
        if (window.showToast) {
            window.showToast('La taille doit être entre 120 et 250 cm', 'error');
        }
        return false;
    }
    
    if (weight < 30 || weight > 300) {
        if (window.showToast) {
            window.showToast('Le poids doit être entre 30 et 300 kg', 'error');
        }
        return false;
    }
    
    return true;
}

function validateStep4() {
    const selectedGoals = document.querySelectorAll('.chip.selected');
    if (selectedGoals.length === 0) {
        if (window.showToast) {
            window.showToast('Veuillez sélectionner au moins un objectif', 'error');
        }
        return false;
    }
    return true;
}

// ===== MISE À JOUR DE LA BARRE DE PROGRESSION =====
function updateProgressBar() {
    const totalSteps = 7;
    const currentStep = getCurrentStep();
    const progress = (currentStep / totalSteps) * 100;
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

// ===== AFFICHAGE DE L'INTERFACE PRINCIPALE =====
function showMainInterface() {
    // Masquer l'onboarding
    document.getElementById('onboarding').classList.remove('active');
    document.getElementById('progressContainer').style.display = 'none';
    
    // Afficher la navigation et l'interface principale
    document.getElementById('bottomNav').style.display = 'flex';
    
    // Afficher l'avatar utilisateur
    if (currentUser && currentUser.name) {
        const userInitial = document.getElementById('userInitial');
        userInitial.textContent = currentUser.name.charAt(0).toUpperCase();
        userInitial.style.display = 'flex';
    } else {
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