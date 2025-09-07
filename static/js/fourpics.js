const UNSPLASH_API_KEY = 'RD5ueHAUC5xIT7kEm91zkwa9UgKhv-STUhZFhzuXHdo';

const gameWords = [
    {
        word: "PERIOD",
        searches: ["calendar", "time", "clock", "schedule"],
        hint: "The monthly cycle that women experience"
    },
    {
        word: "PADS",
        searches: ["cotton", "white", "soft", "comfort"],
        hint: "Absorbent products worn during menstruation"
    },
    {
        word: "TAMPONS",
        searches: ["cotton", "white", "health", "care"],
        hint: "Insertable menstrual products"
    },
    {
        word: "HYGIENE",
        searches: ["soap", "clean", "fresh", "bathroom"],
        hint: "Keeping clean and healthy"
    },
    {
        word: "CYCLE",
        searches: ["circle", "calendar", "rotation", "pattern"],
        hint: "A recurring sequence of events"
    },
    {
        word: "CARE",
        searches: ["hands", "wellness", "health", "comfort"],
        hint: "Looking after yourself or others"
    },
    {
        word: "HEALTH",
        searches: ["wellness", "fitness", "doctor", "medicine"],
        hint: "Physical and mental well-being"
    },
    {
        word: "CLEAN",
        searches: ["soap", "fresh", "white", "pure"],
        hint: "Free from dirt or germs"
    }
];

let currentGame = {};
let score = 0;
let round = 1;
let hintsUsed = 0;
let playerAnswer = [];
let usedTiles = [];
let hintLetters = [];

// --- Sound Effects (Web Audio API) ---
let __fxCtx;
function fxCtx(){
    if (!__fxCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        __fxCtx = new AC();
    }
    return __fxCtx;
}
function playTone({freq=440, type='sine', duration=0.15, gain=0.2, start=0, glideToFreq=null, glideTime=0.08}){
    try{
        const ctx = fxCtx();
        const t = ctx.currentTime + start;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (glideToFreq){
            o.frequency.exponentialRampToValueAtTime(glideToFreq, t + glideTime);
        }
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        o.connect(g).connect(ctx.destination);
        o.start(t);
        o.stop(t + duration + 0.02);
    }catch(_){/* ignore audio errors */}
}
function fxClick(){ playTone({ freq: 520, duration: 0.08, gain: 0.15 }); }
function fxSuccess(){
    playTone({ freq: 660, duration: 0.16, gain: 0.22 });
    playTone({ freq: 880, duration: 0.18, gain: 0.2, start: 0.14 });
}
function fxError(){ playTone({ freq: 220, type: 'sawtooth', duration: 0.22, gain: 0.18, glideToFreq: 160, glideTime: 0.18 }); }
function fxHint(){ playTone({ freq: 1200, type: 'triangle', duration: 0.12, gain: 0.15 }); }
function fxClear(){ playTone({ freq: 420, type: 'square', duration: 0.1, gain: 0.12 }); }

async function loadImage(imageId, searchTerm, loadingId) {
    const img = document.getElementById(imageId);
    const loading = document.getElementById(loadingId);
    
    // High-quality fallback images for each category
    const fallbackImages = [
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=300&q=80', // nature
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=300&q=80', // office
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=300&q=80', // nature2
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80'  // mountain
    ];
    
    // Simple, reliable search terms that work well with Unsplash
    const safeSearchTerms = {
        'soap': 'clean soap',
        'clean': 'running water',
        'fresh': 'fresh flowers',
        'bathroom': 'clean bathroom',
        'hygiene': 'personal hygiene',
        'cotton': 'cotton pad',
        'white': 'medical gloves',
        'soft': 'soft tissue',
        'comfort': 'hugging',
        'calendar': 'menstrual calendar',
        'time': 'clock face',
        'schedule': 'planner desk',
        'circle': 'circular pattern',
        'rotation': 'cycle motion',
        'hands': 'hands holding',
        'wellness': 'self care',
        'health': 'nurse care',
        'care': 'emotional support',
        'medicine': 'medical kit',
        'doctor': 'female doctor',
        'fitness': 'woman exercising',
        'pure': 'pure water'
    };

    
    // Use safe search term if available, otherwise use a generic fallback
    let safeTerm = safeSearchTerms[searchTerm.toLowerCase()] || 'abstract';
    
    try {
        // Simplified API call without problematic parameters
        const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(safeTerm)}&client_id=${UNSPLASH_API_KEY}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if we have valid image data
        if (data && data.urls && (data.urls.small || data.urls.thumb || data.urls.regular)) {
            const imageUrl = data.urls.small || data.urls.thumb || data.urls.regular;
            
            img.onload = () => {
                loading.style.display = 'none';
                img.style.display = 'block';
            };
            
            img.onerror = () => {
                // Use fallback if image fails to load
                const fallbackIndex = Math.floor(Math.random() * fallbackImages.length);
                img.src = fallbackImages[fallbackIndex];
                loading.style.display = 'none';
                img.style.display = 'block';
            };
            
            img.src = imageUrl;
        } else {
            throw new Error('Invalid image data received');
        }
        
    } catch (error) {
        console.warn(`Failed to load image for "${searchTerm}":`, error);
        
        // Use a random fallback image
        const fallbackIndex = Math.floor(Math.random() * fallbackImages.length);
        img.src = fallbackImages[fallbackIndex];
        
        img.onload = () => {
            loading.style.display = 'none';
            img.style.display = 'block';
        };
        
        img.onerror = () => {
            loading.style.display = 'none';
            img.style.display = 'block';
            // If even fallback fails, show a colored placeholder
            img.style.backgroundColor = '#f0f0f0';
            img.style.minHeight = '150px';
        };
    }
}

