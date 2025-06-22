import { currentUser, setCurrentProgram, setUserPrograms } from './app-state.js';
import { showToast } from './app-ui.js';
import { showView } from './app-navigation.js';
import { activateProgram, loadUserPrograms, saveProgram, getUserCommitment, saveUserCommitment } from './app-api.js';

// Variable pour stocker temporairement les paramètres du programme
let pendingProgramParams = null;
let currentGeneratedProgramId = null;

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
                        <option value="never">Jamais</option>
                        <option value="normal" selected>Normal</option>
                        <option value="priority">Priorité</option>
                        <option value="always">Toujours</option>
                        </select>
                    </div>
                    <div class="muscle-priority-item">
                        <span>Dos</span>
                        <select name="back_priority">
                        <option value="never">Jamais</option>
                        <option value="normal" selected>Normal</option>
                        <option value="priority">Priorité</option>
                        <option value="always">Toujours</option>
                        </select>
                    </div>
                    <div class="muscle-priority-item">
                        <span>Épaules</span>
                        <select name="shoulders_priority">
                        <option value="never">Jamais</option>
                        <option value="normal" selected>Normal</option>
                        <option value="priority">Priorité</option>
                        <option value="always">Toujours</option>
                        </select>
                    </div>
                    <div class="muscle-priority-item">
                        <span>Jambes</span>
                        <select name="legs_priority">
                        <option value="never">Jamais</option>
                        <option value="normal" selected>Normal</option>
                        <option value="priority">Priorité</option>
                        <option value="always">Toujours</option>
                        </select>
                    </div>
                    <div class="muscle-priority-item">
                        <span>Bras</span>
                        <select name="arms_priority">
                        <option value="never">Jamais</option>
                        <option value="normal" selected>Normal</option>
                        <option value="priority">Priorité</option>
                        <option value="always">Toujours</option>
                        </select>
                    </div>
                    <div class="muscle-priority-item">
                        <span>Abdos</span>
                        <select name="core_priority">
                        <option value="never">Jamais</option>
                        <option value="normal" selected>Normal</option>
                        <option value="priority">Priorité</option>
                        <option value="always">Toujours</option>
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
    
    // Vérifier que l'utilisateur a un engagement
    const commitment = await getUserCommitment(currentUser.id);
    if (!commitment) {
        resultDiv.innerHTML = `
            <div style="
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 12px;
                padding: 2rem;
                text-align: center;
            ">
                <h3 style="color: #ef4444;">⚠️ Configuration incomplète</h3>
                <p>Veuillez d'abord définir vos préférences d'entraînement</p>
                <button class="btn btn-primary" onclick="showCommitmentForm()">
                    Configurer mes préférences
                </button>
            </div>
        `;
        return;
    }
    
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
            currentGeneratedProgramId = savedProgram.id;
            // Ajouter les boutons d'action stylés
            resultDiv.innerHTML += `
                <div style="
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1));
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    border-radius: 20px;
                    padding: 2.5rem;
                    text-align: center;
                    margin: 2rem 0;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                ">
                    <h3 style="
                        color: #10b981; 
                        margin: 0 0 1rem 0;
                        font-size: 1.8rem;
                        font-weight: 700;
                    ">🎯 Programme prêt !</h3>
                    
                    <p style="
                        color: rgba(255, 255, 255, 0.9); 
                        margin-bottom: 2rem;
                        font-size: 1.1rem;
                    ">
                        Votre programme personnalisé est maintenant disponible
                    </p>
                    
                    <div style="
                        display: flex; 
                        gap: 1.5rem; 
                        justify-content: center; 
                        flex-wrap: wrap;
                    ">
                        <button onclick="activateProgramAndStart(${savedProgram.id})" style="
                            background: linear-gradient(135deg, #10b981, #059669);
                            color: white;
                            border: none;
                            padding: 1rem 2.5rem;
                            border-radius: 15px;
                            font-size: 1.1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                        " onmouseover="this.style.transform='translateY(-2px)'" 
                        onmouseout="this.style.transform='translateY(0)'">
                            🚀 Commencer maintenant
                        </button>
                        
                        <button onclick="saveForLater()" style="
                            background: rgba(255, 255, 255, 0.1);
                            color: white;
                            border: 2px solid rgba(255, 255, 255, 0.2);
                            padding: 1rem 2.5rem;
                            border-radius: 15px;
                            font-size: 1.1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'" 
                        onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
                            💾 Sauvegarder pour plus tard
                        </button>
                    </div>
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
    
    // DEBUG: Logger les informations reçues
    console.group('🔍 Debug génération programme');
    console.log('Programme complet reçu:', program);
    console.log('Nombre de semaines:', program.length > 0 ? Math.max(...program.map(w => w.week)) : 0);
    console.log('Équipement utilisateur:', currentUser.equipment_config);
    
    // Compter les exercices par groupe musculaire
    const muscleGroups = {};
    program.forEach(workout => {
        if (!muscleGroups[workout.muscle_group]) {
            muscleGroups[workout.muscle_group] = 0;
        }
        muscleGroups[workout.muscle_group] += (workout.exercises?.length || 0);
    });
    console.log('Exercices par groupe musculaire:', muscleGroups);
    console.groupEnd();
    
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
    
    // Compter le nombre total d'exercices
    const totalExercises = program.reduce((total, workout) => 
        total + (workout.exercises ? workout.exercises.length : 0), 0
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
                    ${!currentUser.equipment_config.dumbbells.available ? 
                      '<br><strong>💡 Conseil :</strong> Activez les haltères dans votre configuration pour plus d\'exercices.' : 
                      'Cela peut être dû à une incompatibilité avec votre équipement.'}
                </p>
                <button onclick="generateProgram(event)" class="button-primary" style="margin-top: 1rem;">
                    🔄 Réessayer avec d'autres paramètres
                </button>
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
                    Semaine ${week}
                    <span style="
                        margin-left: auto;
                        font-size: 0.9rem;
                        color: rgba(255, 255, 255, 0.6);
                        font-weight: normal;
                    ">${workouts.length} séances</span>
                </h4>
                
                <div id="week-content-${week}" style="
                    padding: 0 1.25rem 1.25rem 1.25rem;
                    ${isFirstWeek ? '' : 'display: none;'}
                ">
                    ${workouts.map(workout => {
                        // Couleurs différentes selon le type de séance
                        const colors = {
                            'Pectoraux/Triceps': '#60a5fa',
                            'Dos/Biceps': '#34d399',
                            'Jambes': '#f59e0b',
                            'Épaules/Abdos': '#a78bfa',
                            'Haut du corps': '#60a5fa',
                            'Bas du corps': '#f59e0b',
                            'Full body': '#ec4899'
                        };
                        const color = colors[workout.muscle_group] || '#60a5fa';
                        
                        return `
                            <div style="
                                margin-top: 1rem;
                                padding: 1rem;
                                background: rgba(255, 255, 255, 0.03);
                                border-radius: 8px;
                                border: 1px solid rgba(255, 255, 255, 0.1);
                            ">
                                <p style="
                                    color: ${color};
                                    margin: 0 0 1rem 0;
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                ">
                                    <strong>Jour ${workout.day} - ${workout.muscle_group}</strong>
                                    <span style="
                                        font-size: 0.9rem;
                                        color: rgba(255, 255, 255, 0.6);
                                    ">${workout.exercises.length} exercices</span>
                                </p>
                                
                                ${workout.exercises.map((ex, idx) => `
                                    <div style="
                                        background: rgba(255, 255, 255, 0.03);
                                        border: 1px solid rgba(255, 255, 255, 0.1);
                                        border-radius: 8px;
                                        padding: 1rem;
                                        margin-bottom: 0.75rem;
                                        display: flex;
                                        align-items: center;
                                        gap: 1rem;
                                    ">
                                        <div style="
                                            color: #3b82f6;
                                            font-weight: bold;
                                            font-size: 1.1rem;
                                            min-width: 25px;
                                        ">${idx + 1}.</div>
                                        
                                        <div style="flex: 1; min-width: 0;">
                                            <div style="
                                                font-weight: 500;
                                                color: white;
                                                margin-bottom: 0.25rem;
                                                word-wrap: break-word;
                                                overflow-wrap: break-word;
                                                hyphens: auto;
                                                line-height: 1.4;
                                            ">${ex.exercise_name}</div>
                                            
                                            <div style="
                                                display: flex;
                                                gap: 1rem;
                                                align-items: center;
                                                flex-wrap: wrap;
                                                font-size: 0.85rem;
                                                color: rgba(255, 255, 255, 0.7);
                                            ">
                                                <span style="
                                                    background: rgba(59, 130, 246, 0.1);
                                                    padding: 0.2rem 0.6rem;
                                                    border-radius: 4px;
                                                    white-space: nowrap;
                                                ">${ex.sets} × ${ex.target_reps}</span>
                                                <span style="
                                                    color: #60a5fa;
                                                    font-weight: 500;
                                                    white-space: nowrap;
                                                ">${ex.predicted_weight}kg</span>
                                                <span style="
                                                    color: rgba(255, 255, 255, 0.5);
                                                    white-space: nowrap;
                                                ">${ex.rest_time}s repos</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });
    
    // Ajouter le bouton de validation
    html += `
        <div style="
            margin-top: 2rem;
            padding: 2rem;
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.3);
            border-radius: 12px;
            text-align: center;
        ">
            <h4 style="color: #22c55e; margin-bottom: 0.5rem;">
                ✅ Programme prêt !
            </h4>
            <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 1.5rem;">
                Commencez dès maintenant ou sauvegardez pour plus tard
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <button onclick="activateProgramAndStart(${currentGeneratedProgramId})" class="button-primary">
                    🚀 Commencer ce programme
                </button>
                <button onclick="saveForLater()" class="button-secondary" style="
                    padding: 0.75rem 2rem;
                    font-size: 1rem;
                ">
                    💾 Sauvegarder pour plus tard
                </button>
            </div>
        </div>
    `;
    
    resultDiv.innerHTML = html;
}


// ===== TOGGLE SEMAINE =====
function toggleWeek(week) {
    const content = document.getElementById(`week-content-${week}`);
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

// ===== SAUVEGARDER POUR PLUS TARD =====
async function saveForLater() {
    if (!currentGeneratedProgramId) {
        showToast('Aucun programme à sauvegarder', 'error');
        return;
    }
    
    showToast('Programme sauvegardé dans vos programmes !', 'success');
    showView('dashboard');
}


// ===== EXPORTS GLOBAUX =====
window.activateProgramAndStart = activateProgramAndStart;
window.saveForLater = saveForLater;
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