// frontend/app-program-generator.js - Version refonte complète

import { currentUser, setCurrentProgram, getUserCommitment } from './app-state.js';
import { showToast } from './app-ui.js';
import { showView } from './app-navigation.js';
import { activateProgram, loadUserPrograms, saveProgram, saveUserCommitment } from './app-api.js';

// Variable pour stocker temporairement les paramètres du programme
let pendingProgramParams = null;

// ===== AFFICHAGE DE L'INTERFACE DE GÉNÉRATION =====
async function showProgramGenerator() {
    const container = document.getElementById('mainContent');
    if (!container) {
        const mainDiv = document.createElement('div');
        mainDiv.className = 'view';
        mainDiv.id = 'program-generator';
        mainDiv.innerHTML = '<div id="mainContent"></div>';
        document.querySelector('.container').appendChild(mainDiv);
    }
    
    const content = document.getElementById('mainContent') || container;
    
    // Vérifier si l'utilisateur a déjà un engagement
    const commitment = await getUserCommitment(currentUser.id);
    
    if (!commitment) {
        // Afficher le formulaire d'engagement d'abord
        showCommitmentForm(content);
    } else {
        // Afficher directement le formulaire de génération
        showProgramForm(content, commitment);
    }
    
    showView('program-generator');
}

// ===== FORMULAIRE D'ENGAGEMENT =====
function showCommitmentForm(container) {
    container.innerHTML = `
        <h2>🎯 Définir vos objectifs d'entraînement</h2>
        <p style="color: var(--gray-light); margin-bottom: 2rem;">
            Avant de créer votre programme, définissons vos disponibilités
        </p>
        
        <form id="commitmentForm" onsubmit="submitCommitment(event)">
            <div class="commitment-section">
                <h3>Fréquence d'entraînement</h3>
                <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 1rem;">
                    Combien de séances par semaine pouvez-vous faire de manière réaliste ?
                </p>
                <div class="frequency-selector">
                    <button type="button" class="frequency-btn" data-frequency="2" onclick="selectFrequency(this)">
                        2<small>2 jours/sem</small>
                    </button>
                    <button type="button" class="frequency-btn" data-frequency="3" onclick="selectFrequency(this)">
                        3<small>3 jours/sem</small>
                    </button>
                    <button type="button" class="frequency-btn selected" data-frequency="4" onclick="selectFrequency(this)">
                        4<small>4 jours/sem</small>
                    </button>
                    <button type="button" class="frequency-btn" data-frequency="5" onclick="selectFrequency(this)">
                        5<small>5 jours/sem</small>
                    </button>
                    <button type="button" class="frequency-btn" data-frequency="6" onclick="selectFrequency(this)">
                        6<small>6 jours/sem</small>
                    </button>
                </div>
            </div>
            
            <div class="commitment-section">
                <h3>Durée par séance</h3>
                <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 1rem;">
                    Combien de temps pouvez-vous consacrer à chaque séance ?
                </p>
                <div class="time-selector">
                    <button type="button" class="time-btn" data-time="30" onclick="selectTime(this)">
                        30 min<small>Court</small>
                    </button>
                    <button type="button" class="time-btn" data-time="45" onclick="selectTime(this)">
                        45 min<small>Standard</small>
                    </button>
                    <button type="button" class="time-btn selected" data-time="60" onclick="selectTime(this)">
                        60 min<small>Complet</small>
                    </button>
                    <button type="button" class="time-btn" data-time="90" onclick="selectTime(this)">
                        90 min<small>Long</small>
                    </button>
                </div>
            </div>
            
            <div class="commitment-section">
                <h3>Priorités musculaires (optionnel)</h3>
                <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 1rem;">
                    Y a-t-il des muscles que vous souhaitez développer en priorité ?
                </p>
                <div class="muscle-priority-grid">
                    <div class="muscle-priority-item">
                        <span>Pectoraux</span>
                        <select name="chest_priority">
                            <option value="normal">Normal</option>
                            <option value="priority">Priorité</option>
                            <option value="maintain">Maintenir</option>
                        </select>
                    </div>
                    <div class="muscle-priority-item">
                        <span>Dos</span>
                        <select name="back_priority">
                            <option value="normal">Normal</option>
                            <option value="priority">Priorité</option>
                            <option value="maintain">Maintenir</option>
                        </select>
                    </div>
                    <div class="muscle-priority-item">
                        <span>Épaules</span>
                        <select name="shoulders_priority">
                            <option value="normal">Normal</option>
                            <option value="priority">Priorité</option>
                            <option value="maintain">Maintenir</option>
                        </select>
                    </div>
                    <div class="muscle-priority-item">
                        <span>Jambes</span>
                        <select name="legs_priority">
                            <option value="normal">Normal</option>
                            <option value="priority">Priorité</option>
                            <option value="maintain">Maintenir</option>
                        </select>
                    </div>
                    <div class="muscle-priority-item">
                        <span>Bras</span>
                        <select name="arms_priority">
                            <option value="normal">Normal</option>
                            <option value="priority">Priorité</option>
                            <option value="maintain">Maintenir</option>
                        </select>
                    </div>
                    <div class="muscle-priority-item">
                        <span>Abdos</span>
                        <select name="core_priority">
                            <option value="normal">Normal</option>
                            <option value="priority">Priorité</option>
                            <option value="maintain">Maintenir</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary" style="margin-top: 2rem;">
                Continuer vers la création du programme
            </button>
        </form>
    `;
    
    // Ajouter les styles si pas déjà présents
    if (!document.getElementById('commitment-styles')) {
        const style = document.createElement('style');
        style.id = 'commitment-styles';
        style.textContent = `
            .commitment-section {
                background: var(--surface);
                padding: 1.5rem;
                border-radius: 12px;
                margin-bottom: 1.5rem;
            }
            
            .frequency-selector, .time-selector {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                gap: 0.75rem;
            }
            
            .frequency-btn, .time-btn {
                padding: 1rem 0.5rem;
                background: var(--background);
                border: 2px solid var(--border);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
                font-weight: 600;
            }
            
            .frequency-btn:hover, .time-btn:hover {
                border-color: var(--primary);
                transform: translateY(-2px);
            }
            
            .frequency-btn.selected, .time-btn.selected {
                background: var(--primary);
                color: white;
                border-color: var(--primary);
            }
            
            .frequency-btn small, .time-btn small {
                display: block;
                font-size: 0.75rem;
                font-weight: 400;
                opacity: 0.8;
                margin-top: 0.25rem;
            }
            
            .muscle-priority-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 1rem;
            }
            
            .muscle-priority-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem;
                background: var(--background);
                border-radius: 8px;
            }
            
            .muscle-priority-item select {
                padding: 0.25rem 0.5rem;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 4px;
                font-size: 0.875rem;
            }
        `;
        document.head.appendChild(style);
    }
}

