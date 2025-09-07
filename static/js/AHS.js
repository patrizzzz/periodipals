    // Mascot state management
        const mascotStates = {
            'mental-health': 2,
            'risky-behaviors': 1,
            'malnutrition': 0,
            'menstrual-health': 2,
            'substance-use': 1,
            'violence': 2,
            'stress-coping': 3,
            'neutral': 0,
            'pointing': 1,
            'explaining': 2,
            'happy': 3
        };

        // Speech bubble messages
        const bubbleMessages = {
            'mental-health': "🧠 Mental Health Crisis: It's okay to feel sad or overwhelmed sometimes. If you ever feel this way, talk to someone you trust. You're not alone, and asking for help is a sign of strength! 💬",
            'risky-behaviors': "⚠️ Risky Behaviors: Some choices, like smoking or drinking, can harm your body and mind. Making healthy decisions helps you stay strong and happy. If you're unsure, ask a trusted adult for advice! 🌱",
            'malnutrition': "🍎 Nutrition Issues: Eating healthy foods and staying active helps your body grow. If you feel tired or sick often, let someone know. Good habits now mean a healthier future! 🥗",
            'menstrual-health': "🩸 Menstrual Health: Menstruation is a normal part of growing up for girls. It's important to use clean products, track your cycle, and talk to trusted adults about any concerns. You deserve proper care and information! 💗",
            'substance-use': "🚬 Substance Use & Alcohol: Substances like alcohol and drugs can affect your health for a long time. You deserve to feel your best—choose safe activities and friends who support you! 🤗",
            'violence': "✋ Violence Exposure: If you ever feel unsafe or see someone being hurt, reach out to a trusted adult. You deserve respect and kindness. Let's work together to keep everyone safe! 🛡️",
            'completion': "🎉 Amazing work! You've learned about all the important health topics. Knowledge is power - use what you've learned to stay healthy and help others too! 🌟",
            'celebration': "🎊 Fantastic! You're now equipped with important health knowledge. Remember, taking care of your health is one of the best investments you can make! 💪",
            'tip': "💡 Tip: You can click on any card to learn more about that health topic. The progress tracker will show what you've explored!",
            'welcome': "👋 Welcome! I'm Peri, your health guide. Let's learn about adolescent health challenges together. Click on any card to get started!"
        };

        let speechBubbleTimeout;
        const SPEECH_DURATION = 8000;

        // Progress tracking
        let readTopics = new Set();
        const totalTopics = 6;

        function markAsRead(cardElement) {
            const topic = cardElement.dataset.topic;
            const indicator = document.getElementById(`indicator-${topic}`);
            
            if (!readTopics.has(topic)) {
                readTopics.add(topic);
                
                // Update indicator
                if (indicator) {
                    indicator.innerHTML = '<i class="fas fa-check"></i>';
                    indicator.classList.add('completed');
                }
                
                // Update progress
                updateProgress();
                
                // Add celebration effect to card
                cardElement.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    cardElement.style.transform = 'scale(1)';
                }, 300);
            }
        }

        function updateProgress() {
            const progressFill = document.getElementById('learningProgress');
            const progressText = document.getElementById('progressText');
            const progressPercent = document.getElementById('progressPercent');
            const completeSection = document.getElementById('completeSection');
            
            const percentage = (readTopics.size / totalTopics) * 100;
            
            if (progressFill) {
                progressFill.style.width = percentage + '%';
            }
            
            if (progressText) {
                progressText.textContent = `${readTopics.size} of ${totalTopics} topics explored`;
            }
            
            if (progressPercent) {
                progressPercent.textContent = `${Math.round(percentage)}%`;
            }
            
            // Show complete button when all topics are read
            if (readTopics.size === totalTopics && completeSection) {
                completeSection.style.display = 'block';
                setMascotState('happy');
                showSpeechBubble('completion');
            }
        }

        function createConfetti() {
            const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
            const confettiCount = 150;
            
            for (let i = 0; i < confettiCount; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
                confetti.style.animationDelay = Math.random() * 2 + 's';
                confetti.style.animation = `confettiFall ${confetti.style.animationDuration} linear ${confetti.style.animationDelay}`;
                
                document.body.appendChild(confetti);
                
                // Remove confetti after animation
                setTimeout(() => {
                    if (document.body.contains(confetti)) {
                        document.body.removeChild(confetti);
                    }
                }, 5000);
            }
        }

        function celebrateCompletion() {
            // Create confetti
            createConfetti();
            
            // Show celebration message
            const celebrationDiv = document.createElement('div');
            celebrationDiv.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">🎉</div>
                    <div>Congratulations! You've explored all health topics!</div>
                </div>
            `;
            
            celebrationDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(45deg, var(--accent), #38a169);
                color: white;
                padding: 30px 40px;
                border-radius: 25px;
                font-weight: bold;
                font-size: 1.5rem;
                z-index: 10000;
                animation: celebrationBounce 1s ease-out;
                box-shadow: 0 15px 40px rgba(72, 187, 120, 0.4);
                text-align: center;
                max-width: 90%;
            `;
            
            document.body.appendChild(celebrationDiv);
            
            // Mascot celebration
            setMascotState('happy');
            showSpeechBubble('celebration');
            
            // Remove celebration message after 4 seconds
            setTimeout(() => {
                if (document.body.contains(celebrationDiv)) {
                    celebrationDiv.style.opacity = '0';
                    celebrationDiv.style.transform = 'translate(-50%, -50%) scale(0.8)';
                    setTimeout(() => {
                        if (document.body.contains(celebrationDiv)) {
                            document.body.removeChild(celebrationDiv);
                        }
                    }, 500);
                }
            }, 4000);
        }

        function setMascotState(state) {
            const mascotSprite = document.getElementById('mascotSprite');
            if (!mascotSprite) return;

            if (!state) state = 'neutral';

            mascotSprite.classList.remove('neutral', 'pointing', 'explaining', 'happy');
            mascotSprite.classList.add(state);
            mascotSprite.dataset.currentState = state;

            // Add visual feedback for mascot state changes
            if (state === 'happy') {
                mascotSprite.style.transform = 'scale(1.1)';
            } else if (state === 'pointing') {
                mascotSprite.style.transform = 'rotate(5deg)';
            } else if (state === 'explaining') {
                mascotSprite.style.transform = 'scale(1.05) rotate(-2deg)';
            } else {
                mascotSprite.style.transform = 'scale(1)';
            }
        }

        function showSpeechBubble(messageKey) {
            const bubble = document.getElementById('mascotSpeech');
            if (!bubble) return;

            const message = bubbleMessages[messageKey];
            if (!message) return;

            if (speechBubbleTimeout) {
                clearTimeout(speechBubbleTimeout);
            }

            bubble.textContent = message;
            bubble.classList.add('active');

            speechBubbleTimeout = setTimeout(() => {
                bubble.classList.remove('active');
                setMascotState('neutral');
            }, SPEECH_DURATION);
        }

        function createParticles() {
            const particlesContainer = document.getElementById('particles');
            if (!particlesContainer) return;

            for (let i = 0; i < 25; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';
                particle.style.width = particle.style.height = Math.random() * 10 + 5 + 'px';
                particle.style.animationDelay = Math.random() * 6 + 's';
                particle.style.animationDuration = (Math.random() * 3 + 6) + 's';
                particlesContainer.appendChild(particle);
            }
        }

        function showMotivationalMessage() {
            const messages = [
                "💪 Your health matters! Take care of yourself.",
                "🌟 You're stronger than you think!",
                "🤝 It's okay to ask for help when you need it.",
                "🌈 Every small step towards health counts!",
                "💝 You deserve to be happy and healthy!"
            ];

            const message = messages[Math.floor(Math.random() * messages.length)];
            const messageDiv = document.createElement('div');
            messageDiv.innerHTML = message;
            setMascotState('happy');
            messageDiv.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(45deg, var(--primary), var(--primary-dark));
                color: white;
                padding: 15px 20px;
                border-radius: 25px;
                font-weight: bold;
                z-index: 1000;
                animation: slideInDown 0.5s ease-out, fadeOut 0.5s ease-out 4s forwards;
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            `;

            document.body.appendChild(messageDiv);

            setTimeout(() => {
                if (document.body.contains(messageDiv)) {
                    document.body.removeChild(messageDiv);
                }
                setMascotState('neutral');
            }, 4500);
        }

        // Initialize everything when DOM is ready
        document.addEventListener('DOMContentLoaded', function() {
            createParticles();
            setMascotState('neutral');

            // Show welcome message after a short delay
            setTimeout(() => {
                showSpeechBubble('welcome');
            }, 1000);

            // Initialize progress tracking
            updateProgress();

            // Complete button functionality
            const completeBtn = document.getElementById('completeBtn');
            if (completeBtn) {
                completeBtn.addEventListener('click', function() {
                    celebrateCompletion();
                });
            }

            // Resource modal logic
            const resourcesBtn = document.getElementById('resourcesBtn');
            const resourcesBtn2 = document.getElementById('resourcesBtn2');
            const resourcesModal = document.getElementById('resourcesModal');
            const closeResources = document.getElementById('closeResources');

            const openModal = function() {
                resourcesModal.style.display = 'block';
                setTimeout(() => {
                    resourcesModal.classList.add('show');
                }, 10);
            };

            const closeModal = function() {
                resourcesModal.classList.remove('show');
                setTimeout(() => {
                    resourcesModal.style.display = 'none';
                }, 300);
            };

            if (resourcesBtn) {
                resourcesBtn.addEventListener('click', openModal);
            }
            
            if (resourcesBtn2) {
                resourcesBtn2.addEventListener('click', openModal);
            }

            if (closeResources) {
                closeResources.addEventListener('click', closeModal);
            }

            if (resourcesModal) {
                window.addEventListener('click', function(e) {
                    if (e.target === resourcesModal) {
                        closeModal();
                    }
                });
            }

            // Share button functionality
            const shareBtn = document.getElementById('shareBtn');
            if (shareBtn) {
                shareBtn.addEventListener('click', function() {
                    if (navigator.share) {
                        navigator.share({
                            title: 'Adolescent Health Awareness',
                            text: 'Learn about important health challenges faced by Filipino youth',
                            url: window.location.href
                        })
                        .catch(error => {
                            console.log('Error sharing:', error);
                            alert('Sharing failed. Please copy the URL manually.');
                        });
                    } else {
                        alert('Web Share API not supported in your browser. Please copy the URL manually.');
                    }
                });
            }

            // Music player functionality
            const musicToggle = document.getElementById('musicToggle');
            const volumeSlider = document.getElementById('volumeSlider');
            let isPlaying = false;

            if (musicToggle) {
                musicToggle.addEventListener('click', function() {
                    if (isPlaying) {
                        this.innerHTML = '<i class="fas fa-music"></i>';
                        isPlaying = false;
                    } else {
                        this.innerHTML = '<i class="fas fa-volume-up"></i>';
                        isPlaying = true;
                    }
                });
            }

            if (volumeSlider) {
                volumeSlider.addEventListener('input', function() {
                    console.log('Volume:', this.value);
                });
            }

            // Mascot click functionality
            const mascotSprite = document.getElementById('mascotSprite');
            if (mascotSprite) {
                mascotSprite.addEventListener('click', function() {
                    showSpeechBubble('tip');
                });
            }

            // Card hover effects
            const healthCards = document.querySelectorAll('.health-card');
            healthCards.forEach((card, index) => {
                const messageKey = card.dataset.message;
                
                card.addEventListener('mouseenter', function() {
                    const state = mascotStates[messageKey] !== undefined ? 
                        Object.keys(mascotStates).find(key => mascotStates[key] === mascotStates[messageKey]) : 
                        'neutral';
                    setMascotState(state);
                });

                card.addEventListener('mouseleave', function() {
                    setMascotState('neutral');
                });

                // Initial card animation
                card.style.opacity = '0';
                card.style.transform = 'translateY(50px)';
                card.style.transition = 'all 0.6s ease';

                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 200);
            });

            // Add text glow effect after delay
            setTimeout(() => {
                const highlights = document.querySelectorAll('.stat-highlight');
                highlights.forEach((highlight, index) => {
                    setTimeout(() => {
                        highlight.style.transform = 'scale(1.1)';
                        highlight.style.boxShadow = '0 0 20px rgba(255, 107, 107, 0.6)';
                        setTimeout(() => {
                            highlight.style.transform = 'scale(1)';
                            highlight.style.boxShadow = 'none';
                        }, 1000);
                    }, index * 500);
                });
            }, 2000);
        });

        // Show motivational message every 30 seconds
        setInterval(showMotivationalMessage, 30000);

        // Add CSS animations
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @keyframes slideInDown {
                from { transform: translateY(-100%) translateX(-50%); opacity: 0; }
                to { transform: translateY(0) translateX(-50%); opacity: 1; }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }

            @keyframes celebrationBounce {
                0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }

            @keyframes float {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-20px) rotate(180deg); }
            }
        `;
        document.head.appendChild(styleSheet);

        // Global functions for testing
        window.testMascotState = function(state) {
            console.log(`Testing mascot state: ${state}`);
            setMascotState(state);
        };

        window.listMascotStates = function() {
            console.log('Available mascot states:', Object.keys(mascotStates));
        };

        // Reset progress function for testing
        window.resetProgress = function() {
            readTopics.clear();
            document.querySelectorAll('.read-indicator').forEach(indicator => {
                indicator.innerHTML = '<i class="fas fa-book-open"></i>';
                indicator.classList.remove('completed');
            });
            updateProgress();
            document.getElementById('completeSection').style.display = 'none';
        };