const symptoms = [
    {
        id: 'mood',
        title: 'Feeling Different',
        image: '/static/img/moodchanges.webp',
        imageAlt: 'Illustration showing different emotions',
        description: "Sometimes you might feel happy, then sad, then maybe a little grumpy - and that's totally okay! Your body has special helpers called hormones that are working hard, and they can make you feel different emotions.",
        brief: "Your feelings might change quickly. That's just your body being awesome!",
        tips: [
            { icon: '📝', text: 'Write your feelings in a special diary' },
            { icon: '🤗', text: 'Talk to someone you trust and love' },
            { icon: '🌬️', text: 'Take slow, deep breaths like a sleepy dragon' },
            { icon: '🎵', text: 'Listen to your favorite happy songs' }
        ]
    },
    {
        id: 'tired',
        title: 'Feeling Sleepy',
        image: '/static/img/sleepy.png',
        imageAlt: 'Illustration of feeling tired and needing rest',
        description: "Your body might feel like it needs more rest, like a phone that needs charging! This happens because your amazing body is working extra hard to get ready for your period.",
        brief: "You might feel extra tired. Rest is super important!",
        tips: [
            { icon: '🛏️', text: 'Go to bed a little earlier than usual' },
            { icon: '💤', text: 'Take a cozy power nap if you need it' },
            { icon: '🍎', text: 'Eat energy foods like fruits and nuts' },
            { icon: '⏰', text: 'Keep a regular sleep schedule' }
        ]
    },
    {
        id: 'tummy',
        title: 'Tummy Feels Funny',
        image: '/static/img/abdominalpain.webp',
        imageAlt: 'Illustration showing stomach discomfort',
        description: "Your belly might feel uncomfortable or have cramps. Think of it like your uterus doing gentle exercises to get ready! It's completely normal and shows your body is working perfectly.",
        brief: "Your tummy might feel weird or crampy. That's normal!",
        tips: [
            { icon: '🔥', text: 'Use a warm water bottle like a cozy hug' },
            { icon: '🧘', text: 'Try gentle stretches like a sleepy cat' },
            { icon: '🛁', text: 'Take a warm, relaxing bubble bath' },
            { icon: '💊', text: 'Ask an adult about safe medicine' }
        ]
    },
    {
        id: 'headache',
        title: 'Head Feels Ouchy',
        image: '/static/img/headache.webp',
        imageAlt: 'Illustration of someone with a headache',
        description: "Sometimes your head might hurt a little bit. This happens because those busy hormones can affect how you feel all over your body, including your head!",
        brief: "Headaches can happen. Take it easy and drink water!",
        tips: [
            { icon: '💧', text: 'Drink lots of water like a happy fish' },
            { icon: '🌙', text: 'Rest in a quiet, dark room' },
            { icon: '❄️', text: 'Put something cool on your forehead' },
            { icon: '🍽️', text: "Don't skip meals - your brain needs food!" }
        ]
    },
    {
        id: 'skin',
        title: 'Skin Acting Up',
        image: '/static/img/acne.webp',
        imageAlt: 'Illustration showing skin care and acne management',
        description: "You might notice more pimples or your skin feeling different. Hormones can make your skin produce more oil - it's like your skin is just being extra active!",
        brief: "Pimples or oily skin? It's just your body growing!",
        tips: [
            { icon: '🧼', text: 'Wash your face gently, like petting a puppy' },
            { icon: '✋', text: ",Don't pick at pimples (super important!)" },
            { icon: '🧴', text: 'Use gentle, oil-free products' },
            { icon: '🛏️', text: 'Change your pillowcase often' }
        ]
    },
    {
        id: 'cravings',
        title: 'Want Yummy Food',
        image: '/static/img/cravings.webp',
        imageAlt: 'Illustration showing food cravings and healthy snacks',
        description: "Do you suddenly really, REALLY want chocolate or chips? Your body is asking for quick energy during this special time - it's totally normal to have cravings!",
        brief: "Craving snacks? Your body just wants a little treat!",
        tips: [
            { icon: '🍫', text: ",It's okay to have some treats!" },
            { icon: '🥪', text: 'Mix treats with healthy foods' },
            { icon: '💧', text: 'Sometimes thirst feels like hunger' },
            { icon: '🍎', text: 'Keep healthy snacks nearby too' }
        ]
    }
];

class PMSAdventure {
    constructor() {
        this.completedCards = new Set();
        this.init();
    }
    
    init() {
        this.renderCards();
        this.bindEvents();
        this.initializeTopControls();
    }

