// ===== GESTIONNAIRE D'ÉQUIPEMENT =====
// Version refactorisée - Architecture simplifiée
// Ce fichier centralise tous les calculs liés à l'équipement et aux poids disponibles

import { currentUser } from './app-state.js';
import { TIME_BASED_KEYWORDS } from './app-config.js';
import { showToast } from './app-ui.js';

// ===== CALCUL DES POIDS DISPONIBLES - FONCTION PRINCIPALE =====
function calculateAvailableWeights(exercise) {
    if (!exercise || !currentUser?.equipment_config) {
        return [0]; // Fallback de sécurité
    }
    
    const config = currentUser.equipment_config;
    const weights = new Set();
    
    // Exercices au poids du corps
    if (exercise.equipment.includes('poids_du_corps')) {
        weights.add(0); // Sans charge
        
        // Ajouter les charges supplémentaires si disponibles
        if (config.disques?.weights) {
            Object.entries(config.disques.weights).forEach(([weight, count]) => {
                const w = parseFloat(weight);
                if (count >= 1) {
                    weights.add(w);
                    weights.add(w * 2); // Combinaisons
                    if (count >= 2) weights.add(w * 3);
                    if (count >= 3) weights.add(w * 4);
                }
            });
        }
        
        return Array.from(weights).sort((a, b) => a - b);
    }
    
    // Haltères (dumbbells)
    if (exercise.equipment.includes('dumbbells')) {
        return calculateDumbbellWeights(config);
    }
    
    // Barres (olympique, EZ, etc.)
    if (exercise.equipment.some(eq => eq.includes('barre') || eq.includes('barbell'))) {
        return calculateBarbellWeights(exercise, config);
    }
    
    // Kettlebells
    if (exercise.equipment.includes('kettlebell')) {
        return calculateKettlebellWeights(config);
    }
    
    // Défaut
    return [0];
}

// ===== CALCULS SPÉCIALISÉS PAR TYPE D'ÉQUIPEMENT =====

function calculateDumbbellWeights(config) {
    const weights = new Set();
    
    // Option 1: Haltères fixes classiques
    if (config.dumbbells?.weights && config.dumbbells.weights.length > 0) {
        config.dumbbells.weights.forEach(weight => {
            weights.add(weight * 2); // Paire d'haltères
        });
    }
    
    // Option 2: Barres courtes + disques (fallback intelligent)
    if (config.barres?.courte?.available && 
        config.barres.courte.count >= 2 && 
        config.disques?.weights) {
        
        const shortBarbellWeight = 2.5 * 2; // Paire de barres courtes (5kg total)
        weights.add(shortBarbellWeight); // Barres seules
        
        // Ajouter toutes les combinaisons avec disques
        const plateWeights = Object.entries(config.disques.weights)
            .filter(([weight, count]) => count >= 2) // Au moins 2 disques (1 par haltère)
            .map(([weight, count]) => ({
                weight: parseFloat(weight),
                maxPairs: Math.floor(count / 2)
            }));
        
        // Générer toutes les combinaisons possibles
        for (let totalPlateWeight = 0; totalPlateWeight <= 100; totalPlateWeight += 0.5) {
            if (canMakePlateWeight(totalPlateWeight, plateWeights)) {
                weights.add(shortBarbellWeight + totalPlateWeight);
            }
        }
    }
    
    return Array.from(weights).sort((a, b) => a - b);
}

function calculateBarbellWeights(exercise, config) {
    const weights = new Set();
    
    // Déterminer le poids de la barre
    let barWeight = 0;
    if (exercise.equipment.includes('barre_olympique')) {
        if (config.barres?.olympique?.available) barWeight = 20;
        else if (config.barres?.courte?.available) barWeight = 2.5;
    } else if (exercise.equipment.includes('barre_ez')) {
        if (config.barres?.ez?.available) barWeight = 10;
    }
    
    if (barWeight === 0) return [0]; // Pas de barre disponible
    
    weights.add(barWeight); // Barre seule
    
    // Ajouter toutes les combinaisons avec disques
    if (config.disques?.weights) {
        const plateWeights = Object.entries(config.disques.weights)
            .filter(([weight, count]) => count >= 2) // Au moins 2 disques (1 par côté)
            .map(([weight, count]) => ({
                weight: parseFloat(weight),
                maxPairs: Math.floor(count / 2)
            }));
        
        // Générer toutes les combinaisons possibles (par côté)
        for (let totalPlateWeightPerSide = 0; totalPlateWeightPerSide <= 200; totalPlateWeightPerSide += 0.5) {
            if (canMakePlateWeight(totalPlateWeightPerSide, plateWeights)) {
                weights.add(barWeight + (totalPlateWeightPerSide * 2)); // x2 car des deux côtés
            }
        }
    }
    
    return Array.from(weights).sort((a, b) => a - b);
}

