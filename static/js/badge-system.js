// Badge system for module completion
export class BadgeSystem {
    constructor() {
        this.moduleIds = ['1', '2', '3', '5', '6', '7'];
        this.excludedModules = ['mini-games', '4']; // Exclude Fun Activities section
        this.init();
    }

    isExcludedModule(moduleId) {
        return this.excludedModules.includes(moduleId);
    }

    init() {
        this.refreshAllBadges();
        this.observeModuleCards();
    }

    refreshAllBadges() {
        const moduleCards = document.querySelectorAll('.module-card');
        moduleCards.forEach(card => {
            const moduleId = card.dataset.moduleId;
            this.updateModuleBadge(card, moduleId);
        });
    }

    observeModuleCards() {
        // Watch for changes in module cards
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.target.classList.contains('module-card')) {
                    const moduleId = mutation.target.dataset.moduleId;
                    this.updateModuleBadge(mutation.target, moduleId);
                }
            });
        });

        // Observe all module cards
        document.querySelectorAll('.module-card').forEach(card => {
            observer.observe(card, { 
                attributes: true, 
                attributeFilter: ['class']
            });
        });
    }

    updateModuleBadge(card, moduleId) {
        if (!card || !moduleId || this.isExcludedModule(moduleId)) return;

        const progress = this.getModuleProgress(moduleId);
        const isCompleted = this.isModuleCompleted(progress);

        if (isCompleted) {
            this.addCompletionBadge(card);
        } else {
            this.removeCompletionBadge(card);
        }
    }

    getModuleProgress(moduleId) {
        const preQuizKey = `module_${moduleId}_pre_quiz`;
        const postQuizKey = `module_${moduleId}_post_quiz`;
        return {
            preQuizDone: localStorage.getItem(preQuizKey) === 'true',
            postQuizDone: localStorage.getItem(postQuizKey) === 'true'
        };
    }

    isModuleCompleted(progress) {
        return progress.preQuizDone && progress.postQuizDone;
    }

    addCompletionBadge(card) {
        if (!card.querySelector('.completion-badge')) {
            const badge = document.createElement('div');
            badge.className = 'completion-badge';
            badge.innerHTML = '<i class="fas fa-check"></i> Complete';
            card.appendChild(badge);
            card.classList.add('module-completed');

            // Add animation class for new badges
            badge.classList.add('new');
            setTimeout(() => badge.classList.remove('new'), 1000);
        }
    }

    removeCompletionBadge(card) {
        const badge = card.querySelector('.completion-badge');
        if (badge) {
            badge.remove();
            card.classList.remove('module-completed');
        }
    }

    // Method to clear all badges (useful for logout)
    clearAllBadges() {
        document.querySelectorAll('.module-card').forEach(card => {
            this.removeCompletionBadge(card);
        });
    }
}

// Initialize badge system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.badgeSystem = new BadgeSystem();
});

// Export for module use
export default BadgeSystem;