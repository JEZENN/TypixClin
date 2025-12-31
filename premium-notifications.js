// ============================================
// SYSTÈME DE NOTIFICATIONS PREMIUM - VERSION SIMPLIFIÉE
// ============================================

/**
 * ⚡ CONFIGURATION - Contrôlé dynamiquement par TableurEnLigne.html
 */
const PREMIUM_NOTIFICATIONS_ENABLED = false; // Désactivé par défaut

/**
 * Configuration des textes (personnalisable)
 */
const PREMIUM_CONFIG = {
    // Bouton sticky
    buttonText: "Devenir Premium",
    buttonIcon: "👑",
    
    // Modal
    modalTitle: "Passez Premium !",
    modalSubtitle: "Débloquez toutes les fonctionnalités",
    modalCTA: "Découvrir Premium",
    
    // Toast
    toastMessage: "Cette fonctionnalité nécessite un compte Premium",
    toastDuration: 4000,
    
    // Features affichées dans le modal
    features: [
        { icon: "✏️", text: "Modification illimitée" },
        { icon: "➕", text: "Ajout de tours illimité" },
        { icon: "☁️", text: "Sauvegarde cloud" },
        { icon: "📊", text: "Statistiques avancées" },
        { icon: "🏆", text: "Système de trophées" },
        { icon: "🔄", text: "Synchronisation" }
    ]
};

/**
 * Système de notifications Premium
 */
