// Configuration API
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api' 
    : '/api';

// Variables globales
let currentUser = null;
let currentStep = 1;
let selectedGoals = [];
let selectedEquipment = [];
window.selectedDumbbells = [];
let selectedPlates = [];
let resistanceBands = [];
let plateConfiguration = {}; // Format: { "5": 4, "10": 2, "20": 2 }
let bandCounter = 0;
let workoutMode = null;
let currentWorkout = null;
let timerInterval = null;
let exercises = [];
let bodyParts = [];
let searchQuery = '';
let filterBodyPart = '';
let currentExercise = null;
let currentSet = {
    set_number: 1,
    weight: 0,
    target_reps: 10,
    actual_reps: 10
};
let restTimer = 0;
let restInterval = null;
// ===== NOUVEAU CODE JAVASCRIPT POUR L'ÉQUIPEMENT =====
// À ajouter/remplacer dans app.js

// Variables globales pour la nouvelle configuration équipement
let equipmentConfig = {
    barres: {
        barbell_standard: {available: false, weight: 20.0, count: 1},
        barbell_ez: {available: false, weight: 10.0, count: 1},
        barbell_courte: {available: false, weight: 2.5, count: 2}
    },
    disques: {available: false, weights: {}},
    dumbbells: {available: false, weights: []},
    banc: {available: false, inclinable_haut: true, inclinable_bas: false},
    elastiques: {available: false, bands: []},
    autres: {
        kettlebell: {available: false, weights: []},
        barre_traction: {available: false},
        lest_corps: {available: false, weights: []},
        lest_chevilles: {available: false, weights: []},
        lest_poignets: {available: false, weights: []}
    }
};

let elastiqueCounter = 0;

// ===== FONCTIONS POUR LES BARRES =====
function toggleBarreConfig(type) {
    const checkbox = document.getElementById(`barbell_${type}`);
    const config = document.getElementById(`${type}_config`);
    
    if (checkbox.checked) {
        config.style.display = 'block';
        equipmentConfig.barres[`barbell_${type}`].available = true;
        
        // Mettre à jour les valeurs depuis les inputs
        const weightInput = document.getElementById(`${type}_weight`);
        const countInput = document.getElementById(`${type}_count`);
        
        if (weightInput) {
            equipmentConfig.barres[`barbell_${type}`].weight = parseFloat(weightInput.value) || 20;
        }
        if (countInput) {
            equipmentConfig.barres[`barbell_${type}`].count = parseInt(countInput.value) || 1;
        }
        
        // Ajouter event listeners pour les changements
        if (weightInput) {
            weightInput.addEventListener('change', () => {
                equipmentConfig.barres[`barbell_${type}`].weight = parseFloat(weightInput.value) || 20;
            });
        }
        if (countInput) {
            countInput.addEventListener('change', () => {
                equipmentConfig.barres[`barbell_${type}`].count = parseInt(countInput.value) || 1;
            });
        }
    } else {
        config.style.display = 'none';
        equipmentConfig.barres[`barbell_${type}`].available = false;
    }
}

// ===== FONCTIONS POUR LES DISQUES =====
function toggleDisquesConfig() {
    const checkbox = document.getElementById('disques_available');
    const config = document.getElementById('disques_config');
    
    equipmentConfig.disques.available = checkbox.checked;
    config.style.display = checkbox.checked ? 'block' : 'none';
}

function showDisqueModal() {
    document.getElementById('disqueModal').style.display = 'flex';
    document.getElementById('disque_weight').value = '';
    document.getElementById('disque_custom_weight').style.display = 'none';
    document.getElementById('disque_count').value = '2';
}

function closeDisqueModal() {
    document.getElementById('disqueModal').style.display = 'none';
}

function handleDisqueWeightChange() {
    const weightSelect = document.getElementById('disque_weight');
    const customInput = document.getElementById('disque_custom_weight');
    
    if (weightSelect.value === 'custom') {
        customInput.style.display = 'block';
        customInput.focus();
    } else {
        customInput.style.display = 'none';
        customInput.value = '';
    }
}

