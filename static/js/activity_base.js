class ActivitySystem {
    constructor() {
        this.currentStep = 0;
        this.totalSteps = parseInt(document.getElementById('progressText').textContent.match(/\d+$/)[0]);
        this.activityData = {};
        this.userResponses = {};

        this.initElements();
        this.bindEvents();
        this.updateProgress();
        this.updateNavigation();
    }

    initElements() {
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.submitBtn = document.getElementById('submitBtn');
        this.feedbackModal = document.getElementById('feedbackModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalMessage = document.getElementById('modalMessage');
        this.retryBtn = document.getElementById('retryActivity');
        this.nextActivityBtn = document.getElementById('nextActivity');
        this.closeModalBtn = document.getElementById('closeModal');
    }

    bindEvents() {
        this.prevBtn.addEventListener('click', () => this.previousStep());
        this.nextBtn.addEventListener('click', () => this.nextStep());
        this.submitBtn.addEventListener('click', () => this.submitActivity());
        this.retryBtn.addEventListener('click', () => this.retryActivity());
        this.nextActivityBtn.addEventListener('click', () => this.goToNextActivity());
        this.closeModalBtn.addEventListener('click', () => this.closeModal());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && !this.prevBtn.disabled) {
                this.previousStep();
            } else if (e.key === 'ArrowRight' && !this.nextBtn.disabled) {
                this.nextStep();
            }
        });
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateProgress();
            this.updateNavigation();
            this.showStep(this.currentStep);
        }
    }

    nextStep() {
        if (this.currentStep < this.totalSteps - 1) {
            this.currentStep++;
            this.updateProgress();
            this.updateNavigation();
            this.showStep(this.currentStep);
        }
    }

    updateProgress() {
        const progress = ((this.currentStep + 1) / this.totalSteps) * 100;
        this.progressFill.style.width = progress + '%';
        this.progressText.textContent = `Step ${this.currentStep + 1} of ${this.totalSteps}`;
    }

    updateNavigation() {
        this.prevBtn.disabled = this.currentStep === 0;
        this.nextBtn.disabled = this.currentStep === this.totalSteps - 1;

        // Show submit button on last step
        if (this.currentStep === this.totalSteps - 1) {
            this.nextBtn.style.display = 'none';
            this.submitBtn.style.display = 'block';
        } else {
            this.nextBtn.style.display = 'flex';
            this.submitBtn.style.display = 'none';
        }
    }

    showStep(stepIndex) {
        // This should be implemented by specific activity types
        console.log(`Showing step ${stepIndex}`);
    }

    submitActivity() {
        // Validate activity completion
        const isComplete = this.validateActivity();

        if (isComplete) {
            this.showFeedback(true, "Great job! You've completed this activity successfully!");
            this.recordCompletion();
        } else {
            this.showFeedback(false, "Please complete all parts of the activity before submitting.");
        }
    }

    validateActivity() {
        // Should be implemented by specific activity types
        return true;
    }

    showFeedback(isSuccess, message) {
        this.modalTitle.textContent = isSuccess ? "Activity Complete!" : "Incomplete Activity";
        this.modalMessage.textContent = message;

        if (isSuccess) {
            this.modalTitle.parentElement.style.background = "linear-gradient(135deg, #48bb78, #38a169)";
            this.nextActivityBtn.style.display = "block";
            this.createConfetti();
        } else {
            this.modalTitle.parentElement.style.background = "linear-gradient(135deg, #f56565, #e53e3e)";
            this.nextActivityBtn.style.display = "none";
        }

        this.feedbackModal.style.display = "flex";
    }

    closeModal() {
        this.feedbackModal.style.display = "none";
    }

    retryActivity() {
        this.closeModal();
        this.currentStep = 0;
        this.userResponses = {};
        this.updateProgress();
        this.updateNavigation();
        this.showStep(0);
    }

    goToNextActivity() {
        // Redirect to next activity or module page
        window.location.href = "/menu"; // Default to menu, can be overridden
    }

    recordCompletion() {
        // Send completion data to server
        fetch('/record_activity_completion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                activity_id: window.activityId,
                responses: this.userResponses,
                completed_at: new Date().toISOString()
            })
        }).catch(error => console.error('Error:', error));
    }

    createConfetti() {
        const colors = ['#4299e1', '#48bb78', '#f6ad55', '#9f7aea', '#f687b3'];

        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animation = `confetti ${Math.random() * 3 + 2}s linear forwards`;
            document.body.appendChild(confetti);

            setTimeout(() => {
                confetti.remove();
            }, 5000);
        }
    }
}

// Initialize the activity system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.activitySystem = new ActivitySystem();
});