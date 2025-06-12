// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentStep = 1;
const totalSteps = 5;
let selectedGoals = [];
let selectedEquipment = [];
let equipmentConfig = {
    barres: {
        olympique: { available: false, count: 0, weight: 20 },
        ez: { available: false, count: 0, weight: 10 },
        courte: { available: false, count: 0, weight: 2.5 }
    },
    disques: {}, // {"5": 4, "10": 2} - poids en kg -> nombre
    dumbbells: {}, // {"5": 2, "10": 2} - poids -> nombre
    kettlebells: {}, // {"8": 1, "12": 1} - poids -> nombre
    elastiques: [], // [{color: "vert", resistance: 10, count: 1}]
    banc: {
        available: false,
        inclinable: false,
        declinable: false
    },
    autres: {
        barre_traction: false,
        lest_corps: [],
        lest_chevilles: [],
        lest_poignets: []
    }
};
let currentWorkout = null;
let workoutCheckInterval = null;
let lastSyncTime = null;

// ===== NAVIGATION & VUES =====
function showView(viewName) {
    document.querySelectorAll('.view, .onboarding').forEach(view => {
        view.classList.remove('active');
    });
    
    const view = document.getElementById(viewName) || document.querySelector(`.${viewName}`);
    if (view) {
        view.classList.add('active');
        if (viewName === 'onboarding') {
            showStep(currentStep);
        }
    }
}

function showStep(step) {
    document.querySelectorAll('.onboarding-step').forEach(s => {
        s.classList.remove('active');
    });
    document.getElementById(`step${step}`).classList.add('active');
}

// ===== ÉTAPES ONBOARDING =====
function nextStep() {
    if (currentStep === 1) {
        const name = document.getElementById('userName').value.trim();
        const age = document.getElementById('userAge').value;
        const height = document.getElementById('userHeight').value;
        const weight = document.getElementById('userWeight').value;
        const experience = document.getElementById('experienceLevel').value;
        
        if (!name || !age || !height || !weight || !experience) {
            showToast('Veuillez remplir tous les champs', 'error');
            console.error('Validation échouée:', {name, age, height, weight, experience});
            return;
        }
    } else if (currentStep === 2) {
        if (selectedGoals.length === 0) {
            showToast('Veuillez sélectionner au moins un objectif', 'error');
            return;
        }
    } else if (currentStep === 3) {
        if (selectedEquipment.length === 0) {
            showToast('Veuillez sélectionner au moins un équipement', 'error');
            return;
        }
        generateDetailedEquipmentConfig();
    } else if (currentStep === 4) {
        if (!validateDetailedConfig()) {
            return;
        }
        updateProfileSummary();
    }
    
    if (currentStep < totalSteps) {
        currentStep++;
        showStep(currentStep);
        updateProgressBar();
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
        updateProgressBar();
    }
}

function updateProgressBar() {
    const progress = (currentStep - 1) / (totalSteps - 1) * 100;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
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
    console.log('Toggle equipment:', {
        equipment: card.dataset.equipment,
        hasOnclick: !!card.onclick,
        classList: card.classList.toString()
    });
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
    
    // Structure en grille carrée pour les équipements sélectionnés
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
    
    // Auto-ouvrir les panels pour l'équipement sélectionné
    selectedEquipment.forEach(eq => {
        showConfigPanel(eq);
    });
}

function getEquipmentIcon(type) {
    const icons = {
        'dumbbells': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/></svg>',
        'barbell': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h8m-4-8v16"/></svg>',
        'resistance_bands': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
        'bench': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h18m-9-9v18"/></svg>',
        'pull_up_bar': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3h14m-7 0v18"/></svg>',
        'kettlebell': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>'
    };
    return icons[type] || '';
}

function getEquipmentName(type) {
    const names = {
        'dumbbells': 'Haltères',
        'barbell': 'Barres & Disques',
        'resistance_bands': 'Élastiques',
        'bench': 'Banc',
        'pull_up_bar': 'Barre de traction',
        'kettlebell': 'Kettlebells'
    };
    return names[type] || type;
}

function createPanelContent(type) {
    switch(type) {
        case 'barbell':
            return createBarbellPanel();
        case 'dumbbells':
            return createDumbbellsPanel();
        case 'resistance_bands':
            return createBandsPanel();
        case 'bench':
            return createBenchPanel();
        case 'pull_up_bar':
            return createPullUpPanel();
        case 'kettlebell':
            return createKettlebellPanel();
        default:
            return '';
    }
}

