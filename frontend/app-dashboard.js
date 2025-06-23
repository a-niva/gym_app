// ===== MODULE TABLEAU DE BORD =====
// Ce fichier gère l'affichage du tableau de bord et des statistiques
// Il coordonne le chargement des données et leur affichage

import { loadWorkoutHistory } from './app-history.js';
import { showToast, showLoadingOverlay, hideLoadingOverlay } from './app-ui.js';
import { 
    getUserStats,
    getUserCommitment,
    getTrajectoryAnalysis, 
    getAdaptiveTargets,
    generateAdaptiveWorkout,
    completeAdaptiveWorkout,
    loadUserPrograms
} from './app-api.js';
import { 
    currentUser,
    userCommitment,
    adaptiveTargets, 
    trajectoryAnalysis,
    currentAdaptiveWorkout,
    setCurrentWorkout,
    getCurrentProgram,
    setCurrentProgram,
    setCurrentAdaptiveWorkout
} from './app-state.js';

import { showView } from './app-navigation.js';
import { showProgramGenerator } from './app-program-generator.js';


// ===== CHARGEMENT DU DASHBOARD =====
async function loadDashboard() {
    if (!currentUser) return;
    
    const dashboardView = document.getElementById('dashboard');
    if (!dashboardView) return;
    
    try {
        // Vérifier d'abord si l'utilisateur a un programme actif
        // Récupérer le programme actif depuis l'API
        let hasActiveProgram = false;
        let activeProgram = null;

        try {
            const programs = await loadUserPrograms(currentUser.id);
            activeProgram = programs.find(p => p.is_active === true);
            if (activeProgram) {
                setCurrentProgram(activeProgram);
                hasActiveProgram = true;
            }
        } catch (error) {
            console.error('Erreur chargement programmes:', error);
        }
        
        // Ensuite vérifier s'il a un engagement
        const commitment = await getUserCommitment(currentUser.id);
        
        // Trois cas possibles :
        // 1. Pas d'engagement = Dashboard basique + invitation à créer un programme
        // 2. Engagement mais pas de programme = Dashboard adaptatif + bouton créer programme
        // 3. Engagement + programme = Dashboard adaptatif complet
        
        if (!commitment) {
            // CAS 1: Dashboard classique simple
            showClassicDashboard(dashboardView, hasActiveProgram);
        } else {
            // CAS 2 & 3: Dashboard adaptatif
            await showAdaptiveDashboard(dashboardView, commitment, hasActiveProgram);
        }
        
    } catch (error) {
        console.error('Erreur loading dashboard:', error);
        // En cas d'erreur, afficher le dashboard classique
        showClassicDashboard(dashboardView, false);
    }
}

// ===== DASHBOARD CLASSIQUE =====
function showClassicDashboard(container, hasProgram) {
    container.innerHTML = `
        <div class="dashboard-header" style="text-align: center; margin-bottom: 2rem;">
            <h1 id="welcomeMessage">Bonjour ${currentUser.name} ! 💪</h1>
            <p style="color: var(--gray);">${new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}</p>
        </div>
        
        <div class="stats-grid" style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
            overflow-x: hidden;
        ">
            <!-- Carte principale d'action -->
            <div class="stat-card" style="
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                text-align: center;
                padding: 2rem;
            ">
                ${!hasProgram ? `
                    <h3 style="margin-bottom: 1rem;">🎯 Commencer votre parcours</h3>
                    <p style="margin-bottom: 1.5rem;">Créez votre programme personnalisé</p>
                    <button class="btn" onclick="showProgramGenerator()" style="
                        background: white;
                        color: #10b981;
                        width: 100%;
                    ">
                        Créer mon programme
                    </button>
                ` : `
                    <h3 style="margin-bottom: 1rem;">🚀 Programme actif</h3>
                    <p style="margin-bottom: 1.5rem;">Prêt pour votre séance ?</p>
                    <button class="btn" onclick="showView('workout')" style="
                        background: white;
                        color: #10b981;
                        width: 100%;
                    ">
                        Commencer l'entraînement
                    </button>
                `}
            </div>
            
            <!-- Stats de base -->
            <div class="stat-card">
                <h3>📊 Séances totales</h3>
                <p class="stat-value" id="totalWorkouts">0</p>
            </div>
            
            <div class="stat-card">
                <h3>🔥 Série hebdo</h3>
                <p class="stat-value" id="weekStreak">0</p>
            </div>
            
            <div class="stat-card">
                <h3>📅 Dernière séance</h3>
                <p class="stat-value" id="lastWorkout">Jamais</p>
            </div>
        </div>
        
        <div id="workoutHistory">
            <!-- L'historique sera chargé ici -->
        </div>
    `;
    
    // Charger les stats de base
    updateWelcomeMessage();
    loadUserStats();
    
    // Charger l'historique après un délai
    setTimeout(() => {
        loadWorkoutHistory();
    }, 500);
}

