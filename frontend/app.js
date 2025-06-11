// ===== frontend/app.js - VERSION COMPLÈTE CORRIGÉE =====

// Configuration API
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api' 
    : '/api';

// ===== VARIABLES GLOBALES NETTOYÉES =====
let currentUser = null;
let currentStep = 1;
let selectedGoals = [];
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

// ===== NOUVELLE CONFIGURATION ÉQUIPEMENT (PROPRE) =====
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
    showToast('Configuration kettlebells à venir', 'info');
}

function showLestModal(type) {
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

// ===== FONCTION DE COMPLETION ONBOARDING =====
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

// ===== FONCTIONS UTILITAIRES =====
function parseCommaNumber(str) {
    if (!str) return NaN;
    return parseFloat(str.replace(',', '.'));
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

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

// ===== FONCTIONS DE NAVIGATION =====
function nextStep() {
    if (currentStep < 5) {
        document.getElementById(`step${currentStep}`).classList.remove('active');
        currentStep++;
        document.getElementById(`step${currentStep}`).classList.add('active');
        updateProgressBar();
        
        if (currentStep === 5) {
            updateProfileSummary();
        }
    }
}

function previousStep() {
    if (currentStep > 1) {
        document.getElementById(`step${currentStep}`).classList.remove('active');
        currentStep--;
        document.getElementById(`step${currentStep}`).classList.add('active');
        updateProgressBar();
    }
}

function updateProgressBar() {
    const progress = (currentStep / 5) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
}

function updateProfileSummary() {
    const name = document.getElementById('userName').value;
    const age = document.getElementById('userAge').value;
    const experience = document.getElementById('experienceLevel').value;
    
    let equipmentSummary = '';
    const config = equipmentConfig;
    
    // Résumer l'équipement configuré
    const activeEquipment = [];
    
    // Barres
    Object.entries(config.barres).forEach(([type, conf]) => {
        if (conf.available) {
            const name = type === 'barbell_standard' ? 'Barre standard' : 
                         type === 'barbell_ez' ? 'Barre EZ' : 'Barres courtes';
            activeEquipment.push(`${name} (${conf.weight}kg × ${conf.count})`);
        }
    });
    
    // Disques
    if (config.disques.available) {
        const weights = Object.keys(config.disques.weights);
        if (weights.length > 0) {
            activeEquipment.push(`Disques: ${weights.join(', ')} kg`);
        }
    }
    
    // Haltères
    if (config.dumbbells.available && config.dumbbells.weights.length > 0) {
        activeEquipment.push(`Haltères: ${config.dumbbells.weights.join(', ')} kg`);
    }
    
    // Banc
    if (config.banc.available) {
        let bancInfo = 'Banc';
        if (config.banc.inclinable_haut) bancInfo += ' (inclinable)';
        activeEquipment.push(bancInfo);
    }
    
    // Élastiques
    if (config.elastiques.available && config.elastiques.bands.length > 0) {
        activeEquipment.push(`Élastiques: ${config.elastiques.bands.length} bands`);
    }
    
    // Autres
    Object.entries(config.autres).forEach(([type, conf]) => {
        if (conf.available) {
            const name = type === 'barre_traction' ? 'Barre de traction' : 
                         type === 'kettlebell' ? 'Kettlebells' :
                         type.replace('lest_', 'Lests ');
            activeEquipment.push(name);
        }
    });
    
    equipmentSummary = activeEquipment.length > 0 ? 
        `<br><strong>Équipement:</strong> ${activeEquipment.join(', ')}` : 
        '<br><strong>Équipement:</strong> Poids du corps uniquement';
    
    const summary = `
        <strong>Nom:</strong> ${name}<br>
        <strong>Âge:</strong> ${age} ans<br>
        <strong>Expérience:</strong> ${experience}<br>
        <strong>Objectifs:</strong> ${selectedGoals.join(', ')}${equipmentSummary}
    `;
    
    document.getElementById('profileSummary').innerHTML = summary;
}

function showView(viewName) {
    // Cacher toutes les vues
    document.querySelectorAll('.onboarding, .dashboard, .workout-view, .exercises-view, .profile-view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Afficher la vue demandée
    const targetView = document.getElementById(`${viewName}View`) || document.querySelector(`.${viewName}`);
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
}

// ===== FONCTIONS POUR LES EXERCICES =====
async function loadExercises() {
    try {
        const response = await fetch(`${API_URL}/exercises/`);
        if (response.ok) {
            exercises = await response.json();
            bodyParts = [...new Set(exercises.map(ex => ex.body_part))];
            console.log(`Loaded ${exercises.length} exercises`);
        }
    } catch (error) {
        console.error('Error loading exercises:', error);
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
        console.error('Error loading user:', error);
        localStorage.removeItem('userId');
        showView('onboarding');
    }
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
        console.error('Error loading available exercises:', error);
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
        <div class="exercise-card" onclick="selectExercise(${exercise.id})">
            <div class="exercise-header">
                <h3>${exercise.name_fr}</h3>
                <span class="exercise-level">${exercise.level}</span>
            </div>
            <p class="exercise-body-part">${exercise.body_part}</p>
            <p class="exercise-equipment">${exercise.equipment.join(', ')}</p>
        </div>
    `).join('');
}

function selectExercise(exerciseId) {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (exercise) {
        currentExercise = exercise;
        startWorkout();
    }
}

function filterExercises() {
    const searchTerm = document.getElementById('searchExercises').value.toLowerCase();
    const bodyPartFilter = document.getElementById('bodyPartFilter').value;
    
    let filteredExercises = exercises;
    
    if (searchTerm) {
        filteredExercises = filteredExercises.filter(ex => 
            ex.name_fr.toLowerCase().includes(searchTerm) ||
            ex.name_eng.toLowerCase().includes(searchTerm)
        );
    }
    
    if (bodyPartFilter) {
        filteredExercises = filteredExercises.filter(ex => ex.body_part === bodyPartFilter);
    }
    
    displayExercises(filteredExercises);
}

// ===== FONCTIONS WORKOUT =====
function startFreeTimeWorkout() {
    workoutMode = 'free_time';
    showView('exercises');
    loadAvailableExercises();
}

function startProgramWorkout() {
    workoutMode = 'program';
    showToast('Programmes d\'entraînement à venir', 'info');
}

async function startWorkout() {
    if (!currentExercise || !currentUser) return;
    
    try {
        // Créer une nouvelle séance
        const workoutResponse = await fetch(`${API_URL}/workouts/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                type: workoutMode
            })
        });
        
        if (workoutResponse.ok) {
            currentWorkout = await workoutResponse.json();
            showView('workout');
            initializeWorkoutInterface();
        }
    } catch (error) {
        console.error('Error starting workout:', error);
        showToast('Erreur lors du démarrage de l\'entraînement', 'error');
    }
}