function generateLetterPool(word) {
    // Start with the letters from the word
    let letters = word.split('');
    
    // Add some random letters to make it challenging
    const extraLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numExtra = Math.max(8, Math.floor(word.length * 1.5));
    
    for (let i = 0; i < numExtra; i++) {
        letters.push(extraLetters[Math.floor(Math.random() * extraLetters.length)]);
    }
    
    // Shuffle the letters
    for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    
    return letters;
}

function createAnswerBoxes() {
    const container = document.getElementById('answerBoxes');
    container.innerHTML = '';
    
    currentGame.word.split('').forEach((letter, index) => {
        const box = document.createElement('div');
        box.className = 'letter-box';
        box.id = `box-${index}`;
        
        // Provide some letters as free hints (about 25% of the word)
        if (hintLetters.includes(index)) {
            box.textContent = letter;
            box.classList.add('hint');
        }
        
        container.appendChild(box);
    });
}

function createLetterTiles() {
    const container = document.getElementById('letterTiles');
    container.innerHTML = '';
    
    const letters = generateLetterPool(currentGame.word);
    
    letters.forEach((letter, index) => {
        const tile = document.createElement('div');
        tile.className = 'letter-tile';
        tile.textContent = letter;
        tile.id = `tile-${index}`;
        tile.onclick = () => selectLetter(index, letter);
        container.appendChild(tile);
    });
}

function selectLetter(tileIndex, letter) {
    const tile = document.getElementById(`tile-${tileIndex}`);
    
    if (tile.classList.contains('used')) return;
    
    fxClick();
    
    // Find the next empty box
    let nextEmptyIndex = -1;
    for (let i = 0; i < currentGame.word.length; i++) {
        if (!hintLetters.includes(i) && !playerAnswer[i]) {
            nextEmptyIndex = i;
            break;
        }
    }
    
    if (nextEmptyIndex === -1) return; // No empty boxes
    
    // Fill the box
    const box = document.getElementById(`box-${nextEmptyIndex}`);
    box.textContent = letter;
    box.classList.add('filled');
    
    // Mark tile as used
    tile.classList.add('used');
    
    // Update player answer
    playerAnswer[nextEmptyIndex] = letter;
    usedTiles.push(tileIndex);
    
    // Check if word is complete
    checkIfComplete();
}

function checkIfComplete() {
    let isComplete = true;
    for (let i = 0; i < currentGame.word.length; i++) {
        if (!hintLetters.includes(i) && !playerAnswer[i]) {
            isComplete = false;
            break;
        }
    }
    
    if (isComplete) {
        // Build the complete answer
        let completeAnswer = '';
        for (let i = 0; i < currentGame.word.length; i++) {
            if (hintLetters.includes(i)) {
                completeAnswer += currentGame.word[i];
            } else {
                completeAnswer += playerAnswer[i];
            }
        }
        
        if (completeAnswer === currentGame.word) {
            fxSuccess();
            const points = Math.max(15 - hintsUsed * 3 - hintLetters.length, 1);
            score += points;
            document.getElementById('score').textContent = score;
            
            showMessage(`🎉 Excellent! You earned ${points} points!`, 'success');
            
            setTimeout(() => {
                round++;
                document.getElementById('round').textContent = round;
                startNewRound();
            }, 2000);
        } else {
            fxError();
            showMessage('🤔 Almost there! Try rearranging the letters.', 'error');
        }
    }
}

function clearAnswer() {
    fxClear();
    // Clear player answer
    for (let i = 0; i < currentGame.word.length; i++) {
        if (!hintLetters.includes(i)) {
            const box = document.getElementById(`box-${i}`);
            box.textContent = '';
            box.classList.remove('filled');
            playerAnswer[i] = null;
        }
    }
    
    // Reset used tiles
    usedTiles.forEach(tileIndex => {
        const tile = document.getElementById(`tile-${tileIndex}`);
        tile.classList.remove('used');
    });
    
    usedTiles = [];
    document.getElementById('message').innerHTML = '';
}

