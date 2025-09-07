// Topic data and configuration - Updated to match HTML structure
const topicsData = {
    1: {
        id: '1',
        title: "Height Growth",
        icon: "📏",
        mascotState: "explaining",
        description: "✨ Growth Spurt Alert! You might suddenly shoot up several inches taller! 🌱 Your body's natural growth hormones are working their magic to help you reach new heights! This is totally normal and exciting! 🎉",
        tips: [
            "💫 Get 8-10 hours of sleep each night for maximum growth",
            "🥛 Eat calcium-rich foods like dairy and leafy greens",
            "🏃‍♂️ Stay active with fun sports and exercise",
            "🎯 Keep good posture to grow tall and strong"
        ],
        mascotBubbleText: "Wow! You're growing taller! 🌱 Your body is releasing special growth hormones to help you reach new heights! Pretty amazing, right? 📏✨"
    },
    2: {
        id: '2',
        title: "Skin Changes",
        icon: "🧴",
        mascotState: "pointing",
        description: "🌟 Your skin is going through some amazing changes! Sometimes it might get a bit oilier or have some spots - that's your body's way of growing up! 🌈 Don't worry, these changes are totally normal and we'll help you keep your skin happy! ✨",
        tips: [
            "🧼 Gently wash your face twice daily",
            "💧 Drink lots of water for glowing skin",
            "🌞 Use sunscreen to protect your skin",
            "💪 Remember - everyone goes through this!"
        ],
        mascotBubbleText: "Your skin's getting ready for the teen years! 🌟 It might feel different, but don't worry - everyone goes through this! Let's learn how to keep it healthy! ✨"
    },
    3: {
        id: '3',
        title: "Voice Changes",
        icon: "🎤",
        mascotState: "explaining",
        description: "🎵 Time for your voice's big adventure! It might crack or change - that's your voice box growing stronger! 🎭 Think of it like your voice is learning to sing a new song. It's completely natural and pretty cool! 🌟",
        tips: [
            "🎶 Be patient - your voice will find its perfect tune",
            "💧 Keep your voice happy with plenty of water",
            "🗣️ Practice speaking in your new voice",
            "🌈 Embrace the changes - they make you unique!"
        ],
        mascotBubbleText: "Your voice is on an adventure! 🎵 It might sound different sometimes, but that's just your voice box growing stronger! Keep practicing and stay hydrated! 🎤"
    },
    4: {
        id: '4',
        title: "Body Hair",
        icon: "✂️",
        mascotState: "pointing",
        description: "🌱 Just like a garden, new hair is starting to grow! It's appearing in new places - that's your body's natural way of growing up! ✨ Everyone's hair grows differently, and that's perfectly okay! 🌈",
        tips: [
            "✨ Remember - hair growth is totally natural",
            "🧴 Keep your skin moisturized and happy",
            "🛁 Stay fresh with good hygiene",
            "💫 You choose how to style your body hair"
        ],
        mascotBubbleText: "New hair growing? That's totally natural! 🌱 Everyone's hair grows differently, and that's what makes us unique! Let's learn about keeping clean and fresh! ✨"
    },
    5: {
        id: '5',
        title: "Muscle Growth",
        icon: "💪",
        mascotState: "happy",
        description: "💪 Your body is becoming stronger and more powerful! 🌟 You might notice you can lift heavier things or run faster. Your muscles are growing and getting stronger - it's like having your own superhero transformation! ✨",
        tips: [
            "🏃‍♂️ Have fun being active every day",
            "🥗 Power up with healthy foods",
            "💤 Get plenty of rest for muscle growth",
            "🌈 Stay positive and watch yourself grow stronger!"
        ],
        mascotBubbleText: "Feel that strength growing? 💪 Your muscles are getting bigger and stronger - like a superhero in training! Remember to eat well and stay active! 🌟"
    },
    6: {
        id: '6',
        title: "Emotional Changes",
        icon: "😊",
        mascotState: "explaining",
        description: "🎢 Get ready for an amazing emotional journey! 💫 Sometimes you might feel super happy, other times a bit down - and that's perfectly okay! 🌈 Your feelings are like a beautiful rainbow of emotions, all part of growing up! ✨",
        tips: [
            "💝 Share your feelings with people you trust",
            "🧘‍♂️ Try fun relaxation activities",
            "📖 Write down your thoughts and feelings",
            "🌟 Remember - all your feelings are valid!"
        ],
        mascotBubbleText: "Feeling lots of different emotions? That's perfectly normal! 🌈 Your feelings are like a colorful rainbow - all of them are important and valid! Let's talk about it! 💝"
    }
};

