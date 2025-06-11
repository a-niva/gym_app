#!/usr/bin/env python3
"""
Script simple pour mettre à jour exercises.json avec les nouveaux noms d'équipement.
"""

import json
import os

def update_exercises_equipment():
    """Met à jour les noms d'équipement dans exercises.json"""
    
    # Mapping ancien -> nouveau format
    equipment_mapping = {
        "barbell": "barbell_standard",
        "ez_bar": "barbell_ez", 
        "dumbbells": "dumbbells",  # Reste pareil
        "bench": "bench_plat",
        "incline bench": "bench_inclinable",
        "resistance_bands": "elastiques",
        "bodyweight": "bodyweight",  # Reste pareil
        
        # Nouveaux équipements (pour référence future)
        "short_barbell": "barbell_courte",
        "kettlebell": "kettlebell",
        "pull_up_bar": "barre_traction",
        "weight_vest": "lest_corps",
        "ankle_weights": "lest_chevilles",
        "wrist_weights": "lest_poignets",
        
        # Machines et autres
        "cable_machine": "cables",
        "squat_rack": "squat_rack",
        "shoulder_press_machine": "machine_epaules",
        "leg_press_machine": "machine_jambes",
        "convergent_machine": "machine_convergente"
    }
    
    # Lire le fichier existant
    try:
        with open('exercises.json', 'r', encoding='utf-8') as f:
            exercises = json.load(f)
    except FileNotFoundError:
        print("❌ ERREUR: exercises.json non trouvé dans le répertoire courant")
        return False
    
    print(f"🔄 Mise à jour de {len(exercises)} exercices...")
    
    # Backup de l'ancien fichier
    if os.path.exists('exercises.json.backup'):
        os.remove('exercises.json.backup')
    os.rename('exercises.json', 'exercises.json.backup')
    print("📦 Backup créé: exercises.json.backup")
    
    # Mettre à jour chaque exercice
    updated_count = 0
    
    for exercise in exercises:
        old_equipment = exercise.get('equipment', [])
        new_equipment = []
        
        for eq in old_equipment:
            if eq in equipment_mapping:
                new_eq = equipment_mapping[eq]
                new_equipment.append(new_eq)
                
                # Ajouter des spécifications pour certains exercices
                if not exercise.get('equipment_specs'):
                    exercise['equipment_specs'] = {}
                
                # Spécifications automatiques basées sur le nom
                if new_eq == "barbell_standard":
                    exercise['equipment_specs']['barbell_count'] = 1
                elif new_eq == "dumbbells":
                    if "unilatéral" in exercise['name_fr'].lower() or "single" in exercise['name_eng'].lower():
                        exercise['equipment_specs']['dumbbell_count'] = 1
                    else:
                        exercise['equipment_specs']['dumbbell_count'] = 2
                elif new_eq == "bench_inclinable":
                    exercise['equipment_specs']['requires_incline'] = True
                
            else:
                print(f"⚠️  Équipement non mappé '{eq}' dans {exercise['name_fr']}")
                new_equipment.append(eq)  # Garder tel quel
        
        if new_equipment != old_equipment:
            updated_count += 1
            
        exercise['equipment'] = new_equipment
    
    # Sauvegarder le nouveau fichier
    with open('exercises.json', 'w', encoding='utf-8') as f:
        json.dump(exercises, f, ensure_ascii=False, indent=2)
    
    print(f"✅ {updated_count} exercices mis à jour")
    print(f"📁 Nouveau fichier: exercises.json")
    print(f"📁 Ancien fichier: exercises.json.backup")
    
    return True

def main():
    print("🏋️ MISE À JOUR EXERCICES - NOUVELLE STRUCTURE ÉQUIPEMENT")
    print("=" * 60)
    
    if not os.path.exists('exercises.json'):
        print("❌ Fichier exercises.json introuvable dans le répertoire courant")
        print("Assurez-vous d'être dans le bon répertoire")
        return
    
    print("📋 Mapping des équipements:")
    print("  barbell → barbell_standard")
    print("  ez_bar → barbell_ez") 
    print("  bench → bench_plat")
    print("  incline bench → bench_inclinable")
    print("  resistance_bands → elastiques")
    print("  + ajout d'equipment_specs automatiques")
    print()
    
    response = input("Continuer? (oui/non): ")
    if response.lower() != 'oui':
        print("Annulé")
        return
    
    if update_exercises_equipment():
        print("\n🎉 MISE À JOUR TERMINÉE")
        print("\nProchaines étapes:")
        print("1. Vérifier le fichier exercises.json")
        print("2. Vider la base de données")
        print("3. Redémarrer l'application")
        print("4. Les exercices seront automatiquement réimportés")
    else:
        print("\n❌ MISE À JOUR ÉCHOUÉE")

if __name__ == "__main__":
    main()