function startNewRound() {
    // Reset state
    playerAnswer = [];
    usedTiles = [];
    hintLetters = [];

    const queryOverrides = {
    'PERIOD': [
        'menstrual calendar',
        'period tracker',
        'red calendar',
        'woman holding stomach'
    ],
    'PADS': [
        'sanitary pad',
        'menstrual pad',
        'absorbent pad',
        'feminine hygiene product'
    ],
    'TAMPONS': [
        'tampons',
        'menstrual product',
        'cotton tampon',
        'feminine hygiene'
    ],
    'HYGIENE': [
        'personal hygiene',
        'clean bathroom',
        'washing hands',
        'soap and towel'
    ],
    'CYCLE': [
        'menstrual cycle chart',
        'calendar circle',
        'repeating pattern',
        'female reproductive cycle'
    ],
    'CARE': [
        'hands holding',
        'emotional support',
        'nurse helping patient',
        'self care'
    ],
    'HEALTH': [
        'doctor checkup',
        'medical wellness',
        'woman doing yoga',
        'nurse and patient'
    ],
    'CLEAN': [
        'washing with soap',
        'clean towel',
        'fresh bathroom',
        'sparkling surface'
    ],
    'MEDICINE': [
        'medical pills',
        'first aid kit',
        'nurse with stethoscope',
        'doctor and patient'
    ]
    };


    
    // Reset images
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`img${i}`).style.display = 'none';
        document.getElementById(`loading${i}`).style.display = 'flex';
        document.getElementById(`loading${i}`).innerHTML = 'Loading image...';
    }

    // Select random word
    currentGame = gameWords[Math.floor(Math.random() * gameWords.length)];
    
    // Generate hint letters (about 25% of the word, minimum 1)
    const numHints = Math.max(1, Math.floor(currentGame.word.length * 0.25));
    while (hintLetters.length < numHints) {
        const randomIndex = Math.floor(Math.random() * currentGame.word.length);
        if (!hintLetters.includes(randomIndex)) {
            hintLetters.push(randomIndex);
        }
    }
    
    // Initialize player answer array
    playerAnswer = new Array(currentGame.word.length).fill(null);
    
    // Create game elements
    createAnswerBoxes();
    createLetterTiles();
    
    // Load images with a small delay between each request to avoid rate limiting
    currentGame.searches.forEach((search, index) => {
        setTimeout(() => {
            loadImage(`img${index + 1}`, search, `loading${index + 1}`);
        }, index * 200); // 200ms delay between each image request
    });

    // Clear message
    document.getElementById('message').innerHTML = '';
    hintsUsed = 0;
    const queries = queryOverrides[currentGame.word] || currentGame.searches;
        queries.forEach((search, index) => {
        setTimeout(() => {
            loadImage(`img${index + 1}`, search, `loading${index + 1}`);
        }, index * 200);
        });

}

function showHint() {
    const messageDiv = document.getElementById('message');
    hintsUsed++;
    fxHint();
    
    if (hintsUsed === 1) {
        showMessage(`💡 Hint: ${currentGame.hint}`, 'info');
    } else if (hintsUsed === 2) {
        // Reveal another letter
        let availableIndices = [];
        for (let i = 0; i < currentGame.word.length; i++) {
            if (!hintLetters.includes(i) && !playerAnswer[i]) {
                availableIndices.push(i);
            }
        }
        
        if (availableIndices.length > 0) {
            const revealIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
            hintLetters.push(revealIndex);
            
            const box = document.getElementById(`box-${revealIndex}`);
            box.textContent = currentGame.word[revealIndex];
            box.classList.remove('filled');
            box.classList.add('hint');
            
            showMessage(`✨ Perfect! Another letter revealed!`, 'info');
        } else {
            showMessage(`🔍 The word has ${currentGame.word.length} letters total`, 'info');
        }
    } else {
        // Reveal another letter if possible
        let availableIndices = [];
        for (let i = 0; i < currentGame.word.length; i++) {
            if (!hintLetters.includes(i) && !playerAnswer[i]) {
                availableIndices.push(i);
            }
        }
        
        if (availableIndices.length > 0) {
            const revealIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
            hintLetters.push(revealIndex);
            
            const box = document.getElementById(`box-${revealIndex}`);
            box.textContent = currentGame.word[revealIndex];
            box.classList.remove('filled');
            box.classList.add('hint');
            
            showMessage(`✨ Perfect! Another letter revealed!`, 'info');
        } else {
            showMessage(`💭 Category: Menstrual Health & Hygiene`, 'info');
        }
    }
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = `<div class="message ${type}">${text}</div>`;
}

function newGame() {
    score = 0;
    round = 1;
    hintsUsed = 0;
    document.getElementById('score').textContent = score;
    document.getElementById('round').textContent = round;
    startNewRound();
}

// Start the game
startNewRound();