// ===== DASHBOARD ADAPTATIF =====
async function showAdaptiveDashboard(container, commitment, hasProgram) {
    // Initialiser les targets si nécessaire
    try {
        await fetch(`/api/users/${currentUser.id}/init-adaptive-targets`, {
            method: 'POST'
        });
    } catch (error) {
        console.log('Targets déjà initialisés ou erreur:', error);
    }
    // Charger les données adaptatives
    const [trajectory, targets] = await Promise.all([
        getTrajectoryAnalysis(currentUser.id),
        getAdaptiveTargets(currentUser.id)
    ]);
    
    // État différent selon la présence d'un programme
    const statusMessage = hasProgram 
        ? (trajectory.on_track ? '✅ Sur la bonne voie !' : '⚠️ Ajustons le rythme')
        : '🎯 Prêt à commencer';
    
    container.innerHTML = `
        <div class="dashboard-header" style="text-align: center; margin-bottom: 2rem;">
            <h1>Bonjour ${currentUser.name} ! 💪</h1>
            <p style="color: var(--gray);">${new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}</p>
        </div>
        
        <!-- Widget Trajectoire -->
        <div class="trajectory-widget ${trajectory.on_track ? 'on-track' : 'off-track'}" style="
            background: linear-gradient(135deg, 
                ${trajectory.on_track ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'}, 
                rgba(255, 255, 255, 0.02)
            );
            border-radius: 20px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            border: 2px solid ${trajectory.on_track ? '#10b981' : '#f59e0b'};
            text-align: center;
        ">
            <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem;">${statusMessage}</h2>
            <p style="color: var(--gray); margin: 0;">
                ${trajectory.sessions_this_week}/${commitment.sessions_per_week} séances cette semaine
            </p>
        </div>
        
        <!-- Widget Engagement -->
        <div style="
            background: rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        ">
            <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                🎯 Engagement 
                <span style="font-size: 0.8rem; color: var(--gray);">
                    ${commitment.sessions_per_week} séances/sem
                </span>
            </h3>
            
            <!-- Stats sur une ligne -->
            <div style="
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            ">
                <div style="text-align: center;">
                    <div style="font-size: 1.8rem; font-weight: bold; color: ${trajectory.consistency_score >= 0.7 ? '#10b981' : '#f59e0b'};">
                        ${Math.round(trajectory.consistency_score * 100)}%
                    </div>
                    <div style="font-size: 0.85rem; color: var(--gray);">Régularité (30j)</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.8rem; font-weight: bold; color: ${trajectory.volume_adherence >= 0.8 ? '#10b981' : '#f59e0b'};">
                        ${Math.round(trajectory.volume_adherence * 100)}%
                    </div>
                    <div style="font-size: 0.85rem; color: var(--gray);">Adhérence volume</div>
                </div>
            </div>
        </div>

        <!-- Progression muscles avec cercles -->
        ${targets && targets.length > 0 ? `
        <div style="
            background: rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            backdrop-filter: blur(10px);
        ">
            <h3 style="margin-bottom: 1.5rem; font-size: 1rem; color: var(--gray);">
                💪 Progression musculaire (7j)
            </h3>
            
            <div style="
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 1.5rem;
                row-gap: 2rem;
            ">
                ${targets.map((target, index) => {
                    const percentage = target.target_volume > 0 
                        ? Math.round((target.current_volume / target.target_volume) * 100)
                        : 0;
                    
                    // Gradients uniques par muscle
                    const gradients = {
                        'chest': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        'back': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        'shoulders': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        'legs': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                        'arms': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                        'core': 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
                    };
                    
                    const muscleNames = {
                        'chest': 'Pectoraux',
                        'back': 'Dos',
                        'shoulders': 'Épaules',
                        'legs': 'Jambes',
                        'arms': 'Bras',
                        'core': 'Abdos'
                    };
                    
                    const gradient = gradients[target.muscle_group] || gradients.chest;
                    const muscleName = muscleNames[target.muscle_group] || target.muscle_group;
                    
                    // Calcul de la circonférence pour l'animation
                    const radius = 45;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference - (percentage / 100) * circumference;
                    
                    return `
                        <div style="
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            text-align: center;
                        ">
                            <div style="
                                position: relative;
                                width: 120px;
                                height: 120px;
                            ">
                                <!-- Cercle de fond -->
                                <svg width="120" height="120" style="
                                    transform: rotate(-90deg);
                                    filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));
                                ">
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="${radius}"
                                        stroke="rgba(255, 255, 255, 0.1)"
                                        stroke-width="10"
                                        fill="none"
                                    />
                                    <!-- Cercle de progression avec gradient -->
                                    <defs>
                                        <linearGradient id="gradient-${index}" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" style="stop-color:${gradient.match(/#[a-f0-9]{6}/gi)[0]};stop-opacity:1" />
                                            <stop offset="100%" style="stop-color:${gradient.match(/#[a-f0-9]{6}/gi)[1]};stop-opacity:1" />
                                        </linearGradient>
                                    </defs>
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="${radius}"
                                        stroke="url(#gradient-${index})"
                                        stroke-width="10"
                                        fill="none"
                                        stroke-linecap="round"
                                        stroke-dasharray="${circumference}"
                                        stroke-dashoffset="${strokeDashoffset}"
                                        style="
                                            transition: stroke-dashoffset 1s ease-in-out;
                                            filter: drop-shadow(0 0 6px ${gradient.match(/#[a-f0-9]{6}/gi)[0]}40);
                                        "
                                    />
                                </svg>
                                
                                <!-- Pourcentage au centre -->
                                <div style="
                                    position: absolute;
                                    top: 50%;
                                    left: 50%;
                                    transform: translate(-50%, -50%);
                                    font-size: 1.8rem;
                                    font-weight: bold;
                                    background: ${gradient};
                                    -webkit-background-clip: text;
                                    -webkit-text-fill-color: transparent;
                                    background-clip: text;
                                ">
                                    ${percentage}%
                                </div>
                            </div>
                            
                            <!-- Nom du muscle -->
                            <div style="
                                margin-top: 0.75rem;
                                font-size: 0.9rem;
                                color: #e5e7eb;
                                font-weight: 500;
                            ">
                                ${muscleName}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        ` : ''}
                
        <!-- Conseil personnalisé avec défilement automatique -->
        <div id="insightCarousel" style="
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
            border-radius: 16px;
            padding: 1.2rem;
            margin-bottom: 1.5rem;
            min-height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
        ">
            <div id="insightText" style="
                text-align: center;
                font-size: 1rem;
                line-height: 1.5;
                transition: opacity 0.5s ease;
            ">
                ${trajectory.insights && trajectory.insights.length > 0 ? trajectory.insights[0] : '💪 Continuez vos efforts !'}
            </div>
        </div>
        
        <!-- Actions rapides -->
        <div class="action-grid" style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 2rem;
        ">
            <div class="action-card" onclick="generateQuickWorkout()" style="
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
                border: 2px solid #10b981;
                border-radius: 16px;
                padding: 1.5rem;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
            ">
                <h3 style="margin-bottom: 0.5rem;">⚡ Séance rapide adaptée</h3>
                <p style="font-size: 0.9rem; color: var(--gray); margin: 0;">
                    ${trajectory.next_muscles ? `${trajectory.next_muscles.join(' + ')}` : 'Optimisée pour vous'}
                </p>
            </div>
            
            <div class="action-card" onclick="window.startWorkout('free')" style="
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid var(--gray);
                border-radius: 16px;
                padding: 1.5rem;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
            ">
                <h3 style="margin-bottom: 0.5rem;">🏃 Séance libre</h3>
                <p style="font-size: 0.9rem; color: var(--gray); margin: 0;">Choisissez vos exercices</p>
            </div>
        </div>
        
        ${!hasProgram ? `
            <!-- Call to action programme -->
            <div style="
                background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
                border-radius: 20px;
                padding: 2rem;
                text-align: center;
                margin-bottom: 2rem;
            ">
                <h3 style="margin-bottom: 1rem;">🚀 Créez votre programme personnalisé</h3>
                <p style="color: var(--gray); margin-bottom: 1.5rem;">
                    Optimisé selon vos objectifs et votre emploi du temps
                </p>
                <button class="btn" onclick="showProgramGenerator()" style="
                    background: white;
                    color: #8b5cf6;
                    padding: 0.75rem 2rem;
                ">
                    Créer mon programme
                </button>
            </div>
        ` : ''}
        
        <!-- Stats classiques en bas -->
        <div style="
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-top: 2rem;
        ">
            <div class="stat-card" style="
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 1rem;
                text-align: center;
            ">
                <div class="stat-value" id="totalWorkouts">${trajectory.total_workouts || 0}</div>
                <div class="stat-label" style="font-size: 0.85rem; color: var(--gray);">Séances totales</div>
            </div>
            <div class="stat-card" style="
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 1rem;
                text-align: center;
            ">
                <div class="stat-value" id="weekStreak">${trajectory.week_streak || 0}</div>
                <div class="stat-label" style="font-size: 0.85rem; color: var(--gray);">Semaines d'affilée</div>
            </div>
            <div class="stat-card" style="
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 1rem;
                text-align: center;
            ">
                <div class="stat-value" id="lastWorkout">
                    ${trajectory.last_workout ? new Date(trajectory.last_workout).toLocaleDateString('fr-FR') : 'Jamais'}
                </div>
                <div class="stat-label" style="font-size: 0.85rem; color: var(--gray);">Dernière séance</div>
            </div>
        </div>
        
        <!-- Historique -->
        <div id="workoutHistory" style="margin-top: 2rem;">
            <!-- L'historique sera chargé ici -->
        </div>
    `;
    
    // Démarrer le carousel des insights
    if (trajectory.insights && trajectory.insights.length > 1) {
        let currentInsightIndex = 0;
        const insightText = document.getElementById('insightText');
        
        setInterval(() => {
            // Fondu sortant
            insightText.style.opacity = '0';
            
            setTimeout(() => {
                // Changer le texte
                currentInsightIndex = (currentInsightIndex + 1) % trajectory.insights.length;
                insightText.textContent = trajectory.insights[currentInsightIndex];
                // Fondu entrant
                insightText.style.opacity = '1';
            }, 500);
        }, 4000); // Change toutes les 4 secondes
    }
    
    // Charger les stats et l'historique
    updateWelcomeMessage();
    loadUserStats();
    
    // Charger l'historique après un délai
    setTimeout(() => {
        loadWorkoutHistory();
    }, 500);
}

// ========== NOUVELLES FONCTIONS DASHBOARD ADAPTATIF ==========

// Fonction pour afficher l'état des muscles
async function renderMuscleStatus(targets) {
    if (!targets || targets.length === 0) {
        return '<p style="color: var(--gray);">Aucune donnée disponible</p>';
    }
    
    const muscleEmojis = {
        chest: '🎯',
        back: '🔙',
        shoulders: '💪',
        legs: '🦵',
        arms: '💪',
        core: '🎯'
    };
    
    const muscleNames = {
        chest: 'Pectoraux',
        back: 'Dos',
        shoulders: 'Épaules',
        legs: 'Jambes',
        arms: 'Bras',
        core: 'Abdos'
    };
    
    // Construire le HTML directement sans Promise
    let html = '';
    
    targets.forEach(target => {
        const readiness = calculateReadiness(target);
        const statusClass = readiness > 0.7 ? 'ready' : readiness > 0.4 ? 'moderate' : 'tired';
        const statusColor = readiness > 0.7 ? '#10b981' : readiness > 0.4 ? '#f59e0b' : '#ef4444';
        const volumePercent = target.target_volume > 0 
            ? Math.round((target.current_volume / target.target_volume) * 100)
            : 0;
        
        html += `
            <div class="muscle-item ${statusClass}" style="
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid ${statusColor}33;
                border-radius: 12px;
                padding: 1rem;
            ">
                <div class="muscle-header" style="
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                ">
                    <span class="muscle-emoji" style="font-size: 1.5rem;">${muscleEmojis[target.muscle_group] || '💪'}</span>
                    <span class="muscle-name" style="font-weight: 600;">${muscleNames[target.muscle_group] || target.muscle_group}</span>
                </div>
                <div class="muscle-stats">
                    <div class="mini-progress" style="
                        background: rgba(255, 255, 255, 0.1);
                        height: 6px;
                        border-radius: 3px;
                        overflow: hidden;
                        margin-bottom: 0.5rem;
                    ">
                        <div class="mini-progress-fill" style="
                            background: ${statusColor};
                            height: 100%;
                            width: ${volumePercent}%;
                            transition: width 0.3s;
                        "></div>
                    </div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        font-size: 0.875rem;
                    ">
                        <span style="color: var(--gray);">${volumePercent}% du volume</span>
                        <span style="color: var(--gray);">
                            ${target.last_trained ? getTimeSinceText(target.last_trained) : 'Jamais'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    });
    
    return html;
}

// Fonction pour calculer la disponibilité d'un muscle
function calculateReadiness(target) {
    if (!target.last_trained) return 1.0;
    
    const hoursSince = (new Date() - new Date(target.last_trained)) / (1000 * 60 * 60);
    let readiness = Math.min(1.0, hoursSince / 48); // 48h pour récupération complète
    
    // Ajuster selon la dette de récupération
    if (target.recovery_debt > 0) {
        readiness *= Math.max(0.5, 1 - (target.recovery_debt / 10));
    }
    
    return readiness;
}

// Fonction pour formater le temps écoulé
function getTimeSinceText(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const hours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (hours < 1) return "À l'instant";
    if (hours < 24) return `Il y a ${hours}h`;
    if (hours < 48) return "Hier";
    if (hours < 168) return `Il y a ${Math.floor(hours / 24)}j`;
    return `Il y a ${Math.floor(hours / 168)} sem`;
}

// Fonction pour générer une séance rapide
async function generateQuickWorkout() {
    try {
        // Afficher le modal de sélection du temps
        const timeAvailable = await showTimeSelectionModal();
        if (!timeAvailable) return;
        
        showLoadingOverlay('Génération de votre séance adaptative...');
        
        // Appel à l'API
        const response = await fetch(`/api/users/${currentUser.id}/adaptive-workout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ time_available: timeAvailable })
        });
        
        hideLoadingOverlay();
        
        if (!response.ok) {
            throw new Error('Erreur lors de la génération');
        }
        
        const workout = await response.json();
        setCurrentAdaptiveWorkout(workout);
        
        // Afficher la séance générée
        showAdaptiveWorkoutModal(workout);
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Erreur génération séance:', error);
        showToast('Erreur lors de la génération de la séance', 'error');
    }
}


// ===== MODAL DE SÉLECTION DU TEMPS CORRIGÉ =====
async function showTimeSelectionModal() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: var(--surface);
                border-radius: 16px;
                padding: 2rem;
                max-width: 400px;
                width: 90%;
            ">
                <h3 style="margin-bottom: 1.5rem; text-align: center;">Temps disponible aujourd'hui ?</h3>
                <div class="time-options" style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                ">
                    <button class="time-option" data-time="30" style="
                        background: rgba(255, 255, 255, 0.05);
                        border: 2px solid rgba(255, 255, 255, 0.1);
                        border-radius: 12px;
                        padding: 1.5rem;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-align: center;
                    " onmouseover="this.style.borderColor='#3b82f6'" 
                       onmouseout="this.style.borderColor='rgba(255, 255, 255, 0.1)'">
                        <span class="time-value" style="font-size: 2rem; font-weight: 700; display: block;">30</span>
                        <span class="time-label" style="color: var(--gray);">minutes</span>
                    </button>
                    
                    <button class="time-option" data-time="45" style="
                        background: rgba(255, 255, 255, 0.05);
                        border: 2px solid rgba(255, 255, 255, 0.1);
                        border-radius: 12px;
                        padding: 1.5rem;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-align: center;
                    " onmouseover="this.style.borderColor='#3b82f6'" 
                       onmouseout="this.style.borderColor='rgba(255, 255, 255, 0.1)'">
                        <span class="time-value" style="font-size: 2rem; font-weight: 700; display: block;">45</span>
                        <span class="time-label" style="color: var(--gray);">minutes</span>
                    </button>
                    
                    <button class="time-option" data-time="60" style="
                        background: rgba(255, 255, 255, 0.05);
                        border: 2px solid rgba(255, 255, 255, 0.1);
                        border-radius: 12px;
                        padding: 1.5rem;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-align: center;
                    " onmouseover="this.style.borderColor='#3b82f6'" 
                       onmouseout="this.style.borderColor='rgba(255, 255, 255, 0.1)'">
                        <span class="time-value" style="font-size: 2rem; font-weight: 700; display: block;">60</span>
                        <span class="time-label" style="color: var(--gray);">minutes</span>
                    </button>
                    
                    <button class="time-option" data-time="90" style="
                        background: rgba(255, 255, 255, 0.05);
                        border: 2px solid rgba(255, 255, 255, 0.1);
                        border-radius: 12px;
                        padding: 1.5rem;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-align: center;
                    " onmouseover="this.style.borderColor='#3b82f6'" 
                       onmouseout="this.style.borderColor='rgba(255, 255, 255, 0.1)'">
                        <span class="time-value" style="font-size: 2rem; font-weight: 700; display: block;">90</span>
                        <span class="time-label" style="color: var(--gray);">minutes</span>
                    </button>
                </div>
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="width: 100%;">
                    Annuler
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelectorAll('.time-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const time = parseInt(btn.dataset.time);
                modal.remove();
                resolve(time);
            });
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(null);
            }
        });
    });
}

// Modal pour afficher la séance adaptative
function showAdaptiveWorkoutModal(workout) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <h3>Votre séance adaptative 🎯</h3>
            <p class="workout-duration">Durée estimée : ${Math.round(workout.estimated_duration)} minutes</p>
            
            <div class="workout-muscles">
                <strong>Muscles ciblés :</strong> ${workout.muscles.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}
            </div>
            
            <div class="exercises-list">
                ${workout.exercises.map((ex, idx) => `
                    <div class="exercise-item">
                        <span class="exercise-number">${idx + 1}</span>
                        <div class="exercise-details">
                            <h4>${ex.exercise.name_fr}</h4>
                            <div class="exercise-specs">
                                <span>${ex.sets} séries</span>
                                <span>${ex.target_reps} reps</span>
                                <span>${ex.rest_time}s repos</span>
                                ${ex.predicted_weight ? `<span>${ex.predicted_weight}kg</span>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                    Modifier
                </button>
                <button class="btn" onclick="startAdaptiveWorkout()">
                    Commencer la séance
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Fonction pour démarrer la séance adaptative
async function startAdaptiveWorkout() {
    if (!currentAdaptiveWorkout) return;
    
    // Créer la séance
    const workoutData = {
        user_id: currentUser.id,
        type: "adaptive"
    };
    
    try {
        const response = await fetch(`/api/workouts/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workoutData)
        });
        
        const workout = await response.json();
        setCurrentWorkout(workout);
        
        // Préparer les exercices pour la vue workout
        // CORRIGÉ : Utiliser currentAdaptiveWorkout au lieu de state
        // qui n'est pas défini dans ce module
        
        // Fermer le modal et afficher la vue workout
        document.querySelector('.modal-overlay')?.remove();
        showView('workout');
        
        showToast('Séance démarrée !', 'success');
        
    } catch (error) {
        console.error('Error starting workout:', error);
        showToast('Erreur lors du démarrage de la séance', 'error');
    }
}

