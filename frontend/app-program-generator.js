import { currentUser, setCurrentProgram } from './app-state.js';
import { showToast } from './app-ui.js';
import { showView } from './app-navigation.js';
import { activateProgram, loadUserPrograms, saveProgram, getUserCommitment, saveUserCommitment } from './app-api.js';

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
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                padding: 2rem;
                border-radius: 16px;
                margin-bottom: 2rem;
            }
            
            .commitment-section h3 {
                color: white;
                margin-bottom: 0.5rem;
                font-size: 1.25rem;
            }
            
            .frequency-selector, .time-selector {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                gap: 1rem;
                margin-top: 1rem;
            }
            
            .frequency-btn, .time-btn {
                padding: 1rem;
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.7);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.25rem;
            }
            
            .frequency-btn:hover, .time-btn:hover {
                border-color: #3b82f6;
                background: rgba(59, 130, 246, 0.1);
                transform: translateY(-2px);
            }
            
            .frequency-btn.selected, .time-btn.selected {
                background: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }
            
            .frequency-btn small, .time-btn small {
                display: block;
                font-size: 0.75rem;
                font-weight: 400;
                opacity: 0.8;
            }
            
            .muscle-priority-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-top: 1rem;
            }
            
            .muscle-priority-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .muscle-priority-item span {
                color: rgba(255, 255, 255, 0.9);
            }
            
            .muscle-priority-item select {
                padding: 0.5rem;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                color: white;
                font-size: 0.875rem;
                cursor: pointer;
            }
            
            .muscle-priority-item select option {
                background: #1e293b;
                color: white;
            }
            
            .btn-primary {
                background: #10b981;
                color: white;
                border: none;
                padding: 1rem 2rem;
                border-radius: 12px;
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                width: 100%;
            }
            
            .btn-primary:hover {
                background: #059669;
                transform: translateY(-2px);
            }
            
            .loading-container {
                text-align: center;
                padding: 3rem;
                color: rgba(255, 255, 255, 0.7);
            }
            
            .loading-spinner {
                width: 48px;
                height: 48px;
                border: 3px solid rgba(255, 255, 255, 0.1);
                border-top-color: #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
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

// ===== TRANSFORMATION DU PROGRAMME POUR SAUVEGARDE =====
function transformProgramForSaving(program, weeks, frequency) {
    const programData = {
        name: `Programme ${weeks} semaines - ${frequency}j/sem`,
        duration_weeks: weeks,
        frequency: frequency,
        program_days: []
    };
    
    // Grouper par semaine et jour
    const groupedDays = {};
    
    program.forEach(item => {
        const key = `${item.week}-${item.day}`;
        if (!groupedDays[key]) {
            groupedDays[key] = {
                week_number: item.week,
                day_number: item.day,
                muscle_group: item.muscle_group,
                exercises: []
            };
        }
        
        item.exercises.forEach((ex, index) => {
            groupedDays[key].exercises.push({
                exercise_id: ex.exercise_id,
                sets: ex.sets,
                target_reps: ex.target_reps,
                rest_time: ex.rest_time,
                order_index: index,
                predicted_weight: ex.predicted_weight
            });
        });
    });
    
    programData.program_days = Object.values(groupedDays);
    
    return programData;
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



// ===== AFFICHAGE DU PROGRAMME GÉNÉRÉ =====
function displayProgram(program) {
    const resultDiv = document.getElementById('programResult');
    
    // Vérifier que le programme contient des données
    if (!program || program.length === 0) {
        resultDiv.innerHTML = `
            <div style="
                text-align: center;
                padding: 2rem;
                color: var(--gray);
            ">
                <p>❌ Aucun exercice généré</p>
                <p>Veuillez réessayer</p>
            </div>
        `;
        return;
    }
    
    // Grouper par semaine
    const weeklyProgram = {};
    program.forEach(workout => {
        if (!weeklyProgram[workout.week]) {
            weeklyProgram[workout.week] = [];
        }
        weeklyProgram[workout.week].push(workout);
    });
    
    let html = `
        <h3 style="
            color: white; 
            margin: 2rem 0 1rem 0;
            text-align: center;
        ">Votre programme personnalisé</h3>
        
        <p style="
            text-align: center;
            color: var(--gray);
            margin-bottom: 2rem;
            font-size: 0.9rem;
        ">
            💡 Cliquez sur une semaine pour voir le détail des exercices
        </p>
    `;
    
    Object.entries(weeklyProgram).forEach(([week, workouts], index) => {
        // Déplier automatiquement la première semaine
        const isFirstWeek = index === 0;
        
        html += `
            <div class="week-section" style="
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                margin-bottom: 1rem;
                overflow: hidden;
                transition: all 0.3s;
            ">
                <h4 onclick="toggleWeek(${week})" style="
                    cursor: pointer;
                    margin: 0;
                    padding: 1.25rem;
                    color: #3b82f6;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: rgba(59, 130, 246, 0.1);
                    transition: background 0.2s;
                    user-select: none;
                " onmouseover="this.style.background='rgba(59, 130, 246, 0.2)'" 
                   onmouseout="this.style.background='rgba(59, 130, 246, 0.1)'">
                    <span class="week-toggle" id="toggle-week-${week}" style="
                        font-size: 0.8rem;
                        transition: transform 0.2s;
                        ${isFirstWeek ? 'transform: rotate(90deg);' : ''}
                    ">▶</span>
                    <span style="flex: 1;">Semaine ${week}</span>
                    <span style="
                        font-size: 0.875rem;
                        color: rgba(255, 255, 255, 0.6);
                    ">${workouts.length} séances</span>
                </h4>
                
                <div id="week-${week}" class="week-content" style="
                    padding: 1.5rem;
                    ${isFirstWeek ? 'display: block;' : 'display: none;'}
                    animation: ${isFirstWeek ? 'fadeIn 0.3s ease-out' : 'none'};
                ">
        `;
        
        // Afficher chaque jour de la semaine
        workouts.forEach(workout => {
            const exerciseCount = workout.exercises ? workout.exercises.length : 0;
            
            html += `
                <div class="workout-day" style="
                    margin-bottom: 2rem;
                    padding-bottom: 2rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                ">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 1rem;
                    ">
                        <h5 style="
                            color: #10b981;
                            margin: 0;
                            font-size: 1.1rem;
                        ">Jour ${workout.day} - ${workout.muscle_group}</h5>
                        <span style="
                            background: rgba(16, 185, 129, 0.2);
                            color: #10b981;
                            padding: 0.25rem 0.75rem;
                            border-radius: 999px;
                            font-size: 0.875rem;
                        ">${exerciseCount} exercices</span>
                    </div>
            `;
            
            // Vérifier si les exercices existent
            if (workout.exercises && workout.exercises.length > 0) {
                html += `
                    <div class="exercise-list" style="
                        display: flex;
                        flex-direction: column;
                        gap: 0.75rem;
                    ">
                `;
                
                workout.exercises.forEach((ex, exIndex) => {
                    html += `
                        <div class="exercise-item" style="
                            background: rgba(255, 255, 255, 0.03);
                            padding: 1rem;
                            border-radius: 8px;
                            border-left: 3px solid #3b82f6;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='rgba(255, 255, 255, 0.05)'"
                           onmouseout="this.style.background='rgba(255, 255, 255, 0.03)'">
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                align-items: start;
                                margin-bottom: 0.5rem;
                            ">
                                <strong style="color: white; font-size: 1rem;">
                                    ${exIndex + 1}. ${ex.exercise_name || 'Exercice'}
                                </strong>
                                <span style="
                                    background: rgba(59, 130, 246, 0.2);
                                    color: #3b82f6;
                                    padding: 0.25rem 0.75rem;
                                    border-radius: 999px;
                                    font-size: 0.875rem;
                                    font-weight: 600;
                                ">${ex.sets} × ${ex.target_reps}</span>
                            </div>
                            <div style="
                                display: flex;
                                gap: 2rem;
                                color: rgba(255, 255, 255, 0.6);
                                font-size: 0.875rem;
                            ">
                                <span>💪 ${ex.predicted_weight || 0}kg suggéré</span>
                                <span>⏱️ ${ex.rest_time || 60}s repos</span>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
            } else {
                html += `
                    <p style="
                        color: var(--gray);
                        text-align: center;
                        padding: 1rem;
                        background: rgba(255, 255, 255, 0.03);
                        border-radius: 8px;
                    ">
                        Aucun exercice pour ce jour
                    </p>
                `;
            }
            
            html += '</div>';
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    // Ajouter l'animation CSS si elle n'existe pas
    if (!document.getElementById('program-animations')) {
        const style = document.createElement('style');
        style.id = 'program-animations';
        style.textContent = `
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .week-section:hover {
                border-color: rgba(59, 130, 246, 0.3) !important;
            }
            
            .exercise-item:hover {
                transform: translateX(5px);
            }
        `;
        document.head.appendChild(style);
    }
    
    resultDiv.innerHTML = html;
    
    // Si aucun exercice dans aucune semaine, afficher un message d'erreur
    const totalExercises = Object.values(weeklyProgram).reduce((acc, week) => 
        acc + week.reduce((sum, workout) => 
            sum + (workout.exercises ? workout.exercises.length : 0), 0
        ), 0
    );
    
    if (totalExercises === 0) {
        resultDiv.innerHTML = `
            <div style="
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 12px;
                padding: 2rem;
                text-align: center;
                margin-top: 2rem;
            ">
                <h3 style="color: #ef4444; margin-bottom: 1rem;">
                    ⚠️ Programme incomplet
                </h3>
                <p style="color: rgba(255, 255, 255, 0.7);">
                    Le programme a été généré mais ne contient aucun exercice.
                    Cela peut être dû à une incompatibilité avec votre équipement.
                </p>
                <button class="btn btn-primary" onclick="showProgramGenerator()" style="margin-top: 1rem;">
                    Réessayer avec d'autres paramètres
                </button>
            </div>
        `;
    }
}

// ===== TOGGLE SEMAINE =====
function toggleWeek(week) {
    const content = document.getElementById(`week-${week}`);
    const toggle = document.getElementById(`toggle-week-${week}`);
    
    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'block';
        toggle.style.transform = 'rotate(90deg)';
        
        // Animation d'ouverture
        content.style.opacity = '0';
        content.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            content.style.transition = 'opacity 0.3s, transform 0.3s';
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }, 10);
    } else {
        // Animation de fermeture
        content.style.opacity = '0';
        content.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            content.style.display = 'none';
            toggle.style.transform = 'rotate(0deg)';
        }, 300);
    }
}

// ===== ACTIVATION ET DÉMARRAGE DU PROGRAMME =====
async function activateProgramAndStart(programId) {
    const success = await activateProgram(programId);
    if (success) {
        // Charger le programme actif
        const programs = await loadUserPrograms(currentUser.id);
        const activeProgram = programs.find(p => p.id === programId);
        if (activeProgram) {
            setCurrentProgram(activeProgram);
        }
        
        // Retourner au dashboard
        showView('dashboard');
    }
}

window.activateProgramAndStart = activateProgramAndStart;

// ===== EXPORTS GLOBAUX =====
window.showProgramGenerator = showProgramGenerator;
window.generateProgram = generateProgram;
window.selectFrequency = selectFrequency;  
window.selectTime = selectTime;            
window.submitCommitment = submitCommitment;
window.resetCommitment = resetCommitment;  
window.toggleWeek = toggleWeek;
window.activateProgramAndStart = activateProgramAndStart;

// Export pour les modules
export { showProgramGenerator };