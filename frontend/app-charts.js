// ===== MODULE GRAPHIQUES ET VISUALISATIONS =====
// Ce fichier gère tous les graphiques de progression avec Chart.js

import { currentUser } from './app-state.js';

// Vérifier que Chart.js est chargé
if (typeof Chart === 'undefined') {
    console.error('Chart.js n\'est pas chargé !');
}

// Configuration des graphiques
const chartColors = {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gray: '#6b7280'
};

const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                color: '#e5e7eb',
                font: {
                    family: "'Inter', sans-serif"
                }
            }
        },
        tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#f3f4f6',
            bodyColor: '#e5e7eb',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12
        }
    },
    scales: {
        x: {
            grid: {
                color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
                color: '#9ca3af'
            }
        },
        y: {
            grid: {
                color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
                color: '#9ca3af'
            }
        }
    }
};

// Stockage des instances de graphiques
let charts = {};

// État pour gérer l'initialisation
let chartsInitialized = false;
let isLoadingCharts = false;

// Fonction pour détruire TOUS les graphiques Chart.js
function destroyAllCharts() {
    // Détruire nos références
    Object.keys(charts).forEach(key => {
        if (charts[key]) {
            try {
                charts[key].destroy();
            } catch (e) {
                console.warn(`Erreur destruction graphique ${key}:`, e);
            }
            charts[key] = null;
        }
    });
    charts = {};
    
    // Nettoyer tous les canvas pour forcer Chart.js à libérer ses références
    const canvasIds = ['progressionChart', 'muscleVolumeChart', 'fatigueChart', 'recordsChart'];
    canvasIds.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                context.clearRect(0, 0, canvas.width, canvas.height);
            }
            // Forcer la réinitialisation du canvas
            canvas.width = canvas.width;
        }
    });
    
    // Forcer Chart.js à libérer toutes ses instances
    if (window.Chart && Chart.instances) {
        Object.keys(Chart.instances).forEach(key => {
            try {
                Chart.instances[key].destroy();
            } catch (e) {
                // Ignorer les erreurs
            }
        });
    }
}

// Fonction utilitaire pour créer un graphique en toute sécurité
async function safeCreateChart(canvasId, config, chartKey) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`Canvas ${canvasId} non trouvé`);
        return null;
    }
    
    // S'assurer que l'ancien graphique est détruit
    if (charts[chartKey]) {
        try {
            charts[chartKey].destroy();
            charts[chartKey] = null;
        } catch (e) {
            console.warn(`Erreur destruction ${chartKey}:`, e);
        }
    }
    
    // Attendre un cycle de rendu
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    try {
        // Créer le nouveau graphique
        charts[chartKey] = new Chart(ctx, config);
        return charts[chartKey];
    } catch (error) {
        console.error(`Erreur création graphique ${chartKey}:`, error);
        return null;
    }
}