// Ajouter les exports pour les nouvelles fonctions
window.generateQuickWorkout = generateQuickWorkout;
window.startAdaptiveWorkout = startAdaptiveWorkout;


// ===== MISE À JOUR DU MESSAGE DE BIENVENUE =====
function updateWelcomeMessage() {
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement && currentUser) {
        welcomeElement.textContent = `Bonjour ${currentUser.name} !`;
    }
}

function updateProfileSummary() {
    const summaryEl = document.getElementById('profileSummary');
    if (summaryEl && currentUser) {
        summaryEl.textContent = `${currentUser.height}cm • ${currentUser.weight}kg`;
    }
}

// ===== CHARGEMENT DES STATISTIQUES UTILISATEUR =====
async function loadUserStats() {
    if (!currentUser) return;
    
    const stats = await getUserStats(currentUser.id);
    
    if (stats) {
        displayStats(stats);
    } else {
        // Valeurs par défaut si erreur
        displayStats({
            total_workouts: 0,
            week_streak: 0,
            last_workout: null
        });
    }
}

// ===== AFFICHAGE DES STATISTIQUES =====
function displayStats(stats) {
    // Total des séances
    const totalWorkoutsElement = document.getElementById('totalWorkouts');
    if (totalWorkoutsElement) {
        totalWorkoutsElement.textContent = stats.total_workouts || '0';
    }
    
    // Série hebdomadaire
    const weekStreakElement = document.getElementById('weekStreak');
    if (weekStreakElement) {
        weekStreakElement.textContent = stats.week_streak || '0';
    }
    
    // Dernière séance
    const lastWorkoutElement = document.getElementById('lastWorkout');
    if (lastWorkoutElement) {
        if (!stats.last_workout) {
            lastWorkoutElement.textContent = 'Jamais';
        } else {
            const date = new Date(stats.last_workout);
            // Vérifier que la date est valide
            if (isNaN(date.getTime())) {
                lastWorkoutElement.textContent = 'Jamais';
            } else {
                const today = new Date();
                const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) {
                    lastWorkoutElement.textContent = "Aujourd'hui";
                } else if (diffDays === 1) {
                    lastWorkoutElement.textContent = "Hier";
                } else if (diffDays < 7) {
                    lastWorkoutElement.textContent = `Il y a ${diffDays} jours`;
                } else {
                    lastWorkoutElement.textContent = date.toLocaleDateString('fr-FR');
                }
            }
        }
    }
}

