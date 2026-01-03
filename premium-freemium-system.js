// ============================================
// SYSTÈME FREEMIUM - VERSION FIREBASE
// Gère le statut premium et les restrictions d'accès
// ============================================

/**
 * Configuration Firebase (à adapter selon votre config)
 */
const FIREBASE_CONFIG = {
    // Ces valeurs seront récupérées depuis votre configuration Firebase existante
    // Assurez-vous qu'elles sont définies dans TableurEnLigne.html
};

/**
 * Configuration des restrictions Freemium
 */
const FREEMIUM_CONFIG = {
    // Icônes
    premiumIcon: "👑",
    freemiumIcon: "🛒",
    
    // URLs
    premiumPageUrl: "comptepremium.html",
    
    // Messages
    messages: {
        freemiumAccess: "Version gratuite - Fonctionnalités limitées",
        premiumAccess: "Accès Premium actif",
        upgradeRequired: "Cette fonctionnalité nécessite un compte Premium"
    },
    
    // Restrictions pour version Freemium
    restrictions: {
        maxItemsInChecklist: 10,        // Nombre max d'items dans la checklist
        maxToursPerItem: 3,              // Nombre max de tours par item
        canAddTours: false,              // Pas d'ajout de tours supplémentaires
        canModifyConfidence: false,      // Pas de modification des niveaux de confiance
        canExportData: false,            // Pas d'export des données
        canAccessStats: false,           // Statistiques limitées
        canAccessTrophies: false,        // Pas d'accès aux trophées
        maxSpecialtiesAccess: 5,         // Nombre max de spécialités accessibles
        canCustomizeResources: false,    // Pas de personnalisation des ressources
        showAds: false                   // Afficher de la pub (optionnel)
    }
};

/**
 * Système Freemium Principal
 */
