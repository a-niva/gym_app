// ===== MODULES/EQUIPMENT.JS - CONFIGURATION DE L'ÉQUIPEMENT =====

import { getState, setState, updateNestedState } from '../core/state.js';
import { ELASTIC_COLORS } from '../core/config.js';
import { showToast } from './utils.js';

// Génération de la configuration détaillée
export function generateDetailedEquipmentConfig() {
    const container = document.getElementById('detailedEquipmentConfig');
    const selectedEquipment = getState('selectedEquipment');
    
    const html = `
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
    
    // Auto-configuration des équipements simples
    if (selectedEquipment.includes('pull_up_bar')) {
        updateNestedState('equipmentConfig.autres.barre_traction', true);
        updateEquipmentStatus('pull_up_bar');
    }
    
    if (selectedEquipment.includes('bench')) {
        updateNestedState('equipmentConfig.banc.available', true);
        updateEquipmentStatus('bench');
    }
    
    // Ouvrir les panels de configuration
    selectedEquipment.forEach(eq => {
        showConfigPanel(eq);
    });
}

// Affichage du panel de configuration
export function showConfigPanel(equipment) {
    const panelsContainer = document.getElementById('configPanels');
    if (!panelsContainer) return;
    
    const existingPanel = document.getElementById(`panel-${equipment}`);
    if (existingPanel) {
        existingPanel.scrollIntoView({ behavior: 'smooth' });
        return;
    }
    
    let panelContent = '';
    
    switch(equipment) {
        case 'barbell':
            panelContent = createBarbellPanel();
            break;
        case 'dumbbells':
            panelContent = createDumbbellsPanel();
            break;
        case 'resistance_bands':
            panelContent = createResistanceBandsPanel();
            break;
        case 'kettlebell':
            panelContent = createKettlebellPanel();
            break;
        case 'bench':
            panelContent = createBenchPanel();
            break;
        default:
            return;
    }
    
    const panel = document.createElement('div');
    panel.id = `panel-${equipment}`;
    panel.className = 'config-panel';
    panel.innerHTML = panelContent;
    panelsContainer.appendChild(panel);
    
    panel.scrollIntoView({ behavior: 'smooth' });
}

// Mise à jour du statut de l'équipement
export function updateEquipmentStatus(equipment) {
    const statusElement = document.getElementById(`status-${equipment}`);
    if (!statusElement) return;
    
    const config = getState('equipmentConfig');
    let isConfigured = false;
    
    switch(equipment) {
        case 'dumbbells':
            isConfigured = Object.keys(config.dumbbells).length > 0;
            break;
        case 'barbell':
            const hasBar = config.barres.olympique.available || 
                          config.barres.ez.available || 
                          config.barres.courte.available;
            const hasDisques = Object.keys(config.disques).length > 0;
            isConfigured = hasBar && hasDisques;
            break;
        case 'resistance_bands':
            isConfigured = config.elastiques.length > 0;
            break;
        case 'kettlebell':
            isConfigured = Object.keys(config.kettlebells).length > 0;
            break;
        case 'bench':
        case 'pull_up_bar':
            isConfigured = true;
            break;
    }
    
    statusElement.textContent = isConfigured ? '✓ Configuré' : 'À configurer';
    statusElement.style.color = isConfigured ? '#10b981' : '#f59e0b';
}

// Création des panels de configuration
function createBarbellPanel() {
    const config = getState('equipmentConfig');
    return `
        <div class="config-header">
            <div class="config-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h18M8 6h8M7 18h10"/>
                </svg>
            </div>
            <h3 class="config-title">Configuration Barres & Disques</h3>
        </div>
        
        <div class="config-section">
            <h4>Types de barres disponibles</h4>
            <div class="equipment-item-row">
                <label class="equipment-checkbox">
                    <input type="checkbox" id="barreOlympique" 
                           ${config.barres.olympique.available ? 'checked' : ''}
                           onchange="updateBarbell('olympique', this.checked)">
                    <span>Barre olympique (20kg)</span>
                </label>
            </div>
            <div class="equipment-item-row">
                <label class="equipment-checkbox">
                    <input type="checkbox" id="barreEZ" 
                           ${config.barres.ez.available ? 'checked' : ''}
                           onchange="updateBarbell('ez', this.checked)">
                    <span>Barre EZ (10kg)</span>
                </label>
            </div>
            <div class="equipment-item-row">
                <label class="equipment-checkbox">
                    <input type="checkbox" id="barreCourte" 
                           ${config.barres.courte.available ? 'checked' : ''}
                           onchange="updateBarbell('courte', this.checked)">
                    <span>Barre courte (2.5kg)</span>
                </label>
            </div>
        </div>
        
        <div class="config-section">
            <h4>Disques disponibles (nombre total, pas par paire)</h4>
            <div class="disques-grid">
                ${[0.5, 1, 1.25, 2.5, 5, 10, 15, 20, 25].map(weight => `
                    <div class="disque-item">
                        <label>${weight}kg</label>
                        <input type="number" min="0" max="20" value="${config.disques[weight] || 0}"
                               class="count-input" onchange="updateDisqueWeight(${weight}, this.value)">
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-secondary" onclick="addCustomDisque()">+ Poids personnalisé</button>
        </div>
    `;
}

function createDumbbellsPanel() {
    const config = getState('equipmentConfig');
    return `
        <div class="config-header">
            <div class="config-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
                </svg>
            </div>
            <h3 class="config-title">Configuration Haltères</h3>
        </div>
        
        <div class="config-section">
            <h4>Poids disponibles (par haltère)</h4>
            <div class="dumbbells-grid">
                ${[1, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20].map(weight => `
                    <div class="dumbbell-item">
                        <label>${weight}kg</label>
                        <input type="number" min="0" max="10" value="${config.dumbbells[weight] || 0}"
                               class="count-input" onchange="updateDumbbellWeight(${weight}, this.value)">
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-secondary" onclick="addCustomDumbbell()">+ Poids personnalisé</button>
        </div>
        
        <div class="config-section lest-section">
            <h4>Lests additionnels</h4>
            <h5>Gilet lesté</h5>
            <div class="lest-inputs">
                <label>Poids disponibles (kg)</label>
                <input type="text" id="lestCorps" placeholder="Ex: 5, 10, 15" 
                       value="${config.autres.lest_corps.join(', ')}"
                       onblur="addLest('corps', this.value)">
            </div>
            
            <h5>Lests chevilles (par unité)</h5>
            <div class="lest-inputs">
                <label>Poids disponibles (kg)</label>
                <input type="text" id="lestChevilles" placeholder="Ex: 0.5, 1, 2" 
                       value="${config.autres.lest_chevilles.join(', ')}"
                       onblur="addLest('chevilles', this.value)">
            </div>
            
            <h5>Lests poignets (par unité)</h5>
            <div class="lest-inputs">
                <label>Poids disponibles (kg)</label>
                <input type="text" id="lestPoignets" placeholder="Ex: 0.5, 1" 
                       value="${config.autres.lest_poignets.join(', ')}"
                       onblur="addLest('poignets', this.value)">
            </div>
        </div>
    `;
}

function createResistanceBandsPanel() {
    const config = getState('equipmentConfig');
    return `
        <div class="config-header">
            <div class="config-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
            </div>
            <h3 class="config-title">Configuration Élastiques</h3>
        </div>
        
        <div class="config-section">
            <h4>Ajouter un élastique</h4>
            <div class="elastique-form">
                <input type="text" id="elastiqueColor" placeholder="Couleur (ex: rouge)" class="form-input">
                <input type="number" id="elastiqueResistance" placeholder="Résistance (kg)" min="1" max="100" class="form-input">
                <input type="number" id="elastiqueCount" placeholder="Quantité" min="1" max="10" value="1" class="form-input">
                <button class="btn" onclick="addElastique()">Ajouter</button>
            </div>
            
            <div id="elastiquesList">
                ${config.elastiques.map((e, index) => `
                    <div class="elastique-item">
                        <span class="elastique-color" style="background-color: ${getColorHex(e.color)}"></span>
                        <span>${e.color} - ${e.resistance}kg (x${e.count})</span>
                        <button onclick="removeElastique(${index})" class="btn-remove">×</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function createKettlebellPanel() {
    const config = getState('equipmentConfig');
    return `
        <div class="config-header">
            <div class="config-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="15" r="7" stroke-width="2"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8V4m-2 4h4"/>
                </svg>
            </div>
            <h3 class="config-title">Configuration Kettlebells</h3>
        </div>
        
        <div class="config-section">
            <h4>Poids disponibles</h4>
            <div class="kettlebell-grid">
                ${[4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32].map(weight => `
                    <div class="kettlebell-item">
                        <label>${weight}kg</label>
                        <input type="number" min="0" max="5" value="${config.kettlebells[weight] || 0}"
                               class="count-input" onchange="updateKettlebellWeight(${weight}, this.value)">
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-secondary" onclick="addCustomKettlebell()">+ Poids personnalisé</button>
        </div>
    `;
}

function createBenchPanel() {
    const config = getState('equipmentConfig');
    return `
        <div class="config-header">
            <div class="config-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h18v6H3zM3 12h18v9H3z"/>
                </svg>
            </div>
            <h3 class="config-title">Configuration Banc</h3>
        </div>
        
        <div class="config-section">
            <h4>Caractéristiques du banc</h4>
            <div class="equipment-item-row">
                <label class="equipment-checkbox">
                    <input type="checkbox" id="bancInclinable" 
                           ${config.banc.inclinable ? 'checked' : ''}
                           onchange="toggleBenchFeature('inclinable', this.checked)">
                    <span>Inclinable</span>
                </label>
            </div>
            <div class="equipment-item-row">
                <label class="equipment-checkbox">
                    <input type="checkbox" id="bancDeclinable" 
                           ${config.banc.declinable ? 'checked' : ''}
                           onchange="toggleBenchFeature('declinable', this.checked)">
                    <span>Déclinable</span>
                </label>
            </div>
        </div>
    `;
}

// Fonctions de mise à jour
export function updateBarbell(type, available) {
    updateNestedState(`equipmentConfig.barres.${type}.available`, available);
    updateEquipmentStatus('barbell');
}

export function updateDisqueWeight(weight, count) {
    const config = getState('equipmentConfig');
    const newDisques = { ...config.disques };
    
    if (parseInt(count) > 0) {
        newDisques[weight] = parseInt(count);
    } else {
        delete newDisques[weight];
    }
    
    updateNestedState('equipmentConfig.disques', newDisques);
    updateEquipmentStatus('barbell');
}

export function updateDumbbellWeight(weight, count) {
    const config = getState('equipmentConfig');
    const newDumbbells = { ...config.dumbbells };
    
    if (parseInt(count) > 0) {
        newDumbbells[weight] = parseInt(count);
    } else {
        delete newDumbbells[weight];
    }
    
    updateNestedState('equipmentConfig.dumbbells', newDumbbells);
    updateEquipmentStatus('dumbbells');
}

export function updateKettlebellWeight(weight, count) {
    const config = getState('equipmentConfig');
    const newKettlebells = { ...config.kettlebells };
    
    if (parseInt(count) > 0) {
        newKettlebells[weight] = parseInt(count);
    } else {
        delete newKettlebells[weight];
    }
    
    updateNestedState('equipmentConfig.kettlebells', newKettlebells);
    updateEquipmentStatus('kettlebell');
}

export function toggleBenchFeature(feature, enabled) {
    updateNestedState(`equipmentConfig.banc.${feature}`, enabled);
    updateEquipmentStatus('bench');
}

export function addElastique() {
    const color = document.getElementById('elastiqueColor').value.trim();
    const resistance = parseFloat(document.getElementById('elastiqueResistance').value);
    const count = parseInt(document.getElementById('elastiqueCount').value) || 1;
    
    if (color && resistance) {
        const config = getState('equipmentConfig');
        const newElastiques = [...config.elastiques, { color, resistance, count }];
        updateNestedState('equipmentConfig.elastiques', newElastiques);
        
        updateElastiquesList();
        document.getElementById('elastiqueColor').value = '';
        document.getElementById('elastiqueResistance').value = '';
        document.getElementById('elastiqueCount').value = '1';
        
        showToast(`Ajouté: ${count} élastique(s) ${color} de ${resistance}kg`, 'success');
        updateEquipmentStatus('resistance_bands');
    }
}

export function removeElastique(index) {
    const config = getState('equipmentConfig');
    const newElastiques = config.elastiques.filter((_, i) => i !== index);
    updateNestedState('equipmentConfig.elastiques', newElastiques);
    
    updateElastiquesList();
    updateEquipmentStatus('resistance_bands');
}

export function updateElastiquesList() {
    const list = document.getElementById('elastiquesList');
    if (!list) return;
    
    const config = getState('equipmentConfig');
    list.innerHTML = config.elastiques.map((e, index) => `
        <div class="elastique-item">
            <span class="elastique-color" style="background-color: ${getColorHex(e.color)}"></span>
            <span>${e.color} - ${e.resistance}kg (x${e.count})</span>
            <button onclick="removeElastique(${index})" class="btn-remove">×</button>
        </div>
    `).join('');
}

export function addLest(type, value) {
    const weights = value.split(',')
        .map(w => parseFloat(w.trim()))
        .filter(w => !isNaN(w) && w > 0)
        .sort((a, b) => a - b);
    
    updateNestedState(`equipmentConfig.autres.lest_${type}`, weights);
}

// Ajout de poids personnalisés
export function addCustomDumbbell() {
    const weight = prompt('Poids de l\'haltère (kg):');
    if (weight && !isNaN(weight)) {
        updateDumbbellWeight(parseFloat(weight), 1);
        showConfigPanel('dumbbells');
    }
}

export function addCustomDisque() {
    const weight = prompt('Poids du disque (kg):');
    if (weight && !isNaN(weight)) {
        updateDisqueWeight(parseFloat(weight), 2);
        showConfigPanel('barbell');
    }
}

export function addCustomKettlebell() {
    const weight = prompt('Poids du kettlebell (kg):');
    if (weight && !isNaN(weight)) {
        updateKettlebellWeight(parseFloat(weight), 1);
        showConfigPanel('kettlebell');
    }
}

// Utilitaires
export function getColorHex(colorName) {
    return ELASTIC_COLORS[colorName.toLowerCase()] || '#666';
}

function getEquipmentIcon(type) {
    const icons = {
        'dumbbells': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/></svg>',
        'barbell': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h18M8 6h8M7 18h10"/></svg>',
        'resistance_bands': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
        'bench': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h18v6H3zM3 12h18v9H3z"/></svg>',
        'pull_up_bar': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h18M5 3v9m14-9v9"/></svg>',
        'kettlebell': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="15" r="7" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8V4m-2 4h4"/></svg>'
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