function initializeWorkoutInterface() {
    const container = document.getElementById('currentExercise');
    if (!container || !currentExercise) return;
    
    // Déterminer les paramètres selon le niveau de l'utilisateur
    const userLevel = currentUser.experience_level;
    const exerciseParams = currentExercise.sets_reps.find(sr => sr.level === userLevel) || 
                          currentExercise.sets_reps[0];
    
    currentSet = {
        set_number: 1,
        weight: 0,
        target_reps: exerciseParams.reps,
        actual_reps: exerciseParams.reps
    };
    
    container.innerHTML = `
        <div class="workout-header">
            <h2>${currentExercise.name_fr}</h2>
            <p>${currentExercise.body_part} • ${currentExercise.level}</p>
        </div>
        
        <div class="workout-progress">
            <span>Série ${currentSet.set_number} / ${exerciseParams.sets}</span>
        </div>
        
        <div class="workout-controls">
            <div class="weight-control">
                <label>Poids (kg)</label>
                <input type="number" id="currentWeight" value="${currentSet.weight}" step="0.5" min="0">
            </div>
            
            <div class="reps-control">
                <label>Répétitions</label>
                <input type="number" id="currentReps" value="${currentSet.target_reps}" min="1">
            </div>
        </div>
        
        <div class="workout-actions">
            <button class="btn btn-secondary" onclick="skipSet()">Passer</button>
            <button class="btn" onclick="completeSet()">Série terminée</button>
        </div>
        
        <div id="restTimer" style="display: none;">
            <h3>Repos</h3>
            <div id="timerDisplay">2:00</div>
            <button class="btn btn-secondary" onclick="stopRestTimer()">Arrêter</button>
        </div>
    `;
}

