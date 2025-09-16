import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { AnalyticsService } from './analytics-service.js';
import { FirebaseService } from './firebase-service.js';

// Music player functionality
const musicToggle = document.getElementById('musicToggle');
const volumeSlider = document.getElementById('volumeSlider');
const musicPlayer = document.querySelector('.music-player');
const audio = document.getElementById('bgMusic');

// Use a placeholder audio track - in a real app, use your actual audio file
audio.src = "https://assets.mixkit.co/music/preview/mixkit-forest-flow-581.mp3";
audio.loop = true;
audio.volume = volumeSlider ? volumeSlider.value / 100 : 0.5;

// Check if user has music preference saved
const savedMusicState = localStorage.getItem('musicPlaying');
const savedVolume = localStorage.getItem('musicVolume');

if (savedVolume) {
  audio.volume = savedVolume / 100;
  volumeSlider.value = savedVolume;
}

if (savedMusicState === 'true') {
  audio.play().catch(e => console.log("Auto-play prevented: ", e));
  musicToggle.textContent = '⏸';
}

// Toggle music playback
musicToggle.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
    musicToggle.textContent = '⏸';
    localStorage.setItem('musicPlaying', 'true');
  } else {
    audio.pause();
    musicToggle.textContent = '▶';
    localStorage.setItem('musicPlaying', 'false');
  }
});

// Volume control
volumeSlider.addEventListener('input', () => {
  audio.volume = volumeSlider.value / 100;
  localStorage.setItem('musicVolume', volumeSlider.value);
});

// Expand music player on hover
musicPlayer.addEventListener('mouseenter', () => {
  musicPlayer.classList.add('expanded');
});

musicPlayer.addEventListener('mouseleave', () => {
  musicPlayer.classList.remove('expanded');
});
// Initialize Firebase and check auth state

// Route mappings
const routeMap = {
    'PMS Guide': '/module/6',
    'Puberty Basics': '/module/1',
    'Reproductive System': '/module/2',
    'Hygiene & Health': '/module/3',
    'Menstrual Cycle': '/module/5',
    'Adolescent Health Situation': '/module/7'
};

// Function to clear all stored data
async function clearAllStoredData() {
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear IndexedDB if used
  const databases = await window.indexedDB.databases();
  databases.forEach(db => {
    window.indexedDB.deleteDatabase(db.name);
  });
  
  // Clear cookies
  document.cookie.split(";").forEach(cookie => {
    document.cookie = cookie
      .replace(/^ +/, "")
      .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
  });
}

// Original PeriodiPal functionality
let currentIndex = 0;
let isNavigating = false;
    
const dialogs = {
    welcome: {
        text: "Welcome back! 🌟 I'm so excited you're here! Pick any module that interests you and let's learn together!",
        mood: "*cheerful and encouraging*"
    },
    moduleHover: {
        text: "That looks like a great choice! This module will teach you so many interesting things! 📚",
        mood: "*excited and supportive*"
    },
    moduleSelect: {
        text: "Excellent choice! I'll be right there with you as we explore this topic together! 🎉",
        mood: "*proud and enthusiastic*"
    },
    encouragement: {
        text: "You're doing amazing! Every module you complete makes you smarter and more confident! ✨",
        mood: "*proud and loving*"
    }
};

// Elements
const dialogText = document.getElementById('dialogText');
const moodIndicator = document.getElementById('moodIndicator');
const moduleCards = document.querySelectorAll('.module-card');
const navLeft = document.getElementById('navLeft');
const navRight = document.getElementById('navRight');

// Initialize navigation and UI
function updateNavIndicators() {
    if (!moduleCards || !navLeft || !navRight) {
        console.warn('Navigation elements not found in the DOM');
        return;
    }
    
    const visibleCards = Array.from(moduleCards).filter(card => !card.hasAttribute('hidden') && getComputedStyle(card).display !== 'none');
    const lastVisibleIndex = visibleCards.length - 1;
    navLeft.classList.toggle('visible', currentIndex > 0);
    navRight.classList.toggle('visible', currentIndex < lastVisibleIndex);
}

// Initial update only if elements exist
if (moduleCards && navLeft && navRight) {
    updateNavIndicators();
}

function updateMascotDialog(text, mood) {
    dialogText.style.opacity = '0';
    moodIndicator.style.opacity = '0';
    
    setTimeout(() => {
        dialogText.textContent = text;
        moodIndicator.textContent = mood;
        dialogText.style.opacity = '1';
        moodIndicator.style.opacity = '1';
        
        // Add typewriter effect
        dialogText.style.animation = 'none';
        setTimeout(() => {
          dialogText.style.animation = 'typewriter 0.8s ease forwards';
        }, 10);
    }, 300);
}

function updateFocus(index) {
  if (index >= 0 && index < moduleCards.length) {
    moduleCards.forEach((card, i) => {
      card.classList.remove('active');
      if (i === index) {
        card.classList.add('active');
        card.focus();
      }
    });
    currentIndex = index;
    updateNavIndicators();
  }
}