// ===== FORMULAIRE DE GÉNÉRATION DE PROGRAMME =====
function showProgramForm(container, commitment) {
    // Durée par défaut basée sur la fréquence
    const defaultWeeks = commitment.sessions_per_week <= 3 ? 8 : 6;
    
    container.innerHTML = `
        <h2>📋 Générer un programme</h2>
        <p style="color: var(--gray-light); margin-bottom: 2rem;">
            Programme basé sur ${commitment.sessions_per_week} séances/semaine de ${commitment.time_per_session} minutes
        </p>
        
        <form id="programForm" onsubmit="generateProgram(event)">
            <div class="form-group">
                <label>Durée du programme</label>
                <select name="weeks" class="form-input">
                    <option value="4">4 semaines</option>
                    <option value="6" ${defaultWeeks === 6 ? 'selected' : ''}>6 semaines</option>
                    <option value="8" ${defaultWeeks === 8 ? 'selected' : ''}>8 semaines</option>
                    <option value="12">12 semaines</option>
                </select>
            </div>
            
            <button type="submit" class="btn btn-primary" style="margin-top: 1.5rem;">
                🚀 Générer le programme
            </button>
            
            <button type="button" class="btn btn-secondary" style="margin-top: 1rem;" onclick="resetCommitment()">
                Modifier mes préférences
            </button>
        </form>
        
        <div id="programResult" style="margin-top: 2rem;"></div>
    `;
}

