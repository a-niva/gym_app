// ===== GESTIONNAIRE DE SÉRIES =====
// Version refactorisée - Architecture simplifiée
// Ce fichier gère l'exécution et l'enregistrement des séries

// ===== IMPORTS ET SETUP =====
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
    isSilentMode,
    isAutoWeightEnabled,
    setIsAutoWeightEnabled
} from './app-state.js';

import { showToast, showFatigueModal } from './app-ui.js';
import {
    calculateAvailableWeights,
    validateWeight,
    getExerciseType,
    calculateSuggestedWeight,
    formatWeightDisplay,
    isWeightPossible
} from './app-equipment.js';
import {
    createSet,
    updateSetRestTime,
    checkFatigue,
    getSuggestedWeight,
    getWorkoutAdjustments
} from './app-api.js';
import { TIME_BASED_KEYWORDS } from './app-config.js';
import { addToSessionHistory } from './app-history.js';

// ===== VARIABLES GLOBALES - NOUVEAU SYSTÈME =====
let currentAvailableWeights = [];
let currentWeightIndex = 0;

// ===== INTERFACE POIDS SIMPLIFIÉE =====

async function loadAvailableWeights(exerciseType) {
    try {
        // TENTATIVE d'appel API (nouveau système)
        const response = await fetch(`/api/users/${currentUser.id}/available-weights/${exerciseType}`);
        if (response.ok) {
            const data = await response.json();
            currentAvailableWeights = data.weights || [];
            return currentAvailableWeights;
        }
    } catch (error) {
        console.warn('Endpoint non disponible, fallback ancien système:', error);
    }
    
    // FALLBACK : utiliser l'ancien système
    currentAvailableWeights = calculateAvailableWeights(currentExercise);
    return currentAvailableWeights;
}

async function createWeightInterface(exerciseType, currentWeight) {
    // Charger les poids disponibles
    await loadAvailableWeights(exerciseType);
    
    // Trouver l'index du poids actuel
    currentWeightIndex = currentAvailableWeights.findIndex(w => Math.abs(w - currentWeight) < 0.1);
    if (currentWeightIndex === -1) {
        currentWeightIndex = 0;
    }
    
    // Interface unique pour tous les types
    return `
        <div class="weight-interface">
            <div class="weight-control-row">
                <button class="weight-btn decrease" id="weightDecreaseBtn" onclick="adjustWeight(-1)" 
                        ${currentWeightIndex <= 0 ? 'disabled' : ''}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                    </svg>
                </button>
                
                <div class="weight-display" id="currentWeightDisplay">
                    ${currentWeight}<span class="weight-unit">kg</span>
                </div>
                
                <button class="weight-btn increase" id="weightIncreaseBtn" onclick="adjustWeight(1)"
                        ${currentWeightIndex >= currentAvailableWeights.length - 1 ? 'disabled' : ''}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                </button>
            </div>
            
            <div id="equipmentVisualization">
                ${await getEquipmentVisualization(exerciseType, currentWeight)}
            </div>
        </div>
    `;
}

