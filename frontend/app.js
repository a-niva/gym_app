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
        const experience = document.getElementById('experienceLevel').value;
        
        if (!name || !age || !experience) {
            showToast('Veuillez remplir tous les champs', 'error');
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
    
    // Barres
    if (selectedEquipment.includes('barbell')) {
        html += `
            <div class="equipment-section">
                <h3>🏋️ Configuration des barres et disques</h3>
                
                <!-- Barres -->
                <h4 style="margin-top: 1rem; margin-bottom: 1rem;">Types de barres</h4>
                <div class="equipment-subsection">
                    <div class="equipment-item-row">
                        <label class="checkbox-label">
                            <input type="checkbox" id="barbell_olympic" onchange="toggleBarType('olympique')">
                            <span>Barre olympique (20kg)</span>
                        </label>
                        <input type="number" id="barbell_olympic_count" class="count-input" 
                               min="0" max="10" value="0" placeholder="Nombre"
                               onchange="updateBarCount('olympique', this.value)"
                               style="display: none;">
                    </div>
                    <div class="equipment-item-row">
                        <label class="checkbox-label">
                            <input type="checkbox" id="barbell_ez" onchange="toggleBarType('ez')">
                            <span>Barre EZ/Curl (10kg)</span>
                        </label>
                        <input type="number" id="barbell_ez_count" class="count-input" 
                               min="0" max="10" value="0" placeholder="Nombre"
                               onchange="updateBarCount('ez', this.value)"
                               style="display: none;">
                    </div>
                    <div class="equipment-item-row">
                        <label class="checkbox-label">
                            <input type="checkbox" id="barbell_short" onchange="toggleBarType('courte')">
                            <span>Barres courtes (2.5kg chacune)</span>
                        </label>
                        <input type="number" id="barbell_short_count" class="count-input" 
                               min="0" max="10" value="0" placeholder="Nombre"
                               onchange="updateBarCount('courte', this.value)"
                               style="display: none;">
                    </div>
                </div>
                
                <!-- Disques -->
                <h4 style="margin-top: 1.5rem; margin-bottom: 1rem;">Disques disponibles</h4>
                <div class="equipment-subsection">
                    <p style="color: var(--gray); margin-bottom: 1rem;">Pour chaque poids, indiquez combien vous avez de disques</p>
                    <div class="disques-grid">
                        ${[0.5, 1, 1.25, 2.5, 5, 10, 15, 20, 25].map(weight => `
                            <div class="disque-item">
                                <span class="disque-weight">${weight}kg</span>
                                <input type="number" class="count-input-small" 
                                       min="0" max="20" value="0" 
                                       placeholder="0"
                                       onchange="updateDisqueCount('${weight}', this.value)">
                            </div>
                        `).join('')}
                        <div class="disque-item custom">
                            <input type="number" class="custom-weight-input" 
                                   min="0.1" max="50" step="0.1" 
                                   placeholder="Autre kg" 
                                   id="customDisqueWeight">
                            <input type="number" class="count-input-small" 
                                   min="0" max="20" value="0" 
                                   placeholder="0"
                                   onchange="addCustomDisque()">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Haltères
    if (selectedEquipment.includes('dumbbells')) {
        html += `
            <div class="equipment-section">
                <h3>🏋️‍♀️ Configuration des haltères</h3>
                <div class="equipment-subsection">
                    <p style="color: var(--gray); margin-bottom: 1rem;">Pour chaque poids, indiquez combien vous avez d'haltères</p>
                    <div class="dumbbells-grid">
                        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map(weight => `
                            <div class="dumbbell-item">
                                <span class="dumbbell-weight">${weight}kg</span>
                                <input type="number" class="count-input-small" 
                                       min="0" max="10" value="0" 
                                       placeholder="0"
                                       onchange="updateDumbbellCount('${weight}', this.value)">
                            </div>
                        `).join('')}
                        <div class="dumbbell-item custom">
                            <input type="number" class="custom-weight-input" 
                                   min="0.1" max="100" step="0.1" 
                                   placeholder="Autre kg" 
                                   id="customDumbbellWeight">
                            <input type="number" class="count-input-small" 
                                   min="0" max="10" value="0" 
                                   placeholder="0"
                                   onchange="addCustomDumbbell()">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Kettlebells
    if (selectedEquipment.includes('kettlebell')) {
        html += `
            <div class="equipment-section">
                <h3>🔔 Configuration des kettlebells</h3>
                <div class="equipment-subsection">
                    <p style="color: var(--gray); margin-bottom: 1rem;">Pour chaque poids, indiquez combien vous avez de kettlebells</p>
                    <div class="kettlebell-grid">
                        ${[4, 6, 8, 10, 12, 16, 20, 24, 28, 32].map(weight => `
                            <div class="kettlebell-item">
                                <span class="kettlebell-weight">${weight}kg</span>
                                <input type="number" class="count-input-small" 
                                       min="0" max="10" value="0" 
                                       placeholder="0"
                                       onchange="updateKettlebellCount('${weight}', this.value)">
                            </div>
                        `).join('')}
                        <div class="kettlebell-item custom">
                            <input type="number" class="custom-weight-input" 
                                   min="0.1" max="100" step="0.1" 
                                   placeholder="Autre kg" 
                                   id="customKettlebellWeight">
                            <input type="number" class="count-input-small" 
                                   min="0" max="10" value="0" 
                                   placeholder="0"
                                   onchange="addCustomKettlebell()">
                        </div>
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
                    <p style="color: var(--gray); margin-bottom: 1rem;">Ajoutez vos élastiques avec leur résistance exacte</p>
                    <div id="elastiquesList" class="elastiques-list"></div>
                    <div class="elastique-add">
                        <input type="text" id="elastiqueColor" placeholder="Couleur" class="form-input" style="width: 30%;">
                        <input type="number" id="elastiqueResistance" placeholder="Résistance (kg)" 
                               min="1" max="100" step="0.5" class="form-input" style="width: 40%;">
                        <input type="number" id="elastiqueCount" placeholder="Nombre" 
                               min="1" max="10" value="1" class="form-input" style="width: 20%;">
                        <button onclick="addElastique()" class="btn-add">+</button>
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
                            <input type="checkbox" id="bench_incline" 
                                   onchange="equipmentConfig.banc.inclinable = this.checked">
                            <span>Inclinable (positif)</span>
                        </label>
                    </div>
                    <div class="equipment-item">
                        <label class="checkbox-label">
                            <input type="checkbox" id="bench_decline"
                                   onchange="equipmentConfig.banc.declinable = this.checked">
                            <span>Déclinable (négatif)</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Autres équipements
    if (selectedEquipment.includes('pullup_bar') || selectedEquipment.includes('weighted_vest')) {
        html += `
            <div class="equipment-section">
                <h3>🎯 Autres équipements</h3>
                <div class="equipment-subsection">
        `;
        
        if (selectedEquipment.includes('pullup_bar')) {
            html += `
                <div class="equipment-item">
                    <label class="checkbox-label">
                        <input type="checkbox" checked disabled>
                        <span>✅ Barre de traction disponible</span>
                    </label>
                </div>
            `;
        }
        
        if (selectedEquipment.includes('weighted_vest')) {
            html += `
                <h4 style="margin-top: 1rem;">Lests disponibles</h4>
                <div class="lest-section">
                    <h5>Gilet lesté</h5>
                    <div class="lest-inputs">
                        <input type="number" placeholder="Poids (kg)" min="0.5" max="50" step="0.5"
                               onchange="addLest('corps', this.value)" class="form-input">
                    </div>
                    
                    <h5>Lests chevilles</h5>
                    <div class="lest-inputs">
                        <input type="number" placeholder="Poids (kg)" min="0.5" max="10" step="0.5"
                               onchange="addLest('chevilles', this.value)" class="form-input">
                    </div>
                    
                    <h5>Lests poignets</h5>
                    <div class="lest-inputs">
                        <input type="number" placeholder="Poids (kg)" min="0.5" max="5" step="0.5"
                               onchange="addLest('poignets', this.value)" class="form-input">
                    </div>
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
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
    // Valider barres et disques
    if (selectedEquipment.includes('barbell')) {
        const hasBar = Object.values(equipmentConfig.barres).some(b => b.available && b.count > 0);
        const hasDisques = Object.keys(equipmentConfig.disques).length > 0;
        
        if (!hasBar) {
            showToast('Veuillez sélectionner au moins un type de barre', 'error');
            return false;
        }
        if (!hasDisques) {
            showToast('Veuillez ajouter au moins un poids de disque', 'error');
            return false;
        }
    }
    
    // Valider haltères
    if (selectedEquipment.includes('dumbbells') && Object.keys(equipmentConfig.dumbbells).length === 0) {
        showToast('Veuillez ajouter au moins un poids d\'haltère', 'error');
        return false;
    }
    
    // Valider kettlebells
    if (selectedEquipment.includes('kettlebell') && Object.keys(equipmentConfig.kettlebells).length === 0) {
        showToast('Veuillez ajouter au moins un poids de kettlebell', 'error');
        return false;
    }
    
    // Valider élastiques
    if (selectedEquipment.includes('resistance_bands') && equipmentConfig.elastiques.length === 0) {
        showToast('Veuillez ajouter au moins un élastique', 'error');
        return false;
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

// ===== ENREGISTREMENT UTILISATEUR =====
async function saveUser() {
    const name = document.getElementById('userName').value;
    const age = parseInt(document.getElementById('userAge').value);
    const experience = document.getElementById('experienceLevel').value;
    
    // Préparer la configuration d'équipement pour le backend
    const backendEquipmentConfig = {
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
            available: selectedEquipment.includes('bench'),
            inclinable_haut: equipmentConfig.banc.inclinable,
            inclinable_bas: equipmentConfig.banc.declinable
        },
        elastiques: {
            available: equipmentConfig.elastiques.length > 0,
            bands: equipmentConfig.elastiques
        },
        autres: {
            kettlebell: {
                available: Object.keys(equipmentConfig.kettlebells).length > 0,
                weights: Object.keys(equipmentConfig.kettlebells).map(w => parseFloat(w))
            },
            barre_traction: {
                available: selectedEquipment.includes('pullup_bar')
            },
            lest_corps: {
                available: equipmentConfig.autres.lest_corps.length > 0,
                weights: equipmentConfig.autres.lest_corps
            },
            lest_chevilles: {
                available: equipmentConfig.autres.lest_chevilles.length > 0,
                weights: equipmentConfig.autres.lest_chevilles
            },
            lest_poignets: {
                available: equipmentConfig.autres.lest_poignets.length > 0,
                weights: equipmentConfig.autres.lest_poignets
            }
        }
    };
    
    const userData = {
        name: name,
        age: age,
        experience_level: experience,
        goals: selectedGoals,
        equipment_config: backendEquipmentConfig
    };
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            const user = await response.json();
            localStorage.setItem('userId', user.id);
            currentUser = user;
            showMainInterface();
            showToast('Profil créé avec succès !', 'success');
        } else {
            const error = await response.json();
            showToast(error.detail || 'Erreur lors de la création du profil', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
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
        const response = await fetch('/api/exercises');
        if (response.ok) {
            allExercises = await response.json();
            displayExercises();
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

// ===== SÉANCE D'ENTRAÎNEMENT =====
async function startWorkout() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/workouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                type: 'free_time'
            })
        });
        
        if (response.ok) {
            const workout = await response.json();
            currentWorkout = workout;
            showView('workout-view');
            showToast('Séance démarrée !', 'success');
        }
    } catch (error) {
        console.error('Erreur démarrage séance:', error);
        showToast('Erreur lors du démarrage de la séance', 'error');
    }
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
            showMainInterface();
        } else {
            localStorage.removeItem('userId');
            showView('onboarding');
        }
    } catch (error) {
        console.error('Erreur chargement utilisateur:', error);
        localStorage.removeItem('userId');
        showView('onboarding');
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