const FreemiumSystem = {
    user: null,
    isPremium: false,
    premiumType: null,
    loading: true,
    initialized: false,
    
    /**
     * Initialiser le système
     */
    async init() {
        if (this.initialized) return;
        
        console.log('🔐 Initialisation du système Freemium...');
        
        // Ajouter les styles
        this.addStyles();
        
        // Vérifier l'authentification Firebase
        if (typeof firebase === 'undefined' || !firebase.auth) {
            console.error('❌ Firebase Auth non disponible');
            this.showFreemiumState();
            return;
        }
        
        // Écouter les changements d'authentification
        firebase.auth().onAuthStateChanged(async (user) => {
            this.loading = true;
            
            if (user) {
                this.user = user;
                console.log('👤 Utilisateur connecté:', user.email);
                await this.checkPremiumStatus(user.uid);
            } else {
                console.log('👤 Utilisateur non connecté');
                this.user = null;
                this.isPremium = false;
                this.showFreemiumState();
            }
            
            this.loading = false;
            this.initialized = true;
        });
    },
    
    /**
     * Vérifier le statut premium de l'utilisateur
     */
    async checkPremiumStatus(userId) {
        try {
            console.log('🔍 Vérification du statut premium...');
            
            // Récupérer les données utilisateur depuis Firestore
            const db = firebase.firestore();
            const userDoc = await db.collection('users').doc(userId).get();
            
            if (!userDoc.exists) {
                console.log('⚠️ Document utilisateur non trouvé');
                this.isPremium = false;
                this.showFreemiumState();
                return;
            }
            
            const userData = userDoc.data();
            console.log('📄 Données utilisateur:', userData);
            
            // Vérifier si l'utilisateur est en période de grâce
            if (userData.premiumType === 'grace_period') {
                const graceEnd = userData.gracePeriodEnd?.toMillis();
                if (graceEnd && graceEnd > Date.now()) {
                    this.isPremium = true;
                    this.premiumType = 'grace_period';
                    console.log('✅ Période de grâce active jusqu\'au', new Date(graceEnd).toLocaleDateString('fr-FR'));
                    this.showPremiumState();
                    return;
                }
            }
            
            // Vérifier si l'utilisateur a un abonnement actif
            if (userData.isPremium && userData.subscriptionStatus === 'active') {
                const endDate = userData.subscriptionEndDate?.toMillis();
                if (endDate && endDate > Date.now()) {
                    this.isPremium = true;
                    this.premiumType = userData.premiumType || 'subscription';
                    console.log('✅ Abonnement premium actif jusqu\'au', new Date(endDate).toLocaleDateString('fr-FR'));
                    this.showPremiumState();
                    return;
                }
            }
            
            // Sinon, l'utilisateur est en version gratuite
            console.log('📦 Utilisateur en version gratuite');
            this.isPremium = false;
            this.showFreemiumState();
            
        } catch (error) {
            console.error('❌ Erreur lors de la vérification du statut:', error);
            this.isPremium = false;
            this.showFreemiumState();
        }
    },
    
    /**
     * Afficher l'état Premium
     */
    showPremiumState() {
        console.log('👑 Affichage de l\'état Premium');
        this.createStatusBadge(true);
        this.enableAllFeatures();
    },
    
    /**
     * Afficher l'état Freemium
     */
    showFreemiumState() {
        console.log('🛒 Affichage de l\'état Freemium');
        this.createStatusBadge(false);
        this.applyFreemiumRestrictions();
    },
    
    /**
     * Créer le badge de statut à côté du logo
     */
    createStatusBadge(isPremium) {
        // Supprimer le badge existant s'il existe
        const existingBadge = document.getElementById('premium-status-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Trouver le logo TypixClin
        const logo = document.querySelector('.logo');
        if (!logo) {
            console.warn('⚠️ Logo TypixClin non trouvé');
            return;
        }
        
        // Créer le badge
        const badge = document.createElement('a');
        badge.id = 'premium-status-badge';
        badge.href = FREEMIUM_CONFIG.premiumPageUrl;
        badge.className = isPremium ? 'status-badge premium' : 'status-badge freemium';
        badge.innerHTML = isPremium ? FREEMIUM_CONFIG.premiumIcon : FREEMIUM_CONFIG.freemiumIcon;
        badge.title = isPremium ? FREEMIUM_CONFIG.messages.premiumAccess : FREEMIUM_CONFIG.messages.freemiumAccess;
        
        // Insérer après le logo
        logo.parentNode.insertBefore(badge, logo.nextSibling);
        
        console.log(`✅ Badge ${isPremium ? 'Premium 👑' : 'Freemium 🛒'} ajouté`);
    },
    
    /**
     * Activer toutes les fonctionnalités (mode Premium)
     */
    enableAllFeatures() {
        console.log('✅ Activation de toutes les fonctionnalités');
        
        // Retirer tous les blocages
        document.body.classList.remove('freemium-mode');
        document.body.classList.add('premium-mode');
        
        // Supprimer tous les overlays de restriction
        document.querySelectorAll('.freemium-restriction-overlay').forEach(el => el.remove());
        
        // Réactiver tous les éléments bloqués
        document.querySelectorAll('[data-freemium-blocked]').forEach(el => {
            el.removeAttribute('data-freemium-blocked');
            el.style.pointerEvents = '';
            el.style.opacity = '';
        });
    },
    
    /**
     * Appliquer les restrictions Freemium
     */
    applyFreemiumRestrictions() {
        console.log('🔒 Application des restrictions Freemium');
        
        document.body.classList.add('freemium-mode');
        document.body.classList.remove('premium-mode');
        
        const restrictions = FREEMIUM_CONFIG.restrictions;
        
        // 1. Bloquer l'ajout de tours supplémentaires
        if (!restrictions.canAddTours) {
            this.blockAddTours();
        }
        
        // 2. Bloquer la modification des niveaux de confiance
        if (!restrictions.canModifyConfidence) {
            this.blockConfidenceModification();
        }
        
        // 3. Limiter l'accès aux statistiques
        if (!restrictions.canAccessStats) {
            this.restrictStatsAccess();
        }
        
        // 4. Bloquer l'accès aux trophées
        if (!restrictions.canAccessTrophies) {
            this.blockTrophiesAccess();
        }
        
        // 5. Bloquer la personnalisation des ressources
        if (!restrictions.canCustomizeResources) {
            this.blockResourceCustomization();
        }
        
        // 6. Limiter le nombre d'items dans la checklist
        if (restrictions.maxItemsInChecklist) {
            this.limitChecklistItems(restrictions.maxItemsInChecklist);
        }
        
        // 7. Afficher un message d'info
        this.showFreemiumNotification();
    },
    
    /**
     * Bloquer l'ajout de tours
     */
    blockAddTours() {
        const addTourButtons = document.querySelectorAll('.add-tour-btn, [onclick*="addTour"]');
        addTourButtons.forEach(btn => {
            btn.setAttribute('data-freemium-blocked', 'true');
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.style.pointerEvents = 'none';
            
            // Ajouter un tooltip
            btn.title = 'Premium requis pour ajouter des tours';
        });
        console.log(`🔒 ${addTourButtons.length} boutons "Ajouter un tour" bloqués`);
    },
    
    /**
     * Bloquer la modification des niveaux de confiance
     */
    blockConfidenceModification() {
        // Intercepter les clics sur les boutons de confiance
        document.addEventListener('click', (e) => {
            if (!this.isPremium) {
                const confidenceBtn = e.target.closest('.confidence-btn, [data-confidence]');
                if (confidenceBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showUpgradeModal('Modification des niveaux de confiance');
                }
            }
        }, true);
        
        console.log('🔒 Modification des niveaux de confiance bloquée');
    },
    
    /**
     * Restreindre l'accès aux statistiques
     */
    restrictStatsAccess() {
        const statsSection = document.getElementById('page-stats');
        if (statsSection) {
            const overlay = this.createRestrictionOverlay('Statistiques détaillées');
            statsSection.style.position = 'relative';
            statsSection.appendChild(overlay);
        }
        console.log('🔒 Accès aux statistiques restreint');
    },
    
    /**
     * Bloquer l'accès aux trophées
     */
    blockTrophiesAccess() {
        const trophiesSection = document.querySelector('[data-page="stats"] .trophies-container, #trophies-progress');
        if (trophiesSection) {
            const overlay = this.createRestrictionOverlay('Système de trophées');
            trophiesSection.style.position = 'relative';
            trophiesSection.appendChild(overlay);
        }
        console.log('🔒 Accès aux trophées bloqué');
    },
    
    /**
     * Bloquer la personnalisation des ressources
     */
    blockResourceCustomization() {
        const resourcesConfigBtn = document.getElementById('resources-config-btn');
        if (resourcesConfigBtn) {
            resourcesConfigBtn.setAttribute('data-freemium-blocked', 'true');
            resourcesConfigBtn.style.opacity = '0.5';
            resourcesConfigBtn.style.cursor = 'not-allowed';
            resourcesConfigBtn.style.pointerEvents = 'none';
        }
        console.log('🔒 Personnalisation des ressources bloquée');
    },
    
    /**
     * Limiter le nombre d'items dans la checklist
     */
    limitChecklistItems(maxItems) {
        // Observer les modifications de la checklist
        const checkChecklistLimit = () => {
            const checklistItems = document.querySelectorAll('.checklist-item');
            if (checklistItems.length >= maxItems) {
                // Bloquer l'ajout de nouveaux items
                const addButtons = document.querySelectorAll('[onclick*="sendToChecklist"]');
                addButtons.forEach(btn => {
                    btn.setAttribute('data-freemium-blocked', 'true');
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                    btn.onclick = (e) => {
                        e.preventDefault();
                        this.showUpgradeModal(`Limite de ${maxItems} items atteinte`);
                    };
                });
            }
        };
        
        // Vérifier initialement
        checkChecklistLimit();
        
        // Observer les changements
        const observer = new MutationObserver(checkChecklistLimit);
        const checklistContainer = document.querySelector('.checklist-items, #checklist-items');
        if (checklistContainer) {
            observer.observe(checklistContainer, { childList: true, subtree: true });
        }
        
        console.log(`🔒 Limite de ${maxItems} items dans la checklist appliquée`);
    },
    
    /**
     * Créer un overlay de restriction
     */
    createRestrictionOverlay(featureName) {
        const overlay = document.createElement('div');
        overlay.className = 'freemium-restriction-overlay';
        overlay.innerHTML = `
            <div class="restriction-content">
                <div class="restriction-icon">🔒</div>
                <h3>Fonctionnalité Premium</h3>
                <p>${featureName}</p>
                <button class="restriction-cta" onclick="FreemiumSystem.showUpgradeModal('${featureName}')">
                    Passer Premium
                </button>
            </div>
        `;
        return overlay;
    },
    
    /**
     * Afficher une notification Freemium
     */
    showFreemiumNotification() {
        // Vérifier si on a déjà affiché la notification dans cette session
        if (sessionStorage.getItem('freemiumNotificationShown')) {
            return;
        }
        
        setTimeout(() => {
            this.showToast(FREEMIUM_CONFIG.messages.freemiumAccess, 'info');
            sessionStorage.setItem('freemiumNotificationShown', 'true');
        }, 2000);
    },
    
    /**
     * Afficher un toast
     */
    showToast(message, type = 'info') {
        // Supprimer les toasts existants
        document.querySelectorAll('.freemium-toast').forEach(t => t.remove());
        
        const toast = document.createElement('div');
        toast.className = `freemium-toast ${type}`;
        
        const icon = type === 'info' ? '💡' : type === 'warning' ? '⚠️' : 'ℹ️';
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
                <button class="toast-cta" onclick="window.location.href='${FREEMIUM_CONFIG.premiumPageUrl}'">
                    Passer Premium
                </button>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 6000);
    },
    
    /**
     * Afficher le modal de mise à niveau
     */
    showUpgradeModal(featureName) {
        // Supprimer le modal existant s'il existe
        const existingModal = document.getElementById('upgrade-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'upgrade-modal';
        modal.className = 'upgrade-modal';
        modal.innerHTML = `
            <div class="upgrade-modal-overlay" onclick="document.getElementById('upgrade-modal').remove()"></div>
            <div class="upgrade-modal-content">
                <button class="upgrade-modal-close" onclick="document.getElementById('upgrade-modal').remove()">×</button>
                
                <div class="upgrade-icon">👑</div>
                <h2>Fonctionnalité Premium</h2>
                <p class="upgrade-feature">${featureName}</p>
                <p class="upgrade-description">
                    Cette fonctionnalité est réservée aux utilisateurs Premium. 
                    Passez Premium pour débloquer toutes les fonctionnalités avancées !
                </p>
                
                <div class="upgrade-benefits">
                    <div class="benefit-item">✏️ Modification illimitée</div>
                    <div class="benefit-item">➕ Ajout de tours</div>
                    <div class="benefit-item">📊 Statistiques complètes</div>
                    <div class="benefit-item">🏆 Système de trophées</div>
                    <div class="benefit-item">☁️ Sauvegarde cloud</div>
                    <div class="benefit-item">🔄 Synchronisation</div>
                </div>
                
                <a href="${FREEMIUM_CONFIG.premiumPageUrl}" class="upgrade-cta">
                    <span>Découvrir Premium</span>
                    <span>→</span>
                </a>
                
                <button class="upgrade-later" onclick="document.getElementById('upgrade-modal').remove()">
                    Plus tard
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Bloquer le scroll
        document.body.style.overflow = 'hidden';
        
        // Restaurer le scroll à la fermeture
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('upgrade-modal-overlay') || 
                e.target.classList.contains('upgrade-modal-close') ||
                e.target.classList.contains('upgrade-later')) {
                document.body.style.overflow = '';
            }
        });
    },
    
    /**
     * Vérifier si une action est autorisée
     */
    isActionAllowed(action) {
        if (this.isPremium) {
            return true;
        }
        
        const restrictions = FREEMIUM_CONFIG.restrictions;
        
        switch(action) {
            case 'addTour':
                return restrictions.canAddTours;
            case 'modifyConfidence':
                return restrictions.canModifyConfidence;
            case 'accessStats':
                return restrictions.canAccessStats;
            case 'accessTrophies':
                return restrictions.canAccessTrophies;
            case 'customizeResources':
                return restrictions.canCustomizeResources;
            case 'exportData':
                return restrictions.canExportData;
            default:
                return false;
        }
    },
    
    /**
     * Ajouter les styles CSS
     */
    addStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            /* ===== BADGE DE STATUT ===== */
            .status-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                margin-left: 0.75rem;
                font-size: 1.5rem;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                position: relative;
                animation: fadeInScale 0.5s ease-out;
            }
            
            .status-badge.premium {
                background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
            }
            
            .status-badge.premium:hover {
                transform: scale(1.1) rotate(15deg);
                box-shadow: 0 6px 20px rgba(251, 191, 36, 0.6);
            }
            
            .status-badge.freemium {
                background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
                box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
            }
            
            .status-badge.freemium:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
            }
            
            @keyframes fadeInScale {
                from {
                    opacity: 0;
                    transform: scale(0.5);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            /* ===== OVERLAY DE RESTRICTION ===== */
            .freemium-restriction-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
                border-radius: inherit;
            }
            
            [data-theme="dark"] .freemium-restriction-overlay {
                background: rgba(30, 41, 59, 0.95);
            }
            
            .restriction-content {
                text-align: center;
                padding: 2rem;
                max-width: 300px;
            }
            
            .restriction-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
            
            .restriction-content h3 {
                font-size: 1.25rem;
                font-weight: 700;
                color: var(--gray-900);
                margin-bottom: 0.5rem;
            }
            
            .restriction-content p {
                color: var(--gray-600);
                margin-bottom: 1.5rem;
                font-size: 0.9rem;
            }
            
            .restriction-cta {
                padding: 0.75rem 2rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 50px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            
            .restriction-cta:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            /* ===== TOAST ===== */
            .freemium-toast {
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                z-index: 9999;
                background: white;
                border-radius: 1rem;
                padding: 1.25rem;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 1rem;
                max-width: 400px;
                width: calc(100vw - 4rem);
                border-left: 4px solid #3b82f6;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            [data-theme="dark"] .freemium-toast {
                background: #1e293b;
                border-left-color: #60a5fa;
            }
            
            .freemium-toast.show {
                opacity: 1;
                transform: translateY(0);
            }
            
            .toast-icon {
                font-size: 2rem;
                flex-shrink: 0;
            }
            
            .toast-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .toast-message {
                font-weight: 600;
                color: var(--gray-900);
                font-size: 0.95rem;
            }
            
            .toast-cta {
                align-self: flex-start;
                background: transparent;
                border: none;
                color: #3b82f6;
                font-weight: 700;
                font-size: 0.85rem;
                cursor: pointer;
                padding: 0;
                text-decoration: underline;
                transition: color 0.3s ease;
            }
            
            .toast-cta:hover {
                color: #1d4ed8;
            }
            
            .toast-close {
                flex-shrink: 0;
                background: transparent;
                border: none;
                color: var(--gray-400);
                cursor: pointer;
                font-size: 1.5rem;
                line-height: 1;
                padding: 0.25rem;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 0.25rem;
                transition: all 0.3s ease;
            }
            
            .toast-close:hover {
                background: var(--gray-100);
                color: var(--gray-700);
            }
            
            /* ===== MODAL DE MISE À NIVEAU ===== */
            .upgrade-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            
            .upgrade-modal.show {
                opacity: 1;
                visibility: visible;
            }
            
            .upgrade-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
            }
            
            .upgrade-modal-content {
                position: relative;
                background: white;
                border-radius: 1.5rem;
                padding: 3rem 2.5rem;
                max-width: 500px;
                width: calc(100vw - 3rem);
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
                text-align: center;
                animation: modalSlideUp 0.3s ease-out;
            }
            
            [data-theme="dark"] .upgrade-modal-content {
                background: #1e293b;
            }
            
            @keyframes modalSlideUp {
                from {
                    opacity: 0;
                    transform: translateY(30px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            .upgrade-modal-close {
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: var(--gray-100);
                border: none;
                border-radius: 50%;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                color: var(--gray-600);
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .upgrade-modal-close:hover {
                background: var(--gray-200);
                color: var(--gray-900);
                transform: rotate(90deg);
            }
            
            .upgrade-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
            }
            
            .upgrade-modal-content h2 {
                font-size: 2rem;
                font-weight: 800;
                color: var(--gray-900);
                margin-bottom: 0.5rem;
            }
            
            .upgrade-feature {
                font-size: 1.1rem;
                font-weight: 600;
                color: #3b82f6;
                margin-bottom: 1rem;
            }
            
            .upgrade-description {
                color: var(--gray-600);
                line-height: 1.6;
                margin-bottom: 2rem;
            }
            
            .upgrade-benefits {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 0.75rem;
                margin-bottom: 2rem;
            }
            
            .benefit-item {
                background: var(--gray-50);
                padding: 0.75rem;
                border-radius: 0.75rem;
                font-size: 0.9rem;
                font-weight: 500;
                color: var(--gray-700);
            }
            
            .upgrade-cta {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                width: 100%;
                padding: 1rem 2rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 50px;
                font-weight: 700;
                font-size: 1.05rem;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
                text-decoration: none;
                margin-bottom: 1rem;
            }
            
            .upgrade-cta:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
            }
            
            .upgrade-later {
                background: transparent;
                border: none;
                color: var(--gray-500);
                font-weight: 600;
                cursor: pointer;
                padding: 0.5rem;
                transition: color 0.3s ease;
            }
            
            .upgrade-later:hover {
                color: var(--gray-700);
            }
            
            /* ===== RESPONSIVE ===== */
            @media (max-width: 768px) {
                .status-badge {
                    width: 35px;
                    height: 35px;
                    font-size: 1.25rem;
                    margin-left: 0.5rem;
                }
                
                .upgrade-modal-content {
                    padding: 2rem 1.5rem;
                }
                
                .upgrade-benefits {
                    grid-template-columns: 1fr;
                }
                
                .freemium-toast {
                    bottom: 1.5rem;
                    right: 1.5rem;
                    width: calc(100vw - 3rem);
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
};

// ============================================
// AUTO-INITIALISATION
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Attendre que Firebase soit initialisé
        setTimeout(() => FreemiumSystem.init(), 500);
    });
} else {
    setTimeout(() => FreemiumSystem.init(), 500);
}

// Exporter pour usage global
window.FreemiumSystem = FreemiumSystem;