// Nouvelle fonction pour créer les panels dynamiquement
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
        // Ajouter autres cas si nécessaire
    }
    
    panelsContainer.appendChild(panel);
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
            ${[40, 25, 15, 10, 5, 2.5, 2, 1.25, 1].map(weight => `
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

// Exemple de panel pour les haltères
function createDumbbellsPanel() {
    const commonWeights = [22.5, 20, 15, 12.5, 10, 8, 6, 5, 4, 2];
    
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
            ${commonWeights.map(weight => `
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


// Fonction mise à jour pour les poids
function updateDumbbellWeight(weight, count) {
    const value = parseInt(count) || 0;
    
    if (value > 0) {
        equipmentConfig.dumbbells[weight] = value;
    } else {
        delete equipmentConfig.dumbbells[weight];
    }
    
    updateEquipmentStatus('dumbbells');
}

// Mise à jour du statut visuel
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
            isConfigured = true; // Toujours configuré si sélectionné
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
    
    // Mettre à jour un indicateur visuel si présent
    const indicator = document.getElementById('equipmentProgress');
    if (indicator) {
        indicator.textContent = `${configured} / ${total} configurés`;
    }
}

// Fonctions de mise à jour de l'équipement
function toggleBarType(type) {
    const checkbox = document.getElementById(`barbell_${type === 'olympique' ? 'olympic' : type === 'courte' ? 'short' : type}`);
    const countInput = document.getElementById(`barbell_${type === 'olympique' ? 'olympic' : type === 'courte' ? 'short' : type}_count`);
    
    if (checkbox.checked) {
        countInput.style.display = 'block';
        countInput.value = 1;
        equipmentConfig.barres[type].available = true;
        equipmentConfig.barres[type].count = 1;
    } else {
        countInput.style.display = 'none';
        countInput.value = 0;
        equipmentConfig.barres[type].available = false;
        equipmentConfig.barres[type].count = 0;
    }
}

function updateBarCount(type, count) {
    equipmentConfig.barres[type].count = parseInt(count) || 0;
}

function updateDisqueCount(weight, count) {
    const c = parseInt(count) || 0;
    if (c > 0) {
        equipmentConfig.disques[weight] = c;
    } else {
        delete equipmentConfig.disques[weight];
    }
}

function addCustomDisque() {
    const weightInput = document.getElementById('customDisqueWeight');
    const weight = parseFloat(weightInput.value);
    const countInput = weightInput.nextElementSibling;
    const count = parseInt(countInput.value) || 0;
    
    if (weight && count > 0) {
        equipmentConfig.disques[weight] = count;
        showToast(`Ajouté: ${count} disque(s) de ${weight}kg`, 'success');
        weightInput.value = '';
        countInput.value = 0;
    }
}

function updateDumbbellCount(weight, count) {
    const c = parseInt(count) || 0;
    if (c > 0) {
        equipmentConfig.dumbbells[weight] = c;
    } else {
        delete equipmentConfig.dumbbells[weight];
    }
}

function addCustomDumbbell() {
    const weightInput = document.getElementById('customDumbbellWeight');
    const weight = parseFloat(weightInput.value);
    const countInput = weightInput.nextElementSibling;
    const count = parseInt(countInput.value) || 0;
    
    if (weight && count > 0) {
        equipmentConfig.dumbbells[weight] = count;
        showToast(`Ajouté: ${count} haltère(s) de ${weight}kg`, 'success');
        weightInput.value = '';
        countInput.value = 0;
    }
}

function updateKettlebellCount(weight, count) {
    const c = parseInt(count) || 0;
    if (c > 0) {
        equipmentConfig.kettlebells[weight] = c;
    } else {
        delete equipmentConfig.kettlebells[weight];
    }
}

function createPullUpPanel() {
    updateEquipmentStatus('pull_up_bar'); // Auto-marquer comme configuré
    return `
        <div class="config-header">
            <div class="config-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3h14m-7 0v18"/>
                </svg>
            </div>
            <h3 class="config-title">Barre de traction</h3>
        </div>
        <p style="color: var(--gray-light);">✓ Équipement configuré automatiquement</p>
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
            ${[32, 28, 24, 20, 16, 12, 8, 4].map(weight => `
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

// Fonction pour créer le panel du banc
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

// Fonctions pour mettre à jour les poids
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

// Fonction pour ajouter une bande élastique
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

function getColorName(hexColor) {
    // Convertir le code hex en nom de couleur approximatif
    const colors = {
        '#ff6b6b': 'Rouge',
        '#4ecdc4': 'Turquoise',
        '#45b7d1': 'Bleu',
        '#f7dc6f': 'Jaune',
        '#52c41a': 'Vert',
        '#722ed1': 'Violet',
        '#fa8c16': 'Orange',
        '#000000': 'Noir'
    };
    
    return colors[hexColor] || hexColor;
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

function addCustomKettlebell() {
    const weightInput = document.getElementById('customKettlebellWeight');
    const weight = parseFloat(weightInput.value);
    const countInput = weightInput.nextElementSibling;
    const count = parseInt(countInput.value) || 0;
    
    if (weight && count > 0) {
        equipmentConfig.kettlebells[weight] = count;
        showToast(`Ajouté: ${count} kettlebell(s) de ${weight}kg`, 'success');
        weightInput.value = '';
        countInput.value = 0;
    }
}

async function startWorkout(type) {
    if (!currentUser) {
        showToast('Veuillez vous connecter', 'error');
        return;
    }
    
    // Vérifier s'il y a déjà une session active
    const activeCheck = await checkActiveWorkout();
    if (activeCheck) {
        showToast('Une session est déjà active', 'warning');
        showView('training');
        return;
    }
    
    try {
        const response = await fetch('/api/workouts/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                type: type
            })
        });
        
        if (response.ok) {
            const workout = await response.json();
            currentWorkout = workout;
            
            // Sauvegarder en localStorage pour récupération
            localStorage.setItem('currentWorkout', JSON.stringify({
                id: workout.id,
                status: workout.status,
                created_at: workout.created_at,
                type: workout.type,
                user_id: currentUser.id
            }));
            
            // Démarrer le monitoring
            startWorkoutMonitoring();
            
            showView('training');
            showToast('Séance démarrée !', 'success');
            updateTrainingInterface();
        } else {
            const error = await response.json();
            showToast(error.detail || 'Erreur lors du démarrage', 'error');
        }
    } catch (error) {
        console.error('Erreur démarrage séance:', error);
        showToast('Erreur de connexion au serveur', 'error');
    }
}