const PremiumSystem = {
    isEnabled: PREMIUM_NOTIFICATIONS_ENABLED,
    modalOpen: false,
    
    init() {
        if (!this.isEnabled) {
            console.log('💡 Mode Premium activé - Notifications désactivées');
            return;
        }
        
        console.log('🔔 Mode Freemium - Fonctionnalités limitées');
        this.addStyles();
        this.createStickyButton();
        this.createModal();
        this.interceptEditing();
        this.blockConfigModals();
    },
    
    enable() {
        this.isEnabled = true;
        this.init();
    },
    
    disable() {
        this.isEnabled = false;
        this.cleanup();
    },
    
    cleanup() {
        // Supprimer les éléments créés
        document.getElementById('premium-sticky-btn')?.remove();
        document.getElementById('premium-modal')?.remove();
        document.getElementById('premium-toast')?.remove();
        console.log('🧹 Notifications premium nettoyées');
    },
    
    /**
     * Créer le bouton sticky en bas à droite
     */
    createStickyButton() {
        if (document.getElementById('premium-sticky-btn')) return;
        
        const button = document.createElement('button');
        button.id = 'premium-sticky-btn';
        button.className = 'premium-sticky-btn';
        button.innerHTML = `
            <span class="premium-btn-icon">${PREMIUM_CONFIG.buttonIcon}</span>
            <span class="premium-btn-text">${PREMIUM_CONFIG.buttonText}</span>
        `;
        
        button.addEventListener('click', () => this.openModal());
        document.body.appendChild(button);
    },
    
    /**
     * Créer le modal
     */
    createModal() {
        if (document.getElementById('premium-modal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'premium-modal';
        modal.className = 'premium-modal';
        
        const featuresHTML = PREMIUM_CONFIG.features.map(f => `
            <div class="premium-feature">
                <span class="premium-feature-icon">${f.icon}</span>
                <span class="premium-feature-text">${f.text}</span>
            </div>
        `).join('');
        
        modal.innerHTML = `
            <div class="premium-modal-overlay"></div>
            <div class="premium-modal-card">
                <button class="premium-modal-close" aria-label="Fermer">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                
                <div class="premium-modal-header">
                    <div class="premium-modal-icon">
                        <span>${PREMIUM_CONFIG.buttonIcon}</span>
                    </div>
                    <h2 class="premium-modal-title">${PREMIUM_CONFIG.modalTitle}</h2>
                    <p class="premium-modal-subtitle">${PREMIUM_CONFIG.modalSubtitle}</p>
                </div>
                
                <div class="premium-modal-features">
                    ${featuresHTML}
                </div>
                
                <div class="premium-modal-footer">
                    <a href="comptepremium.html" class="premium-modal-cta">
                        <span>${PREMIUM_CONFIG.modalCTA}</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </a>
                    <button class="premium-modal-later">Plus tard</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('.premium-modal-overlay').addEventListener('click', () => this.closeModal());
        modal.querySelector('.premium-modal-close').addEventListener('click', () => this.closeModal());
        modal.querySelector('.premium-modal-later').addEventListener('click', () => this.closeModal());
    },
    
    openModal() {
        const modal = document.getElementById('premium-modal');
        if (modal) {
            this.modalOpen = true;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },
    
    closeModal() {
        const modal = document.getElementById('premium-modal');
        if (modal) {
            this.modalOpen = false;
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    showToast() {
        const existingToast = document.getElementById('premium-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.id = 'premium-toast';
        toast.className = 'premium-toast';
        toast.innerHTML = `
            <div class="premium-toast-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <div class="premium-toast-content">
                <div class="premium-toast-message">${PREMIUM_CONFIG.toastMessage}</div>
                <button class="premium-toast-cta" onclick="PremiumSystem.openModal()">
                    En savoir plus
                </button>
            </div>
            <button class="premium-toast-close" onclick="this.parentElement.remove()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, PREMIUM_CONFIG.toastDuration);
    },
    
    interceptEditing() {
        const editableSelectors = [
            'input[type="number"]',
            'input[type="text"]',
            'input[type="time"]',
            'input[type="date"]',
            'select',
            'textarea',
            'button.confidence-btn',
            'button.add-tour-btn',
            'button.modify-btn',
            'button.edit-btn',
            'button.delete-btn',
            'button.save-btn',
            '.editable',
            '[contenteditable="true"]',
            '.resource-box',
            '.resource-option',
            '#resources-config-btn',
            '.planning-btn',
            '#planning-form input',
            '#planning-form button'
        ];
        
        document.addEventListener('click', (e) => {
            if (!this.isEnabled || this.modalOpen) return;
            
            const isEditable = editableSelectors.some(selector => 
                e.target.matches(selector) || e.target.closest(selector)
            );
            
            if (isEditable) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.showToast();
                return false;
            }
        }, { capture: true, passive: false });
        
        document.addEventListener('focus', (e) => {
            if (!this.isEnabled || this.modalOpen) return;
            
            const isInput = e.target.matches('input, select, textarea');
            if (isInput) {
                e.target.blur();
                this.showToast();
            }
        }, { capture: true, passive: false });
    },
    
    blockConfigModals() {
        const observer = new MutationObserver((mutations) => {
            if (!this.isEnabled || this.modalOpen) return;
            
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.id === 'resources-config-modal' || 
                            node.id === 'planning-modal' ||
                            node.classList?.contains('modal')) {
                            
                            setTimeout(() => {
                                if (node.classList.contains('active')) {
                                    node.classList.remove('active');
                                }
                                if (node.style.display === 'flex' || node.style.display === 'block') {
                                    node.style.display = 'none';
                                }
                            }, 0);
                            
                            this.showToast();
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },
    
    addStyles() {
        if (document.getElementById('premium-system-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'premium-system-styles';
        styles.textContent = `
            /* Bouton Sticky */
            .premium-sticky-btn {
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                z-index: 9998;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 1rem 1.5rem;
                border-radius: 999px;
                font-weight: 700;
                font-size: 1rem;
                cursor: pointer;
                box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
                animation: premium-pulse 3s ease-in-out infinite;
            }
            
            .premium-sticky-btn:hover {
                transform: translateY(-4px) scale(1.05);
                box-shadow: 0 12px 32px rgba(102, 126, 234, 0.6);
            }
            
            @keyframes premium-pulse {
                0%, 100% { box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4); }
                50% { box-shadow: 0 8px 32px rgba(102, 126, 234, 0.6); }
            }
            
            /* Modal */
            .premium-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            
            .premium-modal.active {
                opacity: 1;
                visibility: visible;
            }
            
            .premium-modal-overlay {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.75);
                backdrop-filter: blur(8px);
                cursor: pointer;
            }
            
            .premium-modal-card {
                position: relative;
                background: white;
                border-radius: 1.5rem;
                padding: 2.5rem;
                max-width: 480px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                transform: scale(0.9) translateY(20px);
                transition: transform 0.3s ease;
            }
            
            .premium-modal.active .premium-modal-card {
                transform: scale(1) translateY(0);
            }
            
            .premium-modal-close {
                position: absolute;
                top: 1.25rem;
                right: 1.25rem;
                background: #f3f4f6;
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                color: #6b7280;
            }
            
            .premium-modal-close:hover {
                background: #e5e7eb;
                transform: rotate(90deg);
            }
            
            .premium-modal-header {
                text-align: center;
                margin-bottom: 2rem;
            }
            
            .premium-modal-icon {
                width: 80px;
                height: 80px;
                margin: 0 auto 1.5rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2.5rem;
                box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
            }
            
            .premium-modal-title {
                font-size: 1.75rem;
                font-weight: 900;
                color: #111827;
                margin-bottom: 0.5rem;
            }
            
            .premium-modal-subtitle {
                font-size: 1rem;
                color: #6b7280;
            }
            
            .premium-modal-features {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
                margin-bottom: 2rem;
                padding: 1.5rem;
                background: #f9fafb;
                border-radius: 1rem;
            }
            
            .premium-feature {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                font-size: 0.95rem;
                color: #374151;
                font-weight: 500;
            }
            
            .premium-feature-icon {
                font-size: 1.5rem;
            }
            
            .premium-modal-footer {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }
            
            .premium-modal-cta {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                padding: 1rem 2rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 0.75rem;
                font-weight: 700;
                font-size: 1.05rem;
                text-decoration: none;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .premium-modal-cta:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .premium-modal-later {
                padding: 0.75rem;
                background: transparent;
                color: #6b7280;
                border: none;
                border-radius: 0.5rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .premium-modal-later:hover {
                background: #f3f4f6;
                color: #374151;
            }
            
            /* Toast */
            .premium-toast {
                position: fixed;
                bottom: 6rem;
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
                border-left: 4px solid #667eea;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
            }
            
            .premium-toast.show {
                opacity: 1;
                transform: translateY(0);
            }
            
            .premium-toast-icon {
                flex-shrink: 0;
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }
            
            .premium-toast-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .premium-toast-message {
                font-weight: 600;
                color: #111827;
                font-size: 0.95rem;
            }
            
            .premium-toast-cta {
                align-self: flex-start;
                background: transparent;
                border: none;
                color: #667eea;
                font-weight: 700;
                font-size: 0.85rem;
                cursor: pointer;
                padding: 0;
                text-decoration: underline;
            }
            
            .premium-toast-cta:hover {
                color: #764ba2;
            }
            
            .premium-toast-close {
                flex-shrink: 0;
                background: transparent;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                padding: 0.25rem;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 0.25rem;
                transition: all 0.3s ease;
            }
            
            .premium-toast-close:hover {
                background: #f3f4f6;
                color: #374151;
            }
            
            @media (max-width: 640px) {
                .premium-sticky-btn {
                    bottom: 1.5rem;
                    right: 1.5rem;
                    padding: 0.875rem 1.25rem;
                }
                
                .premium-btn-text {
                    display: none;
                }
                
                .premium-modal-features {
                    grid-template-columns: 1fr;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (PREMIUM_NOTIFICATIONS_ENABLED) {
            PremiumSystem.init();
        }
    });
} else if (PREMIUM_NOTIFICATIONS_ENABLED) {
    PremiumSystem.init();
}

window.PremiumSystem = PremiumSystem;