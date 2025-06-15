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
    const userId = localStorage.getItem('userId');
    
    // Si pas d'utilisateur connecté, afficher l'écran d'accueil
    if (!userId) {
        showWelcomeScreen();
        return;
    }
    
    // Si utilisateur connecté, charger son profil
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (response.ok) {
            const userData = await response.json();
            currentUser = userData;
            showMainInterface();
        } else {
            // Utilisateur introuvable, retour à l'accueil
            localStorage.removeItem('userId');
            showWelcomeScreen();
        }
    } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        showWelcomeScreen();
    }
}

async function showWelcomeScreen() {
    // Masquer tout sauf l'écran d'accueil
    document.getElementById('onboarding').classList.remove('active');
    document.getElementById('bottomNav').style.display = 'none';
    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('userInitial').style.display = 'none';
    
    // Afficher l'écran d'accueil
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById('welcome').classList.add('active');
    
    // Charger la liste des profils
    await loadProfiles();
}

async function loadProfiles() {
    try {
        const response = await fetch('/api/users/');
        const profiles = await response.json();
        
        const container = document.getElementById('profilesList');
        if (profiles.length === 0) {
            container.innerHTML = '<p style="color: var(--gray);">Aucun profil existant</p>';
            return;
        }
        
        container.innerHTML = profiles.map(profile => `
            <div class="profile-card" onclick="loadProfile(${profile.id})">
                <div class="profile-info">
                    <h4>${profile.name}</h4>
                    <p>Créé le ${new Date(profile.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erreur lors du chargement des profils:', error);
    }
}

async function loadProfile(userId) {
    localStorage.setItem('userId', userId);
    window.location.reload(); // Recharger pour initialiser avec le bon profil
}

function startNewProfile() {
    document.getElementById('welcome').classList.remove('active');
    showProfileForm();
}

// Export des nouvelles fonctions
window.showWelcomeScreen = showWelcomeScreen;
window.loadProfile = loadProfile;
window.startNewProfile = startNewProfile;

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
let isOnline = navigator.onLine;
let syncRetryTimeout = null;

window.addEventListener('online', () => {
    isOnline = true;
    showToast('Connexion rétablie', 'success');
    
    // Synchroniser les données en attente avec un délai
    if (syncRetryTimeout) clearTimeout(syncRetryTimeout);
    syncRetryTimeout = setTimeout(() => {
        if (window.syncPendingSets) {
            window.syncPendingSets();
        }
        if (window.syncInterExerciseRests) {
            window.syncInterExerciseRests();
        }
    }, 2000); // Attendre 2 secondes que la connexion se stabilise
});

window.addEventListener('offline', () => {
    isOnline = false;
    showToast('Mode hors-ligne - Les données seront synchronisées plus tard', 'warning');
});

// Vérification périodique de la connexion
setInterval(() => {
    const wasOnline = isOnline;
    isOnline = navigator.onLine;
    
    if (!wasOnline && isOnline) {
        // Connexion rétablie
        window.dispatchEvent(new Event('online'));
    } else if (wasOnline && !isOnline) {
        // Connexion perdue
        window.dispatchEvent(new Event('offline'));
    }
}, 5000); // Vérifier toutes les 5 secondes

// ===== PRÉVENTION DE LA PERTE DE DONNÉES =====
window.addEventListener('beforeunload', (event) => {
    // Vérifier s'il y a une séance en cours
    if (currentUser && currentUser.id && window.currentWorkout && window.currentWorkout.status === 'started') {
        event.preventDefault();
        event.returnValue = 'Une séance est en cours. Voulez-vous vraiment quitter ?';
    }
    
    // Vérifier s'il y a des données non synchronisées
    const pendingSets = localStorage.getItem('pendingSets');
    if (pendingSets && JSON.parse(pendingSets).length > 0) {
        event.preventDefault();
        event.returnValue = 'Des données n\'ont pas été synchronisées. Voulez-vous vraiment quitter ?';
    }
});

// Gestion du bouton retour
window.addEventListener('popstate', (event) => {
    if (currentUser && currentUser.id && window.currentWorkout && window.currentWorkout.status === 'started') {
        if (!confirm('Une séance est en cours. Voulez-vous vraiment quitter cette page ?')) {
            // Empêcher la navigation arrière
            window.history.pushState(null, '', window.location.href);
        }
    }
});

// ===== KEEP-ALIVE POUR RENDER =====
function startKeepAlive() {
    // Ping le serveur toutes les 5 minutes pour éviter qu'il s'endorme
    const keepAliveInterval = setInterval(async () => {
        try {
            // Utiliser une route légère qui ne fait que répondre OK
            await fetch('/api/health', {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            console.log('Keep-alive ping sent');
        } catch (error) {
            console.error('Keep-alive failed:', error);
        }
    }, 5 * 60 * 1000); // 5 minutes
    
    // Nettoyer l'interval si la page est fermée
    window.addEventListener('beforeunload', () => {
        clearInterval(keepAliveInterval);
    });
}

// ===== LANCEMENT DE L'APPLICATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM chargé - Initialisation de l\'application');
    
    // Vérification que les fonctions critiques sont disponibles
    const criticalFunctions = ['nextStep', 'prevStep', 'showView', 'toggleGoal', 'toggleEquipment'];
    const missingFunctions = criticalFunctions.filter(fn => !window[fn]);
    
    if (missingFunctions.length > 0) {
        console.error('Fonctions critiques manquantes:', missingFunctions);
        // Tenter de recharger les modules
        setTimeout(() => {
            if (!window.nextStep) {
                console.error('nextStep toujours manquant après délai');
                // Fonction de secours
                window.nextStep = () => {
                    console.error('nextStep appelé mais non chargé correctement');
                    showToast('Erreur de chargement, veuillez rafraîchir la page', 'error');
                };
            }
        }, 1000);
    }
    
    initializeApp();
    startKeepAlive();
});

// Export de la fonction d'initialisation si nécessaire
export { initializeApp };