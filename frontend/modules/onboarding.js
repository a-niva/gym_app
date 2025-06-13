// ===== MODULES/ONBOARDING.JS - PROCESSUS D'INSCRIPTION =====

import { getState, setState, resetState } from '../core/state.js';
import { showToast } from './utils.js';
import { generateDetailedEquipmentConfig, updateEquipmentStatus } from './equipment.js';

// Affichage du formulaire de profil
export function showProfileForm() {
    resetState(['currentStep', 'selectedGoals', 'selectedEquipment', 'equipmentConfig']);
    setState('currentStep', 1);
    
    document.getElementById('bottomNav').style.display = 'none';
    document.getElementById('userInitial').style.display = 'none';
    
    document.getElementById('onboarding').classList.add('active');
    document.getElementById('progressContainer').style.display = 'block';
    
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    showStep(1);
    updateProgressBar();
    
    clearFormFields();
}

// Navigation entre les étapes
export function nextStep() {
    const currentStep = getState('currentStep');
    const totalSteps = getState('totalSteps');
    
    if (!validateCurrentStep()) return;
    
    if (currentStep === 3) {
        handleEquipmentStepTransition();
    } else if (currentStep === 4) {
        updateProfileSummary();
    }
    
    if (currentStep < totalSteps) {
        setState('currentStep', currentStep + 1);
        showStep(currentStep + 1);
        updateProgressBar();
    }
}

export function prevStep() {
    const currentStep = getState('currentStep');
    
    if (currentStep > 1) {
        setState('currentStep', currentStep - 1);
        showStep(currentStep - 1);
        updateProgressBar();
    }
}

// Affichage d'une étape spécifique
export function showStep(stepNumber) {
    document.querySelectorAll('.onboarding-step').forEach(step => {
        step.classList.remove('active');
    });
    
    const stepElement = document.getElementById(`step${stepNumber}`);
    if (stepElement) {
        stepElement.classList.add('active');
        
        if (stepNumber === 4) {
            const selectedEquipment = getState('selectedEquipment');
            if (selectedEquipment.length > 0) {
                generateDetailedEquipmentConfig();
            }
        }
    }
}

