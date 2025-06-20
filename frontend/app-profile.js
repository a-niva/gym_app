// ===== MODULE PROFIL =====
import { currentUser } from './app-state.js';
import { showToast } from './app-ui.js';
import { showWelcomeScreen } from './app-init.js';

// ===== AFFICHAGE DES INFORMATIONS DU PROFIL =====
function loadProfileInfo() {
    const container = document.querySelector('#profile .profile-info');
    if (!container || !currentUser) return;
    
    const age = currentUser.birth_date ? 
        Math.floor((new Date() - new Date(currentUser.birth_date)) / (365.25 * 24 * 60 * 60 * 1000)) : 
        'N/A';
    
    container.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.05); padding: 2rem; border-radius: var(--radius); margin-bottom: 2rem;">
            <h2 style="margin-bottom: 1.5rem;">👤 ${currentUser.name}</h2>
            
            <div style="display: grid; gap: 1rem;">
                <div class="profile-row">
                    <span style="color: var(--gray);">Âge:</span>
                    <strong>${age} ans</strong>
                </div>
                
                <div class="profile-row">
                    <span style="color: var(--gray);">Taille:</span>
                    <strong>${currentUser.height} cm</strong>
                </div>
                
                <div class="profile-row">
                    <span style="color: var(--gray);">Poids:</span>
                    <strong>${currentUser.weight} kg</strong>
                </div>
                
                <div class="profile-row">
                    <span style="color: var(--gray);">Niveau:</span>
                    <strong>${currentUser.experience_level}</strong>
                </div>
                
                <div class="profile-row">
                    <span style="color: var(--gray);">Membre depuis:</span>
                    <strong>${new Date(currentUser.created_at).toLocaleDateString('fr-FR')}</strong>
                </div>
            </div>
        </div>
    `;
}

// ===== SUPPRESSION DU PROFIL =====
async function deleteProfile() {
    if (!currentUser) return;
    
    // Triple confirmation pour éviter les accidents
    const firstConfirm = confirm(
        `⚠️ ATTENTION ⚠️\n\n` +
        `Êtes-vous sûr de vouloir supprimer définitivement votre profil "${currentUser.name}" ?\n\n` +
        `Cette action supprimera :\n` +
        `• Toutes vos informations personnelles\n` +
        `• Tout votre historique d'entraînement\n` +
        `• Tous vos programmes\n\n` +
        `Cette action est IRRÉVERSIBLE !`
    );
    
    if (!firstConfirm) return;
    
    const secondConfirm = confirm(
        `⚠️ DERNIÈRE CHANCE ⚠️\n\n` +
        `Voulez-vous VRAIMENT supprimer votre profil ?\n\n` +
        `Tapez OK pour confirmer la suppression définitive.`
    );
    
    if (!secondConfirm) return;
    
    try {
        const response = await fetch(`/api/users/${currentUser.id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Nettoyer le localStorage
            localStorage.removeItem('userId');
            localStorage.removeItem('userProfile');
            localStorage.removeItem('currentWorkout');
            localStorage.removeItem('silentMode');
            
            showToast('Profil supprimé', 'success');
            
            // Retourner à l'écran d'accueil
            showWelcomeScreen();
        } else {
            showToast('Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        console.error('Erreur suppression profil:', error);
        showToast('Erreur de connexion', 'error');
    }
}

// Export des fonctions
window.loadProfileInfo = loadProfileInfo;
window.deleteProfile = deleteProfile;

export { loadProfileInfo, deleteProfile };