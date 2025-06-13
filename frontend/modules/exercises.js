// ===== MODULES/EXERCISES.JS - GESTION DES EXERCICES ET TRACKING =====

import { getState, setState } from '../core/state.js';
import { API_ENDPOINTS, STORAGE_KEYS, MESSAGES, REST_TIMES, TIME_BASED_KEYWORDS } from '../core/config.js';
import { showToast, startTimer, startRestTimer, calculateAvailableWeights } from './utils.js';

// Chargement de la liste des exercices
export async function loadExercises() {
    try {
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.EXERCISES}/`);
        if (response.ok) {
            const exercises = await response.json();
            setState('allExercises', exercises);
            console.log(`${exercises.length} exercices chargés`);
            return exercises;
        } else {
            console.error('Erreur chargement exercices:', response.status);
            return [];
        }
    } catch (error) {
        console.error('Erreur chargement exercices:', error);
        return [];
    }
}

// Affichage du sélecteur d'exercices
export function showExerciseSelector() {
    const container = document.getElementById('exerciseArea');
    if (!container) return;
    
    const exercises = getState('allExercises');
    if (!exercises || exercises.length === 0) {
        container.innerHTML = '<p>Chargement des exercices...</p>';
        loadExercises().then(() => showExerciseSelector());
        return;
    }
    
    const grouped = exercises.reduce((acc, ex) => {
        if (!acc[ex.body_part]) acc[ex.body_part] = [];
        acc[ex.body_part].push(ex);
        return acc;
    }, {});
    
    container.innerHTML = `
        <div class="exercise-selector">
            <h3>Choisir un exercice</h3>
            <input type="text" placeholder="Rechercher..." 
                   id="exerciseSearch" 
                   onkeyup="filterExerciseList()" 
                   class="form-input">
            
            <div id="exerciseListSelector" class="exercise-list-selector">
                ${Object.entries(grouped).map(([part, exercises]) => `
                    <div class="exercise-group">
                        <h4>${part}</h4>
                        ${exercises.map(ex => `
                            <div class="exercise-option" onclick="selectExercise(${ex.id})">
                                <div class="exercise-name">${ex.name_fr}</div>
                                <div class="exercise-equipment">${ex.equipment.join(', ')}</div>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Filtrage de la liste d'exercices
export function filterExerciseList() {
    const searchInput = document.getElementById('exerciseSearch');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const groups = document.querySelectorAll('.exercise-group');
    
    groups.forEach(group => {
        const exercises = group.querySelectorAll('.exercise-option');
        let hasVisible = false;
        
        exercises.forEach(ex => {
            const name = ex.querySelector('.exercise-name').textContent.toLowerCase();
            if (name.includes(searchTerm)) {
                ex.style.display = 'block';
                hasVisible = true;
            } else {
                ex.style.display = 'none';
            }
        });
        
        group.style.display = hasVisible ? 'block' : 'none';
    });
}

// Sélection d'un exercice
export function selectExercise(exerciseId) {
    const lastExerciseEndTime = getState('lastExerciseEndTime');
    if (lastExerciseEndTime) {
        const interExerciseRestTime = Math.floor((new Date() - lastExerciseEndTime) / 1000);
        
        if (interExerciseRestTime > 10) {
            addToSessionHistory('rest', {
                duration: interExerciseRestTime,
                type: 'inter_exercise'
            });
            
            const currentWorkout = getState('currentWorkout');
            const restData = {
                workout_id: currentWorkout.id,
                rest_type: 'inter_exercise',
                duration: interExerciseRestTime,
                timestamp: new Date().toISOString()
            };
            
            const interExerciseRests = JSON.parse(localStorage.getItem(STORAGE_KEYS.INTER_EXERCISE_RESTS) || '[]');
            interExerciseRests.push(restData);
            localStorage.setItem(STORAGE_KEYS.INTER_EXERCISE_RESTS, JSON.stringify(interExerciseRests));
            
            fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.WORKOUTS}/rest-periods/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(restData)
            }).catch(err => console.error('Erreur sync repos inter-exercices:', err));
        }
        
        setState('lastExerciseEndTime', null);
    }
    
    const allExercises = getState('allExercises');
    const exercise = allExercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;
    
    setState('currentExercise', exercise);
    setState('currentSetNumber', 1);
    
    addToSessionHistory('exercise_change', {
        exerciseId: exercise.id,
        exerciseName: exercise.name_fr,
        bodyPart: exercise.body_part
    });
    
    const currentUser = getState('currentUser');
    if (currentUser && exercise.sets_reps) {
        const userLevel = currentUser.experience_level;
        const levelConfig = exercise.sets_reps.find(sr => sr.level === userLevel);
        setState('currentTargetReps', levelConfig ? levelConfig.reps : 10);
    }
    
    showSetInput();
}

