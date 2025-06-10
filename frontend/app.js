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

// Gestion des disques avancée
function showPlateSelector() {
    document.getElementById('plateModal').style.display = 'flex';
    document.getElementById('plateWeight').value = '';
    document.getElementById('customPlateWeight').style.display = 'none';
    document.getElementById('plateCount').value = '2';
}

function closePlateModal() {
    document.getElementById('plateModal').style.display = 'none';
}

function confirmPlateAddition() {
    const weightSelect = document.getElementById('plateWeight');
    const customWeight = document.getElementById('customPlateWeight');
    const count = parseInt(document.getElementById('plateCount').value);
    
    let weight;
    if (weightSelect.value === 'custom') {
        weight = parseCommaNumber(customWeight.value);
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
    
    plateConfiguration[weight] = count;
    updatePlateDisplay();
    closePlateModal();
}

function updatePlateDisplay() {
    const container = document.getElementById('platesConfiguration');
    if (!container) return;
    
    const weights = Object.keys(plateConfiguration).map(w => parseFloat(w)).sort((a, b) => a - b);
    
    if (weights.length === 0) {
        container.innerHTML = '<div style="color: var(--gray); text-align: center; padding: 1rem;">Aucun disque configuré</div>';
        return;
    }
    
    container.innerHTML = weights.map(weight => `
        <div class="plate-config-item">
            <div class="weight">${weight} kg</div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <button onclick="decreasePlateCount(${weight})" style="width: 30px; height: 30px; padding: 0;" class="btn btn-secondary">−</button>
                <input type="number" id="plateCount_${weight}" value="${plateConfiguration[weight]}" 
                       min="0" max="20" onchange="updatePlateCount(${weight}, this.value)"
                       style="text-align: center; width: 60px;" class="form-input">
                <button onclick="increasePlateCount(${weight})" style="width: 30px; height: 30px; padding: 0;" class="btn btn-secondary">+</button>
            </div>
            <button onclick="removePlateType(${weight})" title="Supprimer" class="btn btn-danger" style="padding: 0.5rem;">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `).join('');
}

function updatePlateCount(weight, newCount) {
    const count = parseInt(newCount);
    if (count > 0) {
        plateConfiguration[weight] = count;
    } else {
        delete plateConfiguration[weight];
        updatePlateDisplay();
    }
}

function increasePlateCount(weight) {
    const current = plateConfiguration[weight] || 0;
    if (current < 20) {
        plateConfiguration[weight] = current + 1;
        document.getElementById(`plateCount_${weight}`).value = current + 1;
    }
}

function decreasePlateCount(weight) {
    const current = plateConfiguration[weight] || 0;
    if (current > 1) {
        plateConfiguration[weight] = current - 1;
        document.getElementById(`plateCount_${weight}`).value = current - 1;
    } else if (current === 1) {
        removePlateType(weight);
    }
}

function removePlateType(weight) {
    delete plateConfiguration[weight];
    updatePlateDisplay();
}

// Fonction pour calculer toutes les combinaisons possibles avec les disques disponibles
function calculatePossibleBarbellWeights(barWeight, availablePlates) {
    const weights = new Set([barWeight]); // Commencer avec la barre seule
    
    // Fonction récursive pour générer les combinaisons
    function generateCombinations(plates, maxPerSide) {
        const combinations = [[]];
        
        for (const [weight, count] of Object.entries(plates)) {
            const newCombinations = [];
            const maxUse = Math.min(Math.floor(count / 2), maxPerSide); // Max par côté
            
            for (const combo of combinations) {
                for (let i = 0; i <= maxUse; i++) {
                    const newCombo = [...combo];
                    if (i > 0) {
                        for (let j = 0; j < i; j++) {
                            newCombo.push(parseFloat(weight));
                        }
                    }
                    newCombinations.push(newCombo);
                }
            }
            combinations.push(...newCombinations.slice(1)); // Éviter les doublons
        }
        
        return combinations;
    }
    
    // Générer les combinaisons (max 4 disques par côté pour être réaliste)
    const combinations = generateCombinations(availablePlates, 4);
    
    // Calculer le poids total pour chaque combinaison
    combinations.forEach(combo => {
        const plateWeight = combo.reduce((sum, w) => sum + w, 0) * 2; // x2 car des deux côtés
        weights.add(barWeight + plateWeight);
    });
    
    // Convertir en array, trier et limiter
    return Array.from(weights)
        .filter(w => w <= 500) // Max 500kg pour être réaliste
        .sort((a, b) => a - b);
}

// Améliorer calculateAvailableWeights pour tenir compte du nombre de disques
function calculateAvailableWeights(exercise) {
    const equipmentNeeded = exercise.equipment;
    let weights = [];
    
    if (equipmentNeeded.includes('dumbbells') && currentUser.dumbbell_weights) {
        weights = [...currentUser.dumbbell_weights];
    } else if (equipmentNeeded.includes('barbell') && currentUser.barbell_weights) {
        const barWeight = currentUser.barbell_weights.standard_bar || 20;
        const platesData = currentUser.barbell_weights.plates || [];
        
        // Convertir le format plates si nécessaire
        let availablePlates = {};
        if (Array.isArray(platesData)) {
            if (platesData.length > 0 && typeof platesData[0] === 'object') {
                // Nouveau format avec count
                platesData.forEach(p => {
                    availablePlates[p.weight] = p.count;
                });
            } else {
                // Ancien format - assumer 2 disques de chaque
                platesData.forEach(w => {
                    availablePlates[w] = 2;
                });
            }
        }
        
        // Calculer toutes les combinaisons possibles
        weights = calculatePossibleBarbellWeights(barWeight, availablePlates);
    } else if (equipmentNeeded.includes('resistance_bands') && currentUser.resistance_bands) {
        weights = currentUser.resistance_bands.map(band => band.resistance);
    } else if (equipmentNeeded.includes('bodyweight')) {
        weights = [0]; // Poids du corps
    }
    
    return weights;
}

function collectBarbellData() {
    if (!selectedEquipment.includes('barbell')) return null;
    
    const standardBar = parseCommaNumber(document.getElementById('standardBarWeight').value) || 20;
    const ezBar = parseCommaNumber(document.getElementById('ezBarWeight').value) || 10;
    
    const plates = [];
    for (const [weight, count] of Object.entries(plateConfiguration)) {
        plates.push({
            weight: parseFloat(weight),
            count: count
        });
    }
    
    return {
        standard_bar: standardBar,
        ez_bar: ezBar,
        plates: plates
    };
}

// Gestion des élastiques
function addResistanceBand() {
    bandCounter++;
    const bandsList = document.getElementById('bandsList');
    if (!bandsList) return;
    
    const bandHtml = `
        <div class="band-input" data-band-id="${bandCounter}">
            <input type="text" class="form-input" placeholder="Couleur" id="bandColor${bandCounter}">
            <input type="text" class="form-input" placeholder="Résistance (kg)" id="bandResistance${bandCounter}" style="width: 150px;">
            <button class="btn btn-danger" onclick="removeBand(${bandCounter})" style="padding: 0.5rem;">×</button>
        </div>
    `;
    bandsList.insertAdjacentHTML('beforeend', bandHtml);
}

function removeBand(bandId) {
    const band = document.querySelector(`[data-band-id="${bandId}"]`);
    if (band) band.remove();
}

function collectBandsData() {
    resistanceBands = [];
    document.querySelectorAll('.band-input').forEach(bandDiv => {
        const bandId = bandDiv.dataset.bandId;
        const colorInput = document.getElementById(`bandColor${bandId}`);
        const resistanceInput = document.getElementById(`bandResistance${bandId}`);
        
        if (colorInput && resistanceInput) {
            const color = colorInput.value;
            const resistance = parseCommaNumber(resistanceInput.value);
            
            if (color && !isNaN(resistance) && resistance > 0) {
                resistanceBands.push({ color, resistance });
            }
        }
    });
}

// Gestion des haltères
function showDumbbellSelector() {
    const modal = document.getElementById('dumbbellModal');
    if (modal) {
        modal.style.display = 'flex';
        document.querySelectorAll('#dumbbellModal input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        if (window.selectedDumbbells) {
            window.selectedDumbbells.forEach(weight => {
                const checkbox = document.querySelector(`#dumbbellModal input[value="${weight}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
    }
}

function closeDumbbellModal() {
    const modal = document.getElementById('dumbbellModal');
    if (modal) modal.style.display = 'none';
}

function confirmDumbbellSelection() {
    window.selectedDumbbells = [];
    document.querySelectorAll('#dumbbellModal input:checked').forEach(checkbox => {
        window.selectedDumbbells.push(parseFloat(checkbox.value));
    });
    window.selectedDumbbells.sort((a, b) => a - b);
    
    const container = document.getElementById('selectedDumbbells');
    if (container) {
        if (window.selectedDumbbells.length === 0) {
            container.innerHTML = '<span style="color: var(--gray); font-size: 0.875rem;">Aucun poids sélectionné</span>';
        } else {
            container.innerHTML = window.selectedDumbbells
                .map(w => `<div class="chip selected">${w} kg</div>`)
                .join('');
        }
    }
    closeDumbbellModal();
}

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