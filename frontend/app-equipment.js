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
        // Pour les exercices temporels, seulement l'option sans poids
        if (isTimeBased) {
            return [0];
        }
        
        // Poids du corps de base
        const bodyWeight = currentUser.weight || 75;
        
        // Commencer avec l'option sans charge (0 = poids du corps seul)
        weights.add(0);
        
        // Si l'utilisateur a des lests, ajouter les options avec charge additionnelle
        if (config.autres?.lest_corps?.weights?.length > 0) {
            // Pour chaque lest disponible, ajouter l'option
            config.autres.lest_corps.weights.forEach(lestWeight => {
                weights.add(lestWeight); // Stocker juste le poids du lest
            });
        }
        
        // Retourner les poids triés
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

            // Calculer uniquement les poids VRAIMENT possibles avec les disques disponibles
            if (config.disques?.weights && Object.keys(config.disques.weights).length > 0) {
                const possibleWeights = calculateAllPossibleBarWeights(barWeight, config.disques.weights);
                
                // Si on a plus de 3 options, exclure la barre seule pour éviter les sauts bizarres
                if (possibleWeights.length > 3) {
                    possibleWeights.forEach(w => {
                        if (w !== barWeight || possibleWeights.length === 1) {
                            weights.add(w);
                        }
                    });
                } else {
                    possibleWeights.forEach(w => weights.add(w));
                }
            } else {
                // Pas de disques, seulement la barre
                weights.add(barWeight);
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

// ===== VALIDATION DU POIDS =====
function validateWeight(exercise, weight) {
    const availableWeights = calculateAvailableWeights(exercise);
    
    if (availableWeights.length > 0 && !availableWeights.includes(weight)) {
        // Trouver le poids disponible le plus proche
        const closest = getClosestPossibleWeight(exercise, weight);
        
        // Vérifier si c'est vraiment réalisable
        if (!isWeightPossible(exercise, closest)) {
            // Message plus informatif
            const availableWeights = calculateAvailableWeights(exercise);
            const nearbyOptions = availableWeights
                .filter(w => Math.abs(w - weight) <= 10)
                .slice(0, 3)
                .join(', ');

            showToast(
                `⚠️ ${weight}kg impossible avec vos disques. Suggestion : ${closest}kg${nearbyOptions ? ` (autres options : ${nearbyOptions}kg)` : ''}`, 
                'warning'
            );
        }
        
        return closest;
    }
    
    return weight;
}

// ===== OBTENIR LE POIDS POSSIBLE LE PLUS PROCHE =====
export function getClosestPossibleWeight(exercise, targetWeight) {
    const availableWeights = calculateAvailableWeights(exercise);
    
    if (availableWeights.length === 0) {
        return targetWeight;
    }
    
    // Si le poids exact existe, parfait
    if (availableWeights.includes(targetWeight)) {
        return targetWeight;
    }
    
    // Trouver les options au-dessus et en-dessous
    let bestLower = null;
    let bestHigher = null;
    
    for (const weight of availableWeights) {
        if (weight < targetWeight && (bestLower === null || weight > bestLower)) {
            bestLower = weight;
        } else if (weight > targetWeight && (bestHigher === null || weight < bestHigher)) {
            bestHigher = weight;
        }
    }
    
    // Logique de sélection intelligente
    if (bestLower !== null && bestHigher !== null) {
        const lowerDiff = targetWeight - bestLower;
        const higherDiff = bestHigher - targetWeight;
        
        // Préférer le poids inférieur sauf si :
        // - La différence est > 5kg ET le poids supérieur est plus proche
        // - Le poids inférieur est < 50% du poids cible
        if (bestLower < targetWeight * 0.5) {
            return bestHigher;
        }
        
        return (lowerDiff <= 5 || lowerDiff <= higherDiff) ? bestLower : bestHigher;
    }
    
    // Si on n'a qu'une option
    return bestLower || bestHigher || availableWeights[0];
}

// ===== VÉRIFIER SI UN POIDS EST RÉALISABLE =====
export function isWeightPossible(exercise, weight, config) {
    const equipmentConfig = config || currentUser?.equipment_config;
    if (!equipmentConfig) return true; // Pas de validation sans config
    
    // Pour barres + disques
    if (exercise.equipment.some(eq => eq.includes('barbell'))) {
        // Vérifier qu'on a une barre
        const hasBarbell = Object.values(equipmentConfig.barres || {})
            .some(b => b.available && b.count > 0);
        
        if (!hasBarbell) return false;
        
        // Calculer si on peut atteindre ce poids avec les disques disponibles
        const barWeight = getBarWeight(exercise, equipmentConfig);
        const targetPlateWeight = weight - barWeight;
        
        if (targetPlateWeight < 0) return false; // Poids demandé < poids de la barre
        if (targetPlateWeight === 0) return true; // Juste la barre
        
        // Vérifier si on peut faire cette combinaison avec les disques
        return canMakePlateWeightOptimal(targetPlateWeight / 2, equipmentConfig.disques?.weights || {});
    }
    
    // Pour haltères et kettlebells, vérifier directement
    const availableWeights = calculateAvailableWeights(exercise);
    return availableWeights.includes(weight);
}

// ===== FONCTIONS HELPER PRIVÉES =====
function getBarWeight(exercise, config) {
    if (exercise.equipment.includes('barbell_standard')) {
        if (config.barres?.olympique?.available) return 20;
        if (config.barres?.courte?.available) return 2.5;
    } else if (exercise.equipment.includes('barbell_ez')) {
        if (config.barres?.ez?.available) return 10;
    }
    return 0;
}

// ===== CALCUL INTELLIGENT DES POIDS POSSIBLES =====
function calculateAllPossibleBarWeights(barWeight, availablePlates) {
    // Si pas de disques, retourner seulement la barre
    if (!availablePlates || Object.keys(availablePlates).length === 0) {
        return [barWeight];
    }
    
    // Créer un inventaire des disques disponibles par côté
    const platesInventory = [];
    Object.entries(availablePlates).forEach(([weight, count]) => {
        const w = parseFloat(weight);
        const c = parseInt(count);
        if (c > 0) {
            // Nombre de disques disponibles par côté
            const perSide = Math.floor(c / 2);
            if (perSide > 0) {
                platesInventory.push({ weight: w, count: perSide });
            }
        }
    });
    
    if (platesInventory.length === 0) {
        return [barWeight];
    }
    
    // Utiliser un Set pour éviter les doublons
    const possibleWeightsPerSide = new Set([0]); // Commencer avec 0 (juste la barre)
    
    // Pour chaque type de disque
    for (const plate of platesInventory) {
        const currentWeights = Array.from(possibleWeightsPerSide);
        
        // Pour chaque poids existant
        for (const baseWeight of currentWeights) {
            // Essayer d'ajouter 1, 2, 3... disques de ce type
            for (let i = 1; i <= plate.count; i++) {
                const newWeight = baseWeight + (plate.weight * i);
                
                // Limite raisonnable
                if (newWeight <= 200) {
                    possibleWeightsPerSide.add(newWeight);
                }
            }
        }
    }
    
    // Convertir en poids total et trier
    const allWeights = Array.from(possibleWeightsPerSide)
        .map(perSide => barWeight + (perSide * 2))
        .sort((a, b) => a - b);
    
    // Filtrer la barre seule si on a beaucoup d'autres options
    if (allWeights.length > 10 && barWeight >= 10) {
        return allWeights.filter(w => w !== barWeight);
    }
    
    return allWeights;
}

// ===== VÉRIFICATION OPTIMALE SI UN POIDS EST POSSIBLE =====
function canMakePlateWeightOptimal(targetPerSide, availablePlates) {
    // Si le poids cible est 0, c'est toujours possible
    if (targetPerSide === 0) return true;
    
    // Créer liste des disques utilisables (par paires)
    const usablePlates = [];
    Object.entries(availablePlates).forEach(([weight, count]) => {
        const w = parseFloat(weight);
        const c = parseInt(count);
        const pairs = Math.floor(c / 2);
        for (let i = 0; i < pairs; i++) {
            usablePlates.push(w);
        }
    });
    
    if (usablePlates.length === 0) return false;
    
    // Programmation dynamique : peut-on atteindre exactement targetPerSide ?
    const dp = new Array(Math.floor(targetPerSide) + 1).fill(false);
    dp[0] = true;
    
    for (const plate of usablePlates) {
        // Parcourir en sens inverse pour ne pas réutiliser le même disque
        for (let weight = targetPerSide; weight >= plate; weight--) {
            if (dp[Math.floor(weight - plate)]) {
                dp[Math.floor(weight)] = true;
            }
        }
    }
    
    // Vérifier avec tolérance pour les arrondis
    return dp[Math.floor(targetPerSide)] || 
           (targetPerSide % 1 !== 0 && dp[Math.floor(targetPerSide + 0.5)]);
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
    
    // Exercices au poids du corps
    if (exercise.equipment.includes('bodyweight')) {
        // Pour les exercices temporels, pas de poids
        if (getExerciseType(exercise) === 'time_based') {
            return 0;
        }
        
        // Pour les exercices bodyweight, commencer sans charge additionnelle
        return 0;
    }

// Si on arrive ici, prendre un poids au milieu de la gamme disponible
return availableWeights[Math.floor(availableWeights.length / 2)] || 20;
}

// ===== FORMATAGE DE L'AFFICHAGE DU POIDS =====
function formatWeightDisplay(weight, exercise) {
    const exerciseType = getExerciseType(exercise);
    const userWeight = currentUser?.weight || 75;
    
    if (exerciseType === 'time_based' && weight === 0) {
        return 'Sans charge';
    } else if (exerciseType === 'bodyweight_pure' || exerciseType === 'bodyweight_weighted') {
        if (weight === 0) {
            return `Poids du corps (${userWeight}kg)`;
        } else {
            // Pour bodyweight, weight représente le lest ajouté
            const totalWeight = userWeight + weight;
            return `${totalWeight}kg (corps ${userWeight}kg + lest ${weight}kg)`;
        }
    } else {
        return `${weight}kg`;
    }
}

// Export pour les autres modules
export {
    calculateAvailableWeights,
    validateWeight,
    filterExercisesByEquipment,
    getExerciseType,
    calculateSuggestedWeight,
    formatWeightDisplay
};