function confirmDisqueAddition() {
    const weightSelect = document.getElementById('disque_weight');
    const customWeight = document.getElementById('disque_custom_weight');
    const count = parseInt(document.getElementById('disque_count').value);
    
    let weight;
    if (weightSelect.value === 'custom') {
        weight = parseFloat(customWeight.value);
        if (isNaN(weight) || weight <= 0) {
            showToast('Veuillez entrer un poids valide', 'error');
            return;
        }
    } else {
        weight = parseFloat(weightSelect.value);
        if (!weight) {
            showToast('Veuillez sélectionner un poids', 'error');
            return;
        }
    }
    
    if (!count || count < 1) {
        showToast('Veuillez entrer un nombre valide', 'error');
        return;
    }
    
    equipmentConfig.disques.weights[weight.toString()] = count;
    updateDisquesList();
    closeDisqueModal();
    showToast(`${count} disques de ${weight}kg ajoutés`, 'success');
}

function updateDisquesList() {
    const container = document.getElementById('disques_list');
    const weights = Object.entries(equipmentConfig.disques.weights);
    
    if (weights.length === 0) {
        container.innerHTML = '<p style="color: var(--gray); font-size: 0.875rem;">Aucun disque configuré</p>';
        return;
    }
    
    // Trier par poids
    weights.sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
    
    container.innerHTML = weights.map(([weight, count]) => 
        `<div class="disque-item">
            <span><strong>${weight} kg</strong> × ${count} disques</span>
            <button onclick="removeDisque('${weight}')" 
                    style="background: var(--danger); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer;">×</button>
        </div>`
    ).join('');
}

function removeDisque(weight) {
    delete equipmentConfig.disques.weights[weight];
    updateDisquesList();
    showToast(`Disques de ${weight}kg supprimés`, 'info');
}

// ===== FONCTIONS POUR LES HALTÈRES =====
function toggleDumbbellsConfig() {
    const checkbox = document.getElementById('dumbbells_available');
    const config = document.getElementById('dumbbells_config');
    
    equipmentConfig.dumbbells.available = checkbox.checked;
    config.style.display = checkbox.checked ? 'block' : 'none';
}

function showDumbbellModal() {
    document.getElementById('dumbbellModal').style.display = 'flex';
    // Pré-cocher les poids déjà sélectionnés
    document.querySelectorAll('#dumbbellModal input[type="checkbox"]').forEach(cb => {
        cb.checked = equipmentConfig.dumbbells.weights.includes(parseFloat(cb.value));
    });
}

function closeDumbbellModal() {
    document.getElementById('dumbbellModal').style.display = 'none';
}

function confirmDumbbellSelection() {
    equipmentConfig.dumbbells.weights = [];
    document.querySelectorAll('#dumbbellModal input:checked').forEach(checkbox => {
        equipmentConfig.dumbbells.weights.push(parseFloat(checkbox.value));
    });
    equipmentConfig.dumbbells.weights.sort((a, b) => a - b);
    
    updateDumbbellsList();
    closeDumbbellModal();
    showToast(`${equipmentConfig.dumbbells.weights.length} poids d'haltères sélectionnés`, 'success');
}

function updateDumbbellsList() {
    const container = document.getElementById('dumbbells_list');
    
    if (equipmentConfig.dumbbells.weights.length === 0) {
        container.innerHTML = '<p style="color: var(--gray); font-size: 0.875rem;">Aucun haltère sélectionné</p>';
        return;
    }
    
    container.innerHTML = `<p><strong>Haltères disponibles :</strong><br>${equipmentConfig.dumbbells.weights.join(' kg, ')} kg (paires)</p>`;
}

// ===== FONCTIONS POUR LE BANC =====
function toggleBancConfig() {
    const checkbox = document.getElementById('banc_available');
    const config = document.getElementById('banc_config');
    
    equipmentConfig.banc.available = checkbox.checked;
    config.style.display = checkbox.checked ? 'block' : 'none';
    
    if (checkbox.checked) {
        // Ajouter event listeners pour les options du banc
        const inclineHaut = document.getElementById('banc_incline_haut');
        const inclineBas = document.getElementById('banc_incline_bas');
        
        if (inclineHaut) {
            inclineHaut.addEventListener('change', () => {
                equipmentConfig.banc.inclinable_haut = inclineHaut.checked;
            });
        }
        if (inclineBas) {
            inclineBas.addEventListener('change', () => {
                equipmentConfig.banc.inclinable_bas = inclineBas.checked;
            });
        }
    }
}

