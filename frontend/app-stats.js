// ===== MODULE STATISTIQUES AVANCÉES =====
// Ce fichier gère les graphiques avancés de la page stats

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
let statsCharts = {};

// ===== 1. PROGRESSION PAR GROUPE MUSCULAIRE =====
async function updateMuscleProgression() {
    const period = document.getElementById('muscleProgressionPeriod').value;
    
    try {
        const response = await fetch(`/api/users/${currentUser.id}/muscle-progression?period=${period}`);
        const data = await response.json();
        
        if (statsCharts.muscleProgression) {
            statsCharts.muscleProgression.destroy();
        }
        
        const ctx = document.getElementById('muscleProgressionChart').getContext('2d');
        
        // Préparer les datasets
        const datasets = Object.entries(data.muscle_groups).map(([muscle, values]) => ({
            label: muscle,
            data: values,
            borderColor: getColorForMuscle(muscle),
            backgroundColor: getColorForMuscle(muscle, 0.1),
            tension: 0.3,
            fill: false
        }));
        
        statsCharts.muscleProgression = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: datasets
            },
            options: {
                ...chartDefaults,
                plugins: {
                    ...chartDefaults.plugins,
                    title: {
                        display: false
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erreur chargement progression musculaire:', error);
    }
}

// ===== 2. DASHBOARD DE RÉCUPÉRATION =====
async function refreshMuscleRecovery() {
    try {
        const response = await fetch(`/api/users/${currentUser.id}/muscle-recovery`);
        const data = await response.json();
        
        if (statsCharts.muscleRecovery) {
            statsCharts.muscleRecovery.destroy();
        }
        
        const ctx = document.getElementById('muscleRecoveryChart').getContext('2d');
        
        // Transformer les données pour le graphique
        const muscles = data.muscles.map(m => m.muscle);
        const hoursSince = data.muscles.map(m => m.hours_since_last > 168 ? 168 : m.hours_since_last);
        const colors = data.muscles.map(m => {
            if (m.status === 'ready') return chartColors.success;
            if (m.status === 'recovering') return chartColors.warning;
            return chartColors.danger;
        });
        
        statsCharts.muscleRecovery = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: muscles,
                datasets: [{
                    label: 'Heures depuis dernier entraînement',
                    data: hoursSince,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                ...chartDefaults,
                indexAxis: 'y',
                scales: {
                    x: {
                        ...chartDefaults.scales.x,
                        max: 168,
                        ticks: {
                            callback: function(value) {
                                if (value === 168) return '7j+';
                                if (value % 24 === 0) return `${value/24}j`;
                                return `${value}h`;
                            }
                        }
                    }
                },
                plugins: {
                    ...chartDefaults.plugins,
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                xMin: 48,
                                xMax: 48,
                                borderColor: 'rgba(16, 185, 129, 0.5)',
                                borderWidth: 2,
                                label: {
                                    enabled: true,
                                    content: 'Récupéré',
                                    position: 'end'
                                }
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erreur chargement récupération musculaire:', error);
    }
}

// ===== 3. VOLUME PROGRESSIF (réutilise l'existant) =====
async function updateVolumeChart() {
    // Utilise la fonction existante du module app-charts.js
    if (window.loadMuscleVolumeChart) {
        await window.loadMuscleVolumeChart();
    }
}

// ===== 4. SUNBURST UTILISATION ÉQUIPEMENT =====
async function updateEquipmentUsage() {
    const period = document.getElementById('equipmentPeriod').value;
    
    try {
        const response = await fetch(`/api/users/${currentUser.id}/equipment-usage?period=${period}`);
        const data = await response.json();
        
        // Nettoyer le conteneur
        const container = document.getElementById('equipmentSunburst');
        container.innerHTML = '';
        
        // Créer le sunburst avec D3.js
        createSunburst(data, container);
        
    } catch (error) {
        console.error('Erreur chargement utilisation équipement:', error);
    }
}

function createSunburst(data, container) {
    const width = container.offsetWidth;
    const height = 400;
    const radius = Math.min(width, height) / 2;
    
    // Créer le SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width/2},${height/2})`);
    
    // Créer la partition
    const partition = d3.partition()
        .size([2 * Math.PI, radius]);
    
    // Créer la hiérarchie
    const root = d3.hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);
    
    partition(root);
    
    // Créer l'arc
    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1);
    
    // Échelle de couleurs
    const color = d3.scaleOrdinal()
        .domain(['Total', 'barbell_standard', 'dumbbells', 'bodyweight', 'bench_plat', 'elastiques'])
        .range([chartColors.gray, chartColors.primary, chartColors.secondary, chartColors.success, chartColors.warning, chartColors.danger]);
    
    // Ajouter les arcs
    svg.selectAll('path')
        .data(root.descendants())
        .join('path')
        .attr('d', arc)
        .style('fill', d => color(d.data.name))
        .style('stroke', '#0f172a')
        .style('stroke-width', 2)
        .append('title')
        .text(d => `${d.data.name}: ${d.value ? Math.round(d.value) : 0} kg`);
    
    // Ajouter les labels
    svg.selectAll('text')
        .data(root.descendants().filter(d => d.depth && (d.x1 - d.x0) > 0.1))
        .join('text')
        .attr('transform', d => {
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2;
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        })
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .style('fill', 'white')
        .style('font-size', '12px')
        .text(d => d.data.name);
}

// ===== 5. PRÉDICTION DE PERFORMANCE =====
async function updatePerformancePrediction() {
    try {
        const response = await fetch(`/api/users/${currentUser.id}/muscle-performance-prediction`);
        const data = await response.json();
        
        if (statsCharts.performancePrediction) {
            statsCharts.performancePrediction.destroy();
        }
        
        const ctx = document.getElementById('performancePredictionChart').getContext('2d');
        
        // Préparer les données
        const muscles = Object.keys(data.predictions);
        const currentMax = muscles.map(m => data.predictions[m].current_max);
        const predictedMax = muscles.map(m => data.predictions[m].predicted_max);
        const confidence = muscles.map(m => data.predictions[m].confidence);
        
        statsCharts.performancePrediction = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: muscles,
                datasets: [
                    {
                        label: 'Charge actuelle (kg)',
                        data: currentMax,
                        backgroundColor: chartColors.primary,
                        borderWidth: 0
                    },
                    {
                        label: 'Prédiction 30j (kg)',
                        data: predictedMax,
                        backgroundColor: 'rgba(59, 130, 246, 0.3)',
                        borderColor: chartColors.primary,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                ...chartDefaults,
                plugins: {
                    ...chartDefaults.plugins,
                    tooltip: {
                        ...chartDefaults.plugins.tooltip,
                        callbacks: {
                            afterLabel: function(context) {
                                if (context.datasetIndex === 1) {
                                    const muscle = muscles[context.dataIndex];
                                    const conf = data.predictions[muscle].confidence;
                                    const trend = data.predictions[muscle].trend;
                                    return `Confiance: ${conf}%\nTendance: ${trend}`;
                                }
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erreur chargement prédictions:', error);
    }
}

// ===== UTILITAIRES =====
function getColorForMuscle(muscle, opacity = 1) {
    const colorMap = {
        'Pectoraux': chartColors.primary,
        'Dos': chartColors.secondary,
        'Épaules': chartColors.warning,
        'Biceps': chartColors.success,
        'Triceps': chartColors.danger,
        'Jambes': '#ec4899',
        'Abdominaux': '#14b8a6'
    };
    
    const color = colorMap[muscle] || chartColors.gray;
    
    if (opacity < 1) {
        // Convertir hex en rgba
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    return color;
}

// ===== INITIALISATION =====
async function initializeStatsPage() {
    if (!currentUser) return;
    
    // Charger tous les graphiques
    await updateMuscleProgression();
    await refreshMuscleRecovery();
    await updateVolumeChart();
    await updateEquipmentUsage();
    await updatePerformancePrediction();
}

// ===== EXPORT GLOBAL =====
window.updateMuscleProgression = updateMuscleProgression;
window.refreshMuscleRecovery = refreshMuscleRecovery;
window.updateVolumeChart = updateVolumeChart;
window.updateEquipmentUsage = updateEquipmentUsage;
window.updatePerformancePrediction = updatePerformancePrediction;
window.initializeStatsPage = initializeStatsPage;

export {
    initializeStatsPage,
    updateMuscleProgression,
    refreshMuscleRecovery,
    updateEquipmentUsage,
    updatePerformancePrediction
};