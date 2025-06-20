// ===== ÉTAT GLOBAL =====
// Ce fichier contient toutes les variables d'état de l'application
// Aucune logique complexe, juste des variables et des accesseurs simples

let currentUser = null;
let currentStep = 1;
const totalSteps = 5;
let selectedGoals = [];
let selectedEquipment = [];
let equipmentConfig = {
    barres: {
        olympique: { available: false, count: 0, weight: 20 },
        ez: { available: false, count: 0, weight: 10 },
        courte: { available: false, count: 0, weight: 2.5 }
    },
    disques: {}, // {"5": 4, "10": 2} - poids en kg -> nombre
    dumbbells: {}, // {"5": 2, "10": 2} - poids -> nombre
    kettlebells: {}, // {"8": 1, "12": 1} - poids -> nombre
    elastiques: [], // [{color: "vert", resistance: 10, count: 1}]
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
};
let selectedFatigue = 3;
let selectedEffort = 3;
let currentWorkout = null;
let workoutCheckInterval = null;
let lastSyncTime = null;
let restTimerInterval = null;
let lastSetEndTime = null;
let allExercises = [];
let lastExerciseEndTime = null;
let interExerciseRestTime = 0;
let isInRestPeriod = false;
let currentSetData = null;
let sessionHistory = [];

// Variables pour les exercices et séries
let currentExercise = null;
let currentSetNumber = 1;
let currentTargetReps = 10;
let setStartTime = null;
let currentRestTime = 0;

// Variables pour les timers
let timerInterval = null;
let audioContext = null;
let isSilentMode = false;
let currentProgram = null;
let userPrograms = [];
let isAutoWeightEnabled = localStorage.getItem('isAutoWeightEnabled') !== 'false'; // true par défaut
// Variables pour le système adaptatif (Phase 2.2)
let userCommitment = null;
let adaptiveTargets = [];
let trajectoryAnalysis = null;
let currentAdaptiveWorkout = null;

// État des suggestions ML
export let lastCompletedSetId = parseInt(localStorage.getItem('lastCompletedSetId')) || null;

export function setLastCompletedSetId(id) {
    lastCompletedSetId = id;
    localStorage.setItem('lastCompletedSetId', id);
}

// ===== ACCESSEURS SIMPLES =====
// Pas de classes complexes, juste des fonctions directes

export function getCurrentUser() {
    return currentUser;
}

export function setCurrentUser(user) {
    currentUser = user;
}

export function getCurrentWorkout() {
    return currentWorkout;
}

export function setCurrentWorkout(workout) {
    currentWorkout = workout;
}

export function getCurrentStep() {
    return currentStep;
}

export function setCurrentStep(step) {
    currentStep = step;
}

export function getSelectedGoals() {
    return selectedGoals;
}

export function setSelectedGoals(goals) {
    selectedGoals = goals;
}

export function getSelectedEquipment() {
    return selectedEquipment;
}

export function setSelectedEquipment(equipment) {
    selectedEquipment = equipment;
}

export function getEquipmentConfig() {
    return equipmentConfig;
}

export function setEquipmentConfig(config) {
    equipmentConfig = config;
}

export function getAllExercises() {
    return allExercises;
}

export function setAllExercises(exercises) {
    allExercises = exercises;
}

export function getCurrentExercise() {
    return currentExercise;
}

export function setCurrentExercise(exercise) {
    currentExercise = exercise;
}

export function getSessionHistory() {
    return sessionHistory;
}

export function addToStateHistory(entry) {
    sessionHistory.push(entry);
}

export function clearSessionHistory() {
    sessionHistory = [];
}