// ===== FONCTIONS POUR LES ÉLASTIQUES =====
function toggleElastiquesConfig() {
    const checkbox = document.getElementById('elastiques_available');
    const config = document.getElementById('elastiques_config');
    
    equipmentConfig.elastiques.available = checkbox.checked;
    config.style.display = checkbox.checked ? 'block' : 'none';
}

function addElastique() {
    elastiqueCounter++;
    const container = document.getElementById('elastiques_list');
    
    const elastiqueHtml = `
        <div class="elastique-input" data-elastique-id="${elastiqueCounter}">
            <input type="text" class="form-input" placeholder="Couleur" id="elastique_color_${elastiqueCounter}" style="flex: 1;">
            <input type="number" class="form-input" placeholder="Résistance (kg)" id="elastique_resistance_${elastiqueCounter}" 
                   step="0.5" min="1" max="100" style="flex: 1;">
            <input type="number" class="form-input" placeholder="Nombre" id="elastique_count_${elastiqueCounter}" 
                   value="1" min="1" max="10" style="width: 80px;">
            <button onclick="removeElastique(${elastiqueCounter})" 
                    style="background: var(--danger); color: white; border: none; border-radius: var(--radius); padding: 0.5rem; cursor: pointer;">×</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', elastiqueHtml);
}

function removeElastique(id) {
    const element = document.querySelector(`[data-elastique-id="${id}"]`);
    if (element) {
        element.remove();
        updateElastiquesConfig();
    }
}

function updateElastiquesConfig() {
    equipmentConfig.elastiques.bands = [];
    
    document.querySelectorAll('.elastique-input').forEach(elastiqueDiv => {
        const id = elastiqueDiv.dataset.elastiqueId;
        const colorInput = document.getElementById(`elastique_color_${id}`);
        const resistanceInput = document.getElementById(`elastique_resistance_${id}`);
        const countInput = document.getElementById(`elastique_count_${id}`);
        
        if (colorInput && resistanceInput && countInput) {
            const color = colorInput.value.trim();
            const resistance = parseFloat(resistanceInput.value);
            const count = parseInt(countInput.value);
            
            if (color && !isNaN(resistance) && !isNaN(count) && resistance > 0 && count > 0) {
                equipmentConfig.elastiques.bands.push({
                    color: color,
                    resistance: resistance,
                    count: count
                });
            }
        }
    });
}

// ===== FONCTIONS POUR LES AUTRES ÉQUIPEMENTS =====
function toggleKettlebellConfig() {
    const checkbox = document.getElementById('kettlebell_available');
    const config = document.getElementById('kettlebell_config');
    
    equipmentConfig.autres.kettlebell.available = checkbox.checked;
    config.style.display = checkbox.checked ? 'block' : 'none';
}

function toggleLestConfig(type) {
    const checkbox = document.getElementById(`lest_${type}_available`);
    const config = document.getElementById(`lest_${type}_config`);
    
    equipmentConfig.autres[`lest_${type}`].available = checkbox.checked;
    config.style.display = checkbox.checked ? 'block' : 'none';
}

function showKettlebellModal() {
    // TODO: Implémenter modal pour kettlebells
    showToast('Configuration kettlebells à venir', 'info');
}

function showLestModal(type) {
    // TODO: Implémenter modal pour lests
    showToast(`Configuration lests ${type} à venir`, 'info');
}

// ===== FONCTION POUR COLLECTER TOUTE LA CONFIGURATION =====
function collectEquipmentConfig() {
    // Mettre à jour les élastiques
    updateElastiquesConfig();
    
    // Mettre à jour les options du banc si activé
    if (equipmentConfig.banc.available) {
        const inclineHaut = document.getElementById('banc_incline_haut');
        const inclineBas = document.getElementById('banc_incline_bas');
        
        if (inclineHaut) equipmentConfig.banc.inclinable_haut = inclineHaut.checked;
        if (inclineBas) equipmentConfig.banc.inclinable_bas = inclineBas.checked;
    }
    
    // Mettre à jour la barre de traction
    const barreTraction = document.getElementById('barre_traction_available');
    if (barreTraction) {
        equipmentConfig.autres.barre_traction.available = barreTraction.checked;
    }
    
    return equipmentConfig;
}

// ===== FONCTION DE COMPLETION ONBOARDING MISE À JOUR =====
async function completeOnboarding() {
    // Collecter toute la configuration
    const finalConfig = collectEquipmentConfig();
    
    const userData = {
        name: document.getElementById('userName').value,
        age: parseInt(document.getElementById('userAge').value),
        experience_level: document.getElementById('experienceLevel').value,
        goals: selectedGoals,
        equipment_config: finalConfig
    };
    
    // Validation basique
    if (!userData.name || !userData.age || !userData.experience_level || selectedGoals.length === 0) {
        showToast('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }
    
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
            
            showToast('Profil créé avec succès ! 🎉', 'success');
            
            // Passer au dashboard
            setTimeout(() => {
                showView('dashboard');
                document.getElementById('progressContainer').style.display = 'none';
            }, 1500);
            
        } else {
            const errorData = await response.json();
            console.error('Erreur serveur:', errorData);
            showToast('Erreur lors de la création du profil', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion au serveur', 'error');
    }
}

// ===== FONCTION POUR CALCULER LES POIDS DISPONIBLES (mise à jour) =====
function calculateAvailableWeights(exercise) {
    if (!currentUser || !currentUser.equipment_config) {
        return [];
    }
    
    const equipmentNeeded = exercise.equipment || [];
    const config = currentUser.equipment_config;
    let weights = [];
    
    // Haltères
    if (equipmentNeeded.includes('dumbbells') && config.dumbbells?.available) {
        weights = [...config.dumbbells.weights];
    }
    
    // Barres + disques
    else if (equipmentNeeded.some(eq => eq.startsWith('barbell_')) && config.disques?.available) {
        // Déterminer le type de barre
        let barWeight = 20; // Défaut
        
        if (equipmentNeeded.includes('barbell_standard') && config.barres?.barbell_standard?.available) {
            barWeight = config.barres.barbell_standard.weight;
        } else if (equipmentNeeded.includes('barbell_ez') && config.barres?.barbell_ez?.available) {
            barWeight = config.barres.barbell_ez.weight;
        } else if (equipmentNeeded.includes('barbell_courte') && config.barres?.barbell_courte?.available) {
            barWeight = config.barres.barbell_courte.weight;
        }
        
        // Calculer toutes les combinaisons possibles avec les disques
        weights = calculateBarbellWeightCombinations(barWeight, config.disques.weights);
    }
    
    // Élastiques
    else if (equipmentNeeded.includes('elastiques') && config.elastiques?.available) {
        weights = config.elastiques.bands.map(band => band.resistance);
    }
    
    // Kettlebells
    else if (equipmentNeeded.includes('kettlebell') && config.autres?.kettlebell?.available) {
        weights = config.autres.kettlebell.weights;
    }
    
    // Poids du corps
    else if (equipmentNeeded.includes('bodyweight')) {
        weights = [0]; // Poids du corps
    }
    
    return weights.sort((a, b) => a - b);
}

function calculateBarbellWeightCombinations(barWeight, availablePlates) {
    const weights = new Set([barWeight]); // Commencer avec la barre seule
    
    // Convertir les disques en format numérique
    const plates = {};
    for (const [weightStr, count] of Object.entries(availablePlates)) {
        plates[parseFloat(weightStr)] = count;
    }
    
    // Générer toutes les combinaisons possibles (max 6 disques par côté pour être réaliste)
    function generateCombinations(currentWeight, remainingPlates, depth = 0) {
        if (depth > 6) return; // Max 6 disques par côté
        
        weights.add(currentWeight);
        
        for (const [plateWeight, count] of Object.entries(remainingPlates)) {
            if (count >= 2) { // Il faut 2 disques (un de chaque côté)
                const newWeight = currentWeight + (plateWeight * 2);
                const newRemaining = {...remainingPlates};
                newRemaining[plateWeight] = count - 2;
                
                if (newRemaining[plateWeight] === 0) {
                    delete newRemaining[plateWeight];
                }
                
                generateCombinations(newWeight, newRemaining, depth + 1);
            }
        }
    }
    
    generateCombinations(barWeight, plates);
    
    // Convertir en array, trier et limiter à des poids réalistes
    return Array.from(weights)
        .filter(w => w <= 300) // Max 300kg pour être réaliste
        .sort((a, b) => a - b);
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Event listener pour les changements de poids de disques personnalisés
    const disqueWeightSelect = document.getElementById('disque_weight');
    if (disqueWeightSelect) {
        disqueWeightSelect.addEventListener('change', handleDisqueWeightChange);
    }
    
    console.log('Interface équipement initialisée');
});

// Utilitaires
function parseCommaNumber(str) {
    if (!str) return NaN;
    return parseFloat(str.replace(',', '.').trim());
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Son du timer compatible iOS
function playTimerSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // Fréquence en Hz
        gainNode.gain.value = 0.3; // Volume
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2); // Durée 200ms
    } catch (error) {
        console.log('Audio non supporté:', error);
    }
}

// Navigation
function showView(viewName) {
    document.querySelectorAll('.onboarding, .dashboard, .workout-view').forEach(view => {
        view.classList.remove('active');
    });

    const view = document.getElementById(viewName + 'View');
    if (view) {
        view.classList.add('active');
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const navItem = document.querySelector(`.nav-item[onclick*="${viewName}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    if (viewName === 'dashboard' && currentUser) {
        loadDashboard();
    }

    // Gérer l'affichage de la barre de progression
    const progressContainer = document.getElementById('progressContainer');
    if (viewName === 'onboarding') {
        progressContainer.style.display = 'block';
    } else {
        progressContainer.style.display = 'none';
    }
}

