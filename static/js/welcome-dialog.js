import { FirebaseService } from './firebase-service.js';

let selectedAge = null;
let username = '';

document.addEventListener('DOMContentLoaded', () => {
    const ageButtons = document.querySelectorAll('.age-btn');
    const nameInput = document.querySelector('.name-input');
    const welcomeMessage = document.querySelector('.welcome-message');
    const usernameInput = document.getElementById('username');
    const userGreeting = document.getElementById('user-greeting');
    const bgMusic = document.getElementById('bg-music');

    // Add sparkle effects
    createSparkles();

    // Age button handlers
    ageButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            ageButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedAge = btn.dataset.age;
            playSelectSound();
            
            setTimeout(() => {
                document.querySelector('.age-select').style.opacity = '0';
                setTimeout(() => {
                    document.querySelector('.age-select').classList.add('hidden');
                    nameInput.classList.remove('hidden');
                    nameInput.style.opacity = '1';
                }, 300);
            }, 500);
        });
    });

    // Name input handler with Firebase integration
    usernameInput.addEventListener('keyup', async (e) => {
        if (e.key === 'Enter' && usernameInput.value.trim()) {
            username = usernameInput.value.trim();
            const userId = localStorage.getItem('userId');
            
            try {
                await FirebaseService.saveUserData(userId, {
                    username: username,
                    ageGroup: selectedAge
                });
                localStorage.setItem('username', username);
                showWelcomeMessage();
            } catch (error) {
                console.error('Error saving user data:', error);
                // Still show welcome message even if Firebase save fails
                showWelcomeMessage();
            }
        }
    });

    usernameInput.addEventListener('input', () => {
        if (usernameInput.value.trim().length > 0) {
            playTypingSound();
        }
    });
});

function showWelcomeMessage() {
    const nameInput = document.querySelector('.name-input');
    const welcomeMessage = document.querySelector('.welcome-message');
    const userGreeting = document.getElementById('user-greeting');

    nameInput.style.opacity = '0';
    setTimeout(() => {
        nameInput.classList.add('hidden');
        welcomeMessage.classList.remove('hidden');
        welcomeMessage.style.opacity = '1';
        userGreeting.textContent = username;
        playWelcomeSound();
    }, 300);
}

function createSparkles() {
    const container = document.querySelector('.welcome-container');
    for (let i = 0; i < 20; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = Math.random() * 100 + '%';
        sparkle.style.top = Math.random() * 100 + '%';
        sparkle.style.animationDelay = Math.random() * 2 + 's';
        container.appendChild(sparkle);
    }
}

function playSelectSound() {
    const audio = new Audio('/static/audio/select.mp3');
    audio.volume = 0.3;
    audio.play();
}

function playTypingSound() {
    const audio = new Audio('/static/audio/type.mp3');
    audio.volume = 0.1;
    audio.play();
}

function playWelcomeSound() {
    const audio = new Audio('/static/audio/welcome.mp3');
    audio.volume = 0.4;
    audio.play();
}

function startApp() {
    // Store user preferences
    localStorage.setItem('userAge', selectedAge);
    localStorage.setItem('username', username);
    
    // Animate transition
    document.querySelector('.welcome-dialog').style.transform = 'scale(0.8) translateY(-20px)';
    document.querySelector('.welcome-dialog').style.opacity = '0';
    
    setTimeout(() => {
        window.location.href = '/menu';
    }, 800);
}