// Affichage de l'interface de saisie
export function showSetInput() {
    const container = document.getElementById('exerciseArea');
    if (!container) return;
    
    const currentExercise = getState('currentExercise');
    const currentSetNumber = getState('currentSetNumber');
    const currentTargetReps = getState('currentTargetReps');
    const currentUser = getState('currentUser');
    
    const existingHistory = document.getElementById('previousSets');
    const savedHistory = existingHistory ? existingHistory.innerHTML : '';
    
    setState('setStartTime', new Date());
    setState('lastSetEndTime', null);
    
    const isTimeBased = TIME_BASED_KEYWORDS.some(keyword => 
        currentExercise.name_fr.toLowerCase().includes(keyword)
    );
    const isBodyweight = currentExercise.equipment.includes('bodyweight');
    
    let availableWeights = calculateAvailableWeights(currentExercise);
    let suggestedWeight = 0;
    
    if (availableWeights.length > 0) {
        if (isBodyweight && !isTimeBased) {
            suggestedWeight = availableWeights.includes(0) ? 0 : availableWeights[0];
        } else {
            suggestedWeight = availableWeights[Math.floor(availableWeights.length / 2)];
        }
    } else {
        suggestedWeight = 20;
    }
    
    const weightLabel = isBodyweight && !isTimeBased ? 
        'Poids total (corps + charge)' : 
        isTimeBased ? 
        'Charge additionnelle (kg)' : 
        'Poids total (kg)';
    
    const repsLabel = isTimeBased ? 'Durée (secondes)' : 'Répétitions';
    const defaultReps = isTimeBased ? 30 : currentTargetReps;
    
    container.innerHTML = `
        <div class="current-exercise">
            <h2>${currentExercise.name_fr}</h2>
            <p class="exercise-info">${currentExercise.body_part} • ${currentExercise.level}</p>
        </div>
        
        <div class="set-tracker">
            <h3>Série ${currentSetNumber}</h3>
            <div class="set-timer">Durée: <span id="setTimer">0:00</span></div>
            
            <div class="set-input-grid-vertical">
                ${!isTimeBased ? `
                <div class="input-group">
                    <label>${weightLabel}</label>
                    <div class="weight-selector">
                        <button onclick="adjustWeightToNext(-1)" class="btn-adjust">-</button>
                        <input type="number" id="setWeight" value="${suggestedWeight}" 
                               min="${availableWeights[0] || 0}" 
                               max="${availableWeights[availableWeights.length - 1] || 999}"
                               step="any" class="weight-display"
                               onchange="validateWeight()">
                        <button onclick="adjustWeightToNext(1)" class="btn-adjust">+</button>
                    </div>
                    <div class="weight-info">
                        ${isBodyweight ? 
                            `Poids du corps: ${currentUser.weight}kg${availableWeights.length > 1 ? 
                                '. Charge additionnelle disponible.' : ''}` : 
                            `Poids disponibles: ${availableWeights.slice(0, 5).join(', ')}kg${availableWeights.length > 5 ? '...' : ''}`
                        }
                    </div>
                </div>
                ` : ''}
                
                <div class="input-group">
                    <label>${repsLabel}</label>
                    <div class="reps-selector">
                        <button onclick="adjustReps(-1)" class="btn-adjust">-</button>
                        <input type="number" id="setReps" value="${defaultReps}" min="1" max="100" class="reps-display">
                        <button onclick="adjustReps(1)" class="btn-adjust">+</button>
                    </div>
                </div>
                
                <div class="input-group">
                    <label>Fatigue musculaire</label>
                    <div class="emoji-selector">
                        ${[1,2,3,4,5].map(level => `
                            <span class="emoji-option ${level === 3 ? 'selected' : ''}" 
                                  data-value="${level}" 
                                  onclick="selectFatigue(${level})">
                                ${getFatigueEmoji(level)}
                            </span>
                        `).join('')}
                    </div>
                </div>
                
                <div class="input-group">
                    <label>Effort perçu</label>
                    <div class="emoji-selector">
                        ${[1,2,3,4,5].map(level => `
                            <span class="emoji-option ${level === 3 ? 'selected' : ''}" 
                                  data-value="${level}" 
                                  onclick="selectEffort(${level})">
                                ${getEffortEmoji(level)}
                            </span>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="set-actions">
                <button class="btn btn-primary" onclick="completeSet()">Valider la série</button>
                <button class="btn btn-secondary" onclick="skipSet()">Passer</button>
                <button class="btn btn-danger" onclick="finishExercise()">Terminer l'exercice</button>
            </div>
        </div>
        
        <div id="previousSets">${savedHistory}</div>
    `;
    
    startTimer();
}

// Ajustement du poids
export function adjustWeightToNext(direction) {
    const currentExercise = getState('currentExercise');
    const input = document.getElementById('setWeight');
    const currentWeight = parseFloat(input.value) || 0;
    const availableWeights = calculateAvailableWeights(currentExercise);
    
    if (availableWeights.length === 0) return;
    
    let newWeight;
    if (direction > 0) {
        newWeight = availableWeights.find(w => w > currentWeight) || currentWeight;
    } else {
        for (let i = availableWeights.length - 1; i >= 0; i--) {
            if (availableWeights[i] < currentWeight) {
                newWeight = availableWeights[i];
                break;
            }
        }
        if (newWeight === undefined) newWeight = currentWeight;
    }
    
    input.value = newWeight;
}

// Ajustement des répétitions
export function adjustReps(direction) {
    const input = document.getElementById('setReps');
    const current = parseInt(input.value) || 0;
    const newValue = Math.max(1, Math.min(100, current + direction));
    input.value = newValue;
}

// Validation du poids
export function validateWeight() {
    const currentExercise = getState('currentExercise');
    const input = document.getElementById('setWeight');
    const weight = parseFloat(input.value) || 0;
    const availableWeights = calculateAvailableWeights(currentExercise);
    
    if (availableWeights.length > 0 && !availableWeights.includes(weight)) {
        const closest = availableWeights.reduce((prev, curr) => 
            Math.abs(curr - weight) < Math.abs(prev - weight) ? curr : prev
        );
        input.value = closest;
    }
}

// Sélection de la fatigue
export function selectFatigue(level) {
    setState('selectedFatigue', level);
    document.querySelectorAll('.emoji-selector')[0].querySelectorAll('.emoji-option').forEach((el, idx) => {
        el.classList.toggle('selected', idx + 1 === level);
    });
}

// Sélection de l'effort
export function selectEffort(level) {
    setState('selectedEffort', level);
    document.querySelectorAll('.emoji-selector')[1].querySelectorAll('.emoji-option').forEach((el, idx) => {
        el.classList.toggle('selected', idx + 1 === level);
    });
}

// Validation d'une série
export async function completeSet() {
    const setStartTime = getState('setStartTime');
    const currentWorkout = getState('currentWorkout');
    const currentExercise = getState('currentExercise');
    const currentSetNumber = getState('currentSetNumber');
    const selectedFatigue = getState('selectedFatigue');
    const selectedEffort = getState('selectedEffort');
    const currentUser = getState('currentUser');
    
    const setDuration = setStartTime ? Math.floor((new Date() - setStartTime) / 1000) : 0;
    const weight = parseFloat(document.getElementById('setWeight')?.value || 0);
    const reps = parseInt(document.getElementById('setReps').value);
    
    const isTimeBased = TIME_BASED_KEYWORDS.some(keyword => 
        currentExercise.name_fr.toLowerCase().includes(keyword)
    );
    const isBodyweight = currentExercise.equipment.includes('bodyweight');
    
    const setData = {
        workout_id: currentWorkout.id,
        exercise_id: currentExercise.id,
        set_number: currentSetNumber,
        target_reps: isTimeBased ? reps : getState('currentTargetReps'),
        actual_reps: reps,
        weight: weight,
        rest_time: 0,
        fatigue_level: selectedFatigue,
        perceived_exertion: selectedEffort,
        is_bodyweight: isBodyweight,
        is_time_based: isTimeBased,
        body_weight: isBodyweight ? currentUser.weight : null
    };
    
    setState('currentSetData', setData);
    
    try {
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.SETS}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(setData)
        });
        
        if (response.ok) {
            const result = await response.json();
            localStorage.setItem(STORAGE_KEYS.LAST_COMPLETED_SET, result.id.toString());
            showToast(MESSAGES.SUCCESS.SET_RECORDED, 'success');
        } else {
            throw new Error('Erreur serveur');
        }
    } catch (error) {
        console.error('Erreur enregistrement série:', error);
        
        const pendingSets = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_SETS) || '[]');
        pendingSets.push(setData);
        localStorage.setItem(STORAGE_KEYS.PENDING_SETS, JSON.stringify(pendingSets));
        
        showToast('Série sauvegardée localement', 'warning');
    }
    
    addToSessionHistory('set', {
        exerciseName: currentExercise.name_fr,
        setNumber: currentSetNumber,
        weight: weight,
        reps: reps,
        duration: setDuration,
        fatigue: selectedFatigue,
        effort: selectedEffort
    });
    
    setState('lastSetEndTime', new Date());
    setState('currentSetNumber', currentSetNumber + 1);
    
    const restTime = getRestTimeRecommendation(selectedEffort);
    startRestTimer(restTime);
}

// Passer une série
export function skipSet() {
    if (!confirm('Passer cette série ?')) return;
    
    const currentSetNumber = getState('currentSetNumber');
    setState('currentSetNumber', currentSetNumber + 1);
    showSetInput();
}

// Terminer l'exercice
export function finishExercise() {
    setState('lastExerciseEndTime', new Date());
    
    const timerInterval = getState('timerInterval');
    const restTimerInterval = getState('restTimerInterval');
    
    if (timerInterval) {
        clearInterval(timerInterval);
        setState('timerInterval', null);
    }
    
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        setState('restTimerInterval', null);
    }
    
    const currentExercise = getState('currentExercise');
    const currentSetNumber = getState('currentSetNumber');
    
    if (currentExercise && currentSetNumber > 1) {
        const exerciseHistory = {
            exerciseId: currentExercise.id,
            exerciseName: currentExercise.name_fr,
            totalSets: currentSetNumber - 1,
            timestamp: new Date().toISOString()
        };
        
        const workoutHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKOUT_HISTORY) || '[]');
        workoutHistory.push(exerciseHistory);
        localStorage.setItem(STORAGE_KEYS.WORKOUT_HISTORY, JSON.stringify(workoutHistory));
    }
    
    setState('currentExercise', null);
    setState('currentSetNumber', 1);
    setState('setStartTime', null);
    setState('lastSetEndTime', null);
    setState('selectedFatigue', 3);
    setState('selectedEffort', 3);
    
    const currentWorkout = getState('currentWorkout');
    if (currentWorkout && currentWorkout.status === 'started') {
        showExerciseSelector();
    }
}

// Utilitaires
function addToSessionHistory(type, data) {
    const sessionHistory = getState('sessionHistory');
    const historyEntry = {
        type: type,
        timestamp: new Date(),
        data: data
    };
    
    sessionHistory.push(historyEntry);
    setState('sessionHistory', sessionHistory);
    
    localStorage.setItem(STORAGE_KEYS.SESSION_HISTORY, JSON.stringify(sessionHistory));
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const container = document.getElementById('previousSets');
    if (!container) return;
    
    const sessionHistory = getState('sessionHistory');
    const setHistory = sessionHistory.filter(h => h.type === 'set');
    
    if (setHistory.length === 0) return;
    
    container.innerHTML = `
        <h4>Séries précédentes</h4>
        <div class="previous-sets-list">
            ${setHistory.map((h, idx) => `
                <div class="previous-set-item">
                    <span class="set-number">Série ${idx + 1}</span>
                    <span class="set-details">${h.data.weight}kg × ${h.data.reps}</span>
                    <span class="set-emojis">${getFatigueEmoji(h.data.fatigue)} ${getEffortEmoji(h.data.effort)}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function getRestTimeRecommendation(effortLevel) {
    if (effortLevel >= 4) return 180;
    if (effortLevel >= 3) return 120;
    return 90;
}

function getFatigueEmoji(level) {
    const emojis = ['😴', '😌', '😐', '😓', '🥵'];
    return emojis[level - 1] || '😐';
}

function getEffortEmoji(level) {
    const emojis = ['🎯', '💪', '🔥', '⚡', '💥'];
    return emojis[level - 1] || '🔥';
}

// Export des fonctions d'interface d'entraînement
export function updateTrainingInterface() {
    const currentWorkout = getState('currentWorkout');
    const container = document.getElementById('workoutInterface');
    
    if (!container || !currentWorkout) return;
    
    let content = '';
    
    if (currentWorkout.status === 'started') {
        const currentExercise = getState('currentExercise');
        if (!currentExercise) {
            content = `
                <div class="workout-status">
                    <h3>Séance ${currentWorkout.type === 'program' ? 'Programme' : 'Libre'}</h3>
                    <button class="btn btn-secondary" onclick="pauseWorkout()">Mettre en pause</button>
                    <button class="btn btn-danger" onclick="abandonWorkout()">Abandonner</button>
                </div>
                <div id="exerciseArea"></div>
            `;
            
            setTimeout(() => showExerciseSelector(), 100);
        } else {
            content = `
                <div class="workout-status">
                    <h3>Séance en cours</h3>
                    <button class="btn btn-secondary" onclick="pauseWorkout()">Pause</button>
                    <button class="btn btn-success" onclick="completeWorkout()">Terminer</button>
                </div>
                <div id="exerciseArea"></div>
            `;
        }
    } else if (currentWorkout.status === 'paused') {
        content = `
            <div class="workout-status paused">
                <h3>⏸️ Séance en pause</h3>
                <button class="btn btn-primary" onclick="resumeWorkout()">Reprendre</button>
                <button class="btn btn-danger" onclick="abandonWorkout()">Abandonner</button>
            </div>
        `;
    }
    
    container.innerHTML = content;
}

// Import des fonctions depuis autres modules avec gestion des dépendances circulaires
import { pauseWorkout, resumeWorkout, completeWorkout, abandonWorkout } from './workout.js';

// Ajout de la fonction addToSessionHistory qui était manquante
export function addToSessionHistory(type, data) {
    const sessionHistory = getState('sessionHistory');
    const historyEntry = {
        type: type,
        timestamp: new Date(),
        data: data
    };
    
    sessionHistory.push(historyEntry);
    setState('sessionHistory', sessionHistory);
    
    localStorage.setItem(STORAGE_KEYS.SESSION_HISTORY, JSON.stringify(sessionHistory));
    updateHistoryDisplay();
}