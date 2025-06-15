// ===== MODULE GRAPHIQUES ET VISUALISATIONS =====
// Ce fichier gère tous les graphiques de progression avec Chart.js

import { currentUser } from './app-state.js';

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

// ===== GRAPHIQUE DE PROGRESSION SUR 30 JOURS =====
async function loadProgressionChart(exerciseId = null) {
    const ctx = document.getElementById('progressionChart');
    if (!ctx) return;

    // Détruire le graphique existant
    if (charts.progression) {
        charts.progression.destroy();
    }

    const params = exerciseId ? `?exercise_id=${exerciseId}` : '';
    try {
        const response = await fetch(`/api/users/${currentUser.id}/progression${params}`);
        
        // Vérifier que la réponse est OK
        if (!response.ok) {
            console.error(`Erreur API: ${response.status} ${response.statusText}`);
            return;
        }
        
        // Vérifier que c'est bien du JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.error("La réponse n'est pas du JSON");
            return;
        }
        
        // Vérifier que la réponse est OK
        if (!response.ok) {
            console.error(`Erreur API muscle-volume: ${response.status}`);
            return;
        }

        // Vérifier le content-type
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.error("La réponse muscle-volume n'est pas du JSON");
            return;
        }

        const data = await response.json();

        // Vérifier que les données sont valides
        if (!data.volumes || Object.keys(data.volumes).length === 0) {
            console.log("Pas de données de volume musculaire");
            // Afficher un graphique vide
            const emptyData = {
                labels: ['Aucune donnée'],
                datasets: [{
                    label: 'Volume par muscle',
                    data: [0],
                    backgroundColor: chartColors.primary,
                    borderWidth: 0
                }]
            };
            
            charts.muscleVolume = new Chart(ctx, {
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
            });
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

        charts.progression = new Chart(ctx, {
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
        });
    } catch (error) {
        console.error('Erreur chargement progression:', error);
    }
}

