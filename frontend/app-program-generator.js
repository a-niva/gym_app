import { currentUser, setCurrentProgram } from './app-state.js';
import { showToast } from './app-ui.js';
import { showView } from './app-navigation.js';
import { activateProgram, loadUserPrograms } from './app-api.js';

// ===== AFFICHAGE DE L'INTERFACE DE GÉNÉRATION =====
function showProgramGenerator() {
    const container = document.getElementById('mainContent');
    if (!container) {
        // Créer le container s'il n'existe pas
        const mainDiv = document.createElement('div');
        mainDiv.className = 'view';
        mainDiv.id = 'program-generator';
        mainDiv.innerHTML = '<div id="mainContent"></div>';
        document.querySelector('.container').appendChild(mainDiv);
    }
    
    const content = document.getElementById('mainContent') || container;
    
    content.innerHTML = `
        <h2>📋 Générer un programme</h2>
        <p style="color: var(--gray-light); margin-bottom: 2rem;">
            Créez un programme personnalisé selon vos objectifs
        </p>
        
        <form id="programForm" onsubmit="generateProgram(event)">
            <div class="form-group">
                <label>Durée du programme</label>
                <select name="weeks" class="form-input">
                    <option value="4">4 semaines</option>
                    <option value="6">6 semaines</option>
                    <option value="8">8 semaines</option>
                    <option value="12">12 semaines</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Jours par semaine</label>
                <select name="frequency" class="form-input">
                    <option value="3">3 jours</option>
                    <option value="4">4 jours</option>
                    <option value="5">5 jours</option>
                </select>
            </div>
            
            <button type="submit" class="btn btn-primary" style="margin-top: 1.5rem;">
                🚀 Générer le programme
            </button>
        </form>
        
        <div id="programResult" style="margin-top: 2rem;"></div>
    `;
    
    showView('program-generator');
}

// ===== GÉNÉRATION DU PROGRAMME =====
async function generateProgram(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const weeks = parseInt(formData.get('weeks'));
    const frequency = parseInt(formData.get('frequency'));
    
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
        const savedProgramId = data.saved_program_id;
        
        // Afficher le programme
        displayProgram(program);
        
        // Ajouter un bouton pour activer le programme
        if (savedProgramId) {
            resultDiv.innerHTML += `
                <div style="margin-top: 2rem; text-align: center;">
                    <button class="btn btn-primary" onclick="activateProgramAndStart(${savedProgramId})">
                        🚀 Commencer ce programme
                    </button>
                </div>
            `;
        }
        
        showToast('Programme généré et sauvegardé !', 'success');
        
    } catch (error) {
        console.error('Erreur:', error);
        resultDiv.innerHTML = `
            <div class="error-message">
                <p>❌ Erreur lors de la génération du programme</p>
                <p>Please check:</p>
                <ul>
                    <li>Your equipment configuration is complete</li>
                    <li>Your profile has valid goals selected</li>
                    <li>You're connected to the server</li>
                </ul>
            </div>
        `;
    }
}

// ===== AFFICHAGE DU PROGRAMME GÉNÉRÉ =====
function displayProgram(program) {
    const resultDiv = document.getElementById('programResult');
    
    // Grouper par semaine
    const weeklyProgram = {};
    program.forEach(workout => {
        if (!weeklyProgram[workout.week]) {
            weeklyProgram[workout.week] = [];
        }
        weeklyProgram[workout.week].push(workout);
    });
    
    let html = '<h3>Votre programme personnalisé</h3>';
    
    Object.entries(weeklyProgram).forEach(([week, workouts]) => {
        html += `
            <div class="week-section">
                <h4 onclick="toggleWeek(${week})" style="cursor: pointer;">
                    <span class="week-toggle" id="toggle-week-${week}">▶</span>
                    Semaine ${week}
                </h4>
                <div id="week-${week}" class="week-content" style="display: none;">
        `;
        
        workouts.forEach(workout => {
            html += `
                <div class="workout-day">
                    <h5>Jour ${workout.day} - ${workout.muscle_group}</h5>
                    <ul class="exercise-list">
            `;
            
            workout.exercises.forEach(ex => {
                html += `
                    <li>
                        <strong>${ex.exercise_name}</strong><br>
                        ${ex.sets} séries × ${ex.target_reps} reps<br>
                        <span style="color: var(--gray-light);">
                            Poids suggéré: ${ex.predicted_weight}kg | 
                            Repos: ${ex.rest_time}s
                        </span>
                    </li>
                `;
            });
            
            html += `
                    </ul>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += `
        <button class="btn btn-primary" onclick="saveProgram()" style="margin-top: 2rem;">
            💾 Sauvegarder ce programme
        </button>
    `;
    
    resultDiv.innerHTML = html;
}

// ===== TOGGLE SEMAINE =====
function toggleWeek(week) {
    const content = document.getElementById(`week-${week}`);
    const toggle = document.getElementById(`toggle-week-${week}`);
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▼';
    } else {
        content.style.display = 'none';
        toggle.textContent = '▶';
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

// ===== SAUVEGARDE DU PROGRAMME =====
function saveProgram() {
    // TODO: Implémenter la sauvegarde
    showToast('Fonctionnalité de sauvegarde à venir', 'info');
}

// ===== EXPORTS GLOBAUX =====
window.showProgramGenerator = showProgramGenerator;
window.generateProgram = generateProgram;
window.toggleWeek = toggleWeek;
window.saveProgram = saveProgram;

// Export pour les modules
export { showProgramGenerator };