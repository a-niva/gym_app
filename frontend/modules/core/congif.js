// ===== CORE/CONFIG.JS - CONFIGURATION ET CONSTANTES =====

// Configuration des catégories d'exercices
export const EXERCISE_CATEGORIES = {
    BODYWEIGHT_PURE: ['bodyweight'],
    BODYWEIGHT_WEIGHTED: ['bodyweight', 'lest_possible'],
    TIME_BASED: ['gainage', 'planche', 'isometric'],
    WEIGHTED: ['dumbbells', 'barbell', 'kettlebell', 'cables', 'machine']
};

// Mots-clés pour détecter les exercices basés sur le temps
export const TIME_BASED_KEYWORDS = [
    'gainage', 
    'planche', 
    'plank', 
    'vacuum', 
    'isométrique'
];

// Configuration des temps de repos par défaut (en secondes)
export const REST_TIMES = {
    DEFAULT: 90,
    MIN: 30,
    MAX: 300,
    BETWEEN_EXERCISES: 120
};

// Configuration des niveaux de fatigue et d'effort
export const FATIGUE_LEVELS = {
    MIN: 1,
    MAX: 5,
    DEFAULT: 3
};

export const EFFORT_LEVELS = {
    MIN: 1,
    MAX: 5,
    DEFAULT: 3
};

// Configuration des répétitions
export const REPS_CONFIG = {
    DEFAULT: 10,
    MIN: 1,
    MAX: 100,
    TIME_BASED_DEFAULT: 30 // secondes
};

// Configuration des poids
export const WEIGHT_CONFIG = {
    MIN: 0,
    MAX: 300,
    STEP: 0.5
};

// Configuration des couleurs pour les élastiques
export const ELASTIC_COLORS = {
    'jaune': '#ffeb3b',
    'rouge': '#f44336',
    'noir': '#000000',
    'violet': '#9c27b0',
    'vert': '#4caf50',
    'bleu': '#2196f3',
    'orange': '#ff9800',
    'argent': '#9e9e9e',
    'or': '#ffd700'
};

// Configuration du mode développement
export const DEV_CONFIG = {
    USER_ID: 999,
    SHORTCUTS_ENABLED: true,
    AUTO_LOAD_PROFILE: false
};

// Configuration des API endpoints
export const API_ENDPOINTS = {
    BASE_URL: '/api',
    USERS: '/users',
    WORKOUTS: '/workouts',
    SETS: '/sets',
    EXERCISES: '/exercises',
    DEV_INIT: '/dev/init'
};

// Configuration du stockage local
export const STORAGE_KEYS = {
    USER_PROFILE: 'userProfile',
    CURRENT_USER_ID: 'currentUserId',
    CURRENT_WORKOUT: 'currentWorkout',
    SESSION_HISTORY: 'currentSessionHistory',
    WORKOUT_HISTORY: 'currentWorkoutHistory',
    PENDING_SETS: 'pendingSets',
    INTER_EXERCISE_RESTS: 'interExerciseRests',
    LAST_COMPLETED_SET: 'lastCompletedSetId'
};

// Configuration des timers
export const TIMER_CONFIG = {
    SYNC_INTERVAL: 30000, // 30 secondes
    WORKOUT_CHECK_INTERVAL: 60000, // 1 minute
    SET_TIMER_UPDATE: 1000, // 1 seconde
    TOAST_DURATION: 3000 // 3 secondes
};

// Configuration audio
export const AUDIO_CONFIG = {
    REST_ALERT_FREQUENCY: 440, // Hz
    REST_ALERT_DURATION: 200, // ms
    REST_WARNING_TIME: 10 // secondes avant la fin
};

// Messages de l'application
export const MESSAGES = {
    ERRORS: {
        NETWORK: 'Erreur de connexion au serveur',
        VALIDATION: 'Erreur de validation',
        NOT_FOUND: 'Non trouvé',
        GENERIC: 'Une erreur est survenue'
    },
    SUCCESS: {
        PROFILE_SAVED: 'Profil sauvegardé !',
        WORKOUT_STARTED: 'Séance démarrée !',
        WORKOUT_COMPLETED: 'Séance terminée !',
        SET_RECORDED: 'Série enregistrée'
    },
    INFO: {
        LOADING: 'Chargement...',
        SYNCING: 'Synchronisation...',
        OFFLINE: 'Mode hors-ligne'
    }
};

export default {
    EXERCISE_CATEGORIES,
    TIME_BASED_KEYWORDS,
    REST_TIMES,
    FATIGUE_LEVELS,
    EFFORT_LEVELS,
    REPS_CONFIG,
    WEIGHT_CONFIG,
    ELASTIC_COLORS,
    DEV_CONFIG,
    API_ENDPOINTS,
    STORAGE_KEYS,
    TIMER_CONFIG,
    AUDIO_CONFIG,
    MESSAGES
};