// ===== AFFICHAGE DES CARTES DE PRÉDICTION =====
function addPredictionCards(predictions) {
    const container = document.querySelector('.dashboard-grid');
    if (!container || !predictions.predictions) return;
    
    // Créer une carte pour les tendances musculaires
    const trendCard = document.createElement('div');
    trendCard.className = 'stat-card prediction-card';
    trendCard.innerHTML = `
        <h3 style="color: var(--primary); margin-bottom: 1rem;">
            📈 Tendances sur 30 jours
        </h3>
        <div class="prediction-grid">
            ${Object.entries(predictions.predictions)
                .filter(([muscle, data]) => data.trend === 'improving')
                .slice(0, 3)
                .map(([muscle, data]) => `
                    <div class="trend-item">
                        <span class="muscle-name">${muscle}</span>
                        <span class="trend-indicator" style="color: #22c55e;">
                            ↗ +${((data.predicted_max - data.current_max) / data.current_max * 100).toFixed(0)}%
                        </span>
                    </div>
                `).join('')}
        </div>
    `;
    
    // Ajouter la carte seulement s'il y a des tendances positives
    const improvingMuscles = Object.entries(predictions.predictions)
        .filter(([muscle, data]) => data.trend === 'improving');
    
    if (improvingMuscles.length > 0) {
        container.appendChild(trendCard);
    }
    
    // Créer une carte pour les muscles à surveiller
    const declineMuscles = Object.entries(predictions.predictions)
        .filter(([muscle, data]) => data.trend === 'declining');
    
    if (declineMuscles.length > 0) {
        const warningCard = document.createElement('div');
        warningCard.className = 'stat-card warning-card';
        warningCard.innerHTML = `
            <h3 style="color: var(--warning); margin-bottom: 1rem;">
                ⚠️ À surveiller
            </h3>
            <div class="prediction-grid">
                ${declineMuscles.map(([muscle, data]) => `
                    <div class="trend-item">
                        <span class="muscle-name">${muscle}</span>
                        <span class="trend-indicator" style="color: #ef4444;">
                            ↘ ${((data.predicted_max - data.current_max) / data.current_max * 100).toFixed(0)}%
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(warningCard);
    }

    // Carte suggestions d'adaptation du programme
    if (getCurrentProgram()) {
        (async () => {
            try {
                const response = await fetch(
                    `/api/programs/${getCurrentProgram().id}/adjustments?user_id=${currentUser.id}`
                );
                
                if (response.ok) {
                    const suggestions = await response.json();
                    
                    if (suggestions.status === 'ready') {
                        const adaptCard = document.createElement('div');
                        adaptCard.className = 'stat-card adaptation-card';
                        
                        let suggestionsHTML = '<h3 style="color: var(--primary); margin-bottom: 1rem;">🔧 Adaptation du programme</h3>';
                        
                        // Recommandations globales
                        if (suggestions.global_recommendations && suggestions.global_recommendations.length > 0) {
                            suggestionsHTML += '<div class="alert" style="background: rgba(255,193,7,0.1); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">';
                            suggestions.global_recommendations.forEach(rec => {
                                suggestionsHTML += `
                                    <p style="margin: 0.5rem 0;"><strong>${rec.action}</strong></p>
                                    <small style="color: var(--gray-light);">${rec.reason}</small>
                                `;
                            });
                            suggestionsHTML += '</div>';
                        }
                        
                        // Suggestions par muscle (max 3)
                        const muscleEntries = Object.entries(suggestions.muscle_specific || {}).slice(0, 3);
                        if (muscleEntries.length > 0) {
                            suggestionsHTML += '<div class="muscle-suggestions">';
                            muscleEntries.forEach(([muscle, recs]) => {
                                suggestionsHTML += `<h5 style="color: var(--gray-light); text-transform: uppercase; font-size: 0.85rem;">${muscle}</h5>`;
                                recs.forEach(rec => {
                                    const iconMap = {
                                        'increase_volume': '📈',
                                        'change_exercises': '🔄',
                                        'reduce_volume': '📉'
                                    };
                                    suggestionsHTML += `
                                        <p style="margin: 0.5rem 0;">
                                            ${iconMap[rec.type] || '•'} ${rec.action}
                                        </p>
                                    `;
                                });
                            });
                            suggestionsHTML += '</div>';
                        }
                        
                        // Changements d'exercices suggérés
                        if (suggestions.exercises_to_change && suggestions.exercises_to_change.length > 0) {
                            suggestionsHTML += '<div style="margin-top: 1rem;">';
                            suggestionsHTML += '<h5 style="color: var(--gray-light); font-size: 0.85rem;">EXERCICES À VARIER</h5>';
                            suggestions.exercises_to_change.slice(0, 2).forEach(change => {
                                suggestionsHTML += `
                                    <p style="margin: 0.5rem 0; font-size: 0.9rem;">
                                        • ${change.current[0]} → ${change.alternatives[0]}
                                    </p>
                                `;
                            });
                            suggestionsHTML += '</div>';
                        }
                        
                        // Bouton d'action
                        suggestionsHTML += `
                            <button class="btn btn-primary" onclick="showProgramAdjustments()" style="margin-top: 1.5rem; width: 100%;">
                                🔧 Voir toutes les suggestions
                            </button>
                        `;
                        
                        adaptCard.innerHTML = suggestionsHTML;
                        container.appendChild(adaptCard);
                    }
                }
            } catch (error) {
                console.error('Erreur chargement suggestions adaptation:', error);
            }
        })();
    }
}

