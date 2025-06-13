// ===== CORE/STATE.JS - GESTION CENTRALISÉE DE L'ÉTAT =====

// État global de l'application
const AppState = {
    // Utilisateur
    currentUser: null,
    
    // Onboarding
    currentStep: 1,
    totalSteps: 5,
    selectedGoals: [],
    selectedEquipment: [],
    equipmentConfig: {
        barres: {
            olympique: { available: false, count: 0, weight: 20 },
            ez: { available: false, count: 0, weight: 10 },
            courte: { available: false, count: 0, weight: 2.5 }
        },
        disques: {},
        dumbbells: {},
        kettlebells: {},
        elastiques: [],
        banc: {
            available: false,
            inclinable: false,
            declinable: false
        },
        autres: {
            barre_traction: false,
            lest_corps: [],
            lest_chevilles: [],
            lest_poignets: []
        }
    },
    
    // Entraînement
    currentWorkout: null,
    currentExercise: null,
    currentSetNumber: 1,
    currentTargetReps: 10,
    selectedFatigue: 3,
    selectedEffort: 3,
    
    // Timers
    setStartTime: null,
    lastSetEndTime: null,
    lastExerciseEndTime: null,
    interExerciseRestTime: 0,
    isInRestPeriod: false,
    currentSetData: null,
    
    // Historique
    sessionHistory: [],
    allExercises: [],
    
    // Intervalles
    workoutCheckInterval: null,
    restTimerInterval: null,
    timerInterval: null,
    
    // Audio
    audioContext: null,
    isSilentMode: false,
    
    // Dev mode
    isDevMode: false,
    DEV_USER_ID: 999
};

// Getters
export const getState = (key) => {
    return key ? AppState[key] : AppState;
};

// Setters
export const setState = (key, value) => {
    AppState[key] = value;
};

// Update nested state
export const updateNestedState = (path, value) => {
    const keys = path.split('.');
    let obj = AppState;
    
    for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
    }
    
    obj[keys[keys.length - 1]] = value;
};

// Reset state
export const resetState = (keys = []) => {
    if (keys.length === 0) {
        // Reset tout sauf certaines clés
        const preserveKeys = ['allExercises', 'isDevMode', 'DEV_USER_ID'];
        Object.keys(AppState).forEach(key => {
            if (!preserveKeys.includes(key)) {
                AppState[key] = getInitialState()[key];
            }
        });
    } else {
        // Reset seulement les clés spécifiées
        keys.forEach(key => {
            AppState[key] = getInitialState()[key];
        });
    }
};

// Get initial state
function getInitialState() {
    return {
        currentUser: null,
        currentStep: 1,
        selectedGoals: [],
        selectedEquipment: [],
        equipmentConfig: {
            barres: {
                olympique: { available: false, count: 0, weight: 20 },
                ez: { available: false, count: 0, weight: 10 },
                courte: { available: false, count: 0, weight: 2.5 }
            },
            disques: {},
            dumbbells: {},
            kettlebells: {},
            elastiques: [],
            banc: {
                available: false,
                inclinable: false,
                declinable: false
            },
            autres: {
                barre_traction: false,
                lest_corps: [],
                lest_chevilles: [],
                lest_poignets: []
            }
        },
        currentWorkout: null,
        currentExercise: null,
        currentSetNumber: 1,
        currentTargetReps: 10,
        selectedFatigue: 3,
        selectedEffort: 3,
        setStartTime: null,
        lastSetEndTime: null,
        lastExerciseEndTime: null,
        interExerciseRestTime: 0,
        isInRestPeriod: false,
        currentSetData: null,
        sessionHistory: [],
        workoutCheckInterval: null,
        restTimerInterval: null,
        timerInterval: null,
        audioContext: null,
        isSilentMode: false
    };
}


// Obtenir l'état par défaut
const getDefaultState = () => ({
    currentUser: null,
    currentStep: 1,
    totalSteps: 5,
    selectedGoals: [],
    selectedEquipment: [],
    equipmentConfig: {
        barres: {
            olympique: { available: false, count: 0, weight: 20 },
            ez: { available: false, count: 0, weight: 10 },
            courte: { available: false, count: 0, weight: 2.5 }
        },
        disques: {},
        dumbbells: {},
        kettlebells: {},
        elastiques: [],
        banc: {
            available: false,
            inclinable: false,
            declinable: false
        },
        autres: {
            barre_traction: false,
            lest_corps: [],
            lest_chevilles: [],
            lest_poignets: []
        }
    },
    currentWorkout: null,
    currentExercise: null,
    currentSetNumber: 1,
    currentTargetReps: 10,
    selectedFatigue: 3,
    selectedEffort: 3,
    setStartTime: null,
    lastSetEndTime: null,
    lastExerciseEndTime: null,
    interExerciseRestTime: 0,
    isInRestPeriod: false,
    currentSetData: null,
    sessionHistory: [],
    allExercises: [],
    workoutCheckInterval: null,
    restTimerInterval: null,
    timerInterval: null,
    audioContext: null,
    isSilentMode: false,
    isDevMode: false,
    DEV_USER_ID: 999
});

export default AppState;