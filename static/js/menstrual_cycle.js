        let completedPhases = new Set();

        // Mascot explanations for each phase
        const mascotExplanations = {
            1: `<b>Menstruation</b><br>It's your body's way of saying, "Let's start fresh!" Your uterus gently lets go of its lining, and that's what makes your period. It's totally normal and means your body is working perfectly!`,
            2: `<b>Follicular Phase</b><br>This is your body's prep time! Tiny eggs start growing and your energy rises as estrogen increases. You might feel more active and ready for new things!`,
            3: `<b>Ovulation</b><br>It's showtime! A mature egg is released from your ovary—your body's superstar moment! This is when you can get pregnant most easily. You might feel extra awesome and confident!`,
            4: `<b>Luteal Phase</b><br>Your body is making the uterus cozy, just in case a baby might grow. If not, hormone levels drop and your period will start again soon. You might feel different emotions—be kind to yourself!`
        };

        // DOM elements
        const progressFill = document.getElementById('progressFill');
        const progressCount = document.getElementById('progressCount');
        const phaseCards = document.querySelectorAll('.phase-card');
        const quizCard = document.getElementById('quizCard');
        const skipBtn = document.getElementById('skipBtn');
        const takeQuizBtn = document.getElementById('takeQuizBtn');

        // Initialize
        function init() {
            // Add event listeners
            phaseCards.forEach(card => {
                card.addEventListener('click', () => markPhaseComplete(card));
            });

            if (skipBtn) {
                skipBtn.addEventListener('click', () => {
                    window.location.href = '/menu';
                });
            }

            if (takeQuizBtn) {
                takeQuizBtn.addEventListener('click', function() {
                    // Store return module info if needed
                    console.log('Taking quiz for module 5');
                });
            }
        }

        // Mark phase as complete
        function markPhaseComplete(card) {
            const phase = card.dataset.phase;
            
            // Update mascot speech bubble with explanation
            const mascotBubble = document.querySelector('.mascot-container .speech-bubble');
            if (mascotBubble && mascotExplanations[phase]) {
                mascotBubble.innerHTML = mascotExplanations[phase];
            }
            
            if (!completedPhases.has(phase)) {
                completedPhases.add(phase);
                card.classList.add('completed');
                card.classList.add('pulse');
                
                setTimeout(() => {
                    card.classList.remove('pulse');
                }, 2000);

                updateProgress();
                
                if (completedPhases.size === 4) {
                    setTimeout(() => {
                        showQuizCard();
                    }, 1000);
                }
            }
        }

        // Update progress bar
        function updateProgress() {
            const completed = completedPhases.size;
            const percentage = (completed / 4) * 100;
            if (progressFill && progressCount) {
                progressFill.style.width = `${percentage}%`;
                progressCount.textContent = completed;
            }
        }

        // Show quiz card
        function showQuizCard() {
            if (quizCard) {
                quizCard.style.display = 'block';
                quizCard.style.animation = 'fadeIn 0.5s ease-in-out';
                
                // Create celebration effect
                createCelebration();
                
                // Update mascot message
                const mascotBubble = document.querySelector('.mascot-container .speech-bubble');
                if (mascotBubble) {
                    mascotBubble.innerHTML = `<b>Amazing work!</b><br>You've learned about all four phases of the menstrual cycle! Your body is incredible and now you understand how it works. Ready for the quiz?`;
                }
            }
        }

        // Create celebration confetti
        function createCelebration() {
            const colors = ['#ff6b8b', '#6ecb63', '#ffd166', '#9b59b6', '#3498db'];
            
            for (let i = 0; i < 50; i++) {
                setTimeout(() => {
                    const confetti = document.createElement('div');
                    confetti.style.position = 'fixed';
                    confetti.style.left = Math.random() * 100 + 'vw';
                    confetti.style.top = '-10px';
                    confetti.style.width = Math.random() * 8 + 4 + 'px';
                    confetti.style.height = confetti.style.width;
                    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    confetti.style.borderRadius = '50%';
                    confetti.style.zIndex = '10000';
                    confetti.style.pointerEvents = 'none';
                    
                    document.body.appendChild(confetti);
                    
                    const animation = confetti.animate([
                        { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
                        { 
                            transform: `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 360}deg)`, 
                            opacity: 0 
                        }
                    ], {
                        duration: Math.random() * 2000 + 2000,
                        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                    });
                    
                    animation.onfinish = () => confetti.remove();
                }, i * 15);
            }
        }

        // Initialize when DOM is ready
        document.addEventListener('DOMContentLoaded', function() {
            init();
        });