function completeSet() {
    const weight = parseFloat(document.getElementById('currentWeight').value) || 0;
    const reps = parseInt(document.getElementById('currentReps').value) || 0;
    
    currentSet.weight = weight;
    currentSet.actual_reps = reps;
    
    // Sauvegarder la série
    saveSet();
    
    // Commencer le repos
    startRestTimer();
}

async function saveSet() {
    if (!currentWorkout || !currentExercise) return;
    
    try {
        const setData = {
            workout_id: currentWorkout.id,
            exercise_id: currentExercise.id,
            set_number: currentSet.set_number,
            target_reps: currentSet.target_reps,
            actual_reps: currentSet.actual_reps,
            weight: currentSet.weight,
            rest_time: 120, // 2 minutes par défaut
            fatigue_level: 3, // À améliorer avec interface
            perceived_exertion: 7 // À améliorer avec interface
        };
        
        await fetch(`${API_URL}/sets/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(setData)
        });
        
        showToast(`Série ${currentSet.set_number} enregistrée`, 'success');
        
    } catch (error) {
        console.error('Error saving set:', error);
    }
}

function skipSet() {
    currentSet.actual_reps = 0;
    saveSet();
    nextSet();
}

function nextSet() {
    const userLevel = currentUser.experience_level;
    const exerciseParams = currentExercise.sets_reps.find(sr => sr.level === userLevel) || 
                          currentExercise.sets_reps[0];
    
    if (currentSet.set_number >= exerciseParams.sets) {
        // Exercice terminé
        showToast('Exercice terminé ! 🎉', 'success');
        showView('dashboard');
    } else {
        // Série suivante
        currentSet.set_number++;
        currentSet.actual_reps = currentSet.target_reps;
        initializeWorkoutInterface();
    }
}

function startRestTimer(duration = 120) {
    restTimer = duration;
    document.getElementById('restTimer').style.display = 'block';
    
    restInterval = setInterval(() => {
        restTimer--;
        document.getElementById('timerDisplay').textContent = formatTime(restTimer);
        
        if (restTimer <= 0) {
            stopRestTimer();
            showToast('Repos terminé !', 'info');
            nextSet();
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

// ===== GESTION DES OBJECTIFS =====
function toggleGoal(goalElement) {
    const goal = goalElement.dataset.goal;
    goalElement.classList.toggle('selected');
    
    if (goalElement.classList.contains('selected')) {
        selectedGoals.push(goal);
    } else {
        const index = selectedGoals.indexOf(goal);
        if (index > -1) selectedGoals.splice(index, 1);
    }
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    // Event listeners pour les objectifs
    document.querySelectorAll('.chip[data-goal]').forEach(chip => {
        chip.addEventListener('click', () => toggleGoal(chip));
    });

    // Event listener pour les changements de poids de disques personnalisés
    const disqueWeightSelect = document.getElementById('disque_weight');
    if (disqueWeightSelect) {
        disqueWeightSelect.addEventListener('change', handleDisqueWeightChange);
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
    
    console.log('Application initialisée');
});

// Service Worker pour PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
}