// ===== GESTIONNAIRE DE REPOS =====
// Ce fichier gère les périodes de repos entre séries et exercices
// Il inclut les timers, les notifications sonores et les vibrations

import {
    currentExercise,
    currentUser,
    lastSetEndTime,
    setLastSetEndTime,
    restTimerInterval,
    setRestTimerInterval,
    isInRestPeriod,
    setIsInRestPeriod,
    audioContext,
    setAudioContext,
    isSilentMode,
    incrementSetNumber,
    setSetStartTime
} from './app-state.js';

import { updateSetRestTime } from './app-api.js';
import { REST_TARGET_TIME } from './app-config.js';
import { formatWeightDisplay } from './app-equipment.js';
import { addToSessionHistory } from './app-history.js';

// ===== AFFICHAGE DE L'INTERFACE DE REPOS =====
function showRestInterface(setData) {
    const container = document.getElementById('exerciseArea');
    if (!container) return;
    
    setIsInRestPeriod(true);
    setLastSetEndTime(new Date());
    
    container.innerHTML = `
        <div class="current-exercise">
            <h2>${currentExercise.name_fr}</h2>
            <p class="exercise-info">${currentExercise.body_part} • ${currentExercise.level}</p>
        </div>
        
        <div class="rest-timer active">
            <div class="rest-timer-label">Temps de repos</div>
            <div class="rest-timer-display" id="restTimer">0:00</div>
            <div class="rest-info">
                Série ${setData.set_number} terminée : ${formatSetDisplay(setData)}
            </div>
            <button class="btn btn-secondary btn-skip-rest" onclick="skipRestPeriod()">
                ⏭️ Passer le repos
            </button>
        </div>
        
        <div id="previousSets" class="previous-sets">
            ${document.getElementById('previousSets')?.innerHTML || ''}
        </div>
        
        <button class="btn btn-secondary" onclick="finishExerciseDuringRest()">
            Changer d'exercice
        </button>
    `;
    
    startRestTimer(REST_TARGET_TIME);
}

// ===== FORMATAGE DE L'AFFICHAGE D'UNE SÉRIE =====
function formatSetDisplay(setData) {
    // Déterminer le type d'exercice
    const isTimeBased = currentExercise && currentExercise.name_fr.toLowerCase().match(/gainage|planche|plank|vacuum|isométrique/);
    const isBodyweight = currentExercise && currentExercise.equipment.includes('poids_du_corps');
    
    if (isTimeBased) {
        return `${setData.actual_reps} secondes${setData.weight > 0 ? ` avec ${setData.weight}kg` : ''}`;
    } else if (isBodyweight) {
        // Pour bodyweight, utiliser le formatage centralisé
        const weightDisplay = formatWeightDisplay(setData.weight, currentExercise);
        return `${weightDisplay} × ${setData.actual_reps} reps`;
    } else {
        return `${setData.weight}kg × ${setData.actual_reps} reps`;
    }
}

// ===== GESTION DU TIMER DE REPOS =====
function startRestTimer(seconds = 60) {
    // Clear any existing timer first
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        setRestTimerInterval(null);
    }

    // Ajouter une classe pour l'état actif du repos
    const restTimerContainer = document.querySelector('.rest-timer');
    if (restTimerContainer) {
        restTimerContainer.classList.add('active');
    }
    
    const restStartTime = new Date();
    let targetReached = false;
    let lastSecond = -1; // Pour éviter les mises à jour inutiles

    const interval = setInterval(() => {
        const restTimerEl = document.getElementById('restTimer');
        if (!restTimerEl) {
            clearInterval(interval);
            setRestTimerInterval(null);
            return;
        }

        const elapsed = Math.floor((new Date() - restStartTime) / 1000);
        
        // Éviter les mises à jour inutiles
        if (elapsed === lastSecond) return;
        lastSecond = elapsed;
        
        const remaining = Math.max(0, seconds - elapsed);
        
        updateRestTimerDisplay(elapsed);
        
        // Afficher le bouton Continuer après 60 secondes
        if (elapsed >= seconds && !targetReached) {
            targetReached = true;
            showContinueButton();
            
            // Audio/vibration uniquement à 60 secondes
            if (!isSilentMode) {
                playBeep(1000, 300);
            }
            vibrateDevice([200, 100, 200]);
        }
        
        // Audio cues avant 60 secondes
        if (!targetReached && !isSilentMode) {
            if (remaining === 30 || remaining === 10) {
                playBeep(800, 100);
            } else if (remaining === 3 || remaining === 2 || remaining === 1) {
                playBeep(600, 150);
            }
        }
    }, 1000);
    
    setRestTimerInterval(interval);
    
    // Retourner une fonction de cleanup
    return () => {
        if (interval) {
            clearInterval(interval);
            setRestTimerInterval(null);
        }
    };
}

