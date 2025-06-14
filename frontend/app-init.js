// ===== INITIALISATION DE L'APPLICATION =====
// Ce fichier est le point d'entrée principal qui charge tous les modules
// et initialise l'application dans le bon ordre

// Import des modules dans l'ordre de dépendance
import './app-state.js';        // État global (aucune dépendance)
import './app-config.js';       // Configuration (aucune dépendance)
import './app-ui.js';           // Utilitaires UI (dépend de config et state)
import './app-api.js';          // API (dépend de state et ui)
import './app-navigation.js';   // Navigation (dépend de state)
import './app-equipment.js';    // Équipement (dépend de state et config)
import './app-history.js';      // Historique (dépend de state, config et api)
import './app-rest.js';         // Repos (dépend de state et api)
import './app-dashboard.js';    // Dashboard (dépend de state, api et history)
import './app-workout.js';      // Workout (dépend de state, navigation, ui et api)
import './app-exercises.js';    // Exercices (dépend de state et equipment)
import './app-sets.js';         // Sets (dépend de state, ui, equipment et api)
import './app-onboarding.js';   // Onboarding (dépend de tous les modules précédents)
import './app-dev.js';          // Dev mode (peut dépendre de tous les modules)

// Import des fonctions nécessaires à l'initialisation
import { loadExercises, loadUserFromAPI } from './app-api.js';
import { 
    setCurrentUser, 
    setIsSilentMode,
    currentUser
} from './app-state.js';
import { showView, showMainInterface, updateProgressBar } from './app-navigation.js';
import { checkActiveWorkout } from './app-workout.js';
import { showToast } from './app-ui.js';

// ===== FONCTION D'INITIALISATION PRINCIPALE =====
async function initializeApp() {
    console.log('🚀 Initialisation de l\'application MuscleUp...');
    
    try {
        // 1. Configurer la date max pour la date de naissance (18 ans minimum)
        setupBirthDateInput();
        
        // 2. Charger la préférence du mode silencieux
        loadSilentModePreference();
        
        // 3. Charger les exercices depuis l'API
        console.log('📋 Chargement des exercices...');
        await loadExercises();
        
        // 4. Vérifier si un utilisateur existe
        const userId = localStorage.getItem('userId');
        if (userId) {
            console.log('👤 Chargement du profil utilisateur...');
            await loadUser(userId);
        } else {
            console.log('🆕 Nouvel utilisateur - Affichage de l\'onboarding');
            // Afficher la barre de progression pour l'onboarding
            document.getElementById('progressContainer').style.display = 'block';
            updateProgressBar();
            showView('onboarding');
        }
        
        // 5. Enregistrer le Service Worker pour PWA
        registerServiceWorker();
        
        console.log('✅ Application initialisée avec succès');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showToast('Erreur lors de l\'initialisation de l\'application', 'error');
    }
}

// ===== CONFIGURATION DE L'INPUT DATE DE NAISSANCE =====
function setupBirthDateInput() {
    const birthDateInput = document.getElementById('userBirthDate');
    if (birthDateInput) {
        const today = new Date();
        const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        birthDateInput.max = maxDate.toISOString().split('T')[0];
    }
}

// ===== CHARGEMENT DES PRÉFÉRENCES =====
function loadSilentModePreference() {
    const isSilentMode = localStorage.getItem('silentMode') === 'true';
    setIsSilentMode(isSilentMode);
}

// ===== CHARGEMENT DE L'UTILISATEUR =====
async function loadUser(userId) {
    try {
        const user = await loadUserFromAPI(userId);
        
        if (user) {
            setCurrentUser(user);
            
            // Sauvegarder le profil complet en localStorage
            localStorage.setItem('userProfile', JSON.stringify(user));
            
            // Vérifier s'il y a une session active
            const activeWorkout = await checkActiveWorkout();
            if (activeWorkout) {
                showToast('Session en cours récupérée', 'info');
                showView('training');
                if (window.updateTrainingInterface) {
                    window.updateTrainingInterface();
                }
            } else {
                showMainInterface();
            }
        } else {
            // Essayer de charger depuis le cache local
            loadFromCache();
        }
    } catch (error) {
        console.error('Erreur chargement utilisateur:', error);
        // Essayer le cache local en cas d'erreur réseau
        loadFromCache();
    }
}

// ===== CHARGEMENT DEPUIS LE CACHE =====
function loadFromCache() {
    const cachedProfile = localStorage.getItem('userProfile');
    if (cachedProfile) {
        const user = JSON.parse(cachedProfile);
        setCurrentUser(user);
        showToast('Profil chargé depuis le cache', 'info');
        showMainInterface();
    } else {
        localStorage.removeItem('userId');
        showView('onboarding');
    }
}

// ===== ENREGISTREMENT DU SERVICE WORKER =====
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker enregistré:', registration);
            })
            .catch(error => {
                console.error('Erreur Service Worker:', error);
            });
    }
}

// ===== GESTION DES ERREURS GLOBALES =====
window.addEventListener('error', (event) => {
    console.error('Erreur globale:', event.error);
    // En production, on pourrait envoyer ces erreurs à un service de monitoring
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejetée non gérée:', event.reason);
    // En production, on pourrait envoyer ces erreurs à un service de monitoring
});

// ===== DÉTECTION DE LA CONNEXION =====
window.addEventListener('online', () => {
    showToast('Connexion rétablie', 'success');
    // Synchroniser les données en attente
    if (window.syncPendingSets) {
        window.syncPendingSets();
    }
    if (window.syncInterExerciseRests) {
        window.syncInterExerciseRests();
    }
});

window.addEventListener('offline', () => {
    showToast('Mode hors-ligne - Les données seront synchronisées plus tard', 'warning');
});

// ===== PRÉVENTION DE LA PERTE DE DONNÉES =====
window.addEventListener('beforeunload', (event) => {
    // Vérifier s'il y a une séance en cours
    if (currentUser && window.currentWorkout && window.currentWorkout.status === 'started') {
        event.preventDefault();
        event.returnValue = 'Une séance est en cours. Voulez-vous vraiment quitter ?';
    }
});

// ===== LANCEMENT DE L'APPLICATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM chargé - Initialisation de l\'application');
    initializeApp();
});

// Export de la fonction d'initialisation si nécessaire
export { initializeApp };