// ===== MODULES/UTILS.JS - FONCTIONS UTILITAIRES =====

import { getState, setState } from '../core/state.js';
import { TIMER_CONFIG, AUDIO_CONFIG, REST_TIMES } from '../core/config.js';

// Affichage des notifications toast
export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, TIMER_CONFIG.TOAST_DURATION);
}

// Gestion du timer de série
export function startTimer() {
    const existingInterval = getState('timerInterval');
    if (existingInterval) {
        clearInterval(existingInterval);
    }
    
    const startTime = getState('setStartTime');
    if (!startTime) return;
    
    const updateTimer = () => {
        const elapsed = Math.floor((new Date() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        const timerElement = document.getElementById('setTimer');
        if (timerElement) {
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, TIMER_CONFIG.SET_TIMER_UPDATE);
    setState('timerInterval', interval);
}

// Gestion du timer de repos
export function startRestTimer(duration) {
    const existingInterval = getState('restTimerInterval');
    if (existingInterval) {
        clearInterval(existingInterval);
    }
    
    setState('isInRestPeriod', true);
    setState('currentRestTime', duration);
    
    const container = document.getElementById('exerciseArea');
    if (!container) return;
    
    const currentExercise = getState('currentExercise');
    const currentSetNumber = getState('currentSetNumber');
    const sessionHistory = getState('sessionHistory');
    
    // Obtenir l'historique des séries pour cet exercice
    const previousSets = sessionHistory
        .filter(h => h.type === 'set' && h.data.exerciseName === currentExercise.name_fr)
        .map(h => h.data);
    
    container.innerHTML = `
        <div class="rest-period">
            <h2>Temps de repos</h2>
            <div class="rest-timer-display" id="restTimerDisplay">${duration}</div>
            <div class="rest-progress">
                <div class="rest-progress-bar" id="restProgressBar"></div>
            </div>
            
            <div class="rest-info">
                <p>${currentExercise.name_fr} - Prochaine série: ${currentSetNumber}</p>
            </div>
            
            ${previousSets.length > 0 ? `
                <div class="previous-sets-summary">
                    <h4>Séries précédentes</h4>
                    ${previousSets.map((set, idx) => `
                        <div class="previous-set-line">
                            Série ${idx + 1}: ${set.weight}kg × ${set.reps} reps
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="rest-actions">
                <button class="btn btn-secondary" onclick="skipRestPeriod()">Passer le repos</button>
                <button class="btn btn-primary" onclick="completeSetAndFinish()">Terminer l'exercice</button>
            </div>
        </div>
    `;
    
    let remaining = duration;
    const startTime = Date.now();
    
    const updateRestTimer = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        remaining = Math.max(0, duration - elapsed);
        
        const display = document.getElementById('restTimerDisplay');
        const progressBar = document.getElementById('restProgressBar');
        
        if (display) {
            display.textContent = remaining;
        }
        
        if (progressBar) {
            const progress = ((duration - remaining) / duration) * 100;
            progressBar.style.width = `${progress}%`;
        }
        
        // Alerte sonore à 10 secondes de la fin
        if (remaining === AUDIO_CONFIG.REST_WARNING_TIME && !getState('isSilentMode')) {
            playRestAlert();
        }
        
        if (remaining === 0) {
            clearInterval(interval);
            setState('restTimerInterval', null);
            finishRestPeriod();
        }
    };
    
    updateRestTimer();
    const interval = setInterval(updateRestTimer, 1000);
    setState('restTimerInterval', interval);
}

// Fin de la période de repos
export function finishRestPeriod() {
    setState('isInRestPeriod', false);
    
    if (!getState('isSilentMode')) {
        playRestEndAlert();
    }
    
    // Ajouter le repos à l'historique
    const restTime = getState('currentRestTime');
    if (restTime > 0) {
        addRestToHistory(restTime);
    }
    
    // Afficher l'interface pour la prochaine série
    import('./exercises.js').then(module => {
        module.showSetInput();
    });
}

// Passer la période de repos
export function skipRestPeriod() {
    const restTimerInterval = getState('restTimerInterval');
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        setState('restTimerInterval', null);
    }
    
    finishRestPeriod();
}

// Terminer la série et l'exercice
export function completeSetAndFinish() {
    skipRestPeriod();
    
    import('./exercises.js').then(module => {
        module.finishExercise();
    });
}

// Terminer l'exercice pendant le repos
export function finishExerciseDuringRest() {
    const restTimerInterval = getState('restTimerInterval');
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        setState('restTimerInterval', null);
    }
    
    setState('isInRestPeriod', false);
    
    import('./exercises.js').then(module => {
        module.finishExercise();
    });
}

// Ajout du repos à l'historique
export function addRestToHistory(duration) {
    const sessionHistory = getState('sessionHistory');
    const lastCompletedSetId = localStorage.getItem('lastCompletedSetId');
    
    if (lastCompletedSetId && duration > 0) {
        // Mettre à jour le temps de repos sur le serveur
        fetch(`/api/sets/${lastCompletedSetId}/rest-time`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rest_time: duration })
        }).catch(err => console.error('Erreur mise à jour temps repos:', err));
    }
    
    const historyEntry = {
        type: 'rest',
        timestamp: new Date(),
        data: {
            duration: duration,
            type: 'between_sets'
        }
    };
    
    sessionHistory.push(historyEntry);
    setState('sessionHistory', sessionHistory);
    localStorage.setItem('currentSessionHistory', JSON.stringify(sessionHistory));
}

