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

// Stockage des instances de graphiques avec protection
let charts = {
    progression: null,
    muscleVolume: null,
    fatigue: null,
    records: null
};

// Fonction utilitaire pour détruire un graphique en toute sécurité
function safeDestroyChart(chartName) {
    if (charts[chartName]) {
        try {
            charts[chartName].destroy();
            charts[chartName] = null;
        } catch (e) {
            console.warn(`Erreur lors de la destruction du graphique ${chartName}:`, e);
            charts[chartName] = null;
        }
    }
}

// ===== GRAPHIQUE DE PROGRESSION SUR 30 JOURS =====
async function loadProgressionChart(exerciseId = null) {
    const ctx = document.getElementById('progressionChart');
    if (!ctx) return;

    // Détruire le graphique existant de manière sécurisée
    safeDestroyChart('progression');
    
    // Petite pause pour s'assurer que le canvas est libéré
    await new Promise(resolve => setTimeout(resolve, 50));

    const params = exerciseId ? `?exercise_id=${exerciseId}` : '';
    try {
        const response = await fetch(`/api/users/${currentUser.id}/progression${params}`);
        
        // Vérifier que la réponse est OK
        if (!response.ok) {
            console.error(`Erreur API progression: ${response.status} ${response.statusText}`);
            return;
        }
        
        // Vérifier que c'est bien du JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.error("La réponse progression n'est pas du JSON");
            return;
        }
        
        const data = await response.json();

        // Vérifier que les données sont valides
        if (!data.weights || data.weights.length === 0) {
            console.log("Pas de données de progression");
            // Afficher un graphique vide
            const emptyData = {
                labels: ['Aucune donnée'],
                datasets: [{
                    label: '1RM estimé (kg)',
                    data: [0],
                    borderColor: chartColors.primary,
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            };
            
            charts.progression = new Chart(ctx, {
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

    // Détruire le graphique existant de manière sécurisée
    safeDestroyChart('muscleVolume');
    
    // Petite pause pour s'assurer que le canvas est libéré
    await new Promise(resolve => setTimeout(resolve, 50));

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

    // Détruire le graphique existant de manière sécurisée
    safeDestroyChart('fatigue');
    
    // Petite pause pour s'assurer que le canvas est libéré
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        const response = await fetch(`/api/users/${currentUser.id}/fatigue-trends`);
        
        // Vérifier que la réponse est OK
        if (!response.ok) {
            console.error(`Erreur API fatigue-trends: ${response.status}`);
            return;
        }
        
        // Vérifier le content-type
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.error("La réponse fatigue-trends n'est pas du JSON");
            return;
        }
        
        const data = await response.json();

        // Vérifier que les données sont valides
        if (!data.fatigue || data.fatigue.length === 0 || !data.performance || data.performance.length === 0) {
            console.log("Pas de données de fatigue/performance");
            // Afficher un graphique vide
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
            
            charts.fatigue = new Chart(ctx, {
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
            });
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

    // Détruire le graphique existant de manière sécurisée
    safeDestroyChart('records');
    
    // Petite pause pour s'assurer que le canvas est libéré
    await new Promise(resolve => setTimeout(resolve, 50));

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
    if (!currentUser) return;

    // Afficher un loader
    const chartsContainer = document.getElementById('chartsContainer');
    if (chartsContainer) {
        chartsContainer.classList.add('loading');
    }

    try {
        // Chargement séquentiel pour éviter les conflits de canvas
        await loadExerciseSelector();
        await loadProgressionChart();
        await loadMuscleVolumeChart();
        await loadFatigueChart();
        await loadPersonalRecordsChart();
    } catch (error) {
        console.error('Erreur lors du chargement des graphiques:', error);
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