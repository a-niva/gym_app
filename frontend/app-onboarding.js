// ===== MODULE D'ONBOARDING =====
// Ce fichier gère tout le processus d'inscription et de configuration initiale

import { 
    selectedGoals,
    selectedEquipment,
    equipmentConfig,
    currentStep,
    totalSteps,
    setCurrentUser,
    setSelectedGoals,
    setSelectedEquipment,
    setEquipmentConfig,
    resetState,
    currentUser,
    userCommitment
} from './app-state.js';

import { 
    nextStep as navigationNextStep,
    nextStepSimple as navigateNext,
    prevStep as navigatePrev,
    updateProgressBar,
    showMainInterface,
    showProfileForm,
    showStep
} from './app-navigation.js';

import { showToast, getEquipmentIcon, getEquipmentName } from './app-ui.js';
import { saveUser, saveUserCommitment } from './app-api.js';
import { 
    GOAL_NAMES,
    COMMON_DUMBBELL_WEIGHTS,
    COMMON_PLATE_WEIGHTS,
    COMMON_KETTLEBELL_WEIGHTS,
    getColorName
} from './app-config.js';

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

// Fonction pour créer l'étape d'engagement
function createCommitmentStep() {
    const onboardingContainer = document.querySelector('.onboarding-steps');
    if (!onboardingContainer) return;
    
    // Créer l'étape 3.5 : Engagement
    const commitmentStep = document.createElement('div');
    commitmentStep.className = 'onboarding-step';
    commitmentStep.id = 'step-commitment';
    commitmentStep.style.display = 'none';
    commitmentStep.innerHTML = `
        <h2>Votre engagement 🎯</h2>
        <p style="color: var(--gray); margin-bottom: 2rem;">Définissons ensemble vos objectifs réalistes</p>
        
        <div class="commitment-section">
            <h3>Fréquence d'entraînement</h3>
            <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 1rem;">
                Combien de séances par semaine pouvez-vous faire de manière réaliste ?
            </p>
            <div class="frequency-selector">
                <button class="frequency-btn" data-frequency="2">2×/sem<br><small>Débutant</small></button>
                <button class="frequency-btn" data-frequency="3">3×/sem<br><small>Recommandé</small></button>
                <button class="frequency-btn" data-frequency="4">4×/sem<br><small>Intermédiaire</small></button>
                <button class="frequency-btn" data-frequency="5">5×/sem<br><small>Avancé</small></button>
                <button class="frequency-btn" data-frequency="6">6×/sem<br><small>Expert</small></button>
            </div>
        </div>
        
        <div class="commitment-section" style="margin-top: 2rem;">
            <h3>Temps par séance</h3>
            <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 1rem;">
                Combien de temps avez-vous généralement ?
            </p>
            <div class="time-selector">
                <button class="time-btn" data-time="30">30 min<br><small>Express</small></button>
                <button class="time-btn" data-time="45">45 min<br><small>Standard</small></button>
                <button class="time-btn" data-time="60">60 min<br><small>Complet</small></button>
                <button class="time-btn" data-time="90">90 min<br><small>Intensif</small></button>
            </div>
        </div>
        
        <div class="commitment-section" style="margin-top: 2rem;">
            <h3>Muscles prioritaires</h3>
            <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 1rem;">
                Quels groupes musculaires voulez-vous prioriser ?
            </p>
            <div class="muscle-priority-grid">
                <div class="muscle-priority-item" data-muscle="chest">
                    <span>Pectoraux</span>
                    <select class="priority-select">
                        <option value="normal">Normal</option>
                        <option value="priority">Priorité</option>
                        <option value="maintain">Maintenir</option>
                    </select>
                </div>
                <div class="muscle-priority-item" data-muscle="back">
                    <span>Dos</span>
                    <select class="priority-select">
                        <option value="normal">Normal</option>
                        <option value="priority">Priorité</option>
                        <option value="maintain">Maintenir</option>
                    </select>
                </div>
                <div class="muscle-priority-item" data-muscle="shoulders">
                    <span>Épaules</span>
                    <select class="priority-select">
                        <option value="normal">Normal</option>
                        <option value="priority">Priorité</option>
                        <option value="maintain">Maintenir</option>
                    </select>
                </div>
                <div class="muscle-priority-item" data-muscle="legs">
                    <span>Jambes</span>
                    <select class="priority-select">
                        <option value="normal">Normal</option>
                        <option value="priority">Priorité</option>
                        <option value="maintain">Maintenir</option>
                    </select>
                </div>
                <div class="muscle-priority-item" data-muscle="arms">
                    <span>Bras</span>
                    <select class="priority-select">
                        <option value="normal">Normal</option>
                        <option value="priority">Priorité</option>
                        <option value="maintain">Maintenir</option>
                    </select>
                </div>
                <div class="muscle-priority-item" data-muscle="core">
                    <span>Abdos</span>
                    <select class="priority-select">
                        <option value="normal">Normal</option>
                        <option value="priority">Priorité</option>
                        <option value="maintain">Maintenir</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div style="display: flex; gap: 1rem; margin-top: 2rem;">
            <button class="btn btn-secondary" onclick="prevStep()">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Retour
            </button>
            <button class="btn" onclick="saveCommitment()">
                Valider mon engagement
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </button>
        </div>
    `;
    
    // Insérer après l'étape des objectifs
    const step2 = document.getElementById('step2');
    if (step2 && step2.parentNode) {
        step2.parentNode.insertBefore(commitmentStep, step2.nextSibling);
    }
    
    // Ajouter les styles CSS
    const style = document.createElement('style');
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
        
        .priority-select {
            padding: 0.25rem 0.5rem;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 4px;
            font-size: 0.875rem;
        }
    `;
    document.head.appendChild(style);
    
    // Ajouter les event listeners
    document.querySelectorAll('.frequency-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.frequency-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
}

// Fonction pour sauvegarder l'engagement
async function saveCommitment() {
    const selectedFrequency = document.querySelector('.frequency-btn.selected');
    const selectedTime = document.querySelector('.time-btn.selected');
    
    if (!selectedFrequency || !selectedTime) {
        showToast('Veuillez sélectionner une fréquence et une durée', 'error');
        return;
    }
    
    // Collecter les priorités musculaires
    const focusMuscles = {};
    document.querySelectorAll('.muscle-priority-item').forEach(item => {
        const muscle = item.dataset.muscle;
        const priority = item.querySelector('.priority-select').value;
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
        showToast('Engagement enregistré avec succès !', 'success');
        
        // Passer à l'étape suivante
        nextStep();
    } catch (error) {
        console.error('Error saving commitment:', error);
    }
}

// Créer une nouvelle fonction qui gère la logique spéciale
function enhancedNextStep() {
    const currentStepEl = document.querySelector('.onboarding-step.active');
    if (currentStepEl && currentStepEl.id === 'step2') {
        // Après les objectifs, montrer l'engagement si nécessaire
        const commitmentStep = document.getElementById('step-commitment');
        if (commitmentStep && !userCommitment) {
            currentStepEl.classList.remove('active');
            commitmentStep.classList.add('active');
            return;
        }
    }
    
    // Sinon, utiliser la navigation normale
    if (navigationNextStep) {
        navigationNextStep();
    }
}

// Initialiser l'étape d'engagement au chargement
document.addEventListener('DOMContentLoaded', createCommitmentStep);

// ===== VALIDATION DES DONNÉES =====
function validateEmail(email) {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
}

function validatePersonalInfo() {
    const name = document.getElementById('userName').value.trim();
    const birthDate = document.getElementById('userBirthDate').value;
    const height = document.getElementById('userHeight').value;
    const weight = document.getElementById('userWeight').value;
    const experience = document.getElementById('experienceLevel').value;
    const email = document.getElementById('userEmail')?.value.trim();
    
    // Validation du nom
    if (!name || name.length < 2) {
        showToast('Le nom doit contenir au moins 2 caractères', 'error');
        return false;
    }
    
    // Validation de l'email si présent
    if (email && !validateEmail(email)) {
        showToast('Adresse email invalide', 'error');
        return false;
    }
    
    // Validation de l'âge (minimum 16 ans)
    if (birthDate) {
        const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
        if (age < 16) {
            showToast('Vous devez avoir au moins 16 ans', 'error');
            return false;
        }
    }
    
    // Validation de la taille et du poids
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);
    
    if (!heightNum || heightNum < 100 || heightNum > 250) {
        showToast('La taille doit être entre 100 et 250 cm', 'error');
        return false;
    }
    
    if (!weightNum || weightNum < 30 || weightNum > 300) {
        showToast('Le poids doit être entre 30 et 300 kg', 'error');
        return false;
    }
    
    return true;
}

// Définir notre propre version de nextStep
function nextStep() {
    const currentStepEl = document.querySelector('.onboarding-step.active');
    
    // Vérifier si on doit montrer l'étape d'engagement
    if (currentStepEl && currentStepEl.id === 'step2') {
        const commitmentStep = document.getElementById('step-commitment');
        if (commitmentStep && !userCommitment) {
            currentStepEl.classList.remove('active');
            commitmentStep.classList.add('active');
            updateProgressBar();
            return;
        }
    }
    
    // AJOUTER : Gérer le passage depuis l'étape commitment
    if (currentStepEl && currentStepEl.id === 'step-commitment') {
        currentStepEl.classList.remove('active');
        // Passer à l'étape 3 (équipement)
        const step3 = document.getElementById('step3');
        if (step3) {
            step3.classList.add('active');
            updateProgressBar();
            return;
        }
    }
    
    // NOUVEAU : Gérer le passage depuis l'étape 3 (équipement)
    if (currentStepEl && currentStepEl.id === 'step3') {
        // Vérifier si l'équipement sélectionné nécessite une configuration détaillée
        const needsDetailedConfig = selectedEquipment.some(eq => 
            ['dumbbells', 'barbell', 'resistance_bands', 'kettlebell', 'bench'].includes(eq)
        );
        
        if (needsDetailedConfig) {
            // Afficher l'étape 4 et générer la configuration
            currentStepEl.classList.remove('active');
            const step4 = document.getElementById('step4');
            if (step4) {
                step4.classList.add('active');
                generateDetailedEquipmentConfig();
                updateProgressBar();
                return;
            }
        } else {
            // Passer directement à l'étape 5 (récapitulatif)
            currentStepEl.classList.remove('active');
            const step5 = document.getElementById('step5');
            if (step5) {
                step5.classList.add('active');
                updateProfileSummary();
                updateProgressBar();
                return;
            }
        }
    }
    
    // NOUVEAU : Gérer le passage depuis l'étape 4
    if (currentStepEl && currentStepEl.id === 'step4') {
        if (validateDetailedConfig()) {
            currentStepEl.classList.remove('active');
            const step5 = document.getElementById('step5');
            if (step5) {
                step5.classList.add('active');
                updateProfileSummary();
                updateProgressBar();
                return;
            }
        }
        return; // Ne pas continuer si la validation échoue
    }
    
    // Sinon, utiliser la navigation normale
    navigationNextStep();
}

// ===== CONFIGURATION DÉTAILLÉE DE L'ÉQUIPEMENT =====
function generateDetailedEquipmentConfig() {
    const container = document.getElementById('detailedEquipmentConfig');
    
    let html = `
        <div class="equipment-categories-grid">
            ${selectedEquipment.map(eq => `
                <div class="equipment-category selected" data-equipment="${eq}">
                    <div class="equipment-icon">
                        ${getEquipmentIcon(eq)}
                    </div>
                    <div class="equipment-name">${getEquipmentName(eq)}</div>
                    <div class="equipment-status" id="status-${eq}">À configurer</div>
                </div>
            `).join('')}
        </div>
        <div id="configPanels"></div>
    `;
    
    container.innerHTML = html;
    
    // Auto-configurer les équipements simples
    if (selectedEquipment.includes('pull_up_bar')) {
        equipmentConfig.autres.barre_traction = true;
        updateEquipmentStatus('pull_up_bar');
    }
    
    // Afficher les panneaux de configuration pour chaque équipement sélectionné
    selectedEquipment.forEach(eq => {
        if (eq === 'dumbbells' || eq === 'barbell' || eq === 'resistance_bands' || eq === 'kettlebell' || eq === 'bench') {
            showConfigPanel(eq);
        }
    });
}

function showConfigPanel(equipmentType) {
    const panelsContainer = document.getElementById('configPanels');
    const panel = document.createElement('div');
    panel.className = 'config-panel';
    panel.id = `panel-${equipmentType}`;
    
    switch(equipmentType) {
        case 'barbell':
            panel.innerHTML = createBarbellPanel();
            break;
        case 'dumbbells':
            panel.innerHTML = createDumbbellsPanel();
            break;
        case 'resistance_bands':
            panel.innerHTML = createBandsPanel();
            break;
        case 'bench':
            panel.innerHTML = createBenchPanel();
            break;
        case 'kettlebell':
            panel.innerHTML = createKettlebellPanel();
            break;
    }
    
    if (panel.innerHTML) {
        panelsContainer.appendChild(panel);
    }
}

function createBarbellPanel() {
    return `
        <div class="config-header">
            <div class="config-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h8m-4-8v16"/>
                </svg>
            </div>
            <h3 class="config-title">Barres et disques</h3>
        </div>
        
        <h4 style="margin-bottom: 16px; color: var(--gray-light);">Types de barres disponibles</h4>
        <div class="barbell-types">
            <label class="checkbox-label">
                <input type="checkbox" onchange="updateBarbell('olympique', this.checked)">
                <span>Barre olympique (20kg)</span>
            </label>
            <label class="checkbox-label">
                <input type="checkbox" onchange="updateBarbell('ez', this.checked)">
                <span>Barre EZ/Curl (10kg)</span>
            </label>
            <label class="checkbox-label">
                <input type="checkbox" onchange="updateBarbell('courte', this.checked)">
                <span>Barre courte (2.5kg)</span>
            </label>
        </div>
        
        <h4 style="margin-top: 24px; margin-bottom: 16px; color: var(--gray-light);">Poids des disques disponibles</h4>
        <div class="weight-grid">
            ${COMMON_PLATE_WEIGHTS.map(weight => `
                <div class="weight-item">
                    <div class="weight-value">${weight}kg</div>
                    <input type="number" class="weight-input" placeholder="0" min="0" max="10" 
                           value="${equipmentConfig.disques[weight] || 0}"
                           onchange="updateDisqueWeight(${weight}, this.value)">
                </div>
            `).join('')}
        </div>
    `;
}

function createDumbbellsPanel() {
    return `
        <div class="config-header">
            <div class="config-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
                </svg>
            </div>
            <h3 class="config-title">Configuration des haltères</h3>
        </div>
        
        <div class="weight-grid">
            ${COMMON_DUMBBELL_WEIGHTS.map(weight => `
                <div class="weight-item">
                    <div class="weight-value">${weight}kg</div>
                    <input type="number" 
                           class="weight-input" 
                           placeholder="0" 
                           min="0" 
                           max="10"
                           value="${equipmentConfig.dumbbells[weight] || 0}"
                           onchange="updateDumbbellWeight(${weight}, this.value)">
                </div>
            `).join('')}
            <div class="add-custom" onclick="addCustomDumbbell()">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
            </div>
        </div>
    `;
}

function createBandsPanel() {
    return `
        <div class="config-header">
            <div class="config-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
            </div>
            <h3 class="config-title">Configuration des élastiques</h3>
        </div>
        
        <div id="bandsList"></div>
        
        <div class="band-input-group">
            <input type="color" id="bandColor" value="#ff6b6b" class="band-color-input">
            <input type="number" id="bandResistance" placeholder="Résistance (kg)" class="band-resistance-input">
            <input type="number" id="bandCount" placeholder="Nombre" value="1" min="1" class="band-count-input">
            <button onclick="addBand()" class="btn-add">+</button>
        </div>
    `;
}

function createBenchPanel() {
    return `
        <div class="config-header">
            <div class="config-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h18m-9-9v18"/>
                </svg>
            </div>
            <h3 class="config-title">Configuration du banc</h3>
        </div>
        
        <div class="bench-options">
            <div class="bench-option ${equipmentConfig.banc.available ? 'active' : ''}" onclick="toggleBenchFeature(this, 'flat')">
                <h4>Banc plat</h4>
                <p style="color: #64748b; font-size: 14px;">Position horizontale standard</p>
            </div>
            <div class="bench-option ${equipmentConfig.banc.inclinable ? 'active' : ''}" onclick="toggleBenchFeature(this, 'incline')">
                <h4>Inclinable</h4>
                <p style="color: #64748b; font-size: 14px;">Angles positifs (15°, 30°, 45°...)</p>
            </div>
            <div class="bench-option ${equipmentConfig.banc.declinable ? 'active' : ''}" onclick="toggleBenchFeature(this, 'decline')">
                <h4>Déclinable</h4>
                <p style="color: #64748b; font-size: 14px;">Angles négatifs (-15°, -30°...)</p>
            </div>
        </div>
    `;
}

function createKettlebellPanel() {
    return `
        <div class="config-header">
            <div class="config-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8a4 4 0 100 8 4 4 0 000-8z"/>
                </svg>
            </div>
            <h3 class="config-title">Kettlebells</h3>
        </div>
        
        <div class="weight-grid">
            ${COMMON_KETTLEBELL_WEIGHTS.map(weight => `
                <div class="weight-item">
                    <div class="weight-value">${weight}kg</div>
                    <input type="number" class="weight-input" placeholder="0" min="0" max="10" 
                           value="${equipmentConfig.kettlebells[weight] || 0}"
                           onchange="updateKettlebellWeight(${weight}, this.value)">
                </div>
            `).join('')}
        </div>
    `;
}

// ===== MISE À JOUR DE L'ÉQUIPEMENT =====
function updateBarbell(type, checked) {
    equipmentConfig.barres[type].available = checked;
    if (checked) {
        equipmentConfig.barres[type].count = 1;
    } else {
        equipmentConfig.barres[type].count = 0;
    }
    updateEquipmentStatus('barbell');
}

function updateDisqueWeight(weight, count) {
    const value = parseInt(count) || 0;
    if (value > 0) {
        equipmentConfig.disques[weight] = value;
    } else {
        delete equipmentConfig.disques[weight];
    }
    updateEquipmentStatus('barbell');
}

function updateDumbbellWeight(weight, count) {
    const value = parseInt(count) || 0;
    if (value > 0) {
        equipmentConfig.dumbbells[weight] = value;
    } else {
        delete equipmentConfig.dumbbells[weight];
    }
    updateEquipmentStatus('dumbbells');
}

function updateKettlebellWeight(weight, count) {
    const value = parseInt(count) || 0;
    if (value > 0) {
        equipmentConfig.kettlebells[weight] = value;
    } else {
        delete equipmentConfig.kettlebells[weight];
    }
    updateEquipmentStatus('kettlebell');
}

function addBand() {
    const color = document.getElementById('bandColor').value;
    const resistance = document.getElementById('bandResistance').value;
    const count = document.getElementById('bandCount').value;
    
    if (resistance && count) {
        equipmentConfig.elastiques.push({
            color: getColorName(color),
            resistance: parseFloat(resistance),
            count: parseInt(count)
        });
        
        updateBandsList();
        updateEquipmentStatus('resistance_bands');
        
        // Reset inputs
        document.getElementById('bandResistance').value = '';
        document.getElementById('bandCount').value = '1';
    }
}

function updateBandsList() {
    const container = document.getElementById('bandsList');
    if (!container) return;
    
    container.innerHTML = equipmentConfig.elastiques.map((band, index) => `
        <div class="band-item">
            <div class="band-color" style="background-color: ${band.color}"></div>
            <div class="band-info">
                <div class="band-resistance">${band.resistance}kg</div>
                <div class="band-count">${band.count} élastique${band.count > 1 ? 's' : ''}</div>
            </div>
            <div class="band-remove" onclick="removeBand(${index})">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </div>
        </div>
    `).join('');
}

function removeBand(index) {
    equipmentConfig.elastiques.splice(index, 1);
    updateBandsList();
    updateEquipmentStatus('resistance_bands');
}

function toggleBenchFeature(element, feature) {
    element.classList.toggle('active');
    
    switch(feature) {
        case 'flat':
            equipmentConfig.banc.available = element.classList.contains('active');
            break;
        case 'incline':
            equipmentConfig.banc.inclinable = element.classList.contains('active');
            break;
        case 'decline':
            equipmentConfig.banc.declinable = element.classList.contains('active');
            break;
    }
    
    updateEquipmentStatus('bench');
}

// ===== STATUT DE L'ÉQUIPEMENT =====
function updateEquipmentStatus(type) {
    const statusEl = document.getElementById(`status-${type}`);
    if (!statusEl) return;
    
    let isConfigured = false;
    
    switch(type) {
        case 'dumbbells':
            isConfigured = Object.keys(equipmentConfig.dumbbells).length > 0;
            break;
        case 'barbell':
            const hasBarbell = Object.values(equipmentConfig.barres).some(b => b.available);
            const hasDisques = Object.keys(equipmentConfig.disques).length > 0;
            isConfigured = hasBarbell && hasDisques;
            break;
        case 'resistance_bands':
            isConfigured = equipmentConfig.elastiques.length > 0;
            break;
        case 'bench':
            isConfigured = true;
            equipmentConfig.banc.available = true;
            break;
        case 'pull_up_bar':
            isConfigured = true;
            equipmentConfig.autres.barre_traction = true;
            break;
        case 'kettlebell':
            isConfigured = Object.keys(equipmentConfig.kettlebells).length > 0;
            break;
    }
    
    statusEl.textContent = isConfigured ? 'Configuré ✓' : 'À configurer';
    statusEl.style.color = isConfigured ? '#10b981' : '#94a3b8';
    
    updateProgressIndicator();
}

function updateProgressIndicator() {
    const total = selectedEquipment.length;
    let configured = 0;
    
    selectedEquipment.forEach(eq => {
        const status = document.getElementById(`status-${eq}`);
        if (status && status.textContent.includes('✓')) {
            configured++;
        }
    });
    
    const indicator = document.getElementById('equipmentProgress');
    if (indicator) {
        indicator.textContent = `${configured} / ${total} configurés`;
    }
}

// ===== VALIDATION =====
function validateDetailedConfig() {
    let isValid = true;
    let errors = [];
    
    if (selectedEquipment.includes('dumbbells')) {
        const dumbellCount = Object.keys(equipmentConfig.dumbbells).length;
        if (dumbellCount === 0) {
            errors.push('Veuillez ajouter au moins un poids d\'haltère');
            isValid = false;
        }
    }
    
    if (selectedEquipment.includes('barbell')) {
        const hasBarbell = Object.values(equipmentConfig.barres).some(b => b.available && b.count > 0);
        const hasDisques = Object.keys(equipmentConfig.disques).length > 0;
        
        if (!hasBarbell) {
            errors.push('Veuillez sélectionner au moins un type de barre');
            isValid = false;
        }
        if (!hasDisques) {
            errors.push('Veuillez ajouter au moins un poids de disque');
            isValid = false;
        }
    }
    
    if (selectedEquipment.includes('resistance_bands')) {
        if (equipmentConfig.elastiques.length === 0) {
            errors.push('Veuillez ajouter au moins un élastique');
            isValid = false;
        }
    }
    
    if (selectedEquipment.includes('kettlebell')) {
        const kettlebellCount = Object.keys(equipmentConfig.kettlebells).length;
        if (kettlebellCount === 0) {
            errors.push('Veuillez ajouter au moins un poids de kettlebell');
            isValid = false;
        }
    }
    
    if (!isValid && errors.length > 0) {
        errors.forEach(error => showToast(error, 'error'));
    }
    
    return isValid;
}

// ===== RÉSUMÉ DU PROFIL =====
function updateProfileSummary() {
    const container = document.getElementById('profileSummary');
    if (!container) return;
    
    let summaryHTML = '<div class="summary-sections">';
    
    // Section informations personnelles
    summaryHTML += `
        <div class="summary-section">
            <h4 class="summary-title">👤 Informations personnelles</h4>
            <div class="summary-content">
                <div class="summary-row">
                    <span class="summary-label">Nom:</span>
                    <span class="summary-value">${document.getElementById('userName').value}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Date de naissance:</span>
                    <span class="summary-value">${new Date(document.getElementById('userBirthDate').value).toLocaleDateString('fr-FR')}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Taille:</span>
                    <span class="summary-value">${document.getElementById('userHeight').value} cm</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Poids:</span>
                    <span class="summary-value">${document.getElementById('userWeight').value} kg</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Niveau:</span>
                    <span class="summary-value">${document.getElementById('experienceLevel').selectedOptions[0]?.text || 'Non défini'}</span>
                </div>
            </div>
        </div>
    `;
    
    // Section objectifs
    summaryHTML += `
        <div class="summary-section">
            <h4 class="summary-title">🎯 Objectifs</h4>
            <div class="summary-content">
                <div class="goals-summary">
                    ${selectedGoals.map(goal => `
                        <span class="goal-badge">${GOAL_NAMES[goal] || goal}</span>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    // Section équipement
    summaryHTML += `
        <div class="summary-section">
            <h4 class="summary-title">💪 Équipement disponible</h4>
            <div class="summary-content">
    `;
    
    selectedEquipment.forEach(eq => {
        summaryHTML += `<div class="equipment-summary-item">`;
        summaryHTML += `<strong>${getEquipmentName(eq)}</strong>`;
        
        switch(eq) {
            case 'dumbbells':
                const dumbbellWeights = Object.keys(equipmentConfig.dumbbells).filter(w => equipmentConfig.dumbbells[w] > 0);
                if (dumbbellWeights.length > 0) {
                    summaryHTML += `<div class="equipment-detail">Poids: ${dumbbellWeights.join(', ')}kg</div>`;
                }
                break;
                
            case 'barbell':
                const barres = Object.entries(equipmentConfig.barres)
                    .filter(([_, config]) => config.available)
                    .map(([type, config]) => `${type} (${config.weight}kg)`);
                if (barres.length > 0) {
                    summaryHTML += `<div class="equipment-detail">Barres: ${barres.join(', ')}</div>`;
                }
                const disques = Object.entries(equipmentConfig.disques)
                    .filter(([_, count]) => count > 0)
                    .map(([weight, count]) => `${weight}kg×${count}`);
                if (disques.length > 0) {
                    summaryHTML += `<div class="equipment-detail">Disques: ${disques.join(', ')}</div>`;
                }
                break;
                
            case 'resistance_bands':
                if (equipmentConfig.elastiques.length > 0) {
                    const bands = equipmentConfig.elastiques.map(e => 
                        `${e.color} (${e.resistance}kg)`
                    );
                    summaryHTML += `<div class="equipment-detail">${bands.join(', ')}</div>`;
                }
                break;
                
            case 'bench':
                const benchFeatures = [];
                if (equipmentConfig.banc.inclinable) benchFeatures.push('inclinable');
                if (equipmentConfig.banc.declinable) benchFeatures.push('déclinable');
                if (benchFeatures.length > 0) {
                    summaryHTML += `<div class="equipment-detail">Options: ${benchFeatures.join(', ')}</div>`;
                }
                break;
                
            case 'kettlebell':
                const kettlebellWeights = Object.keys(equipmentConfig.kettlebells).filter(w => equipmentConfig.kettlebells[w] > 0);
                if (kettlebellWeights.length > 0) {
                    summaryHTML += `<div class="equipment-detail">Poids: ${kettlebellWeights.join(', ')}kg</div>`;
                }
                break;
        }
        
        summaryHTML += `</div>`;
    });
    
    summaryHTML += `
            </div>
        </div>
    </div>`;
    
    container.innerHTML = summaryHTML;
}

// ===== SAUVEGARDE UTILISATEUR =====
async function saveUserProfile() {
    // Transformer la structure equipment_config au format attendu par l'API
    const transformedEquipmentConfig = {
        barres: equipmentConfig.barres,
        disques: {
            available: Object.keys(equipmentConfig.disques).length > 0,
            weights: equipmentConfig.disques
        },
        dumbbells: {
            available: Object.keys(equipmentConfig.dumbbells).length > 0,
            weights: Object.keys(equipmentConfig.dumbbells).map(w => parseFloat(w))
        },
        banc: {
            available: equipmentConfig.banc.available,
            inclinable_haut: equipmentConfig.banc.inclinable || false,
            inclinable_bas: equipmentConfig.banc.declinable || false
        },
        elastiques: {
            available: equipmentConfig.elastiques.length > 0,
            bands: equipmentConfig.elastiques.map(e => ({
                color: e.color,
                resistance: e.resistance,
                count: e.count
            }))
        },
        autres: {
            kettlebell: {
                available: Object.keys(equipmentConfig.kettlebells || {}).length > 0,
                weights: Object.keys(equipmentConfig.kettlebells || {}).map(w => parseFloat(w))
            },
            barre_traction: {
                available: equipmentConfig.autres.barre_traction || false
            },
            lest_corps: {
                available: (equipmentConfig.autres.lest_corps || []).length > 0,
                weights: equipmentConfig.autres.lest_corps || []
            },
            lest_chevilles: {
                available: (equipmentConfig.autres.lest_chevilles || []).length > 0,
                weights: equipmentConfig.autres.lest_chevilles || []
            },
            lest_poignets: {
                available: (equipmentConfig.autres.lest_poignets || []).length > 0,
                weights: equipmentConfig.autres.lest_poignets || []
            }
        }
    };
    
    const userData = {
        name: document.getElementById('userName').value.trim(),
        birth_date: document.getElementById('userBirthDate').value + 'T00:00:00',
        height: parseFloat(document.getElementById('userHeight').value),
        weight: parseFloat(document.getElementById('userWeight').value),
        experience_level: document.getElementById('experienceLevel').value,
        goals: selectedGoals,
        equipment_config: transformedEquipmentConfig
    };
    
    // Validation finale
    if (!userData.name || !userData.birth_date || !userData.experience_level || 
        isNaN(userData.height) || isNaN(userData.weight) || 
        userData.height <= 0 || userData.weight <= 0) {
        showToast('Informations personnelles incomplètes', 'error');
        return;
    }
    
    if (userData.goals.length === 0) {
        showToast('Aucun objectif sélectionné', 'error');
        return;
    }

    // VALIDATION: Vérifier que equipment_config n'est pas vide
    if (!transformedEquipmentConfig || Object.keys(transformedEquipmentConfig).length === 0) {
        showToast('Configuration d\'équipement requise', 'error');
        return;
    }

    // VALIDATION: Vérifier que goals existe
    if (!userData.goals || userData.goals.length === 0) {
        showToast('Au moins un objectif doit être sélectionné', 'error');
        return;
    }

    const user = await saveUser(userData);
    
    if (user) {
        setCurrentUser(user);
        localStorage.setItem('userId', user.id);
        localStorage.setItem('userProfile', JSON.stringify(user));
        
        // Réinitialiser l'interface
        document.getElementById('progressContainer').style.display = 'none';
        
        showMainInterface();
        showToast('Profil créé avec succès !', 'success');
    }
}

// ===== LOGOUT =====
function logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        localStorage.removeItem('userId');
        localStorage.removeItem('userProfile');
        resetState();
        
        // Réinitialiser l'interface
        document.getElementById('bottomNav').style.display = 'none';
        document.getElementById('progressContainer').style.display = 'block';
        document.getElementById('userInitial').style.display = 'none';
        
        // Réinitialiser les formulaires
        document.getElementById('userName').value = '';
        document.getElementById('userBirthDate').value = '';
        document.getElementById('userHeight').value = '';
        document.getElementById('userWeight').value = '';
        document.getElementById('experienceLevel').value = '';
        
        document.querySelectorAll('.chip.selected, .equipment-card.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        updateProgressBar();
        showStep(1);
        showWelcomeScreen();
        showToast('Déconnexion réussie', 'success');
    }
}

// ===== EXPORT GLOBAL =====
// Export toutes les fonctions utilisées dans le HTML
window.toggleGoal = toggleGoal;
window.toggleEquipment = toggleEquipment;
window.nextStep = nextStep;  // Utilise notre version locale
window.prevStep = prevStep;  // Utilise notre version locale
window.saveUser = saveUserProfile;
window.updateBarbell = updateBarbell;
window.updateDisqueWeight = updateDisqueWeight;
window.updateDumbbellWeight = updateDumbbellWeight;
window.updateKettlebellWeight = updateKettlebellWeight;
window.addBand = addBand;
window.removeBand = removeBand;
window.toggleBenchFeature = toggleBenchFeature;
window.showConfigPanel = showConfigPanel;
window.logout = logout;
window.saveCommitment = saveCommitment;

// Export pour les autres modules
export {
    generateDetailedEquipmentConfig,
    updateProfileSummary,
    validateDetailedConfig
};