function calculateKettlebellWeights(config) {
    if (!config.autres?.kettlebell?.weights) return [0];
    
    return config.autres.kettlebell.weights
        .slice() // Copie pour ne pas modifier l'original
        .sort((a, b) => a - b);
}

// ===== FONCTION HELPER POUR LES COMBINAISONS DE DISQUES =====
function canMakePlateWeight(targetWeight, plateWeights) {
    if (targetWeight === 0) return true;
    
    // Algorithme glouton simple pour vérifier si on peut atteindre le poids
    let remaining = targetWeight;
    const usedPlates = plateWeights.map(p => ({ ...p, used: 0 }));
    
    // Trier par poids décroissant
    usedPlates.sort((a, b) => b.weight - a.weight);
    
    for (const plate of usedPlates) {
        while (remaining >= plate.weight && plate.used < plate.maxPairs) {
            remaining -= plate.weight;
            plate.used++;
        }
        
        if (Math.abs(remaining) < 0.1) return true; // Tolérance pour les arrondis
    }
    
    return Math.abs(remaining) < 0.1;
}

// ===== VALIDATION ET CORRECTION DES POIDS =====

function validateWeight(exercise, weight) {
    const availableWeights = calculateAvailableWeights(exercise);
    
    if (availableWeights.length > 0 && !availableWeights.includes(weight)) {
        const closest = getClosestPossibleWeight(exercise, weight);
        
        if (!isWeightPossible(exercise, closest)) {
            const nearbyOptions = availableWeights
                .filter(w => Math.abs(w - weight) <= 10)
                .slice(0, 3)
                .join(', ');

            showToast(
                `⚠️ ${weight}kg impossible. Suggestion : ${closest}kg${nearbyOptions ? ` (autres : ${nearbyOptions}kg)` : ''}`, 
                'warning'
            );
        }
        
        return closest;
    }
    
    return weight;
}

function getClosestPossibleWeight(exercise, targetWeight) {
    const availableWeights = calculateAvailableWeights(exercise);
    
    if (availableWeights.length === 0) {
        return targetWeight;
    }
    
    // Si le poids exact existe, parfait
    if (availableWeights.some(w => Math.abs(w - targetWeight) < 0.1)) {
        return targetWeight;
    }
    
    // Trouver le plus proche
    return availableWeights.reduce((closest, current) => 
        Math.abs(current - targetWeight) < Math.abs(closest - targetWeight) ? current : closest
    );
}

function isWeightPossible(exercise, weight) {
    const availableWeights = calculateAvailableWeights(exercise);
    return availableWeights.some(w => Math.abs(w - weight) < 0.1);
}

// ===== FILTRAGE DES EXERCICES PAR ÉQUIPEMENT =====

function filterExercisesByEquipment(exercises) {
    const config = currentUser?.equipment_config;
    if (!config) return exercises;
    
    return exercises.filter(exercise => {
        const required = exercise.equipment || [];
        if (required.length === 0) return true; // Bodyweight
        
        // Vérifier si on a AU MOINS UN équipement requis (logique OR)
        return required.some(eq => hasEquipment(eq, config));
    });
}