// ===== GESTION DES SÉLECTIONS =====
function selectFrequency(btn) {
    document.querySelectorAll('.frequency-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

function selectTime(btn) {
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

// ===== SOUMISSION DE L'ENGAGEMENT =====
async function submitCommitment(event) {
    event.preventDefault();
    
    const selectedFrequency = document.querySelector('.frequency-btn.selected');
    const selectedTime = document.querySelector('.time-btn.selected');
    
    if (!selectedFrequency || !selectedTime) {
        showToast('Veuillez sélectionner une fréquence et une durée', 'error');
        return;
    }
    
    // Collecter les priorités musculaires
    const focusMuscles = {};
    const muscles = ['chest', 'back', 'shoulders', 'legs', 'arms', 'core'];
    
    muscles.forEach(muscle => {
        const priority = document.querySelector(`select[name="${muscle}_priority"]`).value;
        if (priority !== 'normal') {
            focusMuscles[muscle] = priority;
        }
    });
    
    const commitment = {
        sessions_per_week: parseInt(selectedFrequency.dataset.frequency),
        time_per_session: parseInt(selectedTime.dataset.time),
        focus_muscles: focusMuscles
    };
    
    try {
        await saveUserCommitment(currentUser.id, commitment);
        showToast('Préférences enregistrées !', 'success');
        
        // Afficher maintenant le formulaire de génération
        const container = document.getElementById('mainContent');
        showProgramForm(container, commitment);
    } catch (error) {
        console.error('Error saving commitment:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
    }
}

// ===== RÉINITIALISER L'ENGAGEMENT =====
async function resetCommitment() {
    if (confirm('Voulez-vous modifier vos préférences d\'entraînement ?')) {
        const container = document.getElementById('mainContent');
        showCommitmentForm(container);
    }
}

// ===== GÉNÉRATION DU PROGRAMME =====
async function generateProgram(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const weeks = parseInt(formData.get('weeks'));
    
    // Récupérer l'engagement actuel
    const commitment = await getUserCommitment(currentUser.id);
    const frequency = commitment.sessions_per_week;
    
    const resultDiv = document.getElementById('programResult');
    resultDiv.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Génération du programme en cours...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`/api/users/${currentUser.id}/program`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weeks, frequency })
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors de la génération');
        }
        
        const data = await response.json();
        const program = data.program;
        
        // Afficher le programme
        displayProgram(program);
        
        // Transformer et sauvegarder le programme
        const programToSave = transformProgramForSaving(program, weeks, frequency);
        const savedProgram = await saveProgram(programToSave);
        
        if (savedProgram) {
            resultDiv.innerHTML += `
                <div style="margin-top: 2rem; text-align: center;">
                    <button class="btn btn-primary" onclick="activateProgramAndStart(${savedProgram.id})">
                        🚀 Commencer ce programme
                    </button>
                </div>
            `;
        }
        
        showToast('Programme généré avec succès !', 'success');
        
    } catch (error) {
        console.error('Erreur:', error);
        resultDiv.innerHTML = `
            <div class="error-message">
                <p>❌ Erreur lors de la génération du programme</p>
                <p>Veuillez réessayer</p>
            </div>
        `;
    }
}

// [Le reste du code reste identique : displayProgram, transformProgramForSaving, etc.]

// ===== EXPORTS GLOBAUX =====
window.showProgramGenerator = showProgramGenerator;
window.generateProgram = generateProgram;
window.selectFrequency = selectFrequency;
window.selectTime = selectTime;
window.submitCommitment = submitCommitment;
window.resetCommitment = resetCommitment;
window.toggleWeek = toggleWeek;
window.activateProgramAndStart = activateProgramAndStart;

export { showProgramGenerator };