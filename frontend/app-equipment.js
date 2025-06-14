// ===== GESTIONNAIRE D'ÉQUIPEMENT =====
// Ce fichier centralise tous les calculs liés à l'équipement et aux poids disponibles
// Il détermine quels poids sont accessibles pour chaque type d'exercice

import { currentUser } from './app-state.js';
import { TIME_BASED_KEYWORDS } from './app-config.js';

// ===== CALCUL DES POIDS DISPONIBLES =====
function calculateAvailableWeights(exercise) {
    if (!currentUser || !currentUser.equipment_config) return [20, 40, 60];
    
    const config = currentUser.equipment_config;
    let weights = new Set();
    
    // Déterminer si c'est un exercice temporel
    const isTimeBased = TIME_BASED_KEYWORDS.some(keyword => 
        exercise.name_fr.toLowerCase().includes(keyword)
    );
    
    // Exercices au poids du corps
    if (exercise.equipment.includes('bodyweight')) {
        // Pour les exercices temporels, pas de poids
        if (isTimeBased) {
            weights.add(0);
            return [0];
        }
        
        // Poids du corps de base
        const bodyWeight = currentUser.weight || 75;
        
        // Pour bodyweight, 0 représente "sans charge additionnelle"
        weights.add(0);
        
        // Si l'utilisateur a des lests, ajouter les options avec charge additionnelle
        if (config.autres?.lest_corps?.weights?.length > 0) {
            config.autres.lest_corps.weights.forEach(lestWeight => {
                weights.add(bodyWeight + lestWeight);
            });
        }
        
        return Array.from(weights).sort((a, b) => a - b);
    }
    
    // Barres + disques
    if (exercise.equipment.some(eq => eq.includes('barbell'))) {
        let barWeight = 0;
        
        if (exercise.equipment.includes('barbell_standard')) {
            if (config.barres?.olympique?.available) barWeight = 20;
            else if (config.barres?.courte?.available) barWeight = 2.5;
        } else if (exercise.equipment.includes('barbell_ez')) {
            if (config.barres?.ez?.available) barWeight = 10;
        }
        
        if (barWeight > 0) {
            weights.add(barWeight);
            
            // Ajouter les combinaisons avec disques
            if (config.disques?.weights) {
                const disqueWeights = Object.entries(config.disques.weights)
                    .filter(([w, count]) => count > 0)
                    .map(([w, count]) => ({weight: parseFloat(w), count: parseInt(count)}));
                
                // Générer quelques poids communs
                for (let totalAdded = 0; totalAdded <= 100; totalAdded += 2.5) {
                    weights.add(barWeight + totalAdded * 2); // *2 car on met des disques des deux côtés
                }
            }
        }
    }
    
    // Haltères
    if (exercise.equipment.includes('dumbbells') && config.dumbbells?.weights) {
        config.dumbbells.weights.forEach(w => {
            weights.add(w * 2); // Paire d'haltères
        });
    }
    
    // Kettlebells
    if (exercise.equipment.includes('kettlebell') && config.autres?.kettlebell?.weights) {
        config.autres.kettlebell.weights.forEach(w => weights.add(w));
    }
    
    // Filtrer et trier
    return Array.from(weights)
        .filter(w => w <= 300 && w >= 0)
        .sort((a, b) => a - b);
}

// ===== AJUSTEMENT AU POIDS DISPONIBLE LE PLUS PROCHE =====
function adjustWeightToNext(exercise, currentWeight, direction) {
    const availableWeights = calculateAvailableWeights(exercise);
    
    if (availableWeights.length === 0) {
        // Comportement par défaut si pas de poids configurés
        const newValue = currentWeight + (direction * 2.5);
        return newValue >= 0 ? newValue : 0;
    }
    
    // Trouver le poids disponible le plus proche
    let targetIndex = 0;
    for (let i = 0; i < availableWeights.length; i++) {
        if (availableWeights[i] >= currentWeight) {
            targetIndex = i;
            break;
        }
        targetIndex = i;
    }
    
    // Ajuster selon la direction
    if (direction > 0 && targetIndex < availableWeights.length - 1) {
        targetIndex++;
    } else if (direction < 0 && targetIndex > 0) {
        targetIndex--;
    }
    
    return availableWeights[targetIndex];
}

// ===== VALIDATION DU POIDS =====
function validateWeight(exercise, weight) {
    const availableWeights = calculateAvailableWeights(exercise);
    
    if (availableWeights.length > 0 && !availableWeights.includes(weight)) {
        // Trouver le poids disponible le plus proche
        const closest = availableWeights.reduce((prev, curr) => 
            Math.abs(curr - weight) < Math.abs(prev - weight) ? curr : prev
        );
        return closest;
    }
    
    return weight;
}

