// ===== MODULE STATISTIQUES AVANCÉES =====
// Ce fichier gère les graphiques avancés de la page stats

import { currentUser } from './app-state.js';
import { BODY_PART_COLORS } from './app-config.js';

function getColorForMuscle(muscle, opacity = 1) {
    const baseColor = BODY_PART_COLORS[muscle] || '#94a3b8';
    if (opacity === 1) return baseColor;
    
    // Convertir hex en rgba avec opacité
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const statsCharts = {};

// Configuration des graphiques
// Palette de couleurs moderne avec gradients
const chartColors = {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gray: '#6b7280',
    pink: '#ec4899',
    cyan: '#06b6d4',
    indigo: '#6366f1'
};

// ===== UTILITAIRES COULEURS =====
function getColorForMuscle(muscle, opacity = 1) {
    // Palette moderne avec des couleurs vibrantes
    const colorMap = {
        'Pectoraux': '#3b82f6',    // Bleu vif
        'Dos': '#8b5cf6',          // Violet
        'Épaules': '#f59e0b',      // Orange
        'Biceps': '#10b981',       // Vert émeraude
        'Triceps': '#ef4444',      // Rouge
        'Jambes': '#ec4899',       // Rose
        'Abdominaux': '#06b6d4',   // Cyan
        'Mollets': '#6366f1',      // Indigo
        'Avant-bras': '#84cc16',   // Vert lime
        'Fessiers': '#a855f7'      // Purple
    };
    
    const color = colorMap[muscle] || chartColors.gray;
    
    if (opacity < 1) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    return color;
}

// Fonction pour créer des gradients
function createGradient(ctx, color, opacity = 0.3) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    const rgb = hexToRgb(color);
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`);
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.01)`);
    return gradient;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false
    },
    animation: {
        duration: 1000,
        easing: 'easeInOutCubic',
        delay: (context) => {
            let delay = 0;
            if (context.type === 'data' && context.mode === 'default') {
                delay = context.dataIndex * 100 + context.datasetIndex * 100;
            }
            return delay;
        }
    },
    plugins: {
        legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
                color: '#e5e7eb',
                font: {
                    family: "'Inter', sans-serif",
                    size: 12,
                    weight: '500'
                },
                padding: 15,
                usePointStyle: true,
                pointStyle: 'circle',
                boxWidth: 8,
                boxHeight: 8
            }
        },
        tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f3f4f6',
            bodyColor: '#e5e7eb',
            borderColor: 'rgba(59, 130, 246, 0.3)',
            borderWidth: 1,
            cornerRadius: 12,
            padding: 16,
            displayColors: true,
            boxPadding: 6,
            caretSize: 8,
            caretPadding: 10
        }
    },
    scales: {
        x: {
            grid: {
                color: 'rgba(255, 255, 255, 0.03)',
                drawBorder: false,
                tickLength: 0
            },
            ticks: {
                color: '#94a3b8',
                font: {
                    size: 11,
                    weight: '400'
                },
                padding: 8
            },
            border: {
                display: false
            }
        },
        y: {
            grid: {
                color: 'rgba(255, 255, 255, 0.05)',
                drawBorder: false,
                tickLength: 0
            },
            ticks: {
                color: '#94a3b8',
                font: {
                    size: 11,
                    weight: '400'
                },
                padding: 12,
                callback: function(value) {
                    return value.toLocaleString('fr-FR');
                }
            },
            border: {
                display: false
            }
        }
    }
};

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
        
        // Créer des datasets avec gradients et effets
        const datasets = Object.entries(data.muscle_groups).map(([muscle, values], index) => {
            const color = getColorForMuscle(muscle);
            return {
                label: muscle,
                data: values,
                borderColor: color,
                backgroundColor: createGradient(ctx, color, 0.2),
                borderWidth: 3,
                pointBackgroundColor: color,
                pointBorderColor: '#1e293b',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: color,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                tension: 0.4,
                fill: true,
                // Effet d'animation décalé
                animation: {
                    delay: index * 200
                }
            };
        });
        
        statsCharts.muscleProgression = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates.map(d => {
                    const date = new Date(d);
                    return date.toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short' 
                    });
                }),
                datasets: datasets
            },
            options: {
                ...chartDefaults,
                plugins: {
                    ...chartDefaults.plugins,
                    title: {
                        display: false
                    }
                },
                // Effet de survol amélioré
                onHover: (event, activeElements) => {
                    ctx.canvas.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
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

// ===== 3. VOLUME PROGRESSIF =====
async function updateVolumeChart() {
    const period = document.getElementById('volumePeriod')?.value || 'month';
    
    try {
        const response = await fetch(`/api/users/${currentUser.id}/muscle-volume?period=${period}`);
        const data = await response.json();
        
        const ctx = document.getElementById('muscleVolumeChart');
        if (!ctx) return;
        
        // Détruire l'ancien graphique
        if (statsCharts['muscleVolume']) {
            statsCharts['muscleVolume'].destroy();
        }
        
        // Créer le nouveau graphique
        statsCharts['muscleVolume'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(data.volumes || {}),
                datasets: [{
                    label: 'Volume (kg)',
                    data: Object.values(data.volumes || {}),
                    backgroundColor: Object.keys(data.volumes || {}).map(muscle => 
                        getColorForMuscle(muscle, 0.7)
                    ),
                    borderColor: Object.keys(data.volumes || {}).map(muscle => 
                        getColorForMuscle(muscle)
                    ),
                    borderWidth: 2
                }]
            },
            options: {
                ...chartDefaults,
                plugins: {
                    ...chartDefaults.plugins,
                    title: {
                        display: true,
                        text: `Volume total par muscle (${period === 'week' ? 'Semaine' : 'Mois'})`,
                        color: '#f3f4f6',
                        font: { size: 14, weight: '600' }
                    }
                },
                scales: {
                    ...chartDefaults.scales,
                    y: {
                        ...chartDefaults.scales.y,
                        title: {
                            display: true,
                            text: 'Volume (kg)',
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erreur chargement volume:', error);
    }
}

// ===== 4. SUNBURST UTILISATION ÉQUIPEMENT =====
// ===== 4. SUNBURST PARTIES DU CORPS =====
async function updateBodyPartDistribution() {
    const period = document.getElementById('bodyPartPeriod').value;
    
    try {
        const response = await fetch(`/api/users/${currentUser.id}/muscle-distribution-detailed?period=${period}`);
        const data = await response.json();
        
        // Nettoyer et créer le sunburst
        const container = document.getElementById('bodyPartSunburst');
        container.innerHTML = '';
        createBodyPartSunburst(data, container);
        
    } catch (error) {
        console.error('Erreur chargement distribution:', error);
    }
}

function createBodyPartSunburst(data, container) {
    const width = container.offsetWidth;
    const height = 400;
    const radius = Math.min(width, height) / 2;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width/2},${height/2})`);
    
    const partition = d3.partition()
        .size([2 * Math.PI, radius]);
    
    const root = d3.hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);
    
    partition(root);
    
    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => {
            if (d.depth === 0) return 0;
            if (d.depth === 1) return radius * 0.4;
            return radius * 0.7;
        })
        .outerRadius(d => {
            if (d.depth === 0) return 0;
            if (d.depth === 1) return radius * 0.65;
            return radius * 0.95;
        });
    
    const g = svg.selectAll('g')
        .data(root.descendants().filter(d => d.depth > 0))
        .enter().append('g');
    
    const paths = g.append('path')
        .attr('d', arc)
        .style('fill', d => {
            // Couleur par muscle (depth 1) ou version plus claire pour exercices (depth 2)
            const muscle = d.depth === 1 ? d.data.name : d.parent.data.name;
            return getColorForMuscle(muscle, d.depth === 1 ? 1 : 0.7);
        })
        .style('stroke', '#1e293b')
        .style('stroke-width', 2)
        .attr('opacity', 0);
    
    // Animation
    paths.transition()
        .duration(750)
        .attr('opacity', 1);
    
    // Labels uniquement pour les muscles (depth 1)
    g.filter(d => d.depth === 1)
        .append('text')
        .attr('transform', d => {
            const [x, y] = arc.centroid(d);
            return `translate(${x},${y})`;
        })
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .text(d => {
            const rootValue = root.value || 1;
            const percentage = rootValue > 0 ? ((d.value / rootValue) * 100).toFixed(0) : '0';
            return percentage > 5 ? d.data.name : '';
        });
    
    // Tooltip amélioré
    paths.on('mouseover', function(event, d) {
        const totalVolume = root.value;
        const totalVolume = root.value || 1; // Éviter division par 0
        const percentage = totalVolume > 0 ? ((d.value / totalVolume) * 100).toFixed(1) : '0';
        
        const tooltip = d3.select('body').append('div')
            .attr('class', 'sunburst-tooltip')
            .style('opacity', 0);
        
        tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        
        let content = '';
        if (d.depth === 1) {
            // Tooltip pour muscle avec répartition des exercices
            content = `<strong>${d.data.name}</strong><br/>
                      Volume: ${Math.round(d.value)}kg (${percentage}%)<br/>`;
            
            if (d.children && d.children.length > 0) {
                content += '<br/><strong>Exercices:</strong><br/>';
                d.children
                    .sort((a, b) => b.value - a.value)
                    .forEach(child => {
                        const exercisePercentage = ((child.value / d.value) * 100).toFixed(0);
                        content += `• ${child.data.name}: ${exercisePercentage}%<br/>`;
                    });
            }
        } else {
            // Tooltip pour exercice
            const muscleVolume = d.parent.value;
            const muscleVolume = d.parent.value || 1; // Éviter division par 0
            const exercisePercentage = muscleVolume > 0 ? ((d.value / muscleVolume) * 100).toFixed(0) : '0';
            content = `<strong>${d.data.name}</strong><br/>
                      Muscle: ${d.parent.data.name}<br/>
                      Volume: ${Math.round(d.value)}kg<br/>
                      ${exercisePercentage}% du muscle<br/>
                      ${percentage}% du total`;
        }
        
        tooltip.html(content)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        
        // Effet de survol
        d3.select(this)
            .transition()
            .duration(200)
            .attr('opacity', 0.8);
        
        // Mettre en évidence les éléments liés
        if (d.depth === 1) {
            // Mettre en évidence tous les exercices de ce muscle
            paths.filter(p => p.depth === 2 && p.parent === d)
                .transition()
                .duration(200)
                .attr('opacity', 0.8);
        } else if (d.depth === 2) {
            // Mettre en évidence le muscle parent
            paths.filter(p => p === d.parent)
                .transition()
                .duration(200)
                .attr('opacity', 0.8);
        }
    })
    .on('mouseout', function(event, d) {
        d3.selectAll('.sunburst-tooltip').remove();
        
        // Restaurer l'opacité
        paths.transition()
            .duration(200)
            .attr('opacity', 1);
    });
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
                        backgroundColor: muscles.map(m => getColorForMuscle(m)),
                        borderWidth: 0,
                        borderRadius: 8,
                        borderSkipped: false,
                        barThickness: 40
                    },
                    {
                        label: 'Prédiction 30j (kg)',
                        data: predictedMax,
                        backgroundColor: muscles.map(m => getColorForMuscle(m, 0.3)),
                        borderColor: muscles.map(m => getColorForMuscle(m)),
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                        borderDash: [5, 5],
                        barThickness: 40
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



// ===== INITIALISATION =====
async function initializeStatsPage() {
    if (!currentUser) return;
    
    await updateMuscleProgression();
    await refreshMuscleRecovery();
    await updateVolumeChart();
    await updateBodyPartDistribution(); // Changé ici
    await updatePerformancePrediction();
}

// ===== EXPORT GLOBAL =====
window.updateMuscleProgression = updateMuscleProgression;
window.refreshMuscleRecovery = refreshMuscleRecovery;
window.updateVolumeChart = updateVolumeChart;
window.updateBodyPartDistribution = updateBodyPartDistribution;
window.updatePerformancePrediction = updatePerformancePrediction;
window.initializeStatsPage = initializeStatsPage;

export {
    initializeStatsPage,
    updateMuscleProgression,
    updateVolumeChart,
    refreshMuscleRecovery,
    updateBodyPartDistribution,
    updatePerformancePrediction
};