const { createApp } = Vue;

const API_URL = '/api';

// Timer sound
const timerSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');

createApp({
    data() {
        return {
            // Navigation
            view: 'home',
            loading: false,
            
            // User
            user: null,
            profile: {
                name: '',
                age: 25,
                experience_level: 'intermediate',
                goals: [],
                available_equipment: [],
                dumbbell_weights: []
            },
            
            equipmentDetails: {
                barbell_bar_weight: 20,
                dumbbell_bar_weight: 2.5,
                available_plates: [1.25, 2.5, 5, 10, 15, 20],
                usePairsForDumbbells: true
            },
            // Stats
            stats: {
                total_workouts: 0,
                total_volume: 0,
                week_workouts: 0
            },
            
            // Workout
            activeWorkout: null,
            currentExercise: null,
            currentSet: {
                set_number: 1,
                target_reps: 10,
                actual_reps: 10,
                weight: 20,
                rest_time: 90,
                fatigue_level: 5,
                perceived_exertion: 5
            },
            
            // Timer
            restTimer: 0,
            timerInterval: null,
            
            // Exercises
            exercises: [],
            searchQuery: '',
            filterBodyPart: '',
            bodyParts: [],
            
            // History
            workoutHistory: []
        }
    },
    
    computed: {
        filteredExercises() {
            return this.exercises.filter(ex => {
                const matchSearch = !this.searchQuery || 
                    ex.name_fr.toLowerCase().includes(this.searchQuery.toLowerCase());
                const matchBodyPart = !this.filterBodyPart || 
                    ex.body_part === this.filterBodyPart;
                const hasEquipment = ex.equipment.some(eq => 
                    this.user.available_equipment.includes(eq)
                );
                
                return matchSearch && matchBodyPart && hasEquipment;
            });
        }
    },
    
    methods: {
        // API calls
        async api(endpoint, method = 'GET', data = null) {
            this.loading = true;
            try {
                const options = {
                    method,
                    headers: { 'Content-Type': 'application/json' }
                };
                if (data) options.body = JSON.stringify(data);
                
                const response = await fetch(`${API_URL}${endpoint}`, options);
                if (!response.ok) throw new Error('API Error');
                return await response.json();
            } catch (error) {
                console.error('API Error:', error);
                alert('Erreur de connexion');
                throw error;
            } finally {
                this.loading = false;
            }
        },
        
        // Profile
        async saveProfile() {
            try {
                if (this.user) {
                    // Update not implemented in v1
                    alert('Mise à jour non implémentée');
                } else {
                    const user = await this.api('/users/', 'POST', this.profile);
                    this.user = user;
                    localStorage.setItem('userId', user.id);
                    await this.loadUserData();
                    this.view = 'home';
                }
            } catch (error) {
                console.error('Save profile error:', error);
            }
        },
        
        async loadUserData() {
            if (!this.user) return;
            
            // Load stats
            this.stats = await this.api(`/stats/${this.user.id}`);
            
            // Load history
            this.workoutHistory = await this.api(`/workouts/${this.user.id}/history`);
        },
        
        // Workout
        async startWorkout() {
            try {
                const workout = await this.api('/workouts/', 'POST', {
                    user_id: this.user.id,
                    type: 'free_time'
                });
                this.activeWorkout = workout;
                this.view = 'workout';
            } catch (error) {
                console.error('Start workout error:', error);
            }
        },
        
        async selectExercise(exercise) {
            this.currentExercise = exercise;
            
            // Get last weight
            try {
                const lastData = await this.api(`/sets/last-weight/${this.user.id}/${exercise.id}`);
                if (lastData.weight) {
                    this.currentSet.weight = lastData.weight;
                    this.currentSet.target_reps = lastData.reps;
                    this.currentSet.actual_reps = lastData.reps;
                }
            } catch (error) {
                console.error('Get last weight error:', error);
            }
            
            this.currentSet.set_number = 1;
        },
        
        async completeSet() {
            try {
                await this.api('/sets/', 'POST', {
                    workout_id: this.activeWorkout.id,
                    exercise_id: this.currentExercise.id,
                    ...this.currentSet,
                    skipped: false
                });
                
                // Start rest timer
                this.startRestTimer();
                
                // Prepare next set
                this.currentSet.set_number++;
                
            } catch (error) {
                console.error('Complete set error:', error);
            }
        },
        
        async skipSet() {
            await this.api('/sets/', 'POST', {
                workout_id: this.activeWorkout.id,
                exercise_id: this.currentExercise.id,
                ...this.currentSet,
                skipped: true
            }).catch(() => {});
            
            this.currentSet.set_number++;
        },
        
        finishExercise() {
            this.currentExercise = null;
            this.currentSet.set_number = 1;
        },
        
        async endWorkout() {
            if (confirm('Terminer la séance ?')) {
                if (this.activeWorkout) {
                    await this.api(`/workouts/${this.activeWorkout.id}/complete`, 'PUT');
                }
                this.activeWorkout = null;
                this.currentExercise = null;
                await this.loadUserData();
                this.view = 'home';
            }
        },
        
        // Timer
        startRestTimer() {
            this.restTimer = this.currentSet.rest_time;
            this.timerInterval = setInterval(() => {
                this.restTimer--;
                if (this.restTimer <= 0) {
                    this.stopTimer();
                    timerSound.play();
                }
            }, 1000);
        },
        
        stopTimer() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            this.restTimer = 0;
        },
        
        skipRest() {
            this.stopTimer();
        },
        
        // Utils
        formatDate(dateString) {
            const date = new Date(dateString);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (date.toDateString() === today.toDateString()) {
                return "Aujourd'hui";
            } else if (date.toDateString() === yesterday.toDateString()) {
                return "Hier";
            } else {
                return date.toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'short' 
                });
            }
        },
        
        calculateAvailableWeights(exerciseType) {
            const weights = [];
            if (exerciseType.includes('barbell')) {
                const barWeight = this.equipmentDetails.barbell_bar_weight;
                weights.push(barWeight);
                
                // Calculer toutes les combinaisons possibles avec 2 côtés
                const plates = this.equipmentDetails.available_plates;
                for (let i = 0; i < plates.length; i++) {
                    for (let j = i; j < plates.length; j++) {
                        weights.push(barWeight + (plates[i] + plates[j]) * 2);
                    }
                }
            } else if (exerciseType.includes('dumbbell')) {
                const barWeight = this.equipmentDetails.dumbbell_bar_weight;
                const multiplier = this.equipmentDetails.usePairsForDumbbells ? 2 : 1;
                
                this.equipmentDetails.available_plates.forEach(plate => {
                    weights.push((barWeight + plate * 2) * multiplier);
                });
            }
            return [...new Set(weights)].sort((a, b) => a - b);
        },
        
        // Init
        async init() {
            // Check saved user
            const userId = localStorage.getItem('userId');
            if (userId) {
                try {
                    this.user = await this.api(`/users/${userId}`);
                    this.profile = { ...this.user };
                    await this.loadUserData();
                } catch (error) {
                    localStorage.removeItem('userId');
                }
            }
            
            // Load exercises
            try {
                this.exercises = await this.api('/exercises/');
                this.bodyParts = [...new Set(this.exercises.map(e => e.body_part))].sort();
            } catch (error) {
                console.error('Load exercises error:', error);
            }
        }
    },
    
    mounted() {
        this.init();
    },
    
    beforeUnmount() {
        this.stopTimer();
    }
}).mount('#app');