async function checkActiveWorkout() {
    if (!currentUser) return null;
    
    try {
        // D'abord vérifier localStorage
        const savedWorkout = localStorage.getItem('currentWorkout');
        if (savedWorkout) {
            const workout = JSON.parse(savedWorkout);
            
            // Vérifier que c'est bien pour cet utilisateur
            if (workout.user_id === currentUser.id && workout.status !== 'completed') {
                // Vérifier avec le serveur que la session existe toujours
                const response = await fetch(`/api/workouts/${workout.id}/status`);
                if (response.ok) {
                    const serverWorkout = await response.json();
                    if (serverWorkout.status === 'started' || serverWorkout.status === 'paused') {
                        currentWorkout = serverWorkout;
                        startWorkoutMonitoring();
                        return serverWorkout;
                    }
                }
            }
            
            // Si pas valide, nettoyer
            localStorage.removeItem('currentWorkout');
        }
        
        // Vérifier côté serveur
        const response = await fetch(`/api/users/${currentUser.id}/active-workout`);
        if (response.ok) {
            const data = await response.json();
            if (data.active_workout) {
                currentWorkout = data.active_workout;
                localStorage.setItem('currentWorkout', JSON.stringify(data.active_workout));
                startWorkoutMonitoring();
                return data.active_workout;
            }
        }
    } catch (error) {
        console.error('Erreur vérification workout actif:', error);
    }
    
    return null;
}

function startWorkoutMonitoring() {
    // Sync toutes les 30 secondes pour gérer Render qui s'endort
    if (workoutCheckInterval) clearInterval(workoutCheckInterval);
    
    workoutCheckInterval = setInterval(async () => {
        if (currentWorkout && currentWorkout.status === 'started') {
            try {
                // Ping pour garder le serveur éveillé sur Render
                await fetch(`/api/workouts/${currentWorkout.id}/status`);
                lastSyncTime = new Date();
            } catch (error) {
                console.error('Erreur sync workout:', error);
                showToast('Connexion perdue, données en local', 'warning');
            }
        }
    }, 30000); // 30 secondes
}

async function pauseWorkout() {
    if (!currentWorkout) return;
    
    try {
        const response = await fetch(`/api/workouts/${currentWorkout.id}/pause`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            const result = await response.json();
            currentWorkout.status = 'paused';
            currentWorkout.paused_at = result.paused_at;
            
            localStorage.setItem('currentWorkout', JSON.stringify(currentWorkout));
            showToast('Séance mise en pause', 'info');
            updateTrainingInterface();
        }
    } catch (error) {
        console.error('Erreur pause workout:', error);
        // Sauvegarder l'état localement même si le serveur ne répond pas
        currentWorkout.status = 'paused';
        currentWorkout.paused_at = new Date().toISOString();
        localStorage.setItem('currentWorkout', JSON.stringify(currentWorkout));
        showToast('Pause sauvegardée localement', 'warning');
    }
}

async function resumeWorkout() {
    if (!currentWorkout) return;
    
    try {
        const response = await fetch(`/api/workouts/${currentWorkout.id}/resume`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            currentWorkout.status = 'started';
            currentWorkout.paused_at = null;
            
            localStorage.setItem('currentWorkout', JSON.stringify(currentWorkout));
            showToast('Séance reprise', 'success');
            updateTrainingInterface();
        }
    } catch (error) {
        console.error('Erreur reprise workout:', error);
        showToast('Erreur de connexion', 'error');
    }
}

async function completeWorkout() {
    if (!currentWorkout) return;
    
    if (!confirm('Terminer la séance ?')) return;
    
    try {
        const response = await fetch(`/api/workouts/${currentWorkout.id}/complete`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            showToast('Séance terminée !', 'success');
            cleanupWorkout();
            showView('dashboard');
            loadDashboard(); // Rafraîchir les stats
        }
    } catch (error) {
        console.error('Erreur fin workout:', error);
        showToast('Erreur, données sauvegardées localement', 'error');
        // TODO: implémenter une queue de sync pour plus tard
    }
}

async function abandonWorkout() {
    if (!currentWorkout) return;
    
    if (!confirm('Abandonner la séance ? Les données seront perdues.')) return;
    
    try {
        await fetch(`/api/workouts/${currentWorkout.id}/abandon`, {
            method: 'PUT'
        });
        
        showToast('Séance abandonnée', 'info');
    } catch (error) {
        console.error('Erreur abandon workout:', error);
    }
    
    cleanupWorkout();
    showView('dashboard');
}

function cleanupWorkout() {
    currentWorkout = null;
    localStorage.removeItem('currentWorkout');
    if (workoutCheckInterval) {
        clearInterval(workoutCheckInterval);
        workoutCheckInterval = null;
    }
}