    initializeTopControls() {
        // Help button handler
        const helpBtn = document.getElementById('helpBtn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                // Show help information in mascot speech bubble
                const mascotSpeech = document.getElementById('mascotSpeech');
                if (mascotSpeech) {
                    mascotSpeech.innerHTML = `
                        <b>Need help? 💡</b><br>
                        Click on any card to learn about different PMS symptoms. Each card has helpful tips! 
                        Try to explore all cards to unlock the quiz at the end. You're doing great! 🌟
                    `;
                }
                // Animate mascot to explaining state
                const mascotSprite = document.getElementById('mascotSprite');
                if (mascotSprite) {
                    mascotSprite.style.backgroundPosition = '66.66% 0';
                }
            });
        }

        // Settings button handler
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                // Toggle music volume control visibility
                const volumeControl = document.querySelector('.volume-control');
                if (volumeControl) {
                    volumeControl.style.opacity = volumeControl.style.opacity === '1' ? '0' : '1';
                }
            });
        }
    }

    renderCards() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        symptoms.forEach((symptom, index) => {
            const card = document.createElement('div');
            card.className = 'phase-card';
            card.setAttribute('data-id', symptom.id);
            card.innerHTML = `
                <div class="phase-header">
                    <div class="phase-icon">
                        <i class="fas ${this.getIconForSymptom(symptom.id)}"></i>
                    </div>
                    <div class="phase-info">
                        <h3>${symptom.title}</h3>
                    </div>
                </div>
                <div class="phase-image">
                    <img src="${symptom.image}" alt="${symptom.imageAlt || symptom.title}" loading="lazy">
                </div>
                <div class="phase-content">
                    <p class="phase-description">${symptom.description}</p>
                    <div class="phase-tips">
                        <h5><i class="fas fa-lightbulb"></i> Self-care tips:</h5>
                        <div class="tips-list">
                            ${symptom.tips.map(tip => `
                                <div class="tip-item">
                                    <span class="tip-icon">${tip.icon}</span>
                                    <span class="tip-text">${tip.text}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>`;
            card.addEventListener('click', () => {
                this.showSymptomInBubble(symptom);
                this.markPhaseComplete(card);
            });
            gameBoard.appendChild(card);
        });
    }

    getIconForSymptom(id) {
        switch (id) {
            case 'mood':
                return 'fa-face-smile';
            case 'tired':
                return 'fa-bed';
            case 'tummy':
                return 'fa-circle-plus';
            case 'headache':
                return 'fa-head-side-virus';
            case 'skin':
                return 'fa-face-grin';
            case 'cravings':
                return 'fa-cookie-bite';
            default:
                return 'fa-star';
        }
    }

    showSymptomInBubble(symptom) {
        const mascotSpeech = document.getElementById('mascotSpeech');
        let emojiPrefix = '';
        switch (symptom.id) {
            case 'mood':
                emojiPrefix = '😊🎭💡';
                break;
            case 'tired':
                emojiPrefix = '😴🛏️💤';
                break;
            case 'tummy':
                emojiPrefix = '🤱🔥🧘';
                break;
            case 'headache':
                emojiPrefix = '🤕💧🌙';
                break;
            case 'skin':
                emojiPrefix = '😅🧼✨';
                break;
            case 'cravings':
                emojiPrefix = '🍫🍎🥪';
                break;
            default:
                emojiPrefix = '🌟';
        }
        mascotSpeech.textContent = `${emojiPrefix} ${symptom.title}: ${symptom.description.split('.')[0]}. ${emojiPrefix}`;
        const mascotSprite = document.getElementById('mascotSprite');
        if (mascotSprite) {
            mascotSprite.style.backgroundPosition = '33.33% 0';
        }
    }

    markPhaseComplete(card) {
        const symptomId = card.dataset.id;
        if (!this.completedCards.has(symptomId)) {
            this.completedCards.add(symptomId);
            card.classList.add('completed');
            card.classList.add('pulse');
            
            setTimeout(() => {
                card.classList.remove('pulse');
            }, 2000);

            this.updateProgress();
            
            if (this.completedCards.size === symptoms.length) {
                setTimeout(() => {
                    this.showQuizCard();
                }, 1000);
            }
        }
    }

    updateProgress() {
        const completed = this.completedCards.size;
        const percentage = (completed / symptoms.length) * 100;
        const progressFill = document.getElementById('progressFill');
        const progressCount = document.getElementById('progressCount');
        
        if (progressFill && progressCount) {
            progressFill.style.width = `${percentage}%`;
            progressCount.textContent = completed;
        }
    }

    showQuizCard() {
        const quizCard = document.querySelector('.post-quiz-card');
        if (quizCard) {
            quizCard.style.display = 'block';
            quizCard.style.animation = 'fadeIn 0.5s ease-in-out';
            this.createCelebration();
        }
    }

    createCelebration() {
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
                    { transform: `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
                ], {
                    duration: Math.random() * 2000 + 2000,
                    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                });
                
                animation.onfinish = () => confetti.remove();
            }, i * 15);
        }
    }

    bindEvents() {
        // No modal events needed
    }

    showAchievement(message) {
        const popup = document.getElementById('achievementPopup');
        popup.textContent = message;
        popup.classList.add('show');
        setTimeout(() => popup.classList.remove('show'), 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Starting PMS Adventure!');
    new PMSAdventure();
});

// Quiz button functionality
const quizBtn = document.querySelector('.quiz-btn');
if (quizBtn) {
    quizBtn.addEventListener('click', function () {
        localStorage.setItem('returnToModule', 'pms_lesson');
    });
}