// ===== CONFIGURATION ET CONSTANTES =====
// Ce fichier contient toutes les constantes de l'application
// Aucune logique métier, juste des valeurs de configuration

// Configuration des exercices
export const EXERCISE_CATEGORIES = {
    BODYWEIGHT_PURE: ['poids_du_corps'],  // Pompes, tractions...
    BODYWEIGHT_WEIGHTED: ['poids_du_corps', 'lest_possible'],  // Peut ajouter du lest
    TIME_BASED: ['gainage', 'planche', 'isometric'],  // En secondes
    WEIGHTED: ['halteres', 'barbell', 'kettlebell', 'poulies', 'machine']  // Avec poids
};

// Détection du type d'exercice basée sur le nom
export const TIME_BASED_KEYWORDS = ['gainage', 'planche', 'plank', 'vacuum', 'isométrique'];

// Configuration du mode développement
export const DEV_USER_ID = 999;

// Timers et intervalles
export const SYNC_INTERVAL = 30000; // 30 secondes
export const REST_TARGET_TIME = 60; // 60 secondes de repos par défaut

// Noms d'équipement en français
export const EQUIPMENT_NAMES = {
    'halteres': 'Haltères',
    'barbell': 'Barres & Disques',
    'elastiques': 'Élastiques',
    'bench': 'Banc',
    'barre_traction': 'Barre de traction',
    'kettlebell': 'Kettlebells'
};

// Icônes SVG pour l'équipement
export const EQUIPMENT_ICONS = {
    'halteres': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/></svg>',
    'barbell': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h8m-4-8v16"/></svg>',
    'elastiques': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
    'bench': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h18m-9-9v18"/></svg>',
    'barre_traction': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3h14m-7 0v18"/></svg>',
    'kettlebell': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>'
};

// Couleurs des groupes musculaires
export const BODY_PART_COLORS = {
    'Pectoraux': '#3b82f6',      // Bleu
    'Bras': '#8b5cf6',         // Violet
    'Deltoïdes': '#ec4899',      // Rose
    'Dos': '#ef4444',            // Rouge
    'Abdominaux': '#f97316',     // Orange
    'Jambes': '#eab308',     // Jaune
    'Dos': '#ef4444',       // Cyan
};

// Mapping des couleurs hexadécimales vers des noms
export const COLOR_NAMES = {
    '#ff6b6b': 'Rouge',
    '#4ecdc4': 'Turquoise',
    '#45b7d1': 'Bleu',
    '#f7dc6f': 'Jaune',
    '#52c41a': 'Vert',
    '#722ed1': 'Violet',
    '#fa8c16': 'Orange',
    '#000000': 'Noir'
};

// Noms des objectifs
export const GOAL_NAMES = {
    'force': '💪 Force',
    'hypertrophie': '🦾 Masse musculaire',
    'endurance': '🏃 Endurance',
    'perte_de_poids': '⚖️ Perte de poids',
    'forme_generale': '❤️ Forme générale',
    'cardio': '🏃 Cardio',
    'flexibility': '🤸 Souplesse'
};

// Poids communs pour les haltères
export const COMMON_DUMBBELL_WEIGHTS = [22.5, 20, 15, 12.5, 10, 8, 6, 5, 4, 2];

// Poids communs pour les disques
export const COMMON_PLATE_WEIGHTS = [40, 25, 15, 10, 5, 2.5, 2, 1.25, 1];

// Poids communs pour les kettlebells
export const COMMON_KETTLEBELL_WEIGHTS = [32, 28, 24, 20, 16, 12, 8, 4];

// ===== FONCTIONS UTILITAIRES DE CONFIGURATION =====

export function getEquipmentName(type) {
    return EQUIPMENT_NAMES[type] || type;
}

export function getEquipmentIcon(type) {
    return EQUIPMENT_ICONS[type] || '';
}

export function getBodyPartColor(bodyPart) {
    return BODY_PART_COLORS[bodyPart] || '#64748b'; // Gris par défaut
}

export function getColorName(hexColor) {
    return COLOR_NAMES[hexColor] || hexColor;
}

export function getGoalName(goal) {
    return GOAL_NAMES[goal] || goal;
}

// Fonctions pour déterminer le type d'exercice
export function isTimeBasedExercise(exerciseName) {
    return TIME_BASED_KEYWORDS.some(keyword => 
        exerciseName.toLowerCase().includes(keyword)
    );
}

export function isBodyweightExercise(equipment) {
    return equipment.includes('poids_du_corps');
}

// Fonction pour obtenir le nom hexadécimal d'une couleur approximative
export function getColorHex(colorName) {
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