function updateTrainingInterface() {
    const container = document.getElementById('workoutInterface');
    if (!container || !currentWorkout) return;
    
    const isPaused = currentWorkout.status === 'paused';
    
    container.innerHTML = `
        <div class="workout-status">
            <h2>Séance ${currentWorkout.type === 'program' ? 'Programme' : 'Libre'}</h2>
            <div class="status-badge status-${currentWorkout.status}">
                ${currentWorkout.status === 'started' ? '🟢 En cours' : '⏸️ En pause'}
            </div>
        </div>
        
        <div class="workout-controls">
            ${isPaused ? 
                `<button class="btn btn-primary" onclick="resumeWorkout()">
                    ▶️ Reprendre
                </button>` :
                `<button class="btn btn-secondary" onclick="pauseWorkout()">
                    ⏸️ Pause
                </button>`
            }
            
            <button class="btn btn-primary" onclick="completeWorkout()">
                ✅ Terminer
            </button>
            
            <button class="btn btn-secondary" onclick="abandonWorkout()">
                ❌ Abandonner
            </button>
        </div>
        
        <div class="sync-status">
            ${lastSyncTime ? 
                `Dernière sync: ${new Date(lastSyncTime).toLocaleTimeString()}` : 
                'En attente de synchronisation...'
            }
        </div>
        
        <div id="exerciseArea"></div>
    `;
    
    // Afficher le sélecteur d'exercices dans la div dédiée
    showExerciseSelector();
}