function createEmojiTrail(element, emojis) {
  const rect = element.getBoundingClientRect();
  
  emojis.forEach((emoji, index) => {
    setTimeout(() => {
      const trail = document.createElement('div');
      trail.className = 'emoji-trail';
      trail.textContent = emoji;
      trail.style.left = (rect.left + Math.random() * rect.width) + 'px';
      trail.style.top = (rect.top + Math.random() * rect.height) + 'px';
      document.body.appendChild(trail);
      
      setTimeout(() => {
        if (document.body.contains(trail)) {
          document.body.removeChild(trail);
        }
      }, 2000);
    }, index * 100);
  });
}

// Module card interactions
moduleCards.forEach((card, index) => {
  card.addEventListener('mouseenter', function() {
    if (!isNavigating) {
      currentIndex = index;
      updateNavIndicators();
      const title = this.dataset.title;
      updateMascotDialog(`"${title}" is such an important topic! ${dialogs.moduleHover.text}`, dialogs.moduleHover.mood);
    }
  });
  
  card.addEventListener('focus', function() {
    currentIndex = index;
    updateNavIndicators();
    const title = this.dataset.title;
    updateMascotDialog(`"${title}" is such an important topic! ${dialogs.moduleHover.text}`, dialogs.moduleHover.mood);
  });
  
  card.addEventListener('click', function(e) {
    e.preventDefault();
    if (!this.classList.contains('loading') && !isNavigating) {
      this.classList.add('loading');
      isNavigating = true;
      
      const title = this.dataset.title;
      
      // Create and show loading overlay
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'loading-overlay';
      loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading ${title}...</div>
        <div class="loading-progress">
          <div class="progress-bar"></div>
        </div>
      `;
      
      // Animate progress bar
      const progressBar = loadingOverlay.querySelector('.progress-bar');
      progressBar.style.width = '0%';
      setTimeout(() => {
        progressBar.style.width = '100%';
      }, 100);
      this.appendChild(loadingOverlay);
      
      updateMascotDialog(`"${title}" - ${dialogs.moduleSelect.text}`, dialogs.moduleSelect.mood);
      createEmojiTrail(this, ['🌟', '🎉', '✨', '💖', '🚀']);
      
      const moduleRoutes = {
        'Menstrual Cycle': '/module/5',
        'Reproductive System': '/module/2',
        'Puberty Basics': '/module/1',
        'Adolescent Health Situation': '/module/7',
        'Fun Activities': '/mini-games',
        'Hand Washing': '/module/3',
        'PMS Guide': '/module/6',
        'Quiz': '/quiz'
      };

      const route = moduleRoutes[title];
      console.log('Navigating to:', route); // Debug log

      if (route) {
        setTimeout(() => {
          try {
            window.location.assign(route);
          } catch (error) {
            console.error('Navigation failed:', error);
            this.classList.remove('loading');
            isNavigating = false;
          }
        }, 1000);
      } else {
        console.error('No route found for:', title);
        this.classList.remove('loading');
        isNavigating = false;
      }
    }
  });
});

// Keyboard navigation
document.addEventListener('keydown', function(e) {
  if (isNavigating) return;
  
  switch(e.key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      e.preventDefault();
      if (currentIndex > 0) {
        updateFocus(currentIndex - 1);
      }
      break;
    case 'ArrowRight':
    case 'ArrowDown':
      e.preventDefault();
      if (currentIndex < moduleCards.length - 1) {
        updateFocus(currentIndex + 1);
      }
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      if (moduleCards[currentIndex]) {
        moduleCards[currentIndex].click();
      }
      break;
    case 'Home':
      e.preventDefault();
      updateFocus(0);
      break;
    case 'End':
      e.preventDefault();
      updateFocus(moduleCards.length - 1);
      break;
  }
});
    
    // Touch/swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.querySelector('.module-grid').addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    });
    
    document.querySelector('.module-grid').addEventListener('touchend', function(e) {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    });
    
    function handleSwipe() {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0 && currentIndex < moduleCards.length - 1) {
          updateFocus(currentIndex + 1);
        } else if (diff < 0 && currentIndex > 0) {
          updateFocus(currentIndex - 1);
        }
      }
    }
// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/static/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show install button or prompt
  showInstallPromotion();
});

function showInstallPromotion() {
  // Create install button if not exists
  if (!document.getElementById('installBtn')) {
    const btn = document.createElement('button');
    btn.id = 'installBtn';
    btn.textContent = 'Install App';
    btn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      z-index: 9999;
    `;
    btn.onclick = installApp;
    document.body.appendChild(btn);
  }
}

async function installApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to install prompt: ${outcome}`);
  deferredPrompt = null;
  document.getElementById('installBtn')?.remove();
}