// ===== GRAPHIQUE DE PROGRESSION SUR 30 JOURS =====
async function loadProgressionChart(exerciseId = null) {
    const params = exerciseId ? `?exercise_id=${exerciseId}` : '';

    try {
        const response = await fetch(`/api/users/${currentUser.id}/progression${params}`);
        
        if (!response.ok) {
            console.error(`Erreur API progression: ${response.status}`);
            return;
        }
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.error("La réponse progression n'est pas du JSON");
            return;
        }
        
        const data = await response.json();

        if (!data.dates || data.dates.length === 0) {
            console.log("Pas de données de progression");
            const emptyData = {
                labels: ['Aucune donnée'],
                datasets: [{
                    label: 'Progression',
                    data: [0],
                    borderColor: chartColors.primary,
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            };
            
            await safeCreateChart('progressionChart', {
                type: 'line',
                data: emptyData,
                options: {
                    ...chartDefaults,
                    plugins: {
                        ...chartDefaults.plugins,
                        title: {
                            display: true,
                            text: 'Aucune donnée disponible',
                            color: '#f3f4f6',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }, 'progression');
            return;
        }

        const chartData = {
            labels: data.dates.map(d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })),
            datasets: [{
                label: '1RM estimé (kg)',
                data: data.weights,
                borderColor: chartColors.primary,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };

        await safeCreateChart('progressionChart', {
            type: 'line',
            data: chartData,
            options: {
                ...chartDefaults,
                plugins: {
                    ...chartDefaults.plugins,
                    title: {
                        display: true,
                        text: 'Progression sur 30 jours',
                        color: '#f3f4f6',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                }
            }
        }, 'progression');
    } catch (error) {
        console.error('Erreur chargement progression:', error);
    }
}

// ===== GRAPHIQUE VOLUME PAR MUSCLE =====
async function loadMuscleVolumeChart(period = 'week') {
    try {
        const response = await fetch(`/api/users/${currentUser.id}/muscle-volume?period=${period}`);
        
        if (!response.ok) {
            console.error(`Erreur API muscle-volume: ${response.status}`);
            return;
        }
        
        const respContentType = response.headers.get("content-type");
        if (!respContentType || !respContentType.includes("application/json")) {
            console.error("La réponse muscle-volume n'est pas du JSON");
            return;
        }
        
        const data = await response.json();

        if (!data.volumes || Object.keys(data.volumes).length === 0) {
            console.log("Pas de données de volume musculaire");
            const emptyData = {
                labels: ['Aucune donnée'],
                datasets: [{
                    label: 'Volume par muscle',
                    data: [0],
                    backgroundColor: chartColors.primary,
                    borderWidth: 0
                }]
            };
            
            await safeCreateChart('muscleVolumeChart', {
                type: 'bar',
                data: emptyData,
                options: {
                    ...chartDefaults,
                    plugins: {
                        ...chartDefaults.plugins,
                        title: {
                            display: true,
                            text: 'Aucune donnée disponible',
                            color: '#f3f4f6',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }, 'muscleVolume');
            return;
        }

        const chartData = {
            labels: Object.keys(data.percentages),
            datasets: [{
                label: 'Volume par muscle (%)',
                data: Object.values(data.percentages),
                backgroundColor: chartColors.primary,
                borderColor: chartColors.primary,
                borderWidth: 1
            }]
        };

        await safeCreateChart('muscleVolumeChart', {
            type: 'bar',
            data: chartData,
            options: {
                ...chartDefaults,
                indexAxis: 'y',
                plugins: {
                    ...chartDefaults.plugins,
                    title: {
                        display: true,
                        text: `Répartition du volume (${period === 'week' ? 'semaine' : 'mois'})`,
                        color: '#f3f4f6',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    x: {
                        ...chartDefaults.scales.x,
                        max: 100
                    }
                }
            }
        }, 'muscleVolume');
    } catch (error) {
        console.error('Erreur chargement volume muscles:', error);
    }
}

// ===== GRAPHIQUE FATIGUE/PERFORMANCE =====
async function loadFatigueChart() {
    try {
        const response = await fetch(`/api/users/${currentUser.id}/fatigue-trends`);
        
        if (!response.ok) {
            console.error(`Erreur API fatigue-trends: ${response.status}`);
            return;
        }
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.error("La réponse fatigue-trends n'est pas du JSON");
            return;
        }
        
        const data = await response.json();

        if (!data.fatigue || data.fatigue.length === 0 || !data.performance || data.performance.length === 0) {
            console.log("Pas de données de fatigue/performance");
            const emptyData = {
                labels: ['Aucune donnée'],
                datasets: [
                    {
                        label: 'Fatigue moyenne',
                        data: [0],
                        borderColor: chartColors.danger,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Performance relative (%)',
                        data: [0],
                        borderColor: chartColors.success,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    }
                ]
            };
            
            await safeCreateChart('fatigueChart', {
                type: 'line',
                data: emptyData,
                options: {
                    ...chartDefaults,
                    plugins: {
                        ...chartDefaults.plugins,
                        title: {
                            display: true,
                            text: 'Aucune donnée disponible',
                            color: '#f3f4f6',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }, 'fatigue');
            return;
        }

        const chartData = {
            labels: data.dates.map(d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })),
            datasets: [
                {
                    label: 'Fatigue moyenne',
                    data: data.fatigue,
                    borderColor: chartColors.danger,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4
                },
                {
                    label: 'Performance relative (%)',
                    data: data.performance,
                    borderColor: chartColors.success,
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4
                }
            ]
        };

        await safeCreateChart('fatigueChart', {
            type: 'line',
            data: chartData,
            options: {
                ...chartDefaults,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    ...chartDefaults.scales,
                    y: {
                        ...chartDefaults.scales.y,
                        type: 'linear',
                        display: true,
                        position: 'left',
                        min: 0,
                        max: 10,
                        title: {
                            display: true,
                            text: 'Fatigue (0-10)',
                            color: '#9ca3af'
                        }
                    },
                    y1: {
                        ...chartDefaults.scales.y,
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        max: 150,
                        grid: {
                            drawOnChartArea: false,
                        },
                        title: {
                            display: true,
                            text: 'Performance (%)',
                            color: '#9ca3af'
                        }
                    }
                }
            }
        }, 'fatigue');
    } catch (error) {
        console.error('Erreur chargement fatigue:', error);
    }
}

// ===== GRAPHIQUE RECORDS PERSONNELS =====
async function loadPersonalRecordsChart() {
    try {
        const response = await fetch(`/api/users/${currentUser.id}/personal-records`);
        
        if (!response.ok) {
            console.error(`Erreur API personal-records: ${response.status}`);
            return;
        }
        
        const recordsContentType = response.headers.get("content-type");
        if (!recordsContentType || !recordsContentType.includes("application/json")) {
            console.error("La réponse personal-records n'est pas du JSON");
            return;
        }
        
        const data = await response.json();

        if (!data.exercises || data.exercises.length === 0) {
            console.log("Pas de records personnels");
            const emptyData = {
                labels: ['Aucun record'],
                datasets: [{
                    label: 'Records',
                    data: [0],
                    backgroundColor: chartColors.primary,
                    borderWidth: 0
                }]
            };
            
            await safeCreateChart('recordsChart', {
                type: 'bar',
                data: emptyData,
                options: {
                    ...chartDefaults,
                    indexAxis: 'y',
                    plugins: {
                        ...chartDefaults.plugins,
                        title: {
                            display: true,
                            text: 'Commencez à vous entraîner pour voir vos records !',
                            color: '#f3f4f6',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }, 'records');
            return;
        }

        const chartData = {
            labels: data.exercises,
            datasets: [
                {
                    label: 'Record actuel (kg)',
                    data: data.current_records,
                    backgroundColor: chartColors.primary,
                    borderWidth: 0
                },
                {
                    label: 'Objectif (kg)',
                    data: data.targets,
                    backgroundColor: 'rgba(59, 130, 246, 0.3)',
                    borderWidth: 0
                }
            ]
        };

        await safeCreateChart('recordsChart', {
            type: 'bar',
            data: chartData,
            options: {
                ...chartDefaults,
                indexAxis: 'y',
                plugins: {
                    ...chartDefaults.plugins,
                    title: {
                        display: true,
                        text: 'Records personnels par exercice',
                        color: '#f3f4f6',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                }
            }
        }, 'records');
    } catch (error) {
        console.error('Erreur chargement records:', error);
    }
}

// ===== SÉLECTEURS DE PÉRIODE =====
let eventListenersInitialized = false;
const eventListeners = {
    volumePeriod: null,
    progressionExercise: null
};

function initializePeriodSelectors() {
    if (eventListenersInitialized) {
        return;
    }
    
    const volumePeriodSelector = document.getElementById('volumePeriodSelector');
    if (volumePeriodSelector) {
        if (eventListeners.volumePeriod) {
            volumePeriodSelector.removeEventListener('change', eventListeners.volumePeriod);
        }
        
        eventListeners.volumePeriod = async (e) => {
            if (!isLoadingCharts) {
                await loadMuscleVolumeChart(e.target.value);
            }
        };
        
        volumePeriodSelector.addEventListener('change', eventListeners.volumePeriod);
    }

    const exerciseSelector = document.getElementById('progressionExerciseSelector');
    if (exerciseSelector) {
        if (eventListeners.progressionExercise) {
            exerciseSelector.removeEventListener('change', eventListeners.progressionExercise);
        }
        
        eventListeners.progressionExercise = async (e) => {
            if (!isLoadingCharts) {
                await loadProgressionChart(e.target.value || null);
            }
        };
        
        exerciseSelector.addEventListener('change', eventListeners.progressionExercise);
    }
    
    eventListenersInitialized = true;
}

function resetPeriodSelectors() {
    eventListenersInitialized = false;
    
    const volumePeriodSelector = document.getElementById('volumePeriodSelector');
    if (volumePeriodSelector && eventListeners.volumePeriod) {
        volumePeriodSelector.removeEventListener('change', eventListeners.volumePeriod);
    }
    
    const exerciseSelector = document.getElementById('progressionExerciseSelector');
    if (exerciseSelector && eventListeners.progressionExercise) {
        exerciseSelector.removeEventListener('change', eventListeners.progressionExercise);
    }
    
    eventListeners.volumePeriod = null;
    eventListeners.progressionExercise = null;
}

// Charger la liste des exercices pour le sélecteur
async function loadExerciseSelector() {
    const selector = document.getElementById('progressionExerciseSelector');
    if (!selector) return;
    
    try {
        const response = await fetch(`/api/exercises`);
        if (!response.ok) {
            console.error(`Erreur API exercises: ${response.status}`);
            return;
        }

        const exercises = await response.json();
        if (!Array.isArray(exercises)) {
            console.error('La réponse exercises n\'est pas un tableau:', exercises);
            return;
        }

        selector.innerHTML = '<option value="">Tous les exercices</option>';
        exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.id;
            option.textContent = exercise.name;
            selector.appendChild(option);
        });
    } catch (error) {
        console.error('Erreur chargement exercices:', error);
    }
}

// ===== CHARGEMENT DE TOUS LES GRAPHIQUES =====
async function loadAllCharts() {
    if (!currentUser || isLoadingCharts) return;
    
    isLoadingCharts = true;
    const chartsContainer = document.getElementById('chartsContainer');
    
    if (chartsContainer) {
        chartsContainer.classList.add('loading');
    }

    try {
        // Détruire TOUS les graphiques existants
        destroyAllCharts();
        
        // Attendre que le DOM soit prêt
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // Charger les graphiques séquentiellement
        await loadExerciseSelector();
        await loadProgressionChart();
        await loadMuscleVolumeChart();
        await loadFatigueChart();
        await loadPersonalRecordsChart();
        
        chartsInitialized = true;
    } catch (error) {
        console.error('Erreur lors du chargement des graphiques:', error);
    } finally {
        if (chartsContainer) {
            chartsContainer.classList.remove('loading');
        }
        isLoadingCharts = false;
    }
}

// ===== EXPORT DES GRAPHIQUES =====
function exportChart(chartId) {
    const chartMapping = {
        'progression': 'progression',
        'muscleVolume': 'muscleVolume',
        'fatigue': 'fatigue',
        'records': 'records'
    };
    
    const chartKey = chartMapping[chartId];
    const chart = charts[chartKey];
    
    if (!chart) {
        console.error(`Graphique ${chartId} non trouvé`);
        return;
    }

    const url = chart.toBase64Image();
    const link = document.createElement('a');
    link.download = `gym-stats-${chartId}-${new Date().toISOString().split('T')[0]}.png`;
    link.href = url;
    link.click();
}

// ===== RAFRAÎCHISSEMENT DES GRAPHIQUES =====
function refreshCharts() {
    loadAllCharts();
}

// ===== NETTOYAGE DES GRAPHIQUES =====
function cleanupCharts() {
    destroyAllCharts();
    chartsInitialized = false;
}

// ===== EXPORT GLOBAL =====
window.loadAllCharts = loadAllCharts;
window.refreshCharts = refreshCharts;
window.exportChart = exportChart;
window.cleanupCharts = cleanupCharts;
window.resetPeriodSelectors = resetPeriodSelectors;

export {
    loadAllCharts,
    loadProgressionChart,
    loadMuscleVolumeChart,
    loadFatigueChart,
    loadPersonalRecordsChart,
    refreshCharts,
    exportChart,
    initializePeriodSelectors,
    resetPeriodSelectors,
    cleanupCharts
};