function hasEquipment(equipmentType, config) {
    switch(equipmentType) {
        case 'poids_du_corps':
            return true;
            
        case 'dumbbells':
            // Haltères fixes OU équivalence barres courtes + disques
            const hasDumbbells = config.dumbbells?.weights?.length > 0;
            const hasEquivalence = config.barres?.courte?.available && 
                                 config.barres?.courte?.count >= 2 && 
                                 config.disques?.weights &&
                                 Object.keys(config.disques.weights).length > 0;
            return hasDumbbells || hasEquivalence;
            
        case 'barre_olympique':
            return config.barres?.olympique?.available || 
                   config.barres?.courte?.available;
                   
        case 'barre_ez':
            return config.barres?.ez?.available;
            
        case 'banc_plat':
            return config.banc?.available;
            
        case 'banc_inclinable':
            return config.banc?.available && config.banc?.inclinable;
            
        case 'banc_declinable':
            return config.banc?.available && config.banc?.declinable;
            
        case 'kettlebell':
            return config.autres?.kettlebell?.available &&
                   config.autres?.kettlebell?.weights?.length > 0;
                   
        case 'disques':
            return config.disques?.available && 
                   Object.keys(config.disques?.weights || {}).length > 0;
                   
        case 'barre_traction':
            return config.autres?.barre_traction?.available;
            
        case 'elastiques':
            return config.elastiques?.available && 
                   config.elastiques?.bands?.length > 0;
                   
        // Équipements non supportés
        case 'poulies':
        case 'machine_convergente':
        case 'machine_pectoraux':
        case 'machine_developpe':
            return false;
            
        default:
            console.warn(`Équipement non géré: ${equipmentType}`);
            return false;
    }
}

// ===== FONCTIONS UTILITAIRES =====

function getExerciseType(exercise) {
    const isTimeBased = TIME_BASED_KEYWORDS.some(keyword => 
        exercise.name_fr.toLowerCase().includes(keyword)
    );
    
    const isBodyweight = exercise.equipment.includes('poids_du_corps');
    
    if (isTimeBased) {
        return 'time_based';
    } else if (isBodyweight) {
        // Vérifier si l'exercice peut être lesté
        const canBeWeighted = exercise.equipment.some(eq => 
            eq.includes('lest') || eq.includes('disque')
        );
        return canBeWeighted ? 'weighted_bodyweight' : 'bodyweight';
    } else {
        return 'weighted';
    }
}

function calculateSuggestedWeight(exercise, availableWeights = null) {
    const weights = availableWeights || calculateAvailableWeights(exercise);
    
    if (weights.length === 0) {
        return 0;
    }
    
    // Exercices au poids du corps : commencer sans charge
    if (exercise.equipment.includes('poids_du_corps')) {
        return 0;
    }
    
    // Pour les autres exercices, prendre un poids au milieu de la gamme
    const middleIndex = Math.floor(weights.length / 2);
    return weights[middleIndex] || 0;
}

function formatWeightDisplay(weight, exercise) {
    const exerciseType = getExerciseType(exercise);
    const userWeight = currentUser?.weight || 75;
    
    if (exerciseType === 'time_based' && weight === 0) {
        return 'Sans charge';
    } else if (exerciseType === 'bodyweight' || exerciseType === 'weighted_bodyweight') {
        if (weight === 0) {
            return `Poids du corps (${userWeight}kg)`;
        } else {
            const totalWeight = userWeight + weight;
            return `${totalWeight}kg (corps ${userWeight}kg + lest ${weight}kg)`;
        }
    } else {
        return `${weight}kg`;
    }
}

// ===== API COMPATIBILITY LAYER =====
// Ces fonctions seront remplacées par les appels API quand le backend sera prêt

async function getAvailableWeightsFromAPI(userId, exerciseType) {
    try {
        const response = await fetch(`/api/users/${userId}/available-weights/${exerciseType}`);
        if (response.ok) {
            const data = await response.json();
            return data.weights || [];
        }
    } catch (error) {
        console.warn('API non disponible, fallback local:', error);
    }
    
    // Fallback vers calcul local
    // Cette partie sera supprimée quand l'API sera stable
    return null; // Signal pour utiliser calculateAvailableWeights
}

async function getEquipmentSetupFromAPI(userId, exerciseType, weight) {
    try {
        const response = await fetch(`/api/users/${userId}/equipment-setup/${exerciseType}/${weight}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.warn('API setup non disponible, fallback local:', error);
    }
    
    // Fallback vers affichage simple
    return null;
}

// ===== EXPORTS =====
export {
    // Fonctions principales
    calculateAvailableWeights,
    validateWeight,
    getExerciseType,
    calculateSuggestedWeight,
    formatWeightDisplay,
    
    // Fonctions utilitaires
    getClosestPossibleWeight,
    isWeightPossible,
    filterExercisesByEquipment,
    
    // API compatibility (seront supprimées plus tard)
    getAvailableWeightsFromAPI,
    getEquipmentSetupFromAPI
};