// Gestion audio
export function playRestAlert() {
    const audioContext = getState('audioContext') || new (window.AudioContext || window.webkitAudioContext)();
    setState('audioContext', audioContext);
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = AUDIO_CONFIG.REST_ALERT_FREQUENCY;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
}

export function playRestEndAlert() {
    const audioContext = getState('audioContext') || new (window.AudioContext || window.webkitAudioContext)();
    setState('audioContext', audioContext);
    
    // Double beep pour la fin du repos
    for (let i = 0; i < 2; i++) {
        setTimeout(() => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = AUDIO_CONFIG.REST_ALERT_FREQUENCY * 1.5;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
        }, i * 200);
    }
}

// Calcul des poids disponibles pour un exercice
export function calculateAvailableWeights(exercise) {
    if (!exercise) return [];
    
    const config = getState('equipmentConfig');
    const currentUser = getState('currentUser');
    const weights = new Set();
    
    // Poids du corps
    if (exercise.equipment.includes('bodyweight')) {
        const bodyWeight = currentUser ? currentUser.weight : 70;
        weights.add(bodyWeight);
        
        // Ajouter les combinaisons avec lests
        if (config.autres.lest_corps && config.autres.lest_corps.length > 0) {
            config.autres.lest_corps.forEach(lest => {
                weights.add(bodyWeight + lest);
            });
        }
        
        if (exercise.equipment.includes('lest_possible')) {
            weights.add(0); // Option sans charge additionnelle
        }
    }
    
    // Barres
    if (exercise.equipment.includes('barbell_standard') || 
        exercise.equipment.includes('barbell_olympic') || 
        exercise.equipment.includes('barbell_ez')) {
        
        let barWeight = 0;
        
        if (exercise.equipment.includes('barbell_olympic')) {
            if (config.barres?.olympique?.available) barWeight = 20;
        } else if (exercise.equipment.includes('barbell_standard')) {
            if (config.barres?.olympique?.available) barWeight = 20;
            else if (config.barres?.courte?.available) barWeight = 2.5;
        } else if (exercise.equipment.includes('barbell_ez')) {
            if (config.barres?.ez?.available) barWeight = 10;
        }
        
        if (barWeight > 0) {
            weights.add(barWeight);
            
            // Générer toutes les combinaisons possibles avec les disques
            if (config.disques) {
                const disqueWeights = [];
                Object.entries(config.disques).forEach(([weight, count]) => {
                    for (let i = 0; i < count; i++) {
                        disqueWeights.push(parseFloat(weight));
                    }
                });
                
                // Algorithme pour générer toutes les combinaisons possibles
                const generateCombinations = (arr, maxPairs) => {
                    const combinations = new Set([0]);
                    
                    for (let i = 0; i < arr.length; i++) {
                        const newCombinations = new Set();
                        combinations.forEach(existing => {
                            for (let pairs = 1; pairs <= maxPairs && pairs <= Math.floor((arr.length - i) / 2); pairs++) {
                                newCombinations.add(existing + arr[i] * 2 * pairs);
                            }
                        });
                        newCombinations.forEach(c => combinations.add(c));
                    }
                    
                    return Array.from(combinations);
                };
                
                const possibleAdditions = generateCombinations(disqueWeights, 10);
                possibleAdditions.forEach(addition => {
                    if (addition <= 200) { // Limite raisonnable
                        weights.add(barWeight + addition);
                    }
                });
            }
        }
    }
    
    // Haltères
    if (exercise.equipment.includes('dumbbells') && config.dumbbells) {
        Object.entries(config.dumbbells).forEach(([weight, count]) => {
            if (count > 0) {
                weights.add(parseFloat(weight) * 2); // Paire d'haltères
            }
        });
    }
    
    // Kettlebells
    if (exercise.equipment.includes('kettlebell') && config.kettlebells) {
        Object.entries(config.kettlebells).forEach(([weight, count]) => {
            if (count > 0) {
                weights.add(parseFloat(weight));
            }
        });
    }
    
    // Élastiques
    if (exercise.equipment.includes('resistance_bands') && config.elastiques) {
        config.elastiques.forEach(band => {
            weights.add(band.resistance);
            
            // Combinaisons d'élastiques
            config.elastiques.forEach(band2 => {
                if (band !== band2) {
                    weights.add(band.resistance + band2.resistance);
                }
            });
        });
    }
    
    // Filtrer et trier
    return Array.from(weights)
        .filter(w => w >= 0 && w <= 300)
        .sort((a, b) => a - b);
}

// Formatage de date
export function formatDate(date) {
    return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Formatage de durée
export function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// Calcul de l'IMC
export function calculateBMI(weight, height) {
    return (weight / Math.pow(height / 100, 2)).toFixed(1);
}

// Détection du type d'exercice
export function isTimeBasedExercise(exerciseName) {
    const TIME_BASED_KEYWORDS = ['gainage', 'planche', 'plank', 'vacuum', 'isométrique'];
    return TIME_BASED_KEYWORDS.some(keyword => 
        exerciseName.toLowerCase().includes(keyword)
    );
}

// Utilitaire pour grouper un tableau par propriété
export function groupBy(array, key) {
    return array.reduce((result, item) => {
        const group = item[key];
        if (!result[group]) result[group] = [];
        result[group].push(item);
        return result;
    }, {});
}