async function getEquipmentVisualization(exerciseType, weight) {
    try {
        // TENTATIVE d'appel API (nouveau système)
        const response = await fetch(`/api/users/${currentUser.id}/equipment-setup/${exerciseType}/${weight}`);
        if (response.ok) {
            const setup = await response.json();
            
            if (setup.type === 'fixed_dumbbells') {
                return `
                    <div class="dumbbell-visualization">
                        <div class="dumbbell-pair">
                            <div class="dumbbell">${setup.weight_each}kg</div>
                            <div class="dumbbell">${setup.weight_each}kg</div>
                        </div>
                        <div class="setup-description">2 haltères de ${setup.weight_each}kg</div>
                    </div>
                `;
            }
            
            if (setup.type === 'short_barbells') {
                return `
                    <div class="short-barbells-visualization">
                        ${setup.plates_per_dumbbell.map(plate => 
                            `<div class="plate-group">${plate.count}×${plate.weight}kg</div>`
                        ).join(' + ')}
                        <div class="setup-description">
                            2 barres courtes (${setup.bar_weight_each}kg chacune) + disques
                        </div>
                    </div>
                `;
            }
            
            if (setup.type === 'barbell') {
                return `
                    <div class="barbell-visualization">
                        <div class="barbell-setup">
                            Barre ${setup.bar_weight}kg + 
                            ${setup.plates_per_side.map(plate => 
                                `${plate.count}×${plate.weight}kg`
                            ).join(' + ')} par côté
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.warn('Endpoint visualisation non disponible, fallback simple:', error);
    }
    
    // FALLBACK : affichage simple selon le type
    if (exerciseType === 'dumbbells') {
        return `<div class="simple-equipment">Haltères: ${weight}kg total</div>`;
    } else if (exerciseType === 'barbell') {
        return `<div class="simple-equipment">Barre + disques: ${weight}kg total</div>`;
    } else if (exerciseType === 'ez_curl') {
        return `<div class="simple-equipment">Barre EZ + disques: ${weight}kg total</div>`;
    }
    
    return `<div class="simple-equipment">${weight}kg</div>`;
}

function adjustWeight(direction) {
    const newIndex = currentWeightIndex + direction;
    
    if (newIndex >= 0 && newIndex < currentAvailableWeights.length) {
        currentWeightIndex = newIndex;
        const newWeight = currentAvailableWeights[newIndex];
        
        // Mettre à jour l'input caché
        const weightInput = document.getElementById('setWeight');
        if (weightInput) {
            weightInput.value = newWeight;
        }
        
        // Mettre à jour l'affichage
        const display = document.getElementById('currentWeightDisplay');
        if (display) {
            display.innerHTML = `${newWeight}<span class="weight-unit">kg</span>`;
        }
        
        // Mettre à jour les boutons
        updateWeightButtons();
        
        // Mettre à jour la visualisation
        updateEquipmentVisualization();
        
        // Mettre à jour les suggestions visuelles
        updateWeightSuggestionVisual();
    }
}

function updateWeightButtons() {
    const decreaseBtn = document.getElementById('weightDecreaseBtn');
    const increaseBtn = document.getElementById('weightIncreaseBtn');
    
    if (decreaseBtn) {
        decreaseBtn.disabled = currentWeightIndex <= 0;
    }
    if (increaseBtn) {
        increaseBtn.disabled = currentWeightIndex >= currentAvailableWeights.length - 1;
    }
}

async function updateEquipmentVisualization() {
    const container = document.getElementById('equipmentVisualization');
    if (container && currentAvailableWeights[currentWeightIndex]) {
        const exerciseType = getExerciseTypeFromExercise(currentExercise);
        const weight = currentAvailableWeights[currentWeightIndex];
        container.innerHTML = await getEquipmentVisualization(exerciseType, weight);
    }
}

function getExerciseTypeFromExercise(exercise) {
    if (exercise.equipment.includes('dumbbells')) {
        return 'dumbbells';
    }
    if (exercise.equipment.includes('barre_ez') || exercise.equipment.includes('curl')) {
        return 'ez_curl';
    }
    if (exercise.equipment.some(eq => eq.includes('barre') || eq.includes('barbell'))) {
        return 'barbell';
    }
    return 'bodyweight';
}

// ===== FONCTIONS PRINCIPALES =====

async function showSetInput() {
    const container = document.getElementById('exerciseArea');
    if (!container) return;
    
    // DEBUG
    console.log('=== DEBUG showSetInput ===');
    console.log('currentSetNumber:', currentSetNumber);
    console.log('currentWorkout:', currentWorkout);
    console.log('lastCompletedSetId from localStorage:', localStorage.getItem('lastCompletedSetId'));
    console.log('currentExercise:', currentExercise);
    
    const existingHistory = document.getElementById('previousSets');
    const savedHistory = existingHistory ? existingHistory.innerHTML : '';
    const lastCompletedSetId = localStorage.getItem('lastCompletedSetId');

    // DÉCLARATION DE TOUTES LES VARIABLES ICI
    let mlRepsSuggestion = null;
    let mlSuggestion = null;
    let adjustments = null;
    let adjustmentsError = null;

    // NOUVEAU : Récupérer les paramètres guidés si disponibles
    const guidedParams = localStorage.getItem('guidedExerciseParams');
    let isGuidedMode = false;
    let targetSets = null;
    let targetReps = null;
    let suggestedWeight = null;
    let guidedRestTime = null;

    if (guidedParams && currentWorkout && currentWorkout.type === 'adaptive') {
        const params = JSON.parse(guidedParams);
        isGuidedMode = true;
        targetSets = params.targetSets;
        targetReps = params.targetReps;
        suggestedWeight = params.suggestedWeight;
        guidedRestTime = params.restTime;
    }

    // Gestion des ajustements ML pour séances adaptatives
    if (currentWorkout && currentWorkout.type === 'adaptive' && lastCompletedSetId) {
        const lastBodyPart = localStorage.getItem('lastCompletedBodyPart');
        const currentBodyPart = currentExercise.body_part;
        
        console.log('DEBUG - ML Check:', {
            lastBodyPart: lastBodyPart,
            currentBodyPart: currentBodyPart,
            shouldRecalculate: !lastBodyPart || lastBodyPart !== currentBodyPart
        });
        
        if (!lastBodyPart || lastBodyPart !== currentBodyPart) {
            console.log('DEBUG - Changement de partie du corps, appel ML');
            
            const sessionHistory = JSON.parse(localStorage.getItem('currentWorkoutHistory') || '[]');
            const hasValidSets = sessionHistory.some(h => 
                h.sets && h.sets.length > 0 && h.sets[0].workout_id === currentWorkout.id
            );
            
            if (hasValidSets) {
                try {
                    const remainingSets = (currentExercise.sets_reps?.find(sr => sr.level === currentUser?.experience_level)?.sets || 3) - currentSetNumber + 1;
                    
                    adjustments = await getWorkoutAdjustments(
                        currentWorkout.id,
                        lastCompletedSetId,
                        remainingSets
                    );
                    
                    if (adjustments?.adjustments) {
                        const mlWeight = adjustments.adjustments.suggested_weight;
                        if (mlWeight) {
                            localStorage.setItem(`mlWeight_${currentBodyPart}_${currentWorkout.id}`, mlWeight.toString());
                            mlSuggestion = mlWeight;
                        }
                        
                        if (adjustments.adjustments.suggested_reps) {
                            mlRepsSuggestion = adjustments.adjustments.suggested_reps;
                            if (typeof mlRepsSuggestion === 'number') {
                                mlRepsSuggestion = {
                                    optimal: mlRepsSuggestion,
                                    confidence: adjustments.adjustments.rep_confidence || 0.5
                                };
                            }
                        }
                    }
                } catch (error) {
                    console.error('Erreur récupération ML suggestions:', error);
                    adjustmentsError = error;
                }
            }
        } else {
            const savedMLWeight = localStorage.getItem(`mlWeight_${currentBodyPart}_${currentWorkout.id}`);
            if (savedMLWeight) {
                mlSuggestion = parseFloat(savedMLWeight);
                console.log('DEBUG - Réutilisation poids ML pour', currentBodyPart, ':', mlSuggestion);
            }
        }
        
        window.currentMLSuggestion = mlSuggestion;
    }
    
    // Pour les séances adaptatives, utiliser les suggestions du plan guidé si pas de ML
    if (isGuidedMode && !mlSuggestion && suggestedWeight && currentSetNumber === 1) {
        mlSuggestion = suggestedWeight;
        window.currentMLSuggestion = mlSuggestion;
    }

    if (isGuidedMode && !mlRepsSuggestion && targetReps && currentSetNumber === 1) {
        mlRepsSuggestion = {
            optimal: typeof targetReps === 'string' ? parseInt(targetReps.split('-')[0]) : targetReps,
            confidence: 0.8
        };
    }

    // Déterminer le type d'exercice
    const exerciseType = getExerciseType(currentExercise);
    const isTimeBased = exerciseType === 'time_based';
    const isBodyweight = exerciseType === 'bodyweight' || exerciseType === 'weighted_bodyweight';
    
    // Obtenir les poids disponibles selon l'équipement
    const availableWeights = calculateAvailableWeights(currentExercise);
    
    // Déterminer le poids par défaut selon l'état du toggle
    let defaultWeight = 0;

    if (isBodyweight) {
        defaultWeight = 0; // Poids additionnel
    } else if (isAutoWeightEnabled && mlSuggestion) {
        defaultWeight = mlSuggestion;
    } else {
        const lastWeight = await getSuggestedWeight(currentUser.id, currentExercise.id);
        const baseWeight = currentExercise.base_weight || calculateSuggestedWeight(currentExercise, availableWeights);
        defaultWeight = lastWeight || baseWeight || 0;
        
        if (isGuidedMode && suggestedWeight && currentSetNumber === 1) {
            defaultWeight = suggestedWeight;
        }
    }
    
    const weightLabel = isBodyweight ? 
        'Charge additionnelle (kg)' : 
        isTimeBased ? 
        'Charge additionnelle (kg)' : 
        'Poids total (kg)';
    
    const repsLabel = isTimeBased ? 'Durée (secondes)' : 'Répétitions';
    
    const defaultReps = isGuidedMode && targetReps && currentSetNumber === 1 ? 
        (typeof targetReps === 'string' ? parseInt(targetReps.split('-')[0]) : targetReps) : 
        (isTimeBased ? 30 : currentTargetReps);

    container.innerHTML = `
        <div class="current-exercise">
            <h2>${currentExercise.name_fr}</h2>
            <p class="exercise-info">${currentExercise.body_part} • ${currentExercise.level}</p>
        </div>
        
        <div class="set-tracker">
            <h3>Série ${currentSetNumber}${isGuidedMode && targetSets ? ` / ${targetSets}` : ''}</h3>
            ${isGuidedMode ? `
                <div class="guided-targets" style="
                    text-align: center;
                    color: var(--primary);
                    margin-bottom: 1rem;
                    padding: 0.75rem;
                    background: rgba(59, 130, 246, 0.1);
                    border-radius: 8px;
                ">
                    <span style="font-weight: 600;">Objectif :</span> 
                    ${targetReps} reps @ ${suggestedWeight ? suggestedWeight + 'kg' : 'À déterminer'}
                    ${guidedRestTime ? ` • Repos : ${guidedRestTime}s` : ''}
                </div>
            ` : ''}
            <div class="set-timer">Durée: <span id="setTimer">0:00</span></div>
            
            <div class="set-input-grid">
                ${!(isTimeBased && isBodyweight) ? `
                    <div class="input-group">
                        <label>${weightLabel}</label>
                        <div class="weight-selector">
                            <input type="hidden" id="setWeight" value="${defaultWeight}">
                            ${isBodyweight ? 
                                `<span class="weight-info">Poids du corps: ${currentUser?.weight || 75}kg${availableWeights.length > 1 ? ' • Lest disponible: ' + availableWeights.filter(w => w > 0).join(', ') + 'kg' : ''}</span>` :
                                `<div id="barbell-visualization" class="barbell-viz"></div>`}
                        </div>
                        <div class="weight-suggestion-line">
                            <div id="weightSuggestion" class="suggestion-hint">
                                ${mlSuggestion ? `💡 Suggestion ML : ${mlSuggestion}kg${mlSuggestion !== defaultWeight ? ` (${mlSuggestion > defaultWeight ? '+' : ''}${(mlSuggestion - defaultWeight).toFixed(1)}kg)` : ''}` : ''}
                            </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" ${isAutoWeightEnabled ? 'checked' : ''} 
                                        onchange="toggleAutoWeight(this.checked)">
                                    <span class="toggle-slider"></span>
                                    <span class="toggle-label">Auto</span>
                                </label>
                        </div>
                    </div>
                ` : '<input type="hidden" id="setWeight" value="0">'}
                
                <div class="input-group">
                    <label>${repsLabel}</label>
                    <div class="reps-selector">
                        <button onclick="adjustReps(${isTimeBased ? -5 : -1})" 
                                class="btn-adjust ${mlRepsSuggestion && mlRepsSuggestion.optimal < defaultReps ? 'suggest-decrease' : ''}"
                                id="repsDecreaseBtn">-</button>
                        <input type="number" id="setReps" value="${mlRepsSuggestion && mlRepsSuggestion.optimal ? mlRepsSuggestion.optimal : defaultReps}" 
                            min="1" max="${isTimeBased ? 300 : 50}" class="reps-display">
                        <button onclick="adjustReps(${isTimeBased ? 5 : 1})" 
                                class="btn-adjust ${mlRepsSuggestion && mlRepsSuggestion.optimal > defaultReps ? 'suggest-increase' : ''}"
                                id="repsIncreaseBtn">+</button>
                    </div>
                    ${mlRepsSuggestion ? `
                        <div class="suggestion-info" style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--primary);">
                            💡 ML suggère : ${mlRepsSuggestion && mlRepsSuggestion.optimal ? mlRepsSuggestion.optimal : 'calcul en cours...'} reps
                            ${mlRepsSuggestion.confidence > 0.7 ? '(confiance élevée)' : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="effort-selectors">
                <div class="selector-group">
                    <label>Fatigue</label>
                    <div class="emoji-selector" id="fatigueSelector">
                        <span class="emoji-option ${selectedFatigue === 1 ? 'selected' : ''}" data-value="1" onclick="selectFatigue(1)">😄</span>
                        <span class="emoji-option ${selectedFatigue === 2 ? 'selected' : ''}" data-value="2" onclick="selectFatigue(2)">🙂</span>
                        <span class="emoji-option ${selectedFatigue === 3 ? 'selected' : ''}" data-value="3" onclick="selectFatigue(3)">😐</span>
                        <span class="emoji-option ${selectedFatigue === 4 ? 'selected' : ''}" data-value="4" onclick="selectFatigue(4)">😓</span>
                        <span class="emoji-option ${selectedFatigue === 5 ? 'selected' : ''}" data-value="5" onclick="selectFatigue(5)">😵</span>
                    </div>
                </div>
                
                <div class="selector-group">
                    <label>Effort perçu</label>
                    <div class="emoji-selector" id="effortSelector">
                        <span class="emoji-option ${selectedEffort === 1 ? 'selected' : ''}" data-value="1" onclick="selectEffort(1)">🚶</span>
                        <span class="emoji-option ${selectedEffort === 2 ? 'selected' : ''}" data-value="2" onclick="selectEffort(2)">🏃</span>
                        <span class="emoji-option ${selectedEffort === 3 ? 'selected' : ''}" data-value="3" onclick="selectEffort(3)">🏋️</span>
                        <span class="emoji-option ${selectedEffort === 4 ? 'selected' : ''}" data-value="4" onclick="selectEffort(4)">🔥</span>
                        <span class="emoji-option ${selectedEffort === 5 ? 'selected' : ''}" data-value="5" onclick="selectEffort(5)">🌋</span>
                    </div>
                </div>
            </div>
            
            <div class="set-actions">
                <button class="btn btn-primary btn-large" onclick="completeSet()">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Valider la série
                </button>
            </div>
            
            <div id="previousSets" class="previous-sets">
                ${savedHistory}
            </div>
            
            <div class="exercise-controls-adaptive">
                ${isGuidedMode ? `
                    <button class="btn btn-outline" onclick="returnToGuidedInterface()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        Retour au plan
                    </button>
                ` : ''}
                
                <button class="btn btn-text" onclick="finishExercise()">
                    Terminer cet exercice
                </button>
            </div>
        </div>
    `;
    
    // Si c'est un exercice au poids du corps, ajouter les boutons manuellement
    if (isBodyweight && !isTimeBased) {
        const weightInfo = container.querySelector('.weight-info');
        if (weightInfo) {
            const userWeight = currentUser?.weight || 75;
            weightInfo.innerHTML = `
                <div class="bodyweight-selector">
                    <div class="weight-control-row">
                        <button class="weight-btn decrease" id="weightDecreaseBtn" onclick="adjustWeight(-1)">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                            </svg>
                        </button>
                        
                        <div class="weight-display">
                            <span class="bodyweight-label">Poids corps: ${userWeight}kg</span>
                            <span class="additional-weight">+ <span id="additionalWeightDisplay">0</span>kg</span>
                        </div>
                        
                        <button class="weight-btn increase" id="weightIncreaseBtn" onclick="adjustWeight(1)">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    // Démarrer les timers
    startTimers();
    setSetStartTime(new Date());
    
    // Mettre à jour la visualisation après création du DOM
    setTimeout(() => {
        if (!isBodyweight && !isTimeBased) {
            updateBarbellVisualization();
        }
        updateWeightSuggestionVisual();
    }, 150);

    // Gérer le clavier virtuel sur mobile
    const handleViewportChange = () => {
        const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const isKeyboardOpen = viewportHeight < window.screen.height * 0.75;
        const setTracker = document.querySelector('.set-tracker');
        
        if (setTracker) {
            if (isKeyboardOpen) {
                setTracker.style.paddingBottom = '260px';
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

async function updateBarbellVisualization() {
    const container = document.getElementById('barbell-visualization');
    if (!container || !currentExercise) return;
    
    const exerciseType = getExerciseType(currentExercise);
    if (exerciseType === 'bodyweight') return;
    
    const weightInput = document.getElementById('setWeight');
    const currentWeight = parseFloat(weightInput?.value) || 0;
    
    try {
        const exerciseTypeForAPI = getExerciseTypeFromExercise(currentExercise);
        container.innerHTML = await createWeightInterface(exerciseTypeForAPI, currentWeight);
    } catch (error) {
        console.error('Erreur interface poids:', error);
        // Fallback vers interface simple
        container.innerHTML = `
            <div class="weight-control-row">
                <button class="weight-btn decrease" onclick="adjustWeight(-1)">-</button>
                <div class="weight-display">${currentWeight}<span class="weight-unit">kg</span></div>
                <button class="weight-btn increase" onclick="adjustWeight(1)">+</button>
            </div>
        `;
    }
}

function updateWeightSuggestionVisual() {
    const mlSuggestion = window.currentMLSuggestion;
    const currentWeight = parseFloat(document.getElementById('setWeight')?.value || 0);
    
    const decreaseBtn = document.getElementById('weightDecreaseBtn');
    const increaseBtn = document.getElementById('weightIncreaseBtn');

    // Vérifier que les boutons existent avant de les manipuler
    if (!decreaseBtn || !increaseBtn) {
        console.warn('Boutons de poids non trouvés dans updateWeightSuggestionVisual');
        return;
    }
        
    // Retirer les classes existantes
    decreaseBtn.classList.remove('suggest-decrease', 'suggest-pulse');
    increaseBtn.classList.remove('suggest-increase', 'suggest-pulse');
    
    // Gérer l'aspect visuel du texte de suggestion
    const suggestionDiv = document.getElementById('weightSuggestion');
    if (suggestionDiv) {
        if (!isAutoWeightEnabled) {
            suggestionDiv.style.opacity = '0.5';
            suggestionDiv.style.textDecoration = 'line-through';
        } else {
            suggestionDiv.style.opacity = '1';
            suggestionDiv.style.textDecoration = 'none';
        }
    }
    
    // Animation des boutons selon le contexte
    const isAdaptiveWorkout = currentWorkout && currentWorkout.type === 'adaptive';

    if (mlSuggestion && Math.abs(mlSuggestion - currentWeight) > 0.1) {
        if (isAdaptiveWorkout || !isAutoWeightEnabled) {
            if (mlSuggestion < currentWeight) {
                decreaseBtn.classList.add('suggest-decrease', 'suggest-pulse');
            } else if (mlSuggestion > currentWeight) {
                increaseBtn.classList.add('suggest-increase', 'suggest-pulse');
            }
        }
    }

    // Force reflow pour l'animation
    if (decreaseBtn.classList.contains('suggest-pulse')) {
        decreaseBtn.offsetHeight;
    }
    if (increaseBtn.classList.contains('suggest-pulse')) {
        increaseBtn.offsetHeight;
    }
    
    // Mettre à jour le texte de suggestion
    if (suggestionDiv && mlSuggestion) {
        const diff = mlSuggestion - currentWeight;
        const sign = diff > 0 ? '+' : '';
        suggestionDiv.innerHTML = `💡 Suggestion ML : ${mlSuggestion}kg${Math.abs(diff) > 0.1 ? ` (${sign}${diff.toFixed(1)}kg)` : ''}`;
    }
}

// ===== GESTION DES SETS =====

async function completeSet() {
    // Validation stricte des entrées
    const weightInput = document.getElementById('setWeight');
    const repsInput = document.getElementById('setReps');
    
    if (!weightInput || !repsInput) {
        showToast('Interface non prête, veuillez patienter', 'error');
        return;
    }
    
    const setDuration = setStartTime ? Math.floor((new Date() - setStartTime) / 1000) : 0;
    
    let weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value);
    
    // Validation des valeurs
    if (isNaN(weight) || weight < 0) {
        showToast('Poids invalide', 'error');
        weightInput.focus();
        return;
    }
    
    if (isNaN(reps) || reps < 0) {
        showToast('Répétitions invalides', 'error');
        repsInput.focus();
        return;
    }
    
    if (selectedFatigue < 1 || selectedFatigue > 5) {
        showToast('Veuillez indiquer votre niveau de fatigue', 'error');
        return;
    }
    
    if (selectedEffort < 1 || selectedEffort > 5) {
        showToast('Veuillez indiquer votre effort perçu', 'error');
        return;
    }
    
    // Validation équipement si applicable
    if (!isWeightPossible(currentExercise, weight)) {
        const validated = validateWeight(currentExercise, weight);
        if (validated !== weight) {
            showToast(`Poids ajusté à ${validated}kg (le plus proche possible)`, 'warning');
            weightInput.value = validated;
            weight = validated;
        }
    }
    
    // Préparation des données de la série
    const setData = {
        workout_id: currentWorkout.id,
        exercise_id: currentExercise.id,
        set_number: currentSetNumber,
        target_reps: parseInt(currentTargetReps) || reps,
        actual_reps: reps,
        weight: weight,
        rest_time: 0,
        fatigue_level: Math.round(selectedFatigue),
        perceived_exertion: selectedEffort,
        timestamp: new Date().toISOString(),
        duration: setDuration
    };
    
    // Sauvegarder l'ID pour la mise à jour du temps de repos
    localStorage.setItem('lastCompletedSetId', `pending_${Date.now()}`);
    setLastSetEndTime(new Date());
    
    // Tentative d'enregistrement
    try {
        const result = await createSet(setData);
        
        if (result && result.id) {
            localStorage.setItem('lastCompletedSetId', result.id.toString());
            
            // Nettoyer les séries en attente pour éviter les doublons
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
        handleSetSuccess(setData, setDuration);
        showToast('Série sauvegardée localement (hors-ligne)', 'warning');
    }
    
    // GESTION SPÉCIFIQUE DU MODE GUIDÉ
    const guidedPlan = localStorage.getItem('guidedWorkoutPlan');
    if (currentWorkout?.type === 'adaptive' && guidedPlan) {
        const progress = JSON.parse(localStorage.getItem('guidedWorkoutProgress') || '{}');
        progress.completedSets = (progress.completedSets || 0) + 1;
        progress.currentExerciseCompletedSets = currentSetNumber;
        progress.lastSetTimestamp = new Date().toISOString();
        localStorage.setItem('guidedWorkoutProgress', JSON.stringify(progress));
        
        const plan = JSON.parse(guidedPlan);
        const currentExerciseIndex = window.currentExerciseIndex || 0;
        const currentExerciseData = plan.exercises[currentExerciseIndex];
        
        if (currentExerciseData && currentSetNumber >= currentExerciseData.sets) {
            showGuidedExerciseCompletion(currentExerciseData);
            
            if (window.restTimerInterval) {
                clearInterval(window.restTimerInterval);
            }
        }
    }
}

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

// ===== HELPERS ET UTILITAIRES =====

function adjustReps(delta) {
    const input = document.getElementById('setReps');
    const newValue = parseInt(input.value) + delta;
    if (newValue > 0) input.value = newValue;
}

function toggleAutoWeight(enabled) {
    setIsAutoWeightEnabled(enabled);
    
    const mlSuggestion = window.currentMLSuggestion;
    const weightInput = document.getElementById('setWeight');
    
    if (!enabled) {
        showToast('Ajustement automatique désactivé', 'info');
        
        if (weightInput && currentExercise) {
            getSuggestedWeight(currentUser.id, currentExercise.id).then(lastWeight => {
                const baseWeight = currentExercise.base_weight || 
                    calculateSuggestedWeight(currentExercise);
                weightInput.value = lastWeight || baseWeight || 0;
                updateBarbellVisualization();
            });
        }
    } else {
        showToast('Ajustement automatique activé', 'info');
        if (mlSuggestion && weightInput) {
            weightInput.value = mlSuggestion;
            updateBarbellVisualization();
        }
    }
    
    updateWeightSuggestionVisual();
}

function saveSetLocally(setData) {
    const pendingSets = JSON.parse(localStorage.getItem('pendingSets') || '[]');
    
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

function handleSetSuccess(setData, setDuration) {
    addSetToHistory({...setData, duration: setDuration});
    updateSessionHistory(setData);
    
    if (currentExercise && currentExercise.body_part && currentWorkout?.type === 'adaptive') {
        localStorage.setItem('lastCompletedBodyPart', currentExercise.body_part);
    }
    
    showToast(`Série ${currentSetNumber} enregistrée ! (${setDuration}s)`, 'success');
    
    if (!isSilentMode && window.playBeep) {
        window.playBeep(800, 150);
    }
    
    if (currentSetNumber % 3 === 0) {
        checkFatigue(currentWorkout.id).then(fatigue => {
            if (fatigue && fatigue.risk === 'high') {
                showToast(`⚠️ ${fatigue.message}`, 'warning');
                showFatigueModal(fatigue);
            }
        }).catch(() => {});
    }
    
    if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
    }
    
    setSelectedFatigue(Math.min(5, selectedFatigue + 0.3));

    updatePreviousSetRestTime().catch(() => {});
    
    if (window.showRestInterface) {
        window.showRestInterface({...setData, duration: setDuration});
    }
    
    if (window.updateMuscleDistribution) {
        window.updateMuscleDistribution();
    }
}

async function updatePreviousSetRestTime() {
    if (currentSetNumber > 1) {
        const previousSetId = localStorage.getItem('lastCompletedSetId');
        const restTime = lastSetEndTime ? Math.floor((new Date() - lastSetEndTime) / 1000) : 0;
        
        if (previousSetId && restTime > 0) {
            await updateSetRestTime(previousSetId, restTime);
        }
    }
}

function addSetToHistory(setData) {
    const enrichedData = {
        ...setData,
        bodyPart: currentExercise.body_part,
        exerciseName: currentExercise.name_fr
    };
    
    addToSessionHistory('set', enrichedData);
}

function updateSessionHistory(setData) {
    const sessionHistory = JSON.parse(localStorage.getItem('currentWorkoutHistory') || '[]');
    
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
    
    exerciseEntry.sets.push(setData);
    exerciseEntry.totalSets = exerciseEntry.sets.length;
    
    localStorage.setItem('currentWorkoutHistory', JSON.stringify(sessionHistory));
}

function showGuidedExerciseCompletion(exerciseData) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
    `;
    
    modal.innerHTML = `
        <div class="modal guided-completion-modal" style="
            background: var(--dark-lighter);
            border-radius: var(--radius);
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            text-align: center;
            animation: slideIn 0.3s ease;
        ">
            <h3>🎯 Exercice "${exerciseData.exercise_name}" terminé !</h3>
            <p><strong>Objectif :</strong> ${exerciseData.sets} séries</p>
            <p><strong>Réalisé :</strong> ${currentSetNumber} séries</p>
            <div class="modal-actions" style="
                display: flex;
                gap: 1rem;
                margin-top: 1.5rem;
                justify-content: center;
            ">
                <button class="btn btn-primary" onclick="
                    document.querySelector('.modal-overlay').remove(); 
                    const exerciseArea = document.getElementById('exerciseArea');
                    if (exerciseArea) {
                        exerciseArea.innerHTML = '';
                        exerciseArea.style.display = 'none';
                    }
                    const mainContent = document.getElementById('mainContent');
                    if (mainContent) {
                        mainContent.style.display = 'block';
                    }
                    if(window.nextGuidedExercise) window.nextGuidedExercise();
                ">
                    ➡️ Exercice suivant
                </button>
                <button class="btn btn-secondary" onclick="document.querySelector('.modal-overlay').remove();">
                    ➕ Série supplémentaire
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function startTimers() {
    if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
    }
    
    const interval = setInterval(() => {
        if (document.hidden || !document.getElementById('setTimer')) {
            clearInterval(interval);
            setTimerInterval(null);
            return;
        }
        
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
    
    const handleVisibilityChange = () => {
        if (document.hidden && timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
        }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
}

// ===== EXPORTS GLOBAUX =====
window.adjustWeight = adjustWeight;
window.createWeightInterface = createWeightInterface;
window.showSetInput = showSetInput;
window.selectFatigue = selectFatigue;
window.selectEffort = selectEffort;
window.completeSet = completeSet;
window.skipSet = skipSet;
window.showGuidedExerciseCompletion = showGuidedExerciseCompletion;
window.updateBarbellVisualization = updateBarbellVisualization;
window.adjustReps = adjustReps;
window.toggleAutoWeight = toggleAutoWeight;

// COMPATIBILITY : Redirection pour l'ancien système
window.adjustWeightToNext = adjustWeight;
window.validateWeightInput = () => {}; // Devenu inutile avec le nouveau système