class PubertyLearningSystem {
    constructor() {
        this.completedTopics = new Set();
        this.currentStep = 0;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadProgress();
        this.initializeMascot();
        // Check if already completed
        if (localStorage.getItem('puberty_module_complete') === 'true') {
            this.showCompletionBadge();
        }
        // Complete button event
        const completeBtn = document.getElementById('completeBtn');
        if (completeBtn) {
            completeBtn.addEventListener('click', () => this.handleCompleteButton());
        }
    }

    bindEvents() {
        // Updated to use correct selectors matching HTML structure
        document.querySelectorAll('.phase-card').forEach(card => {
            card.addEventListener('click', () => this.handleTopicClick(card));
            card.addEventListener('mouseenter', () => this.handleTopicHover(card));
            card.addEventListener('mouseleave', () => this.handleTopicLeave());
            
            // Add keyboard support
            card.setAttribute('tabindex', '0');
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleTopicClick(card);
                }
            });
        });

        document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
    }

    handleTopicClick(card) {
        const phaseId = card.dataset.phase;
        const topic = topicsData[phaseId];
        
        if (!topic) {
            console.log('Topic not found for phase:', phaseId);
            return;
        }

        console.log('Topic clicked:', topic.title);

        // Update mascot state and speech bubble with the full description
        this.updateMascotState(topic.mascotState || 'explaining');
        this.updateSpeechBubble(topic.description);

        // Mark as complete
        this.markTopicComplete(card);
        
        // Create sparkle effect for visual feedback
        this.createSparkleEffect();

        // Add click animation
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
            card.style.transform = '';
        }, 150);
    }

    handleTopicHover(card) {
        const phaseId = card.dataset.phase;
        const topic = topicsData[phaseId];
        
        if (!topic) return;

        this.updateMascotState('pointing');
        this.updateSpeechBubble(`Want to learn about ${topic.title}? Click to explore! ${topic.icon}`);
    }

    handleTopicLeave() {
        // Return to neutral state when mouse leaves
        this.updateMascotState('neutral');
        this.updateSpeechBubble('👋 Hi! I\'m here to help you learn about puberty. Click on any topic to get started! ✨');
    }

    createSparkleEffect() {
        const colors = ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#98FB98'];
        const sparkleCount = 15;
        
        for (let i = 0; i < sparkleCount; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.className = 'sparkle';
                sparkle.style.cssText = `
                    position: fixed;
                    width: 8px;
                    height: 8px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 1000;
                    left: ${Math.random() * window.innerWidth}px;
                    top: ${Math.random() * window.innerHeight}px;
                    animation: sparkle-fall 2s ease-out forwards;
                `;
                document.body.appendChild(sparkle);
                setTimeout(() => sparkle.remove(), 2000);
            }, i * 50);
        }
    }

    markTopicComplete(card) {
        const phaseId = card.dataset.phase;
        if (!this.completedTopics.has(phaseId)) {
            this.completedTopics.add(phaseId);
            card.classList.add('completed');
            card.classList.add('pulse');
            setTimeout(() => {
                card.classList.remove('pulse');
            }, 200);
            this.updateProgress();
            // Save progress to server
            this.saveProgressToServer();
            if (this.completedTopics.size === Object.keys(topicsData).length) {
                setTimeout(() => {
                    this.showCelebration();
                }, 500);
            }
        }
    }

    async saveProgressToServer() {
        try {
            const total = Object.keys(topicsData).length;
            const completed = this.completedTopics.size;
            const percent = (completed / total) * 100;
            const response = await fetch('/api/sync_quiz_state/1/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    progress: {
                        completedTopics: Array.from(this.completedTopics),
                        totalTopics: total,
                        percentComplete: percent,
                        timestamp: new Date().toISOString()
                    }
                })
            });
            if (!response.ok) {
                console.warn('Failed to sync puberty progress:', response.status);
            } else {
                const result = await response.json();
                console.log('Puberty progress synced:', result);
            }
        } catch (e) {
            console.warn('Error syncing puberty progress:', e);
        }
    }

    updateProgress() {
        const totalTopics = Object.keys(topicsData).length;
        const progress = (this.completedTopics.size / totalTopics) * 100;
        const progressFill = document.getElementById('progressFill');
        const progressCount = document.getElementById('progressCount');
        const completeSection = document.getElementById('completeSection');
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressCount) progressCount.textContent = this.completedTopics.size;
        // Show complete button if all topics are done
        if (this.completedTopics.size === totalTopics && completeSection) {
            completeSection.style.display = 'block';
        }
    }

    showCelebration() {
        // Update mascot to happy state with celebration message
        this.updateMascotState('happy');
        this.updateSpeechBubble('🎉 AMAZING! You\'ve learned about all the topics! You\'re ready for the quiz now! 🌟✨');
        
        // Show quiz card with animation
        const quizCard = document.querySelector('.post-quiz-card');
        if (quizCard) {
            quizCard.style.display = 'block';
            quizCard.classList.add('animate-in');
        }

        // Create celebration confetti
        this.createConfetti();
    }

    createConfetti() {
        const colors = ['#FFD700', '#FF69B4', '#00CED1', '#98FB98', '#DDA0DD'];
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.cssText = `
                    position: fixed;
                    width: 10px;
                    height: 10px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    left: ${Math.random() * 100}%`;
                confetti.style.animation = 'confetti-fall 3s ease-out forwards';
                document.body.appendChild(confetti);
                setTimeout(() => confetti.remove(), 3000);
            }, i * 30);
        }
    }

    updateMascotState(state) {
        const mascot = document.querySelector('.mascot-sprite');
        if (!mascot) return;

        const states = {
            'neutral': 0,
            'pointing': 1,
            'explaining': 2,
            'happy': 3
        };
        
        const position = states[state] || states.neutral;
        
        // Add state change animation
        mascot.classList.add('state-changing');
        mascot.style.backgroundPosition = `${position * 33.33}% 0`;
        
        // Remove animation class after transition
        setTimeout(() => {
            mascot.classList.remove('state-changing');
        }, 500);

        // Add idle animation
        mascot.style.animation = 'idle 2s infinite ease-in-out';
    }

    updateSpeechBubble(text) {
        const bubble = document.querySelector('.speech-bubble');
        if (!bubble) return;

        bubble.style.opacity = '0';
        bubble.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            bubble.textContent = text;
            bubble.style.opacity = '1';
            bubble.style.transform = 'translateY(0)';
        }, 200);

        // Add subtle bounce effect
        bubble.style.animation = 'bubble-bounce 0.5s ease-out';
    }

    handleKeyboardNavigation(e) {
        const cards = document.querySelectorAll('.phase-card');
        const focusedCard = document.activeElement;
        const currentIndex = Array.from(cards).indexOf(focusedCard);

        if (currentIndex === -1) return;

        let nextIndex;
        switch(e.key) {
            case 'ArrowLeft':
                nextIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
                break;
            case 'ArrowRight':
                nextIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
                break;
            default:
                return;
        }

        e.preventDefault();
        cards[nextIndex].focus();
    }

    saveProgress() {
        try {
            const progressData = {
                completedTopics: [...this.completedTopics],
                timestamp: Date.now()
            };
            localStorage.setItem('pubertyTopicsCompleted', JSON.stringify(progressData));
            console.log('Progress saved:', progressData);
        } catch (e) {
            console.warn('Failed to save progress:', e);
        }
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('pubertyTopicsCompleted');
            if (saved) {
                const progressData = JSON.parse(saved);
                const completedArray = progressData.completedTopics || progressData;
                
                completedArray.forEach(phaseId => {
                    const card = document.querySelector(`.phase-card[data-phase="${phaseId}"]`);
                    if (card) {
                        this.completedTopics.add(phaseId);
                        card.classList.add('completed');
                    }
                });
                this.updateProgress();
                console.log('Progress loaded:', this.completedTopics);
            }
        } catch (e) {
            console.warn('Failed to load progress:', e);
        }
    }

    initializeMascot() {
        this.updateMascotState('neutral');
        this.updateSpeechBubble('👋 Hi! I\'m here to help you learn about puberty. Click on any topic to get started! ✨');
        
        // Add mascot interaction
        const mascot = document.querySelector('.mascot-sprite');
        if (mascot) {
            mascot.addEventListener('click', () => {
                this.updateMascotState('happy');
                this.updateSpeechBubble('😊 Thanks for clicking on me! Choose a topic above to start learning! 🌟');
                
                setTimeout(() => {
                    this.updateMascotState('neutral');
                    this.updateSpeechBubble('👋 Hi! I\'m here to help you learn about puberty. Click on any topic to get started! ✨');
                }, 3000);
            });
        }
    }

    async handleCompleteButton() {
        // Mark as complete in localStorage
        localStorage.setItem('puberty_module_complete', 'true');
        // Save to server
        try {
            await fetch('/api/sync_quiz_state/1/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    moduleId: '1',
                    progress: { completed: true, timestamp: new Date().toISOString() }
                })
            });
        } catch (e) {
            console.warn('Failed to sync puberty module completion:', e);
        }
        // Optionally show a celebration or badge
        this.showCompletionBadge();
    }

    showCompletionBadge() {
        // Optionally trigger a UI update or celebration
        const completeBtn = document.getElementById('completeBtn');
        if (completeBtn) {
            completeBtn.innerHTML = '<i class="fas fa-check-circle"></i> Completed!';
            completeBtn.disabled = true;
            completeBtn.classList.add('completed');
        }
    }
}

