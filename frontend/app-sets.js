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


// ===== MISE À JOUR VISUELLE DES SUGGESTIONS =====
async function updateWeightSuggestionVisual() {
    const mlSuggestion = window.currentMLSuggestion;
    const currentWeight = parseFloat(document.getElementById('setWeight').value);
    
    const decreaseBtn = document.getElementById('weightDecreaseBtn');
    const increaseBtn = document.getElementById('weightIncreaseBtn');
    
    // Retirer les classes existantes
    if (decreaseBtn) {
        decreaseBtn.classList.remove('suggest-decrease', 'suggest-pulse');
    }
    if (increaseBtn) {
        increaseBtn.classList.remove('suggest-increase', 'suggest-pulse');
    }
    
    // NOUVEAU : Gérer l'aspect visuel du texte de suggestion
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
    
    // Animation des boutons seulement si auto désactivé
    if (!isAutoWeightEnabled && mlSuggestion && Math.abs(mlSuggestion - currentWeight) > 0.1) {
        if (mlSuggestion < currentWeight && decreaseBtn) {
            // Le poids suggéré est INFÉRIEUR, donc suggérer une DIMINUTION
            decreaseBtn.classList.add('suggest-decrease', 'suggest-pulse');
        } else if (mlSuggestion > currentWeight && increaseBtn) {
            // Le poids suggéré est SUPÉRIEUR, donc suggérer une AUGMENTATION
            increaseBtn.classList.add('suggest-increase', 'suggest-pulse');
        }
    }
    
    // Mettre à jour le texte de suggestion
    if (suggestionDiv && mlSuggestion) {
        const diff = mlSuggestion - currentWeight;
        const sign = diff > 0 ? '+' : '';
        suggestionDiv.innerHTML = `💡 Suggestion ML : ${mlSuggestion}kg${Math.abs(diff) > 0.1 ? ` (${sign}${diff.toFixed(1)}kg)` : ''}`;
    }
}