// ===== MISE À JOUR DE L'AFFICHAGE DU TIMER =====
function updateRestTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const display = `${minutes}:${secs.toString().padStart(2, '0')}`;
    
    const restTimerEl = document.getElementById('restTimer');
    if (restTimerEl) {
        restTimerEl.textContent = display;
        
        // Vert jusqu'à 60s, puis orange
        if (seconds <= 60) {
            restTimerEl.style.color = '#10b981';
            restTimerEl.style.fontSize = '1.25rem';
        } else {
            restTimerEl.style.color = '#fb923c'; // Orange après 60s
            restTimerEl.style.fontSize = '1.5rem';
        }
    }
}

// ===== NOTIFICATIONS SONORES =====
function playBeep(frequency, duration) {
    if (!audioContext || isSilentMode) {
        if (!isSilentMode && !audioContext) {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            setAudioContext(context);
        } else {
            return;
        }
    }
        
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
}

// ===== VIBRATION =====
function vibrateDevice(pattern) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

// ===== AFFICHAGE DU BOUTON CONTINUER =====
function showContinueButton() {
    const restTimerContainer = document.querySelector('.rest-timer');
    if (!restTimerContainer) return;
    
    const existingButton = restTimerContainer.querySelector('.btn-continue-rest');
    if (existingButton) return;
    
    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn btn-primary btn-continue-rest';
    continueBtn.textContent = 'Continuer vers la série suivante';
    continueBtn.onclick = () => {
        skipRestPeriod();
    };
    
    restTimerContainer.appendChild(continueBtn);
}

// ===== PASSER LA PÉRIODE DE REPOS =====
function skipRestPeriod() {
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        setRestTimerInterval(null);
    }
    
    const restDuration = lastSetEndTime ? Math.floor((new Date() - lastSetEndTime) / 1000) : 0;
    const lastSetId = localStorage.getItem('lastCompletedSetId');
    
    if (lastSetId && restDuration > 0) {
        updateSetRestTime(lastSetId, restDuration).catch(err => 
            console.error('Failed to update rest time:', err)
        );
    }
    
    // Ajouter le temps de repos à l'historique
    addRestToHistory(restDuration);
    
    if (!isSilentMode) {
        playBeep(600, 100);
    }
    
    setIsInRestPeriod(false);
    incrementSetNumber();
    setSetStartTime(new Date());
    
    // Vérification de sécurité avant d'appeler showSetInput
    if (window.showSetInput) {
        window.showSetInput();
    } else {
        console.error('showSetInput non disponible - vérifiez que app-sets.js est chargé');
    }
}

// ===== CHANGER D'EXERCICE PENDANT LE REPOS =====
function finishExerciseDuringRest() {
    const restDuration = lastSetEndTime ? Math.floor((new Date() - lastSetEndTime) / 1000) : 0;
    const lastSetId = localStorage.getItem('lastCompletedSetId');
    
    if (lastSetId && restDuration > 0) {
        updateSetRestTime(lastSetId, restDuration).catch(err => 
            console.error('Failed to update rest time:', err)
        );
        
        // Ajouter le temps de repos à l'historique avant de changer d'exercice
        addRestToHistory(restDuration);
    }
    
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        setRestTimerInterval(null);
    }
    
    if (window.finishExercise) {
        window.finishExercise();
    }
}

// ===== AJOUT DU REPOS À L'HISTORIQUE =====
function addRestToHistory(duration) {
    if (duration < 5) return; // Ignorer les repos très courts
    
    addToSessionHistory('rest', {
        duration: duration,
        type: 'between_sets'
    });
}

// ===== EXPORT GLOBAL =====
window.showRestInterface = showRestInterface;
window.skipRestPeriod = skipRestPeriod;
window.finishExerciseDuringRest = finishExerciseDuringRest;
window.playBeep = playBeep;
window.addRestToHistory = addRestToHistory;

// Export pour les autres modules
export {
    showRestInterface,
    startRestTimer,
    playBeep,
    vibrateDevice,
    addRestToHistory
};