function nextStep() {
    if (!validateStep(currentStep)) {
        return;
    }

    document.getElementById(`step${currentStep}`).classList.remove('active');
    currentStep++;
    
    setTimeout(() => {
        document.getElementById(`step${currentStep}`).classList.add('active');
        updateProgressBar();
        
        if (currentStep === 4) {
            showProfileSummary();
        }
    }, 300);
}

function prevStep() {
    document.getElementById(`step${currentStep}`).classList.remove('active');
    currentStep--;
    
    setTimeout(() => {
        document.getElementById(`step${currentStep}`).classList.add('active');
        updateProgressBar();
    }, 300);
}

function validateStep(step) {
    switch(step) {
        case 1:
            const name = document.getElementById('userName').value;
            const age = document.getElementById('userAge').value;
            const experience = document.getElementById('experienceLevel').value;
            
            if (!name || !age || !experience) {
                showToast('Veuillez remplir tous les champs', 'error');
                return false;
            }
            
            if (parseInt(age) < 13 || parseInt(age) > 120) {
                showToast('L\'âge doit être entre 13 et 120 ans', 'error');
                return false;
            }
            
            if (name.length < 2) {
                showToast('Le nom doit contenir au moins 2 caractères', 'error');
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
            
        default:
            return true;
    }
}

function updateProgressBar() {
    const progress = (currentStep / 4) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
}

function showProfileSummary() {
    const name = document.getElementById('userName').value;
    const age = document.getElementById('userAge').value;
    const experience = document.getElementById('experienceLevel').value;
    
    collectBandsData();
    
    let equipmentDetails = '';
    if (window.selectedDumbbells && window.selectedDumbbells.length > 0) {
        equipmentDetails += `<br><strong>Haltères:</strong> ${window.selectedDumbbells.join(', ')} kg`;
    }
    if (selectedEquipment.includes('barbell')) {
        const standardBar = document.getElementById('standardBarWeight')?.value || '20';
        equipmentDetails += `<br><strong>Barre standard:</strong> ${standardBar} kg`;
        const plateWeights = Object.keys(plateConfiguration).map(w => parseFloat(w)).sort((a, b) => a - b);
        if (plateWeights.length > 0) {
            equipmentDetails += `<br><strong>Disques:</strong> ${plateWeights.join(', ')} kg`;
        }
    }
    if (resistanceBands.length > 0) {
        equipmentDetails += `<br><strong>Élastiques:</strong> ${resistanceBands.map(b => `${b.color} (${b.resistance}kg)`).join(', ')}`;
    }
    
    const summary = `
        <strong>Nom:</strong> ${name}<br>
        <strong>Âge:</strong> ${age} ans<br>
        <strong>Expérience:</strong> ${experience}<br>
        <strong>Objectifs:</strong> ${selectedGoals.join(', ')}<br>
        <strong>Équipement:</strong> ${selectedEquipment.join(', ')}
        ${equipmentDetails}
    `;
    
    document.getElementById('profileSummary').innerHTML = summary;
}

// API et données
async function completeOnboarding() {
    collectBandsData();
    
    const userData = {
        name: document.getElementById('userName').value,
        age: parseInt(document.getElementById('userAge').value),
        experience_level: document.getElementById('experienceLevel').value,
        goals: selectedGoals,
        available_equipment: selectedEquipment,
        dumbbell_weights: window.selectedDumbbells || [],
        barbell_weights: collectBarbellData(),
        resistance_bands: resistanceBands
    };

    try {
        const response = await fetch(`${API_URL}/users`, {
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
            
            document.getElementById('userInitial').textContent = user.name[0].toUpperCase();
            document.getElementById('userInitial').style.display = 'flex';
            
            showToast('Profil créé avec succès !', 'success');
            showView('dashboard');
        } else {
            const error = await response.json();
            showToast(error.detail || 'Erreur lors de la création du profil', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion', 'error');
    }
}

async function loadUser(userId) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}`);
        if (response.ok) {
            currentUser = await response.json();
            document.getElementById('userInitial').textContent = currentUser.name[0].toUpperCase();
            document.getElementById('userInitial').style.display = 'flex';
            showView('dashboard');
        } else {
            localStorage.removeItem('userId');
            showView('onboarding');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showView('onboarding');
    }
}

async function loadDashboard() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/stats/${currentUser.id}`);
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalWorkouts').textContent = stats.total_workouts;
            document.getElementById('weekWorkouts').textContent = stats.week_workouts;
            document.getElementById('totalVolume').textContent = Math.round(stats.total_volume).toLocaleString();
            document.getElementById('currentStreak').textContent = '0'; // TODO: calculer la série
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

async function loadExercises() {
    try {
        const response = await fetch(`${API_URL}/exercises`);
        if (response.ok) {
            exercises = await response.json();
            bodyParts = [...new Set(exercises.map(e => e.body_part))].sort();
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// Gestion des entraînements
function selectMode(mode) {
    workoutMode = mode;
    document.querySelectorAll('.mode-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
}

async function startWorkout() {
    if (!workoutMode) {
        showToast('Veuillez sélectionner un mode', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/workouts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                type: workoutMode
            })
        });

        if (response.ok) {
            currentWorkout = await response.json();
            showView('workout');
            
            if (workoutMode === 'free_time') {
                loadExerciseSelector();
            } else {
                loadProgramWorkout();
            }
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur lors du démarrage', 'error');
    }
}

function loadExerciseSelector() {
    const container = document.getElementById('exerciseSelector');
    if (!container) return;
    
    const filteredExercises = exercises.filter(ex => {
        const matchSearch = !searchQuery || 
            ex.name_fr.toLowerCase().includes(searchQuery.toLowerCase());
        const matchBodyPart = !filterBodyPart || 
            ex.body_part === filterBodyPart;
        const hasEquipment = ex.equipment.some(eq => 
            currentUser.available_equipment.includes(eq)
        );
        
        return matchSearch && matchBodyPart && hasEquipment;
    });
    
    container.innerHTML = `
        <h2>Sélectionner un exercice</h2>
        <div style="margin-bottom: 1rem;">
            <input type="text" class="form-input" placeholder="Rechercher..." 
                   oninput="updateSearchQuery(this.value)" style="margin-bottom: 0.5rem;">
            <select class="form-input form-select" onchange="updateBodyPartFilter(this.value)">
                <option value="">Toutes les parties du corps</option>
                ${bodyParts.map(bp => `<option value="${bp}">${bp}</option>`).join('')}
            </select>
        </div>
        <div style="display: grid; gap: 0.5rem;">
            ${filteredExercises.map(ex => `
                <div class="equipment-card" onclick="selectExercise(${JSON.stringify(ex).replace(/"/g, '&quot;')})">
                    <h4>${ex.name_fr}</h4>
                    <p style="color: var(--gray); font-size: 0.875rem;">${ex.body_part}</p>
                </div>
            `).join('')}
        </div>
    `;
}

function updateSearchQuery(value) {
    searchQuery = value;
    loadExerciseSelector();
}

function updateBodyPartFilter(value) {
    filterBodyPart = value;
    loadExerciseSelector();
}

async function selectExercise(exercise) {
    currentExercise = exercise;
    
    // Récupérer le dernier poids utilisé
    try {
        const response = await fetch(`${API_URL}/sets/last-weight/${currentUser.id}/${exercise.id}`);
        if (response.ok) {
            const lastData = await response.json();
            if (lastData.weight) {
                currentSet.weight = lastData.weight;
                currentSet.target_reps = lastData.reps;
                currentSet.actual_reps = lastData.reps;
            }
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
    
    currentSet.set_number = 1;
    displayCurrentExercise();
}

function displayCurrentExercise() {
    const container = document.getElementById('currentExercise');
    if (!container || !currentExercise) return;
    
    const availableWeights = calculateAvailableWeights(currentExercise);
    
    container.innerHTML = `
        <h2>${currentExercise.name_fr}</h2>
        <p style="color: var(--gray);">Série ${currentSet.set_number}</p>
        
        <div style="display: grid; gap: 1rem; margin: 2rem 0;">
            <div class="form-group">
                <label class="form-label">Poids (kg)</label>
                <select class="form-input form-select" onchange="updateCurrentWeight(this.value)">
                    ${availableWeights.map(w => 
                        `<option value="${w}" ${w === currentSet.weight ? 'selected' : ''}>${w} kg</option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Répétitions cibles</label>
                <input type="number" class="form-input" value="${currentSet.target_reps}" 
                       onchange="currentSet.target_reps = parseInt(this.value)">
            </div>
            
            <div class="form-group">
                <label class="form-label">Répétitions réalisées</label>
                <input type="number" class="form-input" value="${currentSet.actual_reps}" 
                       onchange="currentSet.actual_reps = parseInt(this.value)">
            </div>
        </div>
        
        <div style="display: flex; gap: 1rem;">
            <button class="btn btn-secondary" onclick="skipSet()">Passer</button>
            <button class="btn" onclick="completeSet()">Valider la série</button>
        </div>
        
        <button class="btn btn-danger" onclick="finishExercise()" style="width: 100%; margin-top: 1rem;">
            Terminer l'exercice
        </button>
        
        <div id="restTimer" style="display: none; text-align: center; margin-top: 2rem;">
            <h3>Repos</h3>
            <div style="font-size: 2rem; font-weight: bold; color: var(--primary);" id="timerDisplay">0:00</div>
            <button class="btn btn-secondary" onclick="stopRestTimer()">Arrêter</button>
        </div>
    `;
}

function updateCurrentWeight(weight) {
    currentSet.weight = parseFloat(weight);
}

async function completeSet() {
    try {
        const response = await fetch(`${API_URL}/sets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                workout_id: currentWorkout.id,
                exercise_id: currentExercise.id,
                ...currentSet,
                skipped: false
            })
        });
        
        if (response.ok) {
            startRestTimer();
            currentSet.set_number++;
            displayCurrentExercise();
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur lors de l\'enregistrement', 'error');
    }
}

