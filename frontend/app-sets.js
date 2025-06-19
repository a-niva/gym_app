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

import { showToast } from './app-ui.js';
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
    getSuggestedWeight
} from './app-api.js';
import { TIME_BASED_KEYWORDS } from './app-config.js';
import { addToSessionHistory } from './app-history.js';

// ===== AFFICHAGE DE L'INTERFACE DE SAISIE =====
async function showSetInput() {
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
    
    // Toujours obtenir la suggestion ML (indépendamment du toggle)
    let mlSuggestion = await getSuggestedWeight(currentUser.id, currentExercise.id);
    if (!mlSuggestion && mlSuggestion !== 0) {
        mlSuggestion = calculateSuggestedWeight(currentExercise);
    }
    
    // Stocker la suggestion ML dans une variable globale pour référence
    window.currentMLSuggestion = mlSuggestion;
    
    // Déterminer le poids à afficher dans l'input
    let defaultWeight = 0;
    
    if (isAutoWeightEnabled && mlSuggestion) {
        // Si auto-ajustement activé, utiliser la suggestion ML
        defaultWeight = mlSuggestion;
    } else {
        // Si auto-ajustement désactivé, utiliser le dernier poids
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
    // Mettre à jour les suggestions visuelles après un court délai
    setTimeout(() => {
        updateWeightSuggestionVisual();
    }, 500);
    
    attachWeightChangeListeners();
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
    const totalWeight = parseFloat(weightInput.value) || 0;
    
    // Déterminer le poids de la barre
    const barWeight = getBarWeightForExercise(currentExercise);
    const platesWeight = totalWeight - barWeight;
    
    if (platesWeight < 0) {
        container.innerHTML = '<div class="barbell-error">Poids inférieur au poids de la barre</div>';
        return;
    }
    
    // Calculer la distribution optimale des disques
    const platesPerSide = calculateOptimalPlateDistribution(platesWeight / 2);
    
    // Créer la visualisation
    container.innerHTML = createBarbellHTML(barWeight, platesPerSide);
}

function getBarWeightForExercise(exercise) {
    if (!currentUser?.equipment_config) return 20;
    const config = currentUser.equipment_config;
    
    if (exercise.equipment.includes('barbell_standard')) {
        if (config.barres?.olympique?.available) return 20;
        if (config.barres?.courte?.available) return 2.5;
    } else if (exercise.equipment.includes('barbell_ez')) {
        if (config.barres?.ez?.available) return 10;
    }
    return 20;
}

function calculateOptimalPlateDistribution(targetPerSide) {
    if (!currentUser?.equipment_config?.disques?.weights) return [];
    
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

// Ajouter un listener pour mettre à jour la visualisation
function attachWeightChangeListeners() {
    const weightInput = document.getElementById('setWeight');
    if (weightInput) {
        // Mettre à jour à chaque changement
        weightInput.addEventListener('input', updateBarbellVisualization);
        // Mise à jour initiale
        updateBarbellVisualization();
        
        // Mettre à jour le scintillement après un court délai pour s'assurer que les boutons sont dans le DOM
        setTimeout(() => {
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
    const suggestionDiv = document.getElementById('weightSuggestion');
    if (suggestionDiv && mlSuggestion) {
        const diff = mlSuggestion - currentWeight;
        const sign = diff > 0 ? '+' : '';
        suggestionDiv.innerHTML = `💡 Suggestion ML : ${mlSuggestion}kg${Math.abs(diff) > 0.1 ? ` (${sign}${diff.toFixed(1)}kg)` : ''}`;
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
    
    // Obtenir TOUS les poids possibles (y compris la barre seule)
    const availableWeights = calculateAvailableWeights(currentExercise);
    
    if (availableWeights.length === 0) {
        return;
    }
    
    // Trouver l'index actuel
    let currentIndex = availableWeights.findIndex(w => Math.abs(w - currentWeight) < 0.1);
    
    if (currentIndex === -1) {
        // Si le poids actuel n'est pas dans la liste, trouver le plus proche
        currentIndex = 0;
        let minDiff = Math.abs(availableWeights[0] - currentWeight);
        for (let i = 1; i < availableWeights.length; i++) {
            const diff = Math.abs(availableWeights[i] - currentWeight);
            if (diff < minDiff) {
                minDiff = diff;
                currentIndex = i;
            }
        }
    }
    
    // Calculer le nouvel index souhaité
    const newIndex = currentIndex + direction;
    
    // Logique spéciale pour éviter la barre seule sauf si nécessaire
    const barWeight = getBarWeightForExercise(currentExercise);
    
    if (newIndex >= 0 && newIndex < availableWeights.length) {
        const newWeight = availableWeights[newIndex];
        
        // Si on tombe sur la barre seule ET qu'il y a d'autres options
        if (newWeight === barWeight && availableWeights.length > 2) {
            // Sauter la barre seule dans la direction du mouvement
            const skipIndex = newIndex + direction;
            if (skipIndex >= 0 && skipIndex < availableWeights.length) {
                input.value = availableWeights[skipIndex];
            } else {
                // Si on ne peut pas sauter, rester où on est
                return;
            }
        } else {
            input.value = newWeight;
        }
    }
    
    // Mettre à jour les visualisations
    updateBarbellVisualization();
    updateWeightSuggestionVisual();
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
            const availableWeights = calculateAvailableWeights(currentExercise);
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

// ===== TOGGLE AUTO POIDS =====
function toggleAutoWeight(enabled) {
    setIsAutoWeightEnabled(enabled);
    
    if (!enabled) {
        showToast('Ajustement automatique désactivé', 'info');
        // Mettre à jour les indications visuelles
        updateWeightSuggestionVisual();
    } else {
        // Si on réactive, appliquer la suggestion ML
        showToast('Ajustement automatique activé', 'info');
        const mlSuggestion = window.currentMLSuggestion;
        if (mlSuggestion) {
            document.getElementById('setWeight').value = mlSuggestion;
            // Mettre à jour la visualisation de la barre
            updateBarbellVisualization();
        }
        // Mettre à jour l'affichage
        updateWeightSuggestionVisual();
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
window.validateWeight = validateWeightInput;
window.completeSet = completeSet;
window.skipSet = skipSet;

// Export pour les autres modules (pas d'export pour ce module car toutes les fonctions sont globales)