function showExerciseSelector() {
    const container = document.getElementById('exerciseArea');
    if (!container) return;
    
    // Filtrer les exercices disponibles selon l'équipement de l'utilisateur
    const availableExercises = allExercises.filter(exercise => {
        // TODO: Implémenter le filtrage selon equipment_config
        return true; // Pour l'instant, tous les exercices
    });
    
    // Grouper par partie du corps
    const grouped = {};
    availableExercises.forEach(ex => {
        if (!grouped[ex.body_part]) grouped[ex.body_part] = [];
        grouped[ex.body_part].push(ex);
    });
    
    container.innerHTML = `
        <div class="exercise-selector">
            <h3>Sélectionner un exercice</h3>
            <input type="text" id="exerciseSearch" placeholder="Rechercher..." 
                   onkeyup="filterExerciseList()" class="form-input">
            
            <div id="exerciseListSelector" class="exercise-list-selector">
                ${Object.entries(grouped).map(([part, exercises]) => `
                    <div class="exercise-group">
                        <h4>${part}</h4>
                        ${exercises.map(ex => `
                            <div class="exercise-option" onclick="selectExercise(${ex.id})">
                                <div class="exercise-name">${ex.name_fr}</div>
                                <div class="exercise-equipment">${ex.equipment.join(', ')}</div>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function filterExerciseList() {
    const searchTerm = document.getElementById('exerciseSearch').value.toLowerCase();
    const groups = document.querySelectorAll('.exercise-group');
    
    groups.forEach(group => {
        const exercises = group.querySelectorAll('.exercise-option');
        let hasVisible = false;
        
        exercises.forEach(ex => {
            const name = ex.querySelector('.exercise-name').textContent.toLowerCase();
            if (name.includes(searchTerm)) {
                ex.style.display = 'block';
                hasVisible = true;
            } else {
                ex.style.display = 'none';
            }
        });
        
        group.style.display = hasVisible ? 'block' : 'none';
    });
}

let currentExercise = null;
let currentSetNumber = 1;
let setStartTime = null;
let lastSetEndTime = null;

function selectExercise(exerciseId) {
    currentExercise = allExercises.find(ex => ex.id === exerciseId);
    if (!currentExercise) return;
    
    currentSetNumber = 1;
    showSetInput();
}

function showSetInput() {
    const container = document.getElementById('exerciseArea');
    if (!container) return;
    
    setStartTime = new Date();
    
    container.innerHTML = `
        <div class="current-exercise">
            <h2>${currentExercise.name_fr}</h2>
            <p class="exercise-info">${currentExercise.body_part} • ${currentExercise.level}</p>
        </div>
        
        ${lastSetEndTime ? `
            <div class="rest-timer">
                <div class="rest-info">Repos: <span id="restTime">0:00</span></div>
            </div>
        ` : ''}
        
        <div class="set-tracker">
            <h3>Série ${currentSetNumber}</h3>
            <div class="set-timer">Durée: <span id="setTimer">0:00</span></div>
            
            <div class="set-input-grid">
                <div class="input-group">
                    <label>Poids total (kg)</label>
                    <div class="weight-selector">
                        <button onclick="adjustWeight(-2.5)" class="btn-adjust">-2.5</button>
                        <input type="number" id="setWeight" value="20" step="2.5" class="weight-display">
                        <button onclick="adjustWeight(2.5)" class="btn-adjust">+2.5</button>
                    </div>
                    <div class="weight-info">Barre + disques inclus</div>
                </div>
                
                <div class="input-group">
                    <label>Répétitions</label>
                    <div class="reps-selector">
                        <button onclick="adjustReps(-1)" class="btn-adjust">-</button>
                        <input type="number" id="setReps" value="10" class="reps-display">
                        <button onclick="adjustReps(1)" class="btn-adjust">+</button>
                    </div>
                </div>
            </div>
            
            <div class="effort-selectors">
                <div class="selector-group">
                    <label>Fatigue</label>
                    <div class="emoji-selector" id="fatigueSelector">
                        <span class="emoji-option" data-value="1" onclick="selectFatigue(1)">😄</span>
                        <span class="emoji-option" data-value="2" onclick="selectFatigue(2)">🙂</span>
                        <span class="emoji-option selected" data-value="3" onclick="selectFatigue(3)">😐</span>
                        <span class="emoji-option" data-value="4" onclick="selectFatigue(4)">😓</span>
                        <span class="emoji-option" data-value="5" onclick="selectFatigue(5)">😵</span>
                    </div>
                </div>
                
                <div class="selector-group">
                    <label>Effort perçu</label>
                    <div class="emoji-selector" id="effortSelector">
                        <span class="emoji-option" data-value="1" onclick="selectEffort(1)">🚶</span>
                        <span class="emoji-option" data-value="2" onclick="selectEffort(2)">🏃</span>
                        <span class="emoji-option selected" data-value="3" onclick="selectEffort(3)">🏋️</span>
                        <span class="emoji-option" data-value="4" onclick="selectEffort(4)">🔥</span>
                        <span class="emoji-option" data-value="5" onclick="selectEffort(5)">🌋</span>
                    </div>
                </div>
            </div>
            
            <div class="set-actions">
                <button class="btn btn-primary" onclick="completeSet()">
                    ✓ Valider la série
                </button>
                <button class="btn btn-secondary" onclick="skipSet()">
                    ⏭️ Passer
                </button>
            </div>
        </div>
        
        <div id="previousSets" class="previous-sets"></div>
        
        <button class="btn btn-secondary" onclick="finishExercise()">
            Terminer cet exercice
        </button>
    `;
    
    // Démarrer les timers
    startTimers();
    
    // Charger l'historique de cet exercice
    loadExerciseHistory();
}

let selectedFatigue = 3;
let selectedEffort = 3;
let timerInterval = null;

function selectFatigue(value) {
    selectedFatigue = value;
    document.querySelectorAll('#fatigueSelector .emoji-option').forEach(el => {
        el.classList.remove('selected');
    });
    document.querySelector(`#fatigueSelector .emoji-option[data-value="${value}"]`).classList.add('selected');
}

function selectEffort(value) {
    selectedEffort = value;
    document.querySelectorAll('#effortSelector .emoji-option').forEach(el => {
        el.classList.remove('selected');
    });
    document.querySelector(`#effortSelector .emoji-option[data-value="${value}"]`).classList.add('selected');
}

function startTimers() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        // Timer de série
        if (setStartTime) {
            const elapsed = Math.floor((new Date() - setStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const setTimer = document.getElementById('setTimer');
            if (setTimer) {
                setTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }
        
        // Timer de repos
        if (lastSetEndTime) {
            const restElapsed = Math.floor((new Date() - lastSetEndTime) / 1000);
            const minutes = Math.floor(restElapsed / 60);
            const seconds = restElapsed % 60;
            const restTimer = document.getElementById('restTime');
            if (restTimer) {
                restTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }
    }, 1000);
}

function loadExerciseHistory() {
    // TODO: Charger l'historique depuis l'API
}

async function skipSet() {
    const setData = {
        workout_id: currentWorkout.id,
        exercise_id: currentExercise.id,
        set_number: currentSetNumber,
        target_reps: 0,
        actual_reps: 0,
        weight: 0,
        rest_time: 0,
        fatigue_level: 0,
        perceived_exertion: 0,
        skipped: true
    };
    
    try {
        await fetch('/api/sets/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(setData)
        });
        
        showToast('Série passée', 'info');
        currentSetNumber++;
        showSetInput();
    } catch (error) {
        console.error('Erreur:', error);
    }
}


function adjustWeight(delta) {
    const input = document.getElementById('setWeight');
    const newValue = parseFloat(input.value) + delta;
    if (newValue >= 0) input.value = newValue;
}

function adjustReps(delta) {
    const input = document.getElementById('setReps');
    const newValue = parseInt(input.value) + delta;
    if (newValue > 0) input.value = newValue;
}

function updateFatigueDisplay(value) {
    document.getElementById('fatigueDisplay').textContent = value;
}

function updateExertionDisplay(value) {
    document.getElementById('exertionDisplay').textContent = value;
}

async function completeSet() {
    // Calculer la durée de la série AVANT de mettre à jour lastSetEndTime
    const setDuration = setStartTime ? Math.floor((new Date() - setStartTime) / 1000) : 0;
    
    const setData = {
        workout_id: currentWorkout.id,
        exercise_id: currentExercise.id,
        set_number: currentSetNumber,
        target_reps: 10,
        actual_reps: parseInt(document.getElementById('setReps').value),
        weight: parseFloat(document.getElementById('setWeight').value),
        rest_time: lastSetEndTime ? Math.floor((new Date() - lastSetEndTime) / 1000) : 0,
        fatigue_level: selectedFatigue * 2,
        perceived_exertion: selectedEffort * 2,
        skipped: false
    };
    
    try {
        const response = await fetch('/api/sets/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(setData)
        });
        
        if (response.ok) {
            showToast(`Série ${currentSetNumber} enregistrée ! (${setDuration}s)`, 'success');
            
            // Ajouter à l'historique local avec la durée
            addSetToHistory({...setData, duration: setDuration});
            
            // IMPORTANT : Mettre à jour lastSetEndTime APRÈS avoir calculé setDuration
            lastSetEndTime = new Date();
            setStartTime = null; // Réinitialiser pour la prochaine série
            
            // Préparer la série suivante
            currentSetNumber++;
            
            // Continuer avec la série suivante
            showSetInput();
        } else {
            showToast('Erreur lors de l\'enregistrement', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Série sauvegardée localement', 'warning');
    }
}

function addSetToHistory(setData) {
    const container = document.getElementById('previousSets');
    const setElement = document.createElement('div');
    setElement.className = 'set-history-item';
    setElement.innerHTML = `
        <div class="set-number">Série ${setData.set_number}</div>
        <div class="set-details">
            ${setData.weight}kg × ${setData.actual_reps} reps
            ${setData.duration ? `<span class="set-duration">${setData.duration}s</span>` : ''}
            <span class="fatigue-badge fatigue-${setData.fatigue_level}">
                Fatigue: ${setData.fatigue_level}/10
            </span>
        </div>
    `;
    container.insertBefore(setElement, container.firstChild);
}

function suggestNextSet(lastSet) {
    // Logique simple pour suggérer la prochaine série
    if (lastSet.fatigue_level >= 8) {
        // Très fatigué : réduire le poids
        document.getElementById('setWeight').value = lastSet.weight * 0.9;
        showToast('Fatigue élevée détectée : poids réduit', 'info');
    } else if (lastSet.actual_reps > lastSet.target_reps + 2) {
        // Trop facile : augmenter le poids
        document.getElementById('setWeight').value = lastSet.weight + 2.5;
        showToast('Performance excellente : poids augmenté', 'success');
    }
}

function startRestTimer(seconds) {
    // TODO: Implémenter le timer dans la phase 1.3
    console.log(`Timer de repos: ${seconds}s`);
}

function finishExercise() {
    // Arrêter les timers
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Réinitialiser
    currentExercise = null;
    currentSetNumber = 1;
    setStartTime = null;
    lastSetEndTime = null;
    selectedFatigue = 3;
    selectedEffort = 3;
    
    // Retourner au sélecteur d'exercices
    showExerciseSelector();
}

function addElastique() {
    const color = document.getElementById('elastiqueColor').value.trim();
    const resistance = parseFloat(document.getElementById('elastiqueResistance').value);
    const count = parseInt(document.getElementById('elastiqueCount').value) || 1;
    
    if (color && resistance) {
        equipmentConfig.elastiques.push({ color, resistance, count });
        updateElastiquesList();
        document.getElementById('elastiqueColor').value = '';
        document.getElementById('elastiqueResistance').value = '';
        document.getElementById('elastiqueCount').value = '1';
        showToast(`Ajouté: ${count} élastique(s) ${color} de ${resistance}kg`, 'success');
    }
}

function updateElastiquesList() {
    const list = document.getElementById('elastiquesList');
    if (!list) return;
    
    list.innerHTML = equipmentConfig.elastiques.map((e, index) => `
        <div class="elastique-item">
            <span class="elastique-color" style="background-color: ${getColorHex(e.color)}"></span>
            <span>${e.color} - ${e.resistance}kg (x${e.count})</span>
            <button onclick="removeElastique(${index})" class="btn-remove">×</button>
        </div>
    `).join('');
}

function removeElastique(index) {
    equipmentConfig.elastiques.splice(index, 1);
    updateElastiquesList();
}

function getColorHex(colorName) {
    const colors = {
        'vert': '#22c55e',
        'jaune': '#eab308',
        'rouge': '#ef4444',
        'noir': '#000000',
        'bleu': '#3b82f6',
        'violet': '#a855f7',
        'orange': '#f97316'
    };
    return colors[colorName.toLowerCase()] || '#666666';
}

function addLest(type, weight) {
    const w = parseFloat(weight);
    if (w > 0) {
        equipmentConfig.autres[`lest_${type}`] = [w];
        showToast(`Lest ${type} de ${w}kg ajouté`, 'success');
    }
}

function validateDetailedConfig() {
    let isValid = true;
    let errors = [];
    
    // Valider selon l'équipement sélectionné
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
    
    if (selectedEquipment.includes('bench')) {
        // Le banc est toujours valide si sélectionné
        if (!equipmentConfig.banc.available) {
            equipmentConfig.banc.available = true;
        }
    }
    
    if (selectedEquipment.includes('pull_up_bar')) {
        // La barre de traction est toujours valide si sélectionnée
        equipmentConfig.autres.barre_traction = true;
    }
    
    // Afficher toutes les erreurs
    if (!isValid && errors.length > 0) {
        errors.forEach(error => showToast(error, 'error'));
    }
    
    return isValid;
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
    
    // Résumé détaillé de l'équipement
    summary += '<p><strong>Équipement:</strong></p><ul style="margin-left: 1rem;">';
    
    // Barres
    if (selectedEquipment.includes('barbell')) {
        const barres = [];
        Object.entries(equipmentConfig.barres).forEach(([type, config]) => {
            if (config.available && config.count > 0) {
                const name = type === 'olympique' ? 'Olympique' : 
                           type === 'ez' ? 'EZ/Curl' : 'Courte';
                barres.push(`${config.count} ${name} (${config.weight}kg)`);
            }
        });
        if (barres.length > 0) {
            summary += `<li>Barres: ${barres.join(', ')}</li>`;
        }
        
        const disques = Object.entries(equipmentConfig.disques)
            .map(([weight, count]) => `${count}x${weight}kg`)
            .join(', ');
        if (disques) {
            summary += `<li>Disques: ${disques}</li>`;
        }
    }
    
    // Haltères
    if (selectedEquipment.includes('dumbbells')) {
        const dumbbells = Object.entries(equipmentConfig.dumbbells)
            .map(([weight, count]) => `${count}x${weight}kg`)
            .join(', ');
        if (dumbbells) {
            summary += `<li>Haltères: ${dumbbells}</li>`;
        }
    }
    
    // Kettlebells
    if (selectedEquipment.includes('kettlebell')) {
        const kettlebells = Object.entries(equipmentConfig.kettlebells)
            .map(([weight, count]) => `${count}x${weight}kg`)
            .join(', ');
        if (kettlebells) {
            summary += `<li>Kettlebells: ${kettlebells}</li>`;
        }
    }
    
    // Élastiques
    if (selectedEquipment.includes('resistance_bands') && equipmentConfig.elastiques.length > 0) {
        const bands = equipmentConfig.elastiques
            .map(e => `${e.count}x ${e.color} (${e.resistance}kg)`)
            .join(', ');
        summary += `<li>Élastiques: ${bands}</li>`;
    }
    
    // Banc
    if (selectedEquipment.includes('bench')) {
        const features = [];
        if (equipmentConfig.banc.inclinable) features.push('inclinable');
        if (equipmentConfig.banc.declinable) features.push('déclinable');
        summary += `<li>Banc${features.length > 0 ? ' ' + features.join(', ') : ''}</li>`;
    }
    
    // Autres
    if (selectedEquipment.includes('pullup_bar')) {
        summary += '<li>Barre de traction</li>';
    }
    
    const lests = [];
    if (equipmentConfig.autres.lest_corps.length > 0) {
        lests.push(`Gilet ${equipmentConfig.autres.lest_corps[0]}kg`);
    }
    if (equipmentConfig.autres.lest_chevilles.length > 0) {
        lests.push(`Chevilles ${equipmentConfig.autres.lest_chevilles[0]}kg`);
    }
    if (equipmentConfig.autres.lest_poignets.length > 0) {
        lests.push(`Poignets ${equipmentConfig.autres.lest_poignets[0]}kg`);
    }
    if (lests.length > 0) {
        summary += `<li>Lests: ${lests.join(', ')}</li>`;
    }
    
    summary += '</ul>';
    
    document.getElementById('profileSummary').innerHTML = summary;
}

async function saveUser() {
    // Transformer la structure equipment_config au format attendu par l'API
    const transformedEquipmentConfig = {
        barres: equipmentConfig.barres, // OK tel quel
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
        age: parseInt(document.getElementById('userAge').value),
        height: parseFloat(document.getElementById('userHeight').value),
        weight: parseFloat(document.getElementById('userWeight').value),
        experience_level: document.getElementById('experienceLevel').value,
        goals: selectedGoals,
        equipment_config: transformedEquipmentConfig
    };
    
    // Validation finale
    if (!userData.name || !userData.age || !userData.experience_level) {
        showToast('Informations personnelles incomplètes', 'error');
        return;
    }
    
    if (userData.goals.length === 0) {
        showToast('Aucun objectif sélectionné', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/users/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            localStorage.setItem('userId', user.id);
            // Sauvegarder aussi le profil complet
            localStorage.setItem('userProfile', JSON.stringify(user));
            
            // Réinitialiser l'interface
            document.getElementById('progressContainer').style.display = 'none';
            
            showMainInterface();
            showToast('Profil créé avec succès !', 'success');
        } else {
            const error = await response.json();
            console.error('Erreur serveur:', error);

            // Gérer les erreurs de validation (422)
            if (Array.isArray(error.detail)) {
                const errorMessages = error.detail.map(err => {
                    // Format Pydantic: extraire le champ et le message
                    const field = err.loc ? err.loc[err.loc.length - 1] : 'Champ';
                    return `${field}: ${err.msg}`;
                }).join('\n');
                showToast(errorMessages || 'Erreur de validation', 'error');
                console.error('Détails erreurs validation:', error.detail);
            } else {
                showToast(error.detail || 'Erreur lors de la sauvegarde', 'error');
            }

        }
    } catch (error) {
        console.error('Erreur réseau:', error);
        showToast('Erreur de connexion au serveur', 'error');
    }
}

// ===== INTERFACE PRINCIPALE =====
function showMainInterface() {
    document.getElementById('onboarding').classList.remove('active');
    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('bottomNav').style.display = 'flex';
    
    if (currentUser) {
        document.getElementById('userInitial').textContent = currentUser.name[0].toUpperCase();
        document.getElementById('userInitial').style.display = 'flex';
    }
    
    showView('dashboard');
    loadDashboard();
}

// ===== DASHBOARD =====
async function loadDashboard() {
    if (!currentUser) return;
    
    document.getElementById('welcomeMessage').textContent = `Bonjour ${currentUser.name} !`;
    
    // Charger les statistiques
    try {
        const response = await fetch(`/api/users/${currentUser.id}/stats`);
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalWorkouts').textContent = stats.total_workouts || '0';
            document.getElementById('weekStreak').textContent = stats.week_streak || '0';
            document.getElementById('lastWorkout').textContent = stats.last_workout || 'Jamais';
        }
    } catch (error) {
        console.error('Erreur chargement stats:', error);
    }
}

// ===== EXERCICES =====
let allExercises = [];

async function loadExercises() {
    try {
        const response = await fetch('/api/exercises/');
        if (response.ok) {
            allExercises = await response.json();
            console.log(`${allExercises.length} exercices chargés`);
        } else {
            console.error('Erreur chargement exercices:', response.status);
        }
    } catch (error) {
        console.error('Erreur chargement exercices:', error);
    }
}


function displayExercises(exercises = allExercises) {
    const container = document.getElementById('exercisesList');
    const bodyParts = [...new Set(exercises.map(e => e.body_part))];
    
    container.innerHTML = bodyParts.map(part => {
        const partExercises = exercises.filter(e => e.body_part === part);
        return `
            <div class="body-part-section">
                <h3>${part}</h3>
                <div class="exercises-grid">
                    ${partExercises.map(exercise => `
                        <div class="exercise-card" onclick="showExerciseDetail(${exercise.id})">
                            <h4>${exercise.name_fr}</h4>
                            <p class="exercise-info">${exercise.name_eng}</p>
                            <div class="exercise-tags">
                                ${exercise.equipment_specs?.barbell_count ? 
                                    `<span class="tag">${exercise.equipment_specs.barbell_count} barre${exercise.equipment_specs.barbell_count > 1 ? 's' : ''}</span>` : ''}
                                ${exercise.equipment_specs?.dumbbell_count ? 
                                    `<span class="tag">${exercise.equipment_specs.dumbbell_count} haltère${exercise.equipment_specs.dumbbell_count > 1 ? 's' : ''}</span>` : ''}
                                <span class="tag tag-${exercise.level}">${exercise.level}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function filterExercises() {
    const searchTerm = document.getElementById('exerciseSearch').value.toLowerCase();
    const bodyPart = document.getElementById('bodyPartFilter').value;
    
    let filtered = allExercises;
    
    if (searchTerm) {
        filtered = filtered.filter(e => 
            e.name_fr.toLowerCase().includes(searchTerm) ||
            e.name_eng.toLowerCase().includes(searchTerm)
        );
    }
    
    if (bodyPart) {
        filtered = filtered.filter(e => e.body_part === bodyPart);
    }
    
    displayExercises(filtered);
}

function showExerciseDetail(exerciseId) {
    const exercise = allExercises.find(e => e.id === exerciseId);
    if (!exercise) return;
    
    // Afficher les détails de l'exercice dans une modal
    console.log('Détails exercice:', exercise);
    // TODO: Implémenter la modal
}

// ===== UTILITAIRES =====
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function loadUser(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (response.ok) {
            currentUser = await response.json();
            
            // Sauvegarder le profil complet en localStorage
            localStorage.setItem('userProfile', JSON.stringify(currentUser));
            
            // Vérifier s'il y a une session active
            const activeWorkout = await checkActiveWorkout();
            if (activeWorkout) {
                showToast('Session en cours récupérée', 'info');
                showView('training');
                updateTrainingInterface();
            } else {
                showMainInterface();
            }
        } else {
            // Essayer de charger depuis le cache local
            const cachedProfile = localStorage.getItem('userProfile');
            if (cachedProfile) {
                currentUser = JSON.parse(cachedProfile);
                showToast('Profil chargé depuis le cache', 'info');
                showMainInterface();
            } else {
                localStorage.removeItem('userId');
                showView('onboarding');
            }
        }
    } catch (error) {
        console.error('Erreur chargement utilisateur:', error);
        
        // Essayer le cache local en cas d'erreur réseau
        const cachedProfile = localStorage.getItem('userProfile');
        if (cachedProfile) {
            currentUser = JSON.parse(cachedProfile);
            showToast('Mode hors-ligne - Profil chargé depuis le cache', 'warning');
            showMainInterface();
        } else {
            localStorage.removeItem('userId');
            showView('onboarding');
        }
    }
}

function logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        localStorage.removeItem('userId');
        currentUser = null;
        currentStep = 1;
        selectedGoals = [];
        selectedEquipment = [];
        equipmentConfig = {
            barres: {
                olympique: { available: false, count: 0, weight: 20 },
                ez: { available: false, count: 0, weight: 10 },
                courte: { available: false, count: 0, weight: 2.5 }
            },
            disques: {},
            dumbbells: {},
            kettlebells: {},
            elastiques: [],
            banc: {
                available: false,
                inclinable: false,
                declinable: false
            },
            autres: {
                barre_traction: false,
                lest_corps: [],
                lest_chevilles: [],
                lest_poignets: []
            }
        };
        
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

// Export des fonctions pour les rendre accessibles depuis le HTML
window.pauseWorkout = pauseWorkout;
window.resumeWorkout = resumeWorkout;
window.completeWorkout = completeWorkout;
window.abandonWorkout = abandonWorkout;

// Exposer les fonctions globalement pour les onclick HTML
window.nextStep = nextStep;
window.prevStep = prevStep;
window.toggleGoal = toggleGoal;
window.toggleEquipment = toggleEquipment;
window.showView = showView;
window.saveUser = saveUser;
window.startWorkout = startWorkout;
window.logout = logout;

// Fonctions pour la configuration détaillée
window.updateBarbell = updateBarbell;
window.updateDisqueWeight = updateDisqueWeight;
window.updateDumbbellWeight = updateDumbbellWeight;
window.updateKettlebellWeight = updateKettlebellWeight;
window.toggleBenchFeature = toggleBenchFeature;
window.addBand = addBand;
window.removeBand = removeBand;
window.addElastique = addElastique;
window.removeElastique = removeElastique;
window.addCustomDumbbell = addCustomDumbbell;
window.addCustomDisque = addCustomDisque;
window.addCustomKettlebell = addCustomKettlebell;
window.updateElastiquesList = updateElastiquesList;
window.getColorHex = getColorHex;
window.addLest = addLest;
window.showConfigPanel = showConfigPanel;

// Fonctions pour le tracking des sets
window.showExerciseSelector = showExerciseSelector;
window.selectExercise = selectExercise;
window.filterExerciseList = filterExerciseList;
window.adjustWeight = adjustWeight;
window.adjustReps = adjustReps;
window.updateFatigueDisplay = updateFatigueDisplay;
window.updateExertionDisplay = updateExertionDisplay;
window.completeSet = completeSet;
window.skipSet = skipSet;
window.finishExercise = finishExercise;

// Fonctions pour les emojis et timers
window.selectFatigue = selectFatigue;
window.selectEffort = selectEffort;
window.skipSet = skipSet;

// Service Worker pour PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
}