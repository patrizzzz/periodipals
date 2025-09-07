class HandwashingGuide {
            constructor() {
                this.currentStep = 0;
                this.autoAdvance = false;
                this.autoTimer = null;
                this.stepData = [
                    {
                        title: "Wet Your Hands",
                        description: "Turn on the tap and wet your hands with clean, running water. The temperature doesn't matter - use what's comfortable.",
                        icon: "fa-faucet",
                        animation: "pulse",
                        duration: 5
                    },
                    {
                        title: "Apply Soap",
                        description: "Apply enough soap to cover all hand surfaces. Liquid soap is preferred, but bar soap is fine if kept clean.",
                        icon: "fa-pump-soap",
                        animation: "pulse",
                        duration: 5
                    },
                    {
                        title: "Scrub Thoroughly",
                        description: "Rub hands together to create lather. Scrub all surfaces including palms, backs, fingers, thumbs, and under nails for at least 20 seconds.",
                        icon: "fa-hands",
                        animation: "rotate",
                        duration: 20
                    },
                    {
                        title: "Rinse Well",
                        description: "Rinse your hands thoroughly under clean, running water. Make sure to remove all soap residue.",
                        icon: "fa-shower",
                        animation: "pulse",
                        duration: 10
                    },
                    {
                        title: "Dry Your Hands",
                        description: "Dry your hands using a clean towel or air dryer. Avoid wiping hands on clothing or other surfaces.",
                        icon: "fa-wind",
                        animation: "shake",
                        duration: 10
                    }
                ];
                
                this.init();
            }
            
            init() {
                this.bindEvents();
                this.updateDisplay();
                this.createBubbles();
                this.startAutoAdvance();
            }
            
            bindEvents() {
                // Navigation buttons
                document.getElementById('prevBtn').addEventListener('click', () => this.previousStep());
                document.getElementById('nextBtn').addEventListener('click', () => this.nextStep());
                
                // Step sidebar clicks
                document.querySelectorAll('.step-item').forEach((item, index) => {
                    item.addEventListener('click', () => this.goToStep(index));
                    item.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            this.goToStep(index);
                        }
                    });
                    item.setAttribute('tabindex', '0');
                });
                
                // Keyboard navigation
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowLeft') this.previousStep();
                    if (e.key === 'ArrowRight') this.nextStep();
                    if (e.key === ' ') {
                        e.preventDefault();
                        this.toggleAutoAdvance();
                    }
                });
            }
            
            goToStep(stepIndex) {
                if (stepIndex >= 0 && stepIndex < this.stepData.length) {
                    this.currentStep = stepIndex;
                    this.updateDisplay();
                    this.resetAutoAdvance();
                }
            }
            
            nextStep() {
                if (this.currentStep < this.stepData.length - 1) {
                    this.currentStep++;
                    this.updateDisplay();
                    this.resetAutoAdvance();
                }
            }
            
            previousStep() {
                if (this.currentStep > 0) {
                    this.currentStep--;
                    this.updateDisplay();
                    this.resetAutoAdvance();
                }
            }
            
            updateDisplay() {
                const step = this.stepData[this.currentStep];
                
                // Update sidebar
                document.querySelectorAll('.step-item').forEach((item, index) => {
                    item.classList.toggle('active', index === this.currentStep);
                });
                
                // Update main display with animation
                const stepTitle = document.getElementById('stepTitle');
                const stepDescription = document.getElementById('stepDescription');
                const stepIcon = document.getElementById('stepIcon');
                const timerCircle = document.getElementById('timerCircle');
                
                // Add fade effect
                [stepTitle, stepDescription, stepIcon].forEach(el => {
                    el.classList.add('fade-in');
                });
                
                // Update content
                stepTitle.textContent = step.title;
                stepDescription.textContent = step.description;
                stepIcon.className = `fas ${step.icon} step-icon ${step.animation}`;
                timerCircle.textContent = `${step.duration}s`;
                
                // Update progress
                const progress = ((this.currentStep + 1) / this.stepData.length) * 100;
                document.getElementById('progressFill').style.width = `${progress}%`;
                document.getElementById('currentStep').textContent = this.currentStep + 1;
                
                // Update buttons
                document.getElementById('prevBtn').disabled = this.currentStep === 0;
                document.getElementById('nextBtn').disabled = this.currentStep === this.stepData.length - 1;
                
                // Update timer circle animation
                this.animateTimer(step.duration);
            }
            
            animateTimer(duration) {
                const timerCircle = document.getElementById('timerCircle');
                let currentTime = 0;
                
                const updateTimer = () => {
                    const progress = (currentTime / duration) * 360;
                    timerCircle.style.background = `conic-gradient(#4299e1 ${progress}deg, #e2e8f0 ${progress}deg)`;
                    
                    if (currentTime < duration) {
                        currentTime += 0.1;
                        requestAnimationFrame(updateTimer);
                    }
                };
                
                updateTimer();
            }
            
            createBubbles() {
                const bubbles = document.getElementById('bubbles');
                bubbles.innerHTML = '';
                
                for (let i = 0; i < 15; i++) {
                    const bubble = document.createElement('div');
                    bubble.className = 'bubble';
                    
                    const size = Math.random() * 15 + 8;
                    const left = Math.random() * 100;
                    const duration = Math.random() * 4 + 3;
                    const delay = Math.random() * 3;
                    
                    bubble.style.width = `${size}px`;
                    bubble.style.height = `${size}px`;
                    bubble.style.left = `${left}%`;
                    bubble.style.animationDuration = `${duration}s`;
                    bubble.style.animationDelay = `${delay}s`;
                    
                    bubbles.appendChild(bubble);
                }
            }
            
            startAutoAdvance() {
                this.autoAdvance = true;
                this.resetAutoAdvance();
            }
            
            resetAutoAdvance() {
                if (this.autoTimer) {
                    clearInterval(this.autoTimer);
                }
                
                if (this.autoAdvance && this.currentStep < this.stepData.length - 1) {
                    let timeLeft = 8;
                    const autoAdvanceEl = document.getElementById('autoAdvance');
                    const autoTimerEl = document.getElementById('autoTimer');
                    
                    autoAdvanceEl.classList.remove('hidden');
                    
                    this.autoTimer = setInterval(() => {
                        timeLeft--;
                        autoTimerEl.textContent = timeLeft;
                        
                        if (timeLeft <= 0) {
                            clearInterval(this.autoTimer);
                            autoAdvanceEl.classList.add('hidden');
                            this.nextStep();
                        }
                    }, 1000);
                } else {
                    document.getElementById('autoAdvance').classList.add('hidden');
                }
            }
            
            toggleAutoAdvance() {
                this.autoAdvance = !this.autoAdvance;
                if (this.autoAdvance) {
                    this.resetAutoAdvance();
                } else {
                    clearInterval(this.autoTimer);
                    document.getElementById('autoAdvance').classList.add('hidden');
                }
            }
        }
        
        // Initialize the guide when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            new HandwashingGuide();
        });
        
        // Add some interactive sound effects (optional)
        const playSound = (type) => {
            // This would integrate with Web Audio API for sound effects
            // For now, we'll use visual feedback
            const stepIcon = document.getElementById('stepIcon');
            stepIcon.style.transform = 'scale(1.1)';
            setTimeout(() => {
                stepIcon.style.transform = 'scale(1)';
            }, 150);
        };