async function skipSet() {
    try {
        await fetch(`${API_URL}/sets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                workout_id: currentWorkout.id,
                exercise_id: currentExercise.id,
                ...currentSet,
                skipped: true
            })
        });
        
        currentSet.set_number++;
        displayCurrentExercise();
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function finishExercise() {
    currentExercise = null;
    currentSet.set_number = 1;
    loadExerciseSelector();
}

async function endWorkout() {
    if (confirm('Terminer la séance ?')) {
        try {
            await fetch(`${API_URL}/workouts/${currentWorkout.id}/complete`, {
                method: 'PUT'
            });
            
            showToast('Séance terminée !', 'success');
            showView('dashboard');
        } catch (error) {
            console.error('Erreur:', error);
        }
    }
}

// Gestion du timer de repos
function startRestTimer() {
    restTimer = 120; // 2 minutes par défaut
    document.getElementById('restTimer').style.display = 'block';
    
    restInterval = setInterval(() => {
        restTimer--;
        document.getElementById('timerDisplay').textContent = formatTime(restTimer);
        
        if (restTimer <= 0) {
            stopRestTimer();
            playTimerSound();
            showToast('Temps de repos terminé !', 'info');
        }
    }, 1000);
}

function stopRestTimer() {
    if (restInterval) {
        clearInterval(restInterval);
        restInterval = null;
    }
    document.getElementById('restTimer').style.display = 'none';
}

function loadProgramWorkout() {
    // TODO: Implémenter les programmes d'entraînement
    const container = document.getElementById('currentExercise');
    if (container) {
        container.innerHTML = '<h2>Programmes d\'entraînement</h2><p>Fonctionnalité à venir...</p>';
    }
}

// Utilitaires d'affichage
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.background = type === 'error' ? 'var(--danger)' : type === 'success' ? 'var(--secondary)' : 'var(--primary)';
    toast.style.color = 'white';
    toast.style.padding = '1rem 2rem';
    toast.style.borderRadius = 'var(--radius)';
    toast.style.boxShadow = 'var(--shadow)';
    toast.style.zIndex = '9999';
    toast.style.animation = 'slideIn 0.3s ease-out';
    toast.style.position = 'fixed';
    toast.style.top = '50%';
    toast.style.left = '50%';
    toast.style.transform = 'translate(-50%, -50%)';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    // Event listeners pour les équipements
    document.querySelectorAll('.equipment-card').forEach(card => {
        card.addEventListener('click', () => {
            const equipment = card.dataset.equipment;
            if (!equipment) return;
            
            card.classList.toggle('selected');
            
            if (card.classList.contains('selected')) {
                selectedEquipment.push(equipment);
            } else {
                const index = selectedEquipment.indexOf(equipment);
                if (index > -1) selectedEquipment.splice(index, 1);
            }
            
            // Montrer/cacher la configuration
            document.getElementById('dumbbellConfig').style.display = 
                selectedEquipment.includes('dumbbells') ? 'block' : 'none';
            document.getElementById('barbellConfig').style.display = 
                selectedEquipment.includes('barbell') ? 'block' : 'none';
            document.getElementById('bandsConfig').style.display = 
                selectedEquipment.includes('resistance_bands') ? 'block' : 'none';
        });
    });

    // Event listeners pour les objectifs
    document.querySelectorAll('.chip[data-goal]').forEach(chip => {
        chip.addEventListener('click', () => {
            const goal = chip.dataset.goal;
            chip.classList.toggle('selected');
            
            if (chip.classList.contains('selected')) {
                selectedGoals.push(goal);
            } else {
                const index = selectedGoals.indexOf(goal);
                if (index > -1) selectedGoals.splice(index, 1);
            }
        });
    });

    // Event listener pour le poids personnalisé des disques
    const plateWeightSelect = document.getElementById('plateWeight');
    if (plateWeightSelect) {
        plateWeightSelect.addEventListener('change', (e) => {
            const customInput = document.getElementById('customPlateWeight');
            if (e.target.value === 'custom') {
                customInput.style.display = 'block';
                customInput.focus();
            } else {
                customInput.style.display = 'none';
                customInput.value = '';
            }
        });
    }

    // Charger les exercices
    await loadExercises();

    // Charger l'utilisateur existant
    const userId = localStorage.getItem('userId');
    if (userId) {
        await loadUser(userId);
    } else {
        // Afficher la barre de progression pour l'onboarding
        document.getElementById('progressContainer').style.display = 'block';
        updateProgressBar();
    }
});

// Service Worker pour PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
}