// Mise à jour de la barre de progression
export function updateProgressBar() {
    const currentStep = getState('currentStep');
    const totalSteps = getState('totalSteps');
    const progress = (currentStep - 1) / (totalSteps - 1) * 100;
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

// Validation de l'étape courante
function validateCurrentStep() {
    const currentStep = getState('currentStep');
    
    switch (currentStep) {
        case 1:
            return validatePersonalInfo();
        case 2:
            return validateGoals();
        case 3:
            return validateEquipment();
        case 4:
            return validateDetailedConfig();
        default:
            return true;
    }
}

// Validation des informations personnelles
function validatePersonalInfo() {
    const name = document.getElementById('userName').value?.trim();
    const birthDate = document.getElementById('userBirthDate').value;
    const height = document.getElementById('userHeight').value;
    const weight = document.getElementById('userWeight').value;
    const experience = document.getElementById('experienceLevel').value;
    
    if (!name || !birthDate || !height || !weight || !experience) {
        showToast('Veuillez remplir tous les champs', 'error');
        return false;
    }
    
    const age = calculateAge(birthDate);
    if (age < 13) {
        showToast('Vous devez avoir au moins 13 ans', 'error');
        return false;
    }
    
    if (height < 100 || height > 250) {
        showToast('Taille invalide (100-250 cm)', 'error');
        return false;
    }
    
    if (weight < 30 || weight > 300) {
        showToast('Poids invalide (30-300 kg)', 'error');
        return false;
    }
    
    return true;
}

// Validation des objectifs
function validateGoals() {
    const goals = getState('selectedGoals');
    if (goals.length === 0) {
        showToast('Veuillez sélectionner au moins un objectif', 'error');
        return false;
    }
    return true;
}

// Validation de l'équipement
function validateEquipment() {
    const equipment = getState('selectedEquipment');
    if (equipment.length === 0) {
        showToast('Veuillez sélectionner au moins un équipement', 'error');
        return false;
    }
    return true;
}

// Validation de la configuration détaillée
function validateDetailedConfig() {
    const equipment = getState('selectedEquipment');
    const needsConfig = equipment.some(eq => 
        ['dumbbells', 'barbell', 'resistance_bands', 'kettlebell'].includes(eq)
    );
    
    if (!needsConfig) return true;
    
    const config = getState('equipmentConfig');
    let hasValidConfig = false;
    
    if (equipment.includes('dumbbells') && Object.keys(config.dumbbells).length > 0) {
        hasValidConfig = true;
    }
    
    if (equipment.includes('barbell')) {
        const hasBarbell = config.barres.olympique.available || 
                         config.barres.ez.available || 
                         config.barres.courte.available;
        const hasDisques = Object.keys(config.disques).length > 0;
        if (hasBarbell && hasDisques) hasValidConfig = true;
    }
    
    if (equipment.includes('resistance_bands') && config.elastiques.length > 0) {
        hasValidConfig = true;
    }
    
    if (equipment.includes('kettlebell') && Object.keys(config.kettlebells).length > 0) {
        hasValidConfig = true;
    }
    
    if (!hasValidConfig) {
        showToast('Veuillez configurer au moins un équipement', 'error');
        return false;
    }
    
    return true;
}

// Gestion de la transition vers l'étape équipement
function handleEquipmentStepTransition() {
    const selectedEquipment = getState('selectedEquipment');
    const needsConfig = selectedEquipment.some(eq => 
        ['dumbbells', 'barbell', 'resistance_bands', 'kettlebell'].includes(eq)
    );
    
    if (!needsConfig) {
        setState('currentStep', 4);
        updateProfileSummary();
    }
}

// Gestion des objectifs
export function toggleGoal(goalElement) {
    const goal = goalElement.dataset.goal;
    const selectedGoals = getState('selectedGoals');
    
    goalElement.classList.toggle('selected');
    
    if (goalElement.classList.contains('selected')) {
        if (!selectedGoals.includes(goal)) {
            selectedGoals.push(goal);
        }
    } else {
        const index = selectedGoals.indexOf(goal);
        if (index > -1) selectedGoals.splice(index, 1);
    }
    
    setState('selectedGoals', selectedGoals);
}

// Gestion de l'équipement
export function toggleEquipment(card) {
    const equipment = card.dataset.equipment;
    const selectedEquipment = getState('selectedEquipment');
    
    card.classList.toggle('selected');
    
    if (card.classList.contains('selected')) {
        if (!selectedEquipment.includes(equipment)) {
            selectedEquipment.push(equipment);
        }
    } else {
        const index = selectedEquipment.indexOf(equipment);
        if (index > -1) selectedEquipment.splice(index, 1);
    }
    
    setState('selectedEquipment', selectedEquipment);
}

// Mise à jour du résumé du profil
export function updateProfileSummary() {
    const summaryDiv = document.getElementById('profileSummary');
    if (!summaryDiv) return;
    
    const userName = document.getElementById('userName').value?.trim();
    const birthDate = document.getElementById('userBirthDate').value;
    const height = document.getElementById('userHeight').value;
    const weight = document.getElementById('userWeight').value;
    const experienceLevel = document.getElementById('experienceLevel').value;
    const selectedGoals = getState('selectedGoals');
    const selectedEquipment = getState('selectedEquipment');
    const equipmentConfig = getState('equipmentConfig');
    
    const age = calculateAge(birthDate);
    const experienceLevels = {
        'beginner': 'Débutant',
        'intermediate': 'Intermédiaire', 
        'advanced': 'Avancé',
        'elite': 'Élite',
        'extreme': 'Extrême'
    };
    
    const goalNames = {
        'strength': 'Force',
        'hypertrophy': 'Masse musculaire',
        'cardio': 'Cardio',
        'weight_loss': 'Perte de poids',
        'endurance': 'Endurance',
        'flexibility': 'Souplesse'
    };
    
    const equipmentNames = {
        'dumbbells': 'Haltères',
        'barbell': 'Barres & Disques',
        'resistance_bands': 'Élastiques',
        'bench': 'Banc',
        'pull_up_bar': 'Barre de traction',
        'kettlebell': 'Kettlebells'
    };
    
    const summaryHTML = `
        <div class="summary-sections">
            <div class="summary-section">
                <h4 class="summary-title">👤 Informations personnelles</h4>
                <div class="summary-row">
                    <span class="summary-label">Nom</span>
                    <span class="summary-value">${userName}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Âge</span>
                    <span class="summary-value">${age} ans</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Taille</span>
                    <span class="summary-value">${height} cm</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Poids</span>
                    <span class="summary-value">${weight} kg</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Niveau</span>
                    <span class="summary-value">${experienceLevels[experienceLevel]}</span>
                </div>
            </div>
            
            <div class="summary-section">
                <h4 class="summary-title">🎯 Objectifs</h4>
                <div class="goal-badges">
                    ${selectedGoals.map(goal => 
                        `<span class="goal-badge">${goalNames[goal]}</span>`
                    ).join('')}
                </div>
            </div>
            
            <div class="summary-section">
                <h4 class="summary-title">🏋️ Équipement</h4>
                ${selectedEquipment.map(eq => {
                    let details = getEquipmentDetails(eq, equipmentConfig);
                    return `
                        <div class="equipment-summary-item">
                            <strong>${equipmentNames[eq]}</strong>
                            ${details ? `<div class="equipment-detail">${details}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    summaryDiv.innerHTML = summaryHTML;
}

// Obtenir les détails de l'équipement
function getEquipmentDetails(equipment, config) {
    switch (equipment) {
        case 'dumbbells':
            const dumbbellWeights = Object.keys(config.dumbbells).sort((a, b) => a - b);
            return dumbbellWeights.length > 0 ? 
                `${dumbbellWeights.join('kg, ')}kg` : 'Non configuré';
                
        case 'barbell':
            const barTypes = [];
            if (config.barres.olympique.available) barTypes.push('Olympique');
            if (config.barres.ez.available) barTypes.push('EZ');
            if (config.barres.courte.available) barTypes.push('Courte');
            const disqueWeights = Object.keys(config.disques).sort((a, b) => a - b);
            return barTypes.length > 0 ? 
                `${barTypes.join(', ')} + Disques: ${disqueWeights.join('kg, ')}kg` : 
                'Non configuré';
                
        case 'resistance_bands':
            return config.elastiques.length > 0 ? 
                `${config.elastiques.length} élastique(s) configuré(s)` : 
                'Non configuré';
                
        case 'kettlebell':
            const kettlebellWeights = Object.keys(config.kettlebells).sort((a, b) => a - b);
            return kettlebellWeights.length > 0 ? 
                `${kettlebellWeights.join('kg, ')}kg` : 'Non configuré';
                
        case 'bench':
            const features = [];
            if (config.banc.inclinable) features.push('Inclinable');
            if (config.banc.declinable) features.push('Déclinable');
            return features.length > 0 ? features.join(', ') : 'Plat';
            
        case 'pull_up_bar':
            return config.autres.barre_traction ? 'Disponible' : 'Non configuré';
            
        default:
            return null;
    }
}

// Utilitaires
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

function clearFormFields() {
    document.getElementById('userName').value = '';
    document.getElementById('userBirthDate').value = '';
    document.getElementById('userHeight').value = '';
    document.getElementById('userWeight').value = '';
    document.getElementById('experienceLevel').value = '';
    
    document.querySelectorAll('.chip.selected, .equipment-card.selected').forEach(el => {
        el.classList.remove('selected');
    });
}

// Import depuis auth.js
import { saveUser } from './auth.js';

// Exposer la fonction saveUser
export { saveUser };