// ===== GRAPHIQUE VOLUME PAR MUSCLE =====
async function loadMuscleVolumeChart(period = 'week') {
    const ctx = document.getElementById('muscleVolumeChart');
    if (!ctx) return;

    if (charts.muscleVolume) {
        charts.muscleVolume.destroy();
    }

    try {
        const response = await fetch(`/api/users/${currentUser.id}/muscle-volume?period=${period}`);
        
        // Vérifier que la réponse est OK
        if (!response.ok) {
            console.error(`Erreur API muscle-volume: ${response.status}`);
            return;
        }
        
        // Vérifier le content-type
        const respContentType = response.headers.get("content-type");
        if (!respContentType || !respContentType.includes("application/json")) {
            console.error("La réponse muscle-volume n'est pas du JSON");
            return;
        }
        
        const data = await response.json();

        // Vérifier que les données sont valides
        if (!data.volumes || Object.keys(data.volumes).length === 0) {
            console.log("Pas de données de volume musculaire");
            // Afficher un graphique vide
            const emptyData = {
                labels: ['Aucune donnée'],
                datasets: [{
                    label: 'Volume par muscle',
                    data: [0],
                    backgroundColor: chartColors.primary,
                    borderWidth: 0
                }]
            };
            
            charts.muscleVolume = new Chart(ctx, {
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
            });
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

        charts.muscleVolume = new Chart(ctx, {
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
        });
    } catch (error) {
        console.error('Erreur chargement volume muscles:', error);
    }
}

// ===== GRAPHIQUE FATIGUE/PERFORMANCE =====
async function loadFatigueChart() {
    const ctx = document.getElementById('fatigueChart');
    if (!ctx) return;

    if (charts.fatigue) {
        charts.fatigue.destroy();
    }

    try {
        const response = await fetch(`/api/users/${currentUser.id}/fatigue-trends`);
        const data = await response.json();

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

        charts.fatigue = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                ...chartDefaults,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: chartDefaults.scales.x,
                    y: {
                        ...chartDefaults.scales.y,
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Fatigue (1-10)',
                            color: '#9ca3af'
                        }
                    },
                    y1: {
                        ...chartDefaults.scales.y,
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Performance (%)',
                            color: '#9ca3af'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    ...chartDefaults.plugins,
                    title: {
                        display: true,
                        text: 'Tendances Fatigue vs Performance',
                        color: '#f3f4f6',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erreur chargement fatigue:', error);
    }
}

// ===== GRAPHIQUE RECORDS PERSONNELS =====
async function loadPersonalRecordsChart() {
    const ctx = document.getElementById('recordsChart');
    if (!ctx) return;

    if (charts.records) {
        charts.records.destroy();
    }

    try {
        const response = await fetch(`/api/users/${currentUser.id}/personal-records`);
        
        // Vérifier que la réponse est OK
        if (!response.ok) {
            console.error(`Erreur API personal-records: ${response.status}`);
            return;
        }
        
        // Vérifier le content-type
        const recordsContentType = response.headers.get("content-type");
        if (!recordsContentType || !recordsContentType.includes("application/json")) {
            console.error("La réponse personal-records n'est pas du JSON");
            return;
        }
        
        const data = await response.json();

        // Vérifier que les données sont valides
        if (!data.exercises || data.exercises.length === 0) {
            console.log("Pas de records personnels");
            // Afficher un graphique vide avec message
            const emptyData = {
                labels: ['Aucun record'],
                datasets: [{
                    label: 'Records',
                    data: [0],
                    backgroundColor: chartColors.primary,
                    borderWidth: 0
                }]
            };
            
            charts.records = new Chart(ctx, {
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
            });
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

        charts.records = new Chart(ctx, {
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
        });
    } catch (error) {
        console.error('Erreur chargement records:', error);
    }
}

// ===== SÉLECTEURS DE PÉRIODE =====
function initializePeriodSelectors() {
    // Sélecteur pour le graphique de volume
    const volumePeriodSelector = document.getElementById('volumePeriodSelector');
    if (volumePeriodSelector) {
        volumePeriodSelector.addEventListener('change', (e) => {
            loadMuscleVolumeChart(e.target.value);
        });
    }

    // Sélecteur pour le graphique de progression
    const exerciseSelector = document.getElementById('progressionExerciseSelector');
    if (exerciseSelector) {
        exerciseSelector.addEventListener('change', (e) => {
            loadProgressionChart(e.target.value || null);
        });
    }
}

// Charger la liste des exercices pour le sélecteur
async function loadExerciseSelector() {
    const selector = document.getElementById('progressionExerciseSelector'); // ADD THIS LINE
    if (!selector) return; // ADD THIS SAFETY CHECK
    
    const response = await fetch(`/api/exercises`);
    if (!response.ok) return;

    const exercises = await response.json();

    // Vérifier que c'est bien un tableau
    if (!Array.isArray(exercises)) {
        console.error('La réponse exercises n\'est pas un tableau:', exercises);
        return;
    }
        
        // Ajouter les options
    exercises.forEach(exercise => {
        const option = document.createElement('option');
        option.value = exercise.id;
        option.textContent = exercise.name;
        selector.appendChild(option);
    });
}

// ===== CHARGEMENT DE TOUS LES GRAPHIQUES =====
async function loadAllCharts() {
    if (!currentUser) return;

    // Afficher un loader
    const chartsContainer = document.getElementById('chartsContainer');
    if (chartsContainer) {
        chartsContainer.classList.add('loading');
    }

    try {
        await Promise.all([
            loadExerciseSelector(),
            loadProgressionChart(),
            loadMuscleVolumeChart(),
            loadFatigueChart(),
            loadPersonalRecordsChart()
        ]);
    } finally {
        if (chartsContainer) {
            chartsContainer.classList.remove('loading');
        }
    }
}

// ===== EXPORT DES GRAPHIQUES =====
function exportChart(chartId) {
    const chart = charts[chartId];
    if (!chart) return;

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

// ===== EXPORT GLOBAL =====
window.loadAllCharts = loadAllCharts;
window.refreshCharts = refreshCharts;
window.exportChart = exportChart;

export {
    loadAllCharts,
    loadProgressionChart,
    loadMuscleVolumeChart,
    loadFatigueChart,
    loadPersonalRecordsChart,
    refreshCharts,
    exportChart,
    initializePeriodSelectors
};