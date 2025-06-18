import { currentUser } from './app-state.js';
import { showToast } from './app-ui.js';
import { showView } from './app-navigation.js';

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
    
    if (!currentUser) {
        showToast('Veuillez vous connecter', 'error');
        return;
    }
    
    const form = event.target;
    const weeks = parseInt(form.weeks.value);
    
    // Afficher un loader
    const resultDiv = document.getElementById('programResult');
    resultDiv.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div class="spinner"></div>
            <p style="color: var(--gray-light);">Génération en cours...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`/api/users/${currentUser.id}/program`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                weeks: weeks,
                frequency: parseInt(form.frequency.value)
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            displayProgram(data.program);
            showToast('Programme généré avec succès !', 'success');
        } else {
            // Vérifier si la réponse est du JSON avant de la parser
            const contentType = response.headers.get("content-type");
            let errorDetail = 'Erreur lors de la génération';
            
            if (contentType && contentType.includes("application/json")) {
                try {
                    const error = await response.json();
                    errorDetail = error.detail || errorDetail;
                } catch {
                    console.error('Réponse non-JSON reçue');
                }
            } else {
                // Si ce n'est pas du JSON, lire comme texte
                const textError = await response.text();
                console.error('Erreur serveur (non-JSON):', textError);
            }
            
            throw new Error(errorDetail);
        }
    } catch (error) {
        console.error('Erreur génération programme:', error);
        showToast(error.message, 'error');
        resultDiv.innerHTML = '';
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