// Add required CSS animations
const style = document.createElement('style');
style.textContent = `
    .topic-content-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.98);
        border-radius: 20px;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
        z-index: 10;
        backdrop-filter: blur(10px);
    }

    .topic-content-overlay.visible {
        opacity: 1;
        transform: translateY(0);
    }

    .topic-content-inner {
        padding: 25px;
        height: 100%;
        overflow-y: auto;
        position: relative;
    }

    .close-btn {
        position: absolute;
        top: 15px;
        right: 15px;
        background: #ff4757;
        color: white;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        transition: transform 0.2s ease;
    }

    .close-btn:hover {
        transform: scale(1.1);
    }

    .topic-header {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 20px;
    }

    .topic-icon {
        font-size: 2rem;
    }

    .topic-description {
        font-size: 1.1rem;
        line-height: 1.6;
        margin-bottom: 20px;
        color: #2d3748;
    }

    .topic-tips {
        background: linear-gradient(to right, #f0f9ff, #e0f2fe);
        border-radius: 12px;
        padding: 20px;
    }

    .topic-tips h4 {
        color: #667eea;
        margin-bottom: 15px;
        font-size: 1.1rem;
    }

    .topic-tips ul {
        list-style: none;
        padding: 0;
    }

    .topic-tips li {
        margin-bottom: 10px;
        padding: 8px 0;
        border-bottom: 1px solid rgba(102, 126, 234, 0.1);
        font-size: 1rem;
    }

    .mascot-sprite.state-changing {
        animation: mascot-bounce 0.5s ease;
    }

    @keyframes mascot-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-15px); }
    }

    @keyframes sparkle-fall {
        0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
    }

    @keyframes confetti-fall {
        0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }

    .speech-bubble {
        transition: all 0.3s ease;
    }

    @keyframes bubble-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
    }

    @keyframes idle {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Puberty Learning System...');
    new PubertyLearningSystem();
    
    // Show complete button handler
    const completeBtn = document.getElementById('completeBtn');
    if (completeBtn) {
        completeBtn.addEventListener('click', async () => {
            // Save progress to server using the correct endpoint
            try {
                const total = Object.keys(topicsData).length;
                const completed = total; // All topics completed
                const percent = 100;
                const response = await fetch('/api/sync_quiz_state/1/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        progress: {
                            completedTopics: Array.from({length: total}, (_, i) => String(i+1)),
                            totalTopics: total,
                            percentComplete: percent,
                            timestamp: new Date().toISOString()
                        }
                    })
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                console.log('Progress synced (complete journey):', result);
                // Optionally show a celebration or redirect
            } catch (error) {
                console.log('Failed to save progress', error);
            }
        });
    }
});