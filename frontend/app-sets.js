// ===== GESTIONNAIRE DE SÉRIES =====
// Ce fichier gère l'exécution et l'enregistrement des séries
// Il contient toute la logique de l'interface de saisie et de validation

import {
    currentUser,
    currentWorkout,
    currentExercise,
    currentSetNumber,
    currentTargetReps,
    selectedFatigue,
    selectedEffort,
    setStartTime,
    lastSetEndTime,
    timerInterval,
    setTimerInterval,
    setSelectedFatigue,
    setSelectedEffort,
    setSetStartTime,
    incrementSetNumber,
    setLastSetEndTime,
    isInRestPeriod,
    setIsInRestPeriod,
    isSilentMode
} from './app-state.js';

import { showToast } from './app-ui.js';
import {
    calculateAvailableWeights,
    adjustWeightToNext as adjustToNextWeight,
    validateWeight,
    getExerciseType,
    calculateSuggestedWeight,
    formatWeightDisplay
} from './app-equipment.js';
import {
    createSet,
    updateSetRestTime,
    checkFatigue,
    getSuggestedWeight
} from './app-api.js';
import { TIME_BASED_KEYWORDS } from './app-config.js';
import { addToSessionHistory } from './app-history.js';

// ===== AFFICHAGE DE L'INTERFACE DE SAISIE =====
function showSetInput() {
    const container = document.getElementById('exerciseArea');
    if (!container) return;
    
    const existingHistory = document.getElementById('previousSets');
    const savedHistory = existingHistory ? existingHistory.innerHTML : '';
    
    setSetStartTime(new Date());
    setLastSetEndTime(null);
    
    // Déterminer le type d'exercice
    const isTimeBased = TIME_BASED_KEYWORDS.some(keyword => 
        currentExercise.name_fr.toLowerCase().includes(keyword)
    );
    const isBodyweight = currentExercise.equipment.includes('bodyweight');
    
    // Calculer les poids disponibles pour cet exercice
    let availableWeights = calculateAvailableWeights(currentExercise);
    let suggestedWeight = calculateSuggestedWeight(currentExercise);
    
    // Adapter les labels selon le type d'exercice
    const weightLabel = isBodyweight && !isTimeBased ? 
        'Charge additionnelle (kg)' : 
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
                            `Poids du corps: ${currentUser?.weight || 75}kg${availableWeights.length > 1 ? ' • Lest disponible: ' + availableWeights.filter(w => w > 0).join(', ') + 'kg' : ''}` :
                            availableWeights.length > 0 ? 
                            `Poids disponibles: ${availableWeights.slice(0, 5).join(', ')}${availableWeights.length > 5 ? '...' : ''} kg` : 
                            'Aucun poids configuré'}
                    </div>
                </div>
                ` : '<input type="hidden" id="setWeight" value="0">'}
                
                <div class="input-group">
                    <label>${repsLabel}</label>
                    <div class="reps-selector">
                        <button onclick="adjustReps(${isTimeBased ? -5 : -1})" class="btn-adjust">-</button>
                        <input type="number" id="setReps" value="${defaultReps}" 
                               min="1" max="${isTimeBased ? 300 : 50}" class="reps-display">
                        <button onclick="adjustReps(${isTimeBased ? 5 : 1})" class="btn-adjust">+</button>
                    </div>
                </div>
                
                <div class="selector-group">
                    <label>Fatigue</label>
                    <div class="emoji-selector" id="fatigueSelector">
                        <span class="emoji-option" data-value="1" onclick="selectFatigue(1)">😄</span>
                        <span class="emoji-option" data-value="2" onclick="selectFatigue(2)">🙂</span>
                        <span class="emoji-option ${selectedFatigue === 3 ? 'selected' : ''}" data-value="3" onclick="selectFatigue(3)">😐</span>
                        <span class="emoji-option" data-value="4" onclick="selectFatigue(4)">😓</span>
                        <span class="emoji-option" data-value="5" onclick="selectFatigue(5)">😵</span>
                    </div>
                </div>
                
                <div class="selector-group">
                    <label>Effort perçu</label>
                    <div class="emoji-selector" id="effortSelector">
                        <span class="emoji-option" data-value="1" onclick="selectEffort(1)">🚶</span>
                        <span class="emoji-option" data-value="2" onclick="selectEffort(2)">🏃</span>
                        <span class="emoji-option ${selectedEffort === 3 ? 'selected' : ''}" data-value="3" onclick="selectEffort(3)">🏋️</span>
                        <span class="emoji-option" data-value="4" onclick="selectEffort(4)">🔥</span>
                        <span class="emoji-option" data-value="5" onclick="selectEffort(5)">🌋</span>
                    </div>
                </div>
            </div>
            
            <div class="set-actions">
                <button class="btn btn-primary" onclick="completeSet()">
                    ✓ Valider la série
                </button>
                <button class="btn btn-secondary btn-sm" onclick="skipSet()">
                    ⏭️ Passer
                </button>
            </div>
        </div>
        
        <div id="previousSets" class="previous-sets">${savedHistory}</div>
        
        <button class="btn btn-secondary" onclick="finishExercise()">
            Terminer cet exercice
        </button>
    `;
    
    startTimers();
    
    // Restaurer les valeurs de fatigue et effort sélectionnées
    selectFatigue(Math.round(selectedFatigue));
    selectEffort(selectedEffort);
    
    // Gestion des suggestions de poids basées sur l'historique
    loadWeightSuggestion();
    
    // Scroll automatique vers les inputs sur mobile
    setTimeout(() => {
        const setTracker = document.querySelector('.set-tracker');
        if (setTracker && window.innerWidth <= 768) {
            setTracker.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
    
    // Gérer le redimensionnement du viewport (clavier virtuel)
    const handleViewportChange = () => {
        const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const isKeyboardOpen = viewportHeight < window.screen.height * 0.75;
        const setTracker = document.querySelector('.set-tracker');
        
        if (setTracker) {
            if (isKeyboardOpen) {
                setTracker.style.paddingBottom = '260px';
                // Scroll vers l'input actif
                const activeElement = document.activeElement;
                if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT')) {
                    setTimeout(() => {
                        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }
            } else {
                setTracker.style.paddingBottom = '';
            }
        }
    };
    
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleViewportChange);
    } else {
        window.addEventListener('resize', handleViewportChange);
    }
}

// ===== CHARGEMENT DES SUGGESTIONS DE POIDS =====
async function loadWeightSuggestion() {
    const previousSetHistory = JSON.parse(localStorage.getItem('currentWorkoutHistory') || '[]');
    const lastSetForExercise = previousSetHistory
        .filter(h => h.exerciseId === currentExercise.id)
        .flatMap(h => h.sets || [])
        .slice(-1)[0];
        
    if (lastSetForExercise && currentSetNumber > 1) {
        let adjustedWeight = calculateSuggestedWeight(currentExercise, lastSetForExercise);
        document.getElementById('setWeight').value = adjustedWeight;
    } else if (currentSetNumber === 1) {
        const weight = await getSuggestedWeight(currentUser.id, currentExercise.id);
        if (weight) {
            const validated = validateWeight(currentExercise, weight);
            document.getElementById('setWeight').value = validated;
        }
    }
}

// ===== GESTION DES TIMERS =====
function startTimers() {
    // Nettoyer l'ancien timer avant d'en créer un nouveau
    if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
    }
    
    const interval = setInterval(() => {
        // Vérifier que le document est visible et que l'élément existe
        if (document.hidden || !document.getElementById('setTimer')) {
            clearInterval(interval);
            setTimerInterval(null);
            return;
        }
        
        // Timer de série UNIQUEMENT
        if (setStartTime) {
            const elapsed = Math.floor((new Date() - setStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const setTimer = document.getElementById('setTimer');
            if (setTimer) {
                setTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }
    }, 1000);
    
    setTimerInterval(interval);
    
    // Nettoyer automatiquement si la page devient invisible
    const handleVisibilityChange = () => {
        if (document.hidden && timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
        }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Retourner une fonction de nettoyage
    return () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
}

// ===== SÉLECTION DE LA FATIGUE ET DE L'EFFORT =====
function selectFatigue(value) {
    setSelectedFatigue(value);
    document.querySelectorAll('#fatigueSelector .emoji-option').forEach(el => {
        el.classList.remove('selected');
    });
    const selectedEl = document.querySelector(`#fatigueSelector .emoji-option[data-value="${value}"]`);
    if (selectedEl) {
        selectedEl.classList.add('selected');
    }
}

function selectEffort(value) {
    setSelectedEffort(value);
    document.querySelectorAll('#effortSelector .emoji-option').forEach(el => {
        el.classList.remove('selected');
    });
    const selectedEl = document.querySelector(`#effortSelector .emoji-option[data-value="${value}"]`);
    if (selectedEl) {
        selectedEl.classList.add('selected');
    }
}

// ===== AJUSTEMENT DES POIDS ET RÉPÉTITIONS =====
function adjustWeightToNext(direction) {
    const input = document.getElementById('setWeight');
    const currentWeight = parseFloat(input.value) || 0;
    const newWeight = adjustToNextWeight(currentExercise, currentWeight, direction);
    input.value = newWeight;
}

function adjustReps(delta) {
    const input = document.getElementById('setReps');
    const newValue = parseInt(input.value) + delta;
    if (newValue > 0) input.value = newValue;
}

function validateWeightInput() {
    const input = document.getElementById('setWeight');
    const weight = parseFloat(input.value) || 0;
    const validated = validateWeight(currentExercise, weight);
    input.value = validated;
}

// ===== HELPERS POUR LA GESTION DES SETS =====

// Fonction helper pour sauvegarder localement
function saveSetLocally(setData) {
    const pendingSets = JSON.parse(localStorage.getItem('pendingSets') || '[]');
    
    // Éviter les doublons
    const exists = pendingSets.some(s => 
        s.exercise_id === setData.exercise_id && 
        s.set_number === setData.set_number &&
        s.workout_id === setData.workout_id
    );
    
    if (!exists) {
        pendingSets.push({
            ...setData,
            timestamp: new Date().toISOString(),
            syncStatus: 'pending'
        });
        localStorage.setItem('pendingSets', JSON.stringify(pendingSets));
    }
}

// Fonction helper pour gérer le succès d'une série
function handleSetSuccess(setData, setDuration) {
    // Ajouter à l'historique local avec la durée
    addSetToHistory({...setData, duration: setDuration});
    
    // Sauvegarder dans l'historique de la session
    updateSessionHistory(setData);
    
    // Notification de succès
    showToast(`Série ${currentSetNumber} enregistrée ! (${setDuration}s)`, 'success');
    
    // Son de validation de série
    if (!isSilentMode && window.playBeep) {
        window.playBeep(800, 150);
    }
    
    // Vérification fatigue toutes les 3 séries
    if (currentSetNumber % 3 === 0) {
        checkFatigue(currentWorkout.id).then(fatigue => {
            if (fatigue && fatigue.risk === 'high') {
                showToast(`⚠️ ${fatigue.message}`, 'warning');
            }
        }).catch(() => {
            // Ignorer les erreurs de vérification de fatigue
        });
    }
    
    // Arrêter le timer de série
    if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
    }
    
    // Augmenter légèrement la fatigue pour la prochaine série
    setSelectedFatigue(Math.min(5, selectedFatigue + 0.3));

    // Mettre à jour le temps de repos de la série PRÉCÉDENTE
    updatePreviousSetRestTime().catch(() => {
        // Ignorer les erreurs de mise à jour du temps de repos
    });
    
    // Afficher l'interface de repos
    if (window.showRestInterface) {
        window.showRestInterface({...setData, duration: setDuration});
    }
    
    // Mettre à jour la distribution musculaire
    if (window.updateMuscleDistribution) {
        window.updateMuscleDistribution();
    }
}

// ===== VALIDATION ET ENREGISTREMENT D'UNE SÉRIE =====
async function completeSet() {
    // Validation stricte des entrées
    const weightInput = document.getElementById('setWeight');
    const repsInput = document.getElementById('setReps');
    
    if (!weightInput || !repsInput) {
        showToast('Interface non prête, veuillez patienter', 'error');
        return;
    }
    
    const setDuration = setStartTime ? Math.floor((new Date() - setStartTime) / 1000) : 0;
    
    // Récupérer et valider les valeurs
    let weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value);
    
    // Validation stricte
    if (isNaN(weight)) weight = 0;
    if (isNaN(reps) || reps <= 0) {
        showToast('Veuillez indiquer un nombre de répétitions valide', 'error');
        return;
    }
    
    // Pour les exercices au poids du corps, ajuster si nécessaire
    const isBodyweight = currentExercise.equipment.includes('bodyweight');
    const isTimeBased = TIME_BASED_KEYWORDS.some(keyword => 
        currentExercise.name_fr.toLowerCase().includes(keyword)
    );
    
    // Validation adaptée au type d'exercice
    if (!isTimeBased && weight === 0 && !isBodyweight) {
        showToast('Veuillez indiquer un poids', 'error');
        return;
    }
    
    // Limites raisonnables
    if (weight > 500) {
        showToast('Le poids semble incorrect (max 500kg)', 'error');
        return;
    }
    
    if (!isTimeBased && reps > 100) {
        showToast('Le nombre de répétitions semble incorrect (max 100)', 'error');
        return;
    }
    
    if (isTimeBased && reps > 600) {
        showToast('La durée semble incorrecte (max 10 minutes)', 'error');
        return;
    }
    
    // Préparer les données
    const setData = {
        workout_id: currentWorkout.id,
        exercise_id: currentExercise.id,
        set_number: currentSetNumber,
        target_reps: currentTargetReps,
        actual_reps: reps,
        weight: weight, // Pour bodyweight, c'est le poids du lest (0 = sans lest)
        rest_time: 0,
        fatigue_level: selectedFatigue * 2,
        perceived_exertion: selectedEffort * 2,
        skipped: false,
        // Ajouter des métadonnées pour clarifier
        is_bodyweight: isBodyweight,
        is_time_based: isTimeBased,
        body_weight: isBodyweight ? currentUser.weight : null,
        total_weight: isBodyweight ? (currentUser.weight + weight) : weight
    };
    
    try {
        const result = await createSet(setData);
        
        if (result) {
            // Stocker l'ID pour mise à jour ultérieure du temps de repos
            localStorage.setItem('lastCompletedSetId', result.id);
            
            // Supprimer cette série des données en attente si elle y était
            const pendingSets = JSON.parse(localStorage.getItem('pendingSets') || '[]');
            const filteredPending = pendingSets.filter(s => 
                !(s.exercise_id === setData.exercise_id && 
                  s.set_number === setData.set_number &&
                  s.workout_id === setData.workout_id)
            );
            localStorage.setItem('pendingSets', JSON.stringify(filteredPending));
            
            handleSetSuccess(setData, setDuration);
        } else {
            throw new Error('Échec de l\'enregistrement');
        }
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement:', error);
        
        // Sauvegarder localement en mode hors-ligne
        saveSetLocally(setData);
        
        // Continuer malgré l'erreur
        handleSetSuccess(setData, setDuration);
        
        showToast('Série sauvegardée localement (hors-ligne)', 'warning');
    }
}

// ===== MISE À JOUR DU TEMPS DE REPOS DE LA SÉRIE PRÉCÉDENTE =====
async function updatePreviousSetRestTime() {
    if (currentSetNumber > 1) {
        const previousSetId = localStorage.getItem('lastCompletedSetId');
        const restTime = lastSetEndTime ? Math.floor((new Date() - lastSetEndTime) / 1000) : 0;
        
        if (previousSetId && restTime > 0) {
            await updateSetRestTime(previousSetId, restTime);
        }
    }
}

// ===== PASSER UNE SÉRIE =====
async function skipSet() {
    const setData = {
        workout_id: currentWorkout.id,
        exercise_id: currentExercise.id,
        set_number: currentSetNumber,
        target_reps: 0,
        actual_reps: 0,
        weight: 0,
        rest_time: 0,
        fatigue_level: 0,
        perceived_exertion: 0,
        skipped: true
    };
    
    const result = await createSet(setData);
    
    if (result) {
        showToast('Série passée', 'info');
        incrementSetNumber();
        showSetInput();
    }
}

// ===== HISTORIQUE LOCAL =====
function addSetToHistory(setData) {
    // Enrichir les données avec les informations de l'exercice
    const enrichedData = {
        ...setData,
        bodyPart: currentExercise.body_part,
        exerciseName: currentExercise.name_fr
    };
    
    // Utiliser la fonction importée depuis app-history.js
    addToSessionHistory('set', enrichedData);
}

function updateSessionHistory(setData) {
    const sessionHistory = JSON.parse(localStorage.getItem('currentWorkoutHistory') || '[]');
    
    // Trouver ou créer l'entrée pour cet exercice
    let exerciseEntry = sessionHistory.find(h => h.exerciseId === currentExercise.id);
    
    if (!exerciseEntry) {
        exerciseEntry = {
            exerciseId: currentExercise.id,
            exerciseName: currentExercise.name_fr,
            sets: [],
            timestamp: new Date().toISOString()
        };
        sessionHistory.push(exerciseEntry);
    }
    
    // Ajouter la série
    exerciseEntry.sets.push(setData);
    exerciseEntry.totalSets = exerciseEntry.sets.length;
    
    localStorage.setItem('currentWorkoutHistory', JSON.stringify(sessionHistory));
}

// ===== EXPORT GLOBAL =====
window.showSetInput = showSetInput;
window.selectFatigue = selectFatigue;
window.selectEffort = selectEffort;
window.adjustWeightToNext = adjustWeightToNext;
window.adjustReps = adjustReps;
window.validateWeight = validateWeightInput;
window.completeSet = completeSet;
window.skipSet = skipSet;

// Export pour les autres modules (pas d'export pour ce module car toutes les fonctions sont globales)