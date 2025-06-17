// ===== UTILITAIRES INTERFACE =====
// Ce fichier contient toutes les fonctions d'interface réutilisables
// Toast, icônes, et autres éléments UI communs

import { 
    getEquipmentIcon as getIconFromConfig,
    getEquipmentName as getNameFromConfig,
    getColorName as getColorNameFromConfig,
    getColorHex as getColorHexFromConfig
} from './app-config.js';

import { isSilentMode, setIsSilentMode } from './app-state.js';

// ===== NOTIFICATIONS TOAST =====
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

// ===== MODAL DE FATIGUE =====
function showFatigueModal(fatigue) {
    const modal = document.createElement('div');
    modal.className = 'fatigue-modal';
    modal.innerHTML = `
        <div class="fatigue-content">
            <h3>⚠️ Fatigue élevée détectée</h3>
            <p>${fatigue.message}</p>
            <div class="fatigue-options">
                <button onclick="reduceSetsRemaining()">Réduire les séries</button>
                <button onclick="switchToLighterExercise()">Exercice plus léger</button>
                <button onclick="dismissFatigueModal()">Continuer</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Export global
window.showFatigueModal = showFatigueModal;

// ===== GESTION DU MODE SILENCIEUX =====
function toggleSilentMode() {
    const newValue = !isSilentMode;
    setIsSilentMode(newValue);
    localStorage.setItem('silentMode', newValue);
    showToast(newValue ? 'Mode silencieux activé' : 'Sons activés', 'info');
}

// ===== FONCTIONS D'ÉQUIPEMENT =====
// Ces fonctions sont des wrappers pour éviter les imports directs depuis config dans le HTML
function getEquipmentIcon(type) {
    return getIconFromConfig(type);
}

function getEquipmentName(type) {
    return getNameFromConfig(type);
}

function getColorName(hexColor) {
    return getColorNameFromConfig(hexColor);
}

function getColorHex(colorName) {
    return getColorHexFromConfig(colorName);
}

// ===== EXPORT GLOBAL =====
// Export pour utilisation dans le HTML
window.showToast = showToast;
window.toggleSilentMode = toggleSilentMode;
window.getEquipmentIcon = getEquipmentIcon;
window.getEquipmentName = getEquipmentName;
window.getColorName = getColorName;
window.getColorHex = getColorHex;

// Export pour les autres modules
export { 
    showToast,
    toggleSilentMode,
    getEquipmentIcon,
    getEquipmentName,
    getColorName,
    getColorHex
};