// ===== FILTRAGE DES EXERCICES PAR ÉQUIPEMENT =====
function filterExercisesByEquipment(allExercises) {
    if (!currentUser?.equipment_config) return [];
    
    const config = currentUser.equipment_config;
    
    return allExercises.filter(exercise => {
        // Vérifier chaque équipement requis
        return exercise.equipment.every(eq => {
            switch(eq) {
                case 'bodyweight':
                    return true;
                case 'dumbbells':
                    return config.dumbbells?.available && 
                        config.dumbbells?.weights?.length > 0;
                case 'barbell_standard':
                    return config.barres?.olympique?.available || 
                        config.barres?.courte?.available;
                case 'barbell_ez':
                    return config.barres?.ez?.available;
                case 'bench_plat':
                    return config.banc?.available;
                case 'bench_inclinable':
                    return config.banc?.available && config.banc?.inclinable_haut;
                case 'bench_declinable':
                    return config.banc?.available && config.banc?.inclinable_bas;
                case 'cables':
                    return false; // Pas dans la config actuelle
                case 'elastiques':
                    return config.elastiques?.available && 
                        config.elastiques?.bands?.length > 0;
                case 'barre_traction':
                    return config.autres?.barre_traction?.available;
                case 'kettlebell':
                    return config.autres?.kettlebell?.available &&
                        config.autres?.kettlebell?.weights?.length > 0;
                case 'disques':
                    return config.disques?.available && 
                        Object.keys(config.disques?.weights || {}).length > 0;
                case 'machine_convergente':
                case 'machine_pectoraux':
                case 'machine_developpe':
                    return false; // Machines non gérées actuellement
                default:
                    console.warn(`Équipement non géré: ${eq}`);
                    return false;
            }
        });
    });
}

// ===== DÉTERMINATION DU TYPE D'EXERCICE =====
function getExerciseType(exercise) {
    const isTimeBased = TIME_BASED_KEYWORDS.some(keyword => 
        exercise.name_fr.toLowerCase().includes(keyword)
    );
    
    const isBodyweight = exercise.equipment.includes('bodyweight');
    
    if (isTimeBased) {
        return 'time_based';
    } else if (isBodyweight) {
        return exercise.equipment.some(eq => eq.includes('lest')) ? 
            'bodyweight_weighted' : 'bodyweight_pure';
    } else {
        return 'weighted';
    }
}

// ===== CALCUL DU POIDS SUGGÉRÉ =====
function calculateSuggestedWeight(exercise, lastSet = null) {
    const availableWeights = calculateAvailableWeights(exercise);
    
    if (availableWeights.length === 0) {
        return 20; // Valeur par défaut
    }
    
    // Si on a une série précédente
    if (lastSet) {
        let adjustedWeight;
        
        // Ajustement basé sur la fatigue et les performances
        if (lastSet.fatigue_level >= 8) {
            adjustedWeight = Math.max(0, lastSet.weight * 0.9);
        } else if (lastSet.actual_reps > lastSet.target_reps + 2) {
            adjustedWeight = lastSet.weight + 2.5;
        } else {
            adjustedWeight = lastSet.weight;
        }
        
        // Arrondir au poids disponible le plus proche
        return availableWeights.reduce((prev, curr) => 
            Math.abs(curr - adjustedWeight) < Math.abs(prev - adjustedWeight) ? curr : prev
        );
    }
    
    // Sinon, prendre un poids au milieu de la gamme
    const exerciseType = getExerciseType(exercise);
    
    if (exerciseType === 'bodyweight_pure' || exerciseType === 'bodyweight_weighted') {
        // Pour bodyweight, commencer sans charge additionnelle
        return availableWeights.includes(0) ? 0 : availableWeights[0];
    } else {
        // Pour les exercices avec poids, prendre le milieu
        return availableWeights[Math.floor(availableWeights.length / 2)];
    }
}

// ===== FORMATAGE DE L'AFFICHAGE DU POIDS =====
function formatWeightDisplay(weight, exercise) {
    const exerciseType = getExerciseType(exercise);
    const userWeight = currentUser?.weight || 75;
    
    if (exerciseType === 'time_based' && weight === 0) {
        return 'Sans charge';
    } else if (exerciseType === 'bodyweight_pure' && weight === 0) {
        return `Poids du corps (${userWeight}kg)`;
    } else if (exerciseType === 'bodyweight_weighted' && weight > 0) {
        const lestWeight = weight - userWeight;
        if (lestWeight > 0) {
            return `${weight}kg (corps + ${lestWeight}kg)`;
        } else {
            return `${weight}kg`;
        }
    } else {
        return `${weight}kg`;
    }
}

// Export pour les autres modules
export {
    calculateAvailableWeights,
    adjustWeightToNext,
    validateWeight,
    filterExercisesByEquipment,
    getExerciseType,
    calculateSuggestedWeight,
    formatWeightDisplay
};