function logout() {
    localStorage.clear();
    setCurrentUser(null);
    showView('onboarding');
}
window.logout = logout;

// ===== RAFRAÎCHISSEMENT DU DASHBOARD =====
async function refreshDashboard() {
    await loadDashboard();
}

// ===== AFFICHAGE DES STATISTIQUES DÉTAILLÉES =====
function showDetailedStats() {
    // TODO: Implémenter une vue détaillée des statistiques
    console.log('Statistiques détaillées à implémenter');
}

async function clearWorkoutHistory() {
    if (!currentUser) return;
    
    // Double confirmation
    const firstConfirm = confirm(
        "⚠️ ATTENTION ⚠️\n\n" +
        "Voulez-vous vraiment supprimer TOUT l'historique de vos séances ?\n\n" +
        "Cette action est IRRÉVERSIBLE."
    );
    
    if (!firstConfirm) return;
    
    const secondConfirm = confirm("Dernière confirmation - Cette action ne peut pas être annulée.");
    
    if (!secondConfirm) return;
    
    try {
        const response = await fetch(`/api/users/${currentUser.id}/workout-history`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(`${result.deleted_workouts} séances supprimées`, 'success');
            await loadDashboard();
        } else {
            showToast('Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        console.error('Erreur suppression historique:', error);
        showToast('Erreur de connexion', 'error');
    }
}


// ===== AFFICHER LES AJUSTEMENTS DE PROGRAMME =====
async function showProgramAdjustments() {
    // Pour l'instant, rediriger vers le générateur
    // TODO: Créer une interface dédiée pour les ajustements
    showProgramGenerator();
    showToast('Analysez votre programme actuel depuis cette page', 'info');
}

// ===== EXPORT GLOBAL =====
window.clearWorkoutHistory = clearWorkoutHistory;
window.loadDashboard = loadDashboard;
window.refreshDashboard = refreshDashboard;
window.showDetailedStats = showDetailedStats;
window.showProgramAdjustments = showProgramAdjustments;
window.generateQuickWorkout = generateQuickWorkout;

// Export pour les autres modules
export {
    loadDashboard,
    refreshDashboard,
    updateWelcomeMessage,
    loadUserStats,
    displayStats,
    addPredictionCards
};