// ===== AFFICHAGE DE L'INTERFACE DE SAISIE =====
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
    console.log('DEBUG - lastCompletedSetId récupéré:', lastCompletedSetId);

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

    // Récupérer les suggestions ML uniquement si on a une série valide pour cet exercice
    if (currentSetNumber > 1 && currentWorkout && lastCompletedSetId) {
        // Vérifier que la dernière série appartient bien à cet exercice ET ce workout
        const sessionHistory = JSON.parse(localStorage.getItem('currentWorkoutHistory') || '[]');
        const currentExerciseHistory = sessionHistory.find(h => h.exerciseId === currentExercise.id);
        
        // Si on a bien des séries pour CET exercice dans CE workout
        if (currentExerciseHistory && currentExerciseHistory.sets && currentExerciseHistory.sets.length > 0) {
            const lastSet = currentExerciseHistory.sets[currentExerciseHistory.sets.length - 1];
            
            // Vérifier que le lastCompletedSetId correspond au workout actuel
            if (lastSet.workout_id === currentWorkout.id) {
                try {
                    const remainingSets = (currentExercise.sets_reps?.[0]?.sets || 3) - currentSetNumber + 1;
                    
                    console.log('DEBUG - Appel getWorkoutAdjustments avec:', {
                        workoutId: currentWorkout.id,
                        setId: lastCompletedSetId,
                        remainingSets: remainingSets,
                        exerciseId: currentExercise.id
                    });
                    
                    adjustments = await getWorkoutAdjustments(
                        currentWorkout.id,
                        lastCompletedSetId,
                        remainingSets
                    );
                    
                    console.log('DEBUG - Réponse adjustments:', adjustments);
                    
                    if (adjustments && adjustments.adjustments) {
                        if (adjustments.adjustments.suggested_reps) {
                            mlRepsSuggestion = {
                                optimal: adjustments.adjustments.suggested_reps,
                                min: adjustments.adjustments.rep_range?.min || adjustments.adjustments.suggested_reps - 2,
                                max: adjustments.adjustments.rep_range?.max || adjustments.adjustments.suggested_reps + 2,
                                confidence: adjustments.adjustments.rep_confidence || 0.5
                            };
                        }
                        
                        // AJOUT : Afficher les recommandations
                        if (adjustments.recommendations && adjustments.recommendations.length > 0) {
                            const firstRecommendation = adjustments.recommendations[0];
                            showToast(`💡 ${firstRecommendation}`, 'info');
                        }
                    }
                } catch (error) {
                    console.error('DEBUG - Erreur getWorkoutAdjustments:', error);
                    localStorage.removeItem('lastCompletedSetId');
                }
            } else {
                console.log('DEBUG - lastCompletedSetId ne correspond pas au workout actuel, nettoyage');
                localStorage.removeItem('lastCompletedSetId');
            }
        } else {
            console.log('DEBUG - Pas d\'historique pour cet exercice, nettoyage lastCompletedSetId');
            localStorage.removeItem('lastCompletedSetId');
        }
    }
    
    setSetStartTime(new Date());
    setLastSetEndTime(null);
    
    // Déterminer le type d'exercice
    const isTimeBased = TIME_BASED_KEYWORDS.some(keyword => 
        currentExercise.name_fr.toLowerCase().includes(keyword)
    );
    const isBodyweight = currentExercise.equipment.includes('poids_du_corps');
    
    // Calculer les poids disponibles pour cet exercice
    let availableWeights = calculateAvailableWeights(currentExercise);
    
    // Toujours obtenir la suggestion ML (indépendamment du toggle)
    try {
        mlSuggestion = await getSuggestedWeight(currentUser.id, currentExercise.id);
    } catch (error) {
        console.warn('Impossible de récupérer la suggestion ML:', error);
    }

    // Si pas de suggestion ML, utiliser le calcul local
    if (!mlSuggestion && mlSuggestion !== 0) {
        mlSuggestion = calculateSuggestedWeight(currentExercise);
    }
    
    // AJOUT : Appliquer le multiplicateur de poids APRÈS avoir obtenu mlSuggestion
    if (adjustments && adjustments.adjustments && adjustments.adjustments.weight_multiplier && mlSuggestion) {
        mlSuggestion = Math.round(mlSuggestion * adjustments.adjustments.weight_multiplier);
        console.log('DEBUG - Nouvelle suggestion de poids ajustée:', mlSuggestion);
    }

    // CORRECTION : Vérifier que la suggestion ML n'est pas inférieure au poids de la barre
    if (mlSuggestion && currentExercise.equipment.some(eq => eq.includes('barbell'))) {
        const barWeight = getBarWeightForExercise(currentExercise);
        if (mlSuggestion < barWeight) {
            console.warn(`Suggestion ML (${mlSuggestion}kg) inférieure au poids de la barre (${barWeight}kg). Ajustement à ${barWeight}kg`);
            mlSuggestion = barWeight;
        }
    }

    // NOUVEAU : En mode guidé, privilégier le poids suggéré du plan
    if (isGuidedMode && suggestedWeight) {
        // Si on a un poids suggéré par le plan guidé et pas de ML ou si c'est la première série
        if (!mlSuggestion || currentSetNumber === 1) {
            mlSuggestion = suggestedWeight;
        }
    }

    // Stocker globalement pour référence
    window.currentMLRepsSuggestion = mlRepsSuggestion;
    window.currentMLSuggestion = mlSuggestion;
    
    // Le reste de votre code reste identique...
    // Déterminer le poids à afficher dans l'input
    let defaultWeight = 0;
    
    if (isAutoWeightEnabled && mlSuggestion) {
        defaultWeight = mlSuggestion;
    } else {
        const previousSetHistory = JSON.parse(localStorage.getItem('currentWorkoutHistory') || '[]');
        const lastSetForExercise = previousSetHistory
            .filter(h => h.exerciseId === currentExercise.id)
            .flatMap(h => h.sets || [])
            .slice(-1)[0];
        
        if (lastSetForExercise) {
            defaultWeight = lastSetForExercise.weight;
        } else if (availableWeights.length > 0) {
            defaultWeight = availableWeights[Math.floor(availableWeights.length / 2)];
        } else {
            defaultWeight = 20;
        }
    }
    
    // Adapter les labels selon le type d'exercice
    const weightLabel = isBodyweight && !isTimeBased ? 
        'Charge additionnelle (kg)' : 
        isTimeBased ? 
        'Charge additionnelle (kg)' : 
        'Poids total (kg)';
    
    const repsLabel = isTimeBased ? 'Durée (secondes)' : 'Répétitions';
    
    // NOUVEAU : En mode guidé, utiliser les répétitions cibles comme valeur par défaut
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
            
            <div class="set-input-grid-vertical">
                ${!(isTimeBased && isBodyweight) ? `
                    <div class="input-group">
                        <label>${weightLabel}</label>
                        <input type="hidden" id="setWeight" value="${defaultWeight}">
                            <div class="weight-info">
                                ${isBodyweight ? 
                                    `Poids du corps: ${currentUser?.weight || 75}kg${availableWeights.length > 1 ? ' • Lest disponible: ' + availableWeights.filter(w => w > 0).join(', ') + 'kg' : ''}` :
                                    currentExercise.equipment.some(eq => eq.includes('barbell')) ?
                                    `<div id="barbell-visualization" class="barbell-viz"></div>` :
                                    availableWeights.length > 0 ? 
                                    `Poids disponibles: ${availableWeights.slice(0, 5).join(', ')}${availableWeights.length > 5 ? '...' : ''} kg` : 
                                    'Aucun poids configuré'}
                            </div>
                            <div class="weight-suggestion-line">
                                <div id="weightSuggestion" class="suggestion-hint">
                                    ${mlSuggestion ? `💡 Suggestion ML : ${mlSuggestion}kg${mlSuggestion !== defaultWeight ? ` (${mlSuggestion > defaultWeight ? '+' : ''}${(mlSuggestion - defaultWeight).toFixed(1)}kg)` : ''}` : ''}
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" id="autoWeightToggle" 
                                        ${isAutoWeightEnabled ? 'checked' : ''} 
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
                        <input type="number" id="setReps" value="${mlRepsSuggestion ? mlRepsSuggestion.optimal : defaultReps}" 
                            min="1" max="${isTimeBased ? 300 : 50}" class="reps-display">
                        <button onclick="adjustReps(${isTimeBased ? 5 : 1})" 
                                class="btn-adjust ${mlRepsSuggestion && mlRepsSuggestion.optimal > defaultReps ? 'suggest-increase' : ''}"
                                id="repsIncreaseBtn">+</button>
                    </div>
                    ${mlRepsSuggestion ? `
                        <div class="suggestion-info" style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--primary);">
                            💡 ML suggère : ${mlRepsSuggestion.optimal} reps 
                            ${mlRepsSuggestion.confidence > 0.7 ? '(haute confiance)' : ''}
                        </div>
                    ` : ''}
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
    
    // Mettre à jour les suggestions visuelles après un court délai
    setTimeout(() => {
        updateWeightSuggestionVisual();
    }, 500);
    
    attachWeightChangeListeners();
    setTimeout(() => {
        if (currentExercise.equipment.some(eq => eq.includes('barbell'))) {
            updateBarbellVisualization();
        }
    }, 50);
    
    // Forcer la mise à jour des suggestions visuelles après un court délai
    setTimeout(() => {
        updateWeightSuggestionVisual();
    }, 100);
}

// ===== VISUALISATION DE LA BARRE =====
function updateBarbellVisualization() {
    const container = document.getElementById('barbell-visualization');
    if (!container) return;
    
    const weightInput = document.getElementById('setWeight');
    if (!weightInput) return; // Vérifier que l'input existe
    
    const totalWeight = parseFloat(weightInput.value) || 0;
    
    // Si pas de poids valide, ne pas afficher d'erreur
    if (totalWeight === 0 && !currentExercise.equipment.includes('poids_du_corps')) {
        // Toujours afficher l'interface avec boutons, même si le poids est 0
        container.innerHTML = createSimplifiedWeightInterface(0);
        return;
    }
    
    // Déterminer le poids de la barre
    const barWeight = getBarWeightForExercise(currentExercise);
    const platesWeight = totalWeight - barWeight;
    
    if (platesWeight < 0) {
        // Afficher l'interface quand même, mais avec juste la barre
        container.innerHTML = createSimplifiedWeightInterface(barWeight);
        return;
    }
    
    // Calculer la distribution optimale des disques
    const platesPerSide = calculateOptimalPlateDistribution(platesWeight / 2);

    // Si pas de disques configurés, afficher une interface simplifiée
    if (!currentUser?.equipment_config?.disques?.weights || Object.keys(currentUser.equipment_config.disques.weights).length === 0) {
        container.innerHTML = createSimplifiedWeightInterface(totalWeight);
        return;
    }

    // Créer la visualisation normale
    container.innerHTML = createBarbellHTML(barWeight, platesPerSide);
}

function getBarWeightForExercise(exercise) {
    if (!currentUser?.equipment_config) return 20;
    const config = currentUser.equipment_config;
    
    if (exercise.equipment.includes('barre_olympique')) {
        if (config.barres?.olympique?.available) return 20;
        if (config.barres?.courte?.available) return 2.5;
    } else if (exercise.equipment.includes('barre_ez')) {
        if (config.barres?.ez?.available) return 10;
    }
    return 20;
}

function calculateOptimalPlateDistribution(targetPerSide) {
    if (!currentUser?.equipment_config?.disques?.weights) {
    console.warn('Aucune configuration de disques trouvée pour l\'utilisateur');
    return [];
    }
    
    const availablePlates = currentUser.equipment_config.disques.weights;
    const result = [];
    let remaining = targetPerSide;
    
    // Trier les disques par poids décroissant
    const sortedPlates = Object.entries(availablePlates)
        .filter(([w, count]) => count > 0)
        .map(([w, count]) => ({weight: parseFloat(w), count: Math.floor(count / 2)}))
        .sort((a, b) => b.weight - a.weight);
    
    // Algorithme glouton optimisé
    for (const plate of sortedPlates) {
        while (remaining >= plate.weight && plate.count > 0) {
            const used = result.find(p => p.weight === plate.weight);
            if (used) {
                used.count++;
            } else {
                result.push({weight: plate.weight, count: 1});
            }
            remaining -= plate.weight;
            plate.count--;
        }
    }
    
    // Si on n'a pas pu faire le poids exact, retourner la meilleure approximation
    if (remaining > 0.1) {
        return [{weight: 0, count: 0, error: true}];
    }
    
    return result;
}

function createBarbellHTML(barWeight, platesPerSide) {
    // Calculer le poids total
    const totalPlatesWeight = platesPerSide.reduce((sum, p) => sum + (p.weight * p.count * 2), 0);
    const totalWeight = barWeight + totalPlatesWeight;
    
    // Créer le HTML avec le nouveau layout
    let html = `
        <div class="barbell-card-integrated">
            <div class="weight-control-row">
                <button class="weight-btn decrease" id="weightDecreaseBtn" onclick="adjustWeightToNext(-1)">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                    </svg>
                </button>
                
                <div class="barbell-total-integrated">${totalWeight}<span class="weight-unit">kg</span></div>
                
                <button class="weight-btn increase" id="weightIncreaseBtn" onclick="adjustWeightToNext(1)">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                </button>
            </div>
            
            <div class="barbell-plates-visualization">
    `;
    
    // Disques côté gauche (ordre inversé pour la symétrie)
    platesPerSide.slice().reverse().forEach(plate => {
        for (let i = 0; i < plate.count; i++) {
            html += `<div class="plate-integrated left" data-weight="${plate.weight}">${plate.weight}</div>`;
        }
    });
    
    // Barre centrale
    html += `<div class="bar-integrated">${barWeight}</div>`;
    
    // Disques côté droit
    platesPerSide.forEach(plate => {
        for (let i = 0; i < plate.count; i++) {
            html += `<div class="plate-integrated right" data-weight="${plate.weight}">${plate.weight}</div>`;
        }
    });
    
    html += `
            </div>
            
            <div class="barbell-detail">
                ${platesPerSide.map(p => `${p.count}×${p.weight}kg`).join(' + ')} par côté
            </div>
        </div>
    `;
    
    return html;
}

function createSimplifiedWeightInterface(totalWeight) {
    return `
        <div class="barbell-card-integrated">
            <div class="weight-control-row">
                <button class="weight-btn decrease" id="weightDecreaseBtn" onclick="adjustWeightToNext(-1)">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                    </svg>
                </button>
                
                <div class="barbell-total-integrated">${totalWeight}<span class="weight-unit">kg</span></div>
                
                <button class="weight-btn increase" id="weightIncreaseBtn" onclick="adjustWeightToNext(1)">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                </button>
            </div>
            
            <div class="barbell-detail" style="color: var(--warning); margin-top: 10px;">
                ⚠️ Configurez vos disques dans votre profil pour voir la répartition
            </div>
        </div>
    `;
}

// Ajouter un listener pour mettre à jour la visualisation
function attachWeightChangeListeners() {
    const weightInput = document.getElementById('setWeight');
    if (weightInput) {
        // Mettre à jour à chaque changement
        weightInput.addEventListener('input', updateBarbellVisualization);
        
        // NOUVEAU : S'assurer que la mise à jour initiale se fait même si la valeur est déjà présente
        setTimeout(() => {
            // Forcer la mise à jour si une valeur existe
            if (weightInput.value && parseFloat(weightInput.value) > 0) {
                updateBarbellVisualization();
            }
            updateWeightSuggestionVisual();
        }, 100);
    }
}

// ===== CHARGEMENT DES SUGGESTIONS DE POIDS =====
async function loadWeightSuggestion() {
    // Cette fonction ne fait plus rien si appelée directement
    // Les suggestions sont maintenant gérées dans showSetInput()
    return;
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
    
    // Utiliser la fonction d'app-equipment qui calcule TOUS les poids possibles
    const availableWeights = calculateAvailableWeights(currentExercise);
    
    if (availableWeights.length === 0) {
        return;
    }
    
    // Trouver l'index actuel
    let currentIndex = availableWeights.findIndex(w => Math.abs(w - currentWeight) < 0.1);
    
    if (currentIndex === -1) {
        // Trouver le plus proche
        let minDiff = Infinity;
        for (let i = 0; i < availableWeights.length; i++) {
            const diff = Math.abs(availableWeights[i] - currentWeight);
            if (diff < minDiff) {
                minDiff = diff;
                currentIndex = i;
            }
        }
    }
    
    // Naviguer dans la liste
    const newIndex = currentIndex + direction;
    
    if (newIndex >= 0 && newIndex < availableWeights.length) {
        input.value = availableWeights[newIndex];
        updateBarbellVisualization();
        updateWeightSuggestionVisual();
    }
}

function adjustReps(delta) {
    const input = document.getElementById('setReps');
    const newValue = parseInt(input.value) + delta;
    if (newValue > 0) input.value = newValue;
}

// ===== VALIDATION DU POIDS SAISI =====
function validateWeightInput() {
    const weightInput = document.getElementById('setWeight');
    const currentWeight = parseFloat(weightInput.value);
    
    if (isNaN(currentWeight)) return;
    
    const validated = validateWeight(currentExercise, currentWeight);
    
    if (validated !== currentWeight) {
        weightInput.value = validated;
        
        // Message explicatif si le poids n'est pas possible
        if (!isWeightPossible(currentExercise, currentWeight)) {
            let availableWeights = calculateAvailableWeights(currentExercise);  
            // Pour les exercices avec barbell, filtrer les poids inférieurs à la barre
            if (currentExercise.equipment.some(eq => eq.includes('barbell'))) {
                const barWeight = getBarWeightForExercise(currentExercise);
                const filteredWeights = availableWeights.filter(w => w >= barWeight);
                if (filteredWeights.length > 0) {
                    availableWeights = filteredWeights;  
                }
            }
            const nearbyWeights = availableWeights
                .filter(w => Math.abs(w - currentWeight) <= 10)
                .slice(0, 5);
            
            showToast(
                `Poids ${currentWeight}kg impossible. Alternatives : ${nearbyWeights.join(', ')}kg`,
                'warning'
            );
        }
    }
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
    
    let weight = parseFloat(weightInput.value);  // Changé en 'let' au lieu de 'const'
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
    
    // Validation équipement si applicable (NOUVEAU CODE ICI)
    if (!isWeightPossible(currentExercise, weight)) {
        const validated = validateWeight(currentExercise, weight);
        if (validated !== weight) {
            showToast(`Poids ajusté à ${validated}kg (le plus proche possible)`, 'warning');
            weightInput.value = validated;
            // Mettre à jour la variable weight avec la valeur validée
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
        weight: weight,  // Utilisera le poids validé si ajusté
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
            // Mise à jour de l'ID réel
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
        
        // Continuer malgré l'erreur
        handleSetSuccess(setData, setDuration);
        
        showToast('Série sauvegardée localement (hors-ligne)', 'warning');
    }
    
    // GESTION SPÉCIFIQUE DU MODE GUIDÉ
    const guidedPlan = localStorage.getItem('guidedWorkoutPlan');
    if (currentWorkout?.type === 'adaptive' && guidedPlan) {
        // Mettre à jour la progression du plan guidé
        const progress = JSON.parse(localStorage.getItem('guidedWorkoutProgress') || '{}');
        progress.completedSets = (progress.completedSets || 0) + 1;
        progress.currentExerciseCompletedSets = currentSetNumber;
        progress.lastSetTimestamp = new Date().toISOString();
        localStorage.setItem('guidedWorkoutProgress', JSON.stringify(progress));
        
        // Vérifier si l'exercice est terminé selon le plan
        const plan = JSON.parse(guidedPlan);
        const currentExerciseIndex = window.currentExerciseIndex || 0;
        const currentExerciseData = plan.exercises[currentExerciseIndex];
        
        if (currentExerciseData && currentSetNumber >= currentExerciseData.sets) {
            // Afficher immédiatement la modal, pas après le repos
            showGuidedExerciseCompletion(currentExerciseData);
            
            // Empêcher l'affichage du repos normal
            if (window.restTimerInterval) {
                clearInterval(window.restTimerInterval);
            }
        }
    }
}

// Fonction helper pour la complétion d'exercice en mode guidé
function showGuidedExerciseCompletion(exerciseData) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal guided-completion-modal">
            <h3>🎯 Exercice "${exerciseData.exercise_name}" terminé !</h3>
            <p><strong>Objectif :</strong> ${exerciseData.sets} séries</p>
            <p><strong>Réalisé :</strong> ${currentSetNumber} séries</p>
            <div class="modal-actions">
                <button class="btn btn-primary" onclick="document.querySelector('.modal-overlay').remove(); if(window.nextGuidedExercise) window.nextGuidedExercise();">
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
                showFatigueModal(fatigue);
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

// ===== TOGGLE AUTO POIDS =====
function toggleAutoWeight(enabled) {
    setIsAutoWeightEnabled(enabled);
    
    if (!enabled) {
        showToast('Ajustement automatique désactivé', 'info');
        updateWeightSuggestionVisual();  // REMPLACER le commentaire
    } else {
        showToast('Ajustement automatique activé', 'info');
        const mlSuggestion = window.currentMLSuggestion;
        if (mlSuggestion) {
            document.getElementById('setWeight').value = mlSuggestion;
            updateBarbellVisualization();
        }
        updateWeightSuggestionVisual();  // AJOUTER ICI AUSSI
    }
}

window.toggleAutoWeight = toggleAutoWeight;

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
window.validateWeightInput = validateWeightInput;
window.completeSet = completeSet;
window.skipSet = skipSet;
window.showGuidedExerciseCompletion = showGuidedExerciseCompletion;
