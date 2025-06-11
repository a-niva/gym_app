// Configuration API
const API_URL = 'http://localhost:8000';

// Variables globales
let currentUser = null;
let currentStep = 1;
let selectedGoals = [];
let selectedEquipment = [];
let exercises = [];
let currentWorkout = null;
let currentExerciseIndex = 0;
let currentSetIndex = 0;
let restTimer = null;
let restInterval = null;

// Configuration équipement détaillée
const equipmentConfig = {
    dumbbells: [],
    barbell: {
        types: [],
        plates: []
    },
    resistance_bands: [],
    bench: {
        available: false,
        incline: false,
        decline: false
    },
    pull_up_bar: false,
    kettlebell: []
};

// ===== NAVIGATION & VUES =====
function showView(viewName) {
    // Cacher toutes les vues
    document.querySelectorAll('.onboarding, .dashboard, .workout-view, .exercises-view, .profile-view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Afficher la vue demandée
    const targetView = document.getElementById(`${viewName}View`);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    // Mettre à jour la navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`[data-view="${viewName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Charger les données si nécessaire
    if (viewName === 'dashboard' && currentUser) {
        loadDashboard();
    } else if (viewName === 'exercises' && currentUser) {
        loadAvailableExercises();
    } else if (viewName === 'profile' && currentUser) {
        loadProfile();
    }
}

// ===== ONBOARDING =====
function nextStep() {
    if (!validateStep(currentStep)) return;
    
    document.getElementById(`step${currentStep}`).classList.remove('active');
    currentStep++;
    
    // Préparer l'étape 4 si nécessaire
    if (currentStep === 4) {
        generateDetailedEquipmentConfig();
    }
    
    setTimeout(() => {
        document.getElementById(`step${currentStep}`).classList.add('active');
        updateProgressBar();
        
        if (currentStep === 5) {
            updateProfileSummary();
        }
    }, 300);
}

function prevStep() {
    if (currentStep > 1) {
        document.getElementById(`step${currentStep}`).classList.remove('active');
        currentStep--;
        
        setTimeout(() => {
            document.getElementById(`step${currentStep}`).classList.add('active');
            updateProgressBar();
        }, 300);
    }
}

function updateProgressBar() {
    const progress = (currentStep / 5) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
}

function validateStep(step) {
    switch(step) {
        case 1:
            const name = document.getElementById('userName').value.trim();
            const age = document.getElementById('userAge').value;
            const experience = document.getElementById('experienceLevel').value;
            
            if (!name || !age || !experience) {
                showToast('Veuillez remplir tous les champs', 'error');
                return false;
            }
            if (age < 14 || age > 100) {
                showToast('Veuillez entrer un âge valide', 'error');
                return false;
            }
            return true;
            
        case 2:
            if (selectedGoals.length === 0) {
                showToast('Veuillez sélectionner au moins un objectif', 'error');
                return false;
            }
            return true;
            
        case 3:
            if (selectedEquipment.length === 0) {
                showToast('Veuillez sélectionner au moins un équipement', 'error');
                return false;
            }
            return true;
            
        case 4:
            // Validation de la configuration détaillée
            return validateDetailedConfig();
            
        default:
            return true;
    }
}

// ===== GESTION DES OBJECTIFS =====
function toggleGoal(goalElement) {
    const goal = goalElement.dataset.goal;
    goalElement.classList.toggle('selected');
    
    if (goalElement.classList.contains('selected')) {
        if (!selectedGoals.includes(goal)) {
            selectedGoals.push(goal);
        }
    } else {
        const index = selectedGoals.indexOf(goal);
        if (index > -1) selectedGoals.splice(index, 1);
    }
}

// ===== GESTION DE L'ÉQUIPEMENT =====
function toggleEquipment(card) {
    const equipment = card.dataset.equipment;
    card.classList.toggle('selected');
    
    if (card.classList.contains('selected')) {
        if (!selectedEquipment.includes(equipment)) {
            selectedEquipment.push(equipment);
        }
    } else {
        const index = selectedEquipment.indexOf(equipment);
        if (index > -1) selectedEquipment.splice(index, 1);
    }
}

function generateDetailedEquipmentConfig() {
    const container = document.getElementById('detailedEquipmentConfig');
    let html = '';
    
    // Haltères
    if (selectedEquipment.includes('dumbbells')) {
        html += `
            <div class="equipment-section">
                <h3>🏋️‍♀️ Configuration des haltères</h3>
                <div class="equipment-subsection">
                    <p style="color: var(--gray); margin-bottom: 1rem;">Sélectionnez les poids disponibles (en kg)</p>
                    <div class="chip-group" id="dumbbellWeights">
                        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map(weight => 
                            `<div class="chip" data-weight="${weight}" onclick="toggleWeight(this, 'dumbbells')">${weight}kg</div>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Barres
    if (selectedEquipment.includes('barbell')) {
        html += `
            <div class="equipment-section">
                <h3>🏋️ Configuration des barres</h3>
                <div class="equipment-subsection">
                    <div class="equipment-item">
                        <label class="checkbox-label">
                            <input type="checkbox" id="barbell_olympic" value="olympic">
                            <span>Barre olympique (20kg)</span>
                        </label>
                    </div>
                    <div class="equipment-item">
                        <label class="checkbox-label">
                            <input type="checkbox" id="barbell_ez" value="ez">
                            <span>Barre EZ (10kg)</span>
                        </label>
                    </div>
                    <div class="equipment-item">
                        <label class="checkbox-label">
                            <input type="checkbox" id="barbell_short" value="short">
                            <span>Barres courtes (2.5kg)</span>
                        </label>
                    </div>
                    
                    <h4 style="margin-top: 1.5rem; margin-bottom: 1rem;">Disques disponibles</h4>
                    <div class="chip-group" id="plateWeights">
                        ${[0.5, 1, 1.25, 2.5, 5, 10, 15, 20, 25].map(weight => 
                            `<div class="chip" data-weight="${weight}" onclick="toggleWeight(this, 'plates')">${weight}kg</div>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Élastiques
    if (selectedEquipment.includes('resistance_bands')) {
        html += `
            <div class="equipment-section">
                <h3>🟡 Configuration des élastiques</h3>
                <div class="equipment-subsection">
                    <p style="color: var(--gray); margin-bottom: 1rem;">Sélectionnez les résistances disponibles</p>
                    <div class="chip-group" id="bandResistances">
                        <div class="chip" data-resistance="light" onclick="toggleBand(this)">🟢 Léger (5-15kg)</div>
                        <div class="chip" data-resistance="medium" onclick="toggleBand(this)">🟡 Moyen (15-25kg)</div>
                        <div class="chip" data-resistance="heavy" onclick="toggleBand(this)">🔴 Lourd (25-35kg)</div>
                        <div class="chip" data-resistance="x-heavy" onclick="toggleBand(this)">⚫ Très lourd (35-45kg)</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Banc
    if (selectedEquipment.includes('bench')) {
        html += `
            <div class="equipment-section">
                <h3>🪑 Configuration du banc</h3>
                <div class="equipment-subsection">
                    <div class="equipment-item">
                        <label class="checkbox-label">
                            <input type="checkbox" id="bench_incline">
                            <span>Inclinable (positif)</span>
                        </label>
                    </div>
                    <div class="equipment-item">
                        <label class="checkbox-label">
                            <input type="checkbox" id="bench_decline">
                            <span>Déclinable (négatif)</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function toggleWeight(element, type) {
    element.classList.toggle('selected');
    const weight = parseFloat(element.dataset.weight);
    
    if (type === 'dumbbells') {
        if (element.classList.contains('selected')) {
            if (!equipmentConfig.dumbbells.includes(weight)) {
                equipmentConfig.dumbbells.push(weight);
            }
        } else {
            const index = equipmentConfig.dumbbells.indexOf(weight);
            if (index > -1) equipmentConfig.dumbbells.splice(index, 1);
        }
    } else if (type === 'plates') {
        if (element.classList.contains('selected')) {
            if (!equipmentConfig.barbell.plates.includes(weight)) {
                equipmentConfig.barbell.plates.push(weight);
            }
        } else {
            const index = equipmentConfig.barbell.plates.indexOf(weight);
            if (index > -1) equipmentConfig.barbell.plates.splice(index, 1);
        }
    }
}

function toggleBand(element) {
    element.classList.toggle('selected');
    const resistance = element.dataset.resistance;
    
    if (element.classList.contains('selected')) {
        if (!equipmentConfig.resistance_bands.includes(resistance)) {
            equipmentConfig.resistance_bands.push(resistance);
        }
    } else {
        const index = equipmentConfig.resistance_bands.indexOf(resistance);
        if (index > -1) equipmentConfig.resistance_bands.splice(index, 1);
    }
}

function validateDetailedConfig() {
    let hasValidConfig = false;
    
    if (selectedEquipment.includes('dumbbells') && equipmentConfig.dumbbells.length === 0) {
        showToast('Veuillez sélectionner au moins un poids d\'haltère', 'error');
        return false;
    }
    
    if (selectedEquipment.includes('barbell')) {
        const hasBarType = document.querySelector('#barbell_olympic:checked') || 
                          document.querySelector('#barbell_ez:checked') || 
                          document.querySelector('#barbell_short:checked');
        if (!hasBarType) {
            showToast('Veuillez sélectionner au moins un type de barre', 'error');
            return false;
        }
        if (equipmentConfig.barbell.plates.length === 0) {
            showToast('Veuillez sélectionner au moins un poids de disque', 'error');
            return false;
        }
    }
    
    return true;
}

// ===== PROFIL & ONBOARDING =====
function updateProfileSummary() {
    const name = document.getElementById('userName').value;
    const age = document.getElementById('userAge').value;
    const experience = document.getElementById('experienceLevel').value;
    const experienceText = document.querySelector(`#experienceLevel option[value="${experience}"]`).textContent;
    
    let summary = `
        <p><strong>Nom:</strong> ${name}</p>
        <p><strong>Âge:</strong> ${age} ans</p>
        <p><strong>Niveau:</strong> ${experienceText}</p>
        <p><strong>Objectifs:</strong> ${selectedGoals.map(g => {
            const chip = document.querySelector(`[data-goal="${g}"]`);
            return chip ? chip.textContent : g;
        }).join(', ')}</p>
    `;
    
    // Résumé de l'équipement
    if (selectedEquipment.length > 0) {
        summary += '<p><strong>Équipement:</strong></p><ul style="margin-left: 1rem;">';
        
        if (selectedEquipment.includes('dumbbells') && equipmentConfig.dumbbells.length > 0) {
            summary += `<li>Haltères: ${equipmentConfig.dumbbells.sort((a,b) => a-b).join(', ')} kg</li>`;
        }
        
        if (selectedEquipment.includes('barbell')) {
            const barTypes = [];
            if (document.querySelector('#barbell_olympic:checked')) barTypes.push('Olympique');
            if (document.querySelector('#barbell_ez:checked')) barTypes.push('EZ');
            if (document.querySelector('#barbell_short:checked')) barTypes.push('Courtes');
            
            summary += `<li>Barres: ${barTypes.join(', ')}</li>`;
            if (equipmentConfig.barbell.plates.length > 0) {
                summary += `<li>Disques: ${equipmentConfig.barbell.plates.sort((a,b) => a-b).join(', ')} kg</li>`;
            }
        }
        
        if (selectedEquipment.includes('resistance_bands') && equipmentConfig.resistance_bands.length > 0) {
            summary += `<li>Élastiques: ${equipmentConfig.resistance_bands.length} résistance(s)</li>`;
        }
        
        if (selectedEquipment.includes('bench')) {
            const benchFeatures = [];
            if (document.querySelector('#bench_incline:checked')) benchFeatures.push('inclinable');
            if (document.querySelector('#bench_decline:checked')) benchFeatures.push('déclinable');
            summary += `<li>Banc${benchFeatures.length > 0 ? ' (' + benchFeatures.join(', ') + ')' : ''}</li>`;
        }
        
        if (selectedEquipment.includes('pull_up_bar')) {
            summary += '<li>Barre de traction</li>';
        }
        
        if (selectedEquipment.includes('kettlebell')) {
            summary += '<li>Kettlebells</li>';
        }
        
        summary += '</ul>';
    }
    
    document.getElementById('profileSummary').innerHTML = summary;
}

async function completeOnboarding() {
    // Collecter la configuration finale
    if (selectedEquipment.includes('barbell')) {
        equipmentConfig.barbell.types = [];
        if (document.querySelector('#barbell_olympic:checked')) equipmentConfig.barbell.types.push('olympic');
        if (document.querySelector('#barbell_ez:checked')) equipmentConfig.barbell.types.push('ez');
        if (document.querySelector('#barbell_short:checked')) equipmentConfig.barbell.types.push('short');
    }
    
    if (selectedEquipment.includes('bench')) {
        equipmentConfig.bench.available = true;
        equipmentConfig.bench.incline = document.querySelector('#bench_incline:checked') || false;
        equipmentConfig.bench.decline = document.querySelector('#bench_decline:checked') || false;
    }
    
    equipmentConfig.pull_up_bar = selectedEquipment.includes('pull_up_bar');
    
    const userData = {
        name: document.getElementById('userName').value,
        age: parseInt(document.getElementById('userAge').value),
        experience_level: document.getElementById('experienceLevel').value,
        goals: selectedGoals,
        equipment_config: equipmentConfig
    };
    
    try {
        console.log('Envoi des données utilisateur:', userData);
        
        const response = await fetch(`${API_URL}/users/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            localStorage.setItem('userId', user.id);
            
            // Mettre à jour l'interface
            document.getElementById('userInitial').textContent = user.name[0].toUpperCase();
            document.getElementById('userInitial').style.display = 'flex';
            document.getElementById('userNameDisplay').textContent = user.name;
            
            // Masquer onboarding et afficher navigation
            document.getElementById('progressContainer').style.display = 'none';
            document.getElementById('bottomNav').style.display = 'flex';
            
            showToast('Profil créé avec succès !', 'success');
            showView('dashboard');
        } else {
            const error = await response.json();
            showToast(error.detail || 'Erreur lors de la création du profil', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion au serveur', 'error');
    }
}

// ===== CHARGEMENT DES DONNÉES =====
async function loadUser(userId) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}`);
        if (response.ok) {
            currentUser = await response.json();
            document.getElementById('userInitial').textContent = currentUser.name[0].toUpperCase();
            document.getElementById('userInitial').style.display = 'flex';
            document.getElementById('userNameDisplay').textContent = currentUser.name;
            document.getElementById('bottomNav').style.display = 'flex';
            showView('dashboard');
        } else {
            localStorage.removeItem('userId');
            document.getElementById('progressContainer').style.display = 'block';
            updateProgressBar();
        }
    } catch (error) {
        console.error('Erreur:', error);
        localStorage.removeItem('userId');
        document.getElementById('progressContainer').style.display = 'block';
        updateProgressBar();
    }
}

async function loadExercises() {
    try {
        const response = await fetch(`${API_URL}/exercises/`);
        if (response.ok) {
            exercises = await response.json();
            console.log(`${exercises.length} exercices chargés`);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des exercices:', error);
    }
}

async function loadDashboard() {
    // TODO: Charger les statistiques réelles
    console.log('Chargement du dashboard pour', currentUser.name);
}

async function loadAvailableExercises() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/users/${currentUser.id}/available-exercises`);
        if (response.ok) {
            const availableExercises = await response.json();
            displayExercises(availableExercises);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des exercices:', error);
        showToast('Erreur lors du chargement des exercices', 'error');
    }
}

function displayExercises(exercisesList) {
    const container = document.getElementById('exercisesList');
    if (!container) return;
    
    if (exercisesList.length === 0) {
        container.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 2rem;">Aucun exercice disponible avec votre équipement</p>';
        return;
    }
    
    container.innerHTML = exercisesList.map(exercise => `
        <div class="exercise-card" onclick="selectExercise(${exercise.id})" style="margin-bottom: 1rem; cursor: pointer;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem;">${exercise.name_fr}</h3>
                <span style="font-size: 0.875rem; color: var(--primary); background: rgba(59, 130, 246, 0.1); padding: 0.25rem 0.75rem; border-radius: 9999px;">${exercise.level}</span>
            </div>
            <p style="color: var(--gray-light); font-size: 0.875rem; margin-bottom: 0.25rem;">${exercise.body_part}</p>
            <p style="color: var(--gray); font-size: 0.75rem;">${exercise.equipment.join(', ')}</p>
        </div>
    `).join('');
}

function loadProfile() {
    if (!currentUser) return;
    
    const container = document.getElementById('profileContent');
    container.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.05); padding: 1.5rem; border-radius: var(--radius); margin-bottom: 1rem;">
            <p><strong>Nom:</strong> ${currentUser.name}</p>
            <p><strong>Âge:</strong> ${currentUser.age} ans</p>
            <p><strong>Niveau:</strong> ${currentUser.experience_level}</p>
            <p><strong>Objectifs:</strong> ${currentUser.goals.join(', ')}</p>
        </div>
        <button class="btn btn-secondary" onclick="logout()">
            Déconnexion
        </button>
    `;
}

// ===== SÉANCES =====
function startFreeWorkout() {
    showView('exercises');
    showToast('Sélectionnez un exercice pour commencer', 'info');
}

function startProgram() {
    showToast('Programmes personnalisés bientôt disponibles !', 'info');
}

function selectExercise(exerciseId) {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;
    
    // TODO: Implémenter la logique de séance
    showToast(`Exercice sélectionné: ${exercise.name_fr}`, 'success');
}

// ===== UTILITAIRES =====
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        localStorage.removeItem('userId');
        currentUser = null;
        currentStep = 1;
        selectedGoals = [];
        selectedEquipment = [];
        
        // Réinitialiser l'interface
        document.getElementById('bottomNav').style.display = 'none';
        document.getElementById('progressContainer').style.display = 'block';
        document.getElementById('userInitial').style.display = 'none';
        
        // Réinitialiser les formulaires
        document.getElementById('userName').value = '';
        document.getElementById('userAge').value = '';
        document.getElementById('experienceLevel').value = '';
        
        document.querySelectorAll('.chip.selected, .equipment-card.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        updateProgressBar();
        showView('onboarding');
        showToast('Déconnexion réussie', 'success');
    }
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    // Event listeners pour les objectifs
    document.querySelectorAll('.chip[data-goal]').forEach(chip => {
        chip.addEventListener('click', () => toggleGoal(chip));
    });
    
    // Event listeners pour l'équipement
    document.querySelectorAll('.equipment-card').forEach(card => {
        card.addEventListener('click', () => toggleEquipment(card));
    });
    
    // Charger les exercices
    await loadExercises();
    
    // Vérifier si un utilisateur existe
    const userId = localStorage.getItem('userId');
    if (userId) {
        await loadUser(userId);
    } else {
        // Afficher la barre de progression pour l'onboarding
        document.getElementById('progressContainer').style.display = 'block';
        updateProgressBar();
    }
    
    console.log('Application initialisée');
});

// Service Worker pour PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
}