// Variables accessibles directement pour simplicité
export {
    currentUser,
    currentStep,
    totalSteps,
    selectedGoals,
    selectedEquipment,
    equipmentConfig,
    selectedFatigue,
    selectedEffort,
    currentWorkout,
    workoutCheckInterval,
    lastSyncTime,
    restTimerInterval,
    lastSetEndTime,
    allExercises,
    lastExerciseEndTime,
    interExerciseRestTime,
    isInRestPeriod,
    currentSetData,
    sessionHistory,
    currentExercise,
    currentSetNumber,
    currentTargetReps,
    setStartTime,
    currentRestTime,
    timerInterval,
    audioContext,
    isSilentMode,
    currentProgram,
    userPrograms,
    isAutoWeightEnabled,
    currentAdaptiveWorkout,
    userCommitment,
    adaptiveTargets,
    trajectoryAnalysis,
    lastCompletedSetId
};

// Réinitialisation de l'état pour logout ou nouveau profil
export function resetState() {
    currentUser = null;
    currentStep = 1;
    selectedGoals = [];
    selectedEquipment = [];
    equipmentConfig = {
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
    };
    selectedFatigue = 3;
    selectedEffort = 3;
    currentWorkout = null;
    sessionHistory = [];
    currentExercise = null;
    currentSetNumber = 1;
    currentTargetReps = 10;
    lastExerciseEndTime = null;
    interExerciseRestTime = 0;

    userCommitment = null;
    adaptiveTargets = [];
    trajectoryAnalysis = null;
    currentAdaptiveWorkout = null;
}

// Setters pour les variables qui n'en ont pas encore
export function setSelectedFatigue(value) {
    selectedFatigue = value;
}

export function setSelectedEffort(value) {
    selectedEffort = value;
}

export function setCurrentSetNumber(number) {
    currentSetNumber = number;
}

export function incrementSetNumber() {
    currentSetNumber++;
}

export function setLastExerciseEndTime(time) {
    lastExerciseEndTime = time;
}

export function setInterExerciseRestTime(time) {
    interExerciseRestTime = time;
}

export function setIsInRestPeriod(value) {
    isInRestPeriod = value;
}

export function setLastSetEndTime(time) {
    lastSetEndTime = time;
}

export function setSetStartTime(time) {
    setStartTime = time;
}

export function setTimerInterval(interval) {
    timerInterval = interval;
}

export function setRestTimerInterval(interval) {
    restTimerInterval = interval;
}

export function setWorkoutCheckInterval(interval) {
    workoutCheckInterval = interval;
}

export function setAudioContext(context) {
    audioContext = context;
}

export function setIsSilentMode(value) {
    isSilentMode = value;
}

export function setLastSyncTime(time) {
    lastSyncTime = time;
}

export function setCurrentTargetReps(reps) {
    currentTargetReps = reps;
}

export function getCurrentProgram() {
    return currentProgram;
}

export function setCurrentProgram(program) {
    currentProgram = program;
}

export function getUserPrograms() {
    return userPrograms;
}

export function setUserPrograms(programs) {
    userPrograms = programs;
}

export function getIsAutoWeightEnabled() {
    return isAutoWeightEnabled;
}

export function setIsAutoWeightEnabled(enabled) {
    isAutoWeightEnabled = enabled;
    localStorage.setItem('isAutoWeightEnabled', enabled);
}

// Ajoutez ces fonctions après setIsAutoWeightEnabled :

export function getUserCommitment() {
    return userCommitment;
}

export function setUserCommitment(commitment) {
    userCommitment = commitment;
}

export function getAdaptiveTargets() {
    return adaptiveTargets;
}

export function setAdaptiveTargets(targets) {
    adaptiveTargets = targets;
}

export function getTrajectoryAnalysis() {
    return trajectoryAnalysis;
}

export function setTrajectoryAnalysis(analysis) {
    trajectoryAnalysis = analysis;
}

export function getCurrentAdaptiveWorkout() {
    return currentAdaptiveWorkout;
}

export function setCurrentAdaptiveWorkout(workout) {
    currentAdaptiveWorkout = workout;
}

// Export de getters pour les variables globales nécessaires
Object.defineProperty(window, 'currentWorkout', {
    get: function() { return currentWorkout; }
});

Object.defineProperty(window, 'currentExercise', {
    get: function() { return currentExercise; }
});