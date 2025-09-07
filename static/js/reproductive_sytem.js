const systemData = {
    female: {
        external: [
            {
                name: "Vulva",
                description: "External female genital organs",
                detail: "The vulva includes the mons pubis, labia majora, labia minora, clitoris, and vaginal opening. It serves as the external protection for the internal reproductive organs."
            },
            {
                name: "Labia Majora",
                description: "Outer lips of the vulva",
                detail: "Large, fleshy folds that form the outer boundaries of the vulva. They contain fatty tissue and hair follicles, providing protection for the more delicate internal structures."
            },
            {
                name: "Labia Minora",
                description: "Inner lips of the vulva",
                detail: "Smaller, hairless folds located inside the labia majora. They surround the vaginal and urethral openings and are rich in nerve endings."
            },
            {
                name: "Clitoris",
                description: "Sensitive organ for sexual pleasure",
                detail: "A small, highly sensitive organ located at the top of the vulva. It contains thousands of nerve endings and plays a crucial role in sexual arousal and pleasure."
            }
        ],
        internal: [
            {
                name: "Ovaries",
                description: "Egg-producing organs",
                detail: "Two almond-shaped organs that produce eggs (ova) and hormones like estrogen and progesterone. They release one egg each month during ovulation."
            },
            {
                name: "Fallopian Tubes",
                description: "Tubes connecting ovaries to uterus",
                detail: "Two tubes that transport eggs from the ovaries to the uterus. Fertilization typically occurs here when sperm meets the egg."
            },
            {
                name: "Uterus",
                description: "Muscular organ where fetus develops",
                detail: "A pear-shaped muscular organ where a fertilized egg implants and develops into a fetus. The inner lining (endometrium) thickens monthly in preparation for pregnancy."
            },
            {
                name: "Cervix",
                description: "Lower part of uterus",
                detail: "The narrow, lower portion of the uterus that connects to the vagina. It produces mucus that changes throughout the menstrual cycle and acts as a barrier."
            },
            {
                name: "Vagina",
                description: "Canal connecting cervix to outside",
                detail: "A muscular, elastic canal that extends from the cervix to the external genitals. It serves as the birth canal and the passageway for menstrual flow."
            }
        ]
    },
    male: {
        external: [
            {
                name: "Penis",
                description: "Male reproductive organ",
                detail: "The external male reproductive organ used for urination and sexual intercourse. It contains the urethra and erectile tissue that fills with blood during arousal."
            },
            {
                name: "Scrotum",
                description: "Sac containing testicles",
                detail: "A pouch of skin that contains and protects the testicles. It regulates temperature by contracting or relaxing to keep testicles at optimal temperature for sperm production."
            },
            {
                name: "Glans",
                description: "Head of the penis",
                detail: "The sensitive, rounded tip of the penis. It contains many nerve endings and is covered by the foreskin in uncircumcised males."
            },
            {
                name: "Foreskin",
                description: "Retractable skin covering glans",
                detail: "A fold of skin that covers and protects the glans. It can be retracted and may be removed through circumcision for religious, cultural, or medical reasons."
            }
        ],
        internal: [
            {
                name: "Testicles",
                description: "Sperm and hormone producing organs",
                detail: "Two oval-shaped organs that produce sperm and testosterone. They are located in the scrotum and are essential for male fertility and sexual development."
            },
            {
                name: "Epididymis",
                description: "Sperm storage and maturation site",
                detail: "A coiled tube attached to each testicle where sperm mature and are stored. Sperm gain the ability to swim and fertilize eggs during their journey through the epididymis."
            },
            {
                name: "Vas Deferens",
                description: "Tubes carrying sperm from testicles",
                detail: "Long tubes that transport mature sperm from the epididymis to the urethra during ejaculation. They are part of the spermatic cord."
            },
            {
                name: "Prostate Gland",
                description: "Gland producing seminal fluid",
                detail: "A walnut-sized gland that surrounds the urethra and produces prostatic fluid, which makes up about 30% of semen and helps nourish and protect sperm."
            },
            {
                name: "Seminal Vesicles",
                description: "Glands producing seminal fluid",
                detail: "Two small glands that produce a sugar-rich fluid that makes up about 60% of semen. This fluid provides energy for sperm and helps with their mobility."
            }
        ]
    }
};

let currentSystem = 'female';
let activePartId = null;

// Track progress
let completedItems = new Set();
const TOTAL_ITEMS = 18;

function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const progressCount = document.getElementById('progressCount');
    const completeSection = document.getElementById('completeSection');
    
    const percentage = (completedItems.size / TOTAL_ITEMS) * 100;
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    
    if (progressCount) {
        progressCount.textContent = `${Math.round(percentage)}%`;
    }
    
    // Show complete button when all items are done
    if (completedItems.size === TOTAL_ITEMS && completeSection) {
        completeSection.style.display = 'block';
    }
}

        async function markItemComplete(itemId) {
            if (!completedItems.has(itemId)) {
                completedItems.add(itemId);
                updateProgress();
                
                // Save progress locally and to server
                try {
                    const response = await fetch('/api/sync_quiz_state/2/progress', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            progress: {
                                completedItems: Array.from(completedItems),
                                totalItems: TOTAL_ITEMS,
                                percentComplete: (completedItems.size / TOTAL_ITEMS) * 100,
                                timestamp: new Date().toISOString()
                            }
                        }),
                        credentials: 'same-origin'
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const result = await response.json();
                    console.log('Progress synced:', result);
                } catch (error) {
                    console.log('Failed to sync progress:', error);
                }
            }
        }function createConfetti() {
    const colors = ['#ff6b8b', '#6ecb63', '#ffd166', '#9b59b6', '#3498db'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.zIndex = '9999';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.top = '-10px';
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = confetti.style.width;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.borderRadius = '50%';
            
            document.body.appendChild(confetti);
            
            const animation = confetti.animate([
                { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
                { transform: `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
            ], {
                duration: Math.random() * 2000 + 2000,
                easing: 'cubic-bezier(.25,.46,.45,.94)'
            });
            
            animation.onfinish = () => confetti.remove();
        }, i * 50);
    }
}

// Add progress sync functionality
async function syncProgress(items) {
    // Save to localStorage
    localStorage.setItem('reproductive_system_progress', JSON.stringify(Array.from(items)));

    try {
        const response = await fetch('/api/sync_quiz_state/2/progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                moduleId: '2',
                progress: {
                    completedItems: Array.from(items),
                    totalItems: TOTAL_ITEMS,
                    timestamp: new Date().toISOString()
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Progress synced successfully:', result);
    } catch (error) {
        console.log('Failed to sync progress:', error);
    }
}

// Load saved progress
function loadSavedProgress() {
    try {
        const savedProgress = localStorage.getItem('reproductive_system_progress');
        if (savedProgress) {
            const items = new Set(JSON.parse(savedProgress));
            items.forEach(itemId => {
                completedItems.add(itemId);
                const element = document.querySelector(`[data-part-id="${itemId}"]`);
                if (element) {
                    element.classList.add('completed');
                }
            });
            updateProgress();
        }
    } catch (e) {
        console.warn('Failed to load saved progress:', e);
    }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    loadSavedProgress();
    
    // System switching functionality
    const systemBtns = document.querySelectorAll('.system-btn');
    const femaleSystem = document.querySelector('.female-system');
    const maleSystem = document.querySelector('.male-system');
    
    // Enhanced debugging
    console.log('System buttons found:', systemBtns.length);
    console.log('Female system element:', femaleSystem);
    console.log('Male system element:', maleSystem);
    
    // List all img elements to see what's available
    const allImages = document.querySelectorAll('img');
    console.log('All images found:', allImages.length);
    allImages.forEach((img, index) => {
        console.log(`Image ${index}:`, {
            src: img.src,
            className: img.className,
            alt: img.alt
        });
    });

    function initializeSystem(system) {
        currentSystem = system;
        const data = systemData[system];
        
        renderParts('external-parts', data.external);
        renderParts('internal-parts', data.internal);
        
        // Update active button
        document.querySelectorAll('.system-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.system === system);
        });
        
        // Show/hide appropriate image with CSS styles
        if (femaleSystem && maleSystem) {
            if (system === 'male') {
                femaleSystem.style.opacity = '0';
                femaleSystem.style.visibility = 'hidden';
                maleSystem.style.opacity = '1';
                maleSystem.style.visibility = 'visible';
                console.log('Switching to male system');
            } else {
                maleSystem.style.opacity = '0';
                maleSystem.style.visibility = 'hidden';
                femaleSystem.style.opacity = '1';
                femaleSystem.style.visibility = 'visible';
                console.log('Switching to female system');
            }
        }
    }

    function renderParts(containerId, parts) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }
        container.innerHTML = '';
        parts.forEach((part, index) => {
            // Use unique ID for each part based on current system
            const partId = `${currentSystem}-${containerId}-${index}`;
            const partElement = document.createElement('div');
            partElement.className = 'part-item';
            partElement.dataset.partId = partId;
            partElement.innerHTML = `
                <div class="part-name">${part.name}</div>
                <div class="part-description">${part.description}</div>
            `;
            partElement.addEventListener('click', () => showPartDetail(part, partElement));
            partElement.addEventListener('mouseenter', () => partElement.classList.add('pulse'));
            partElement.addEventListener('mouseleave', () => partElement.classList.remove('pulse'));
            container.appendChild(partElement);
        });
    }

    function showPartDetail(part, element) {
        // Remove active class from all parts
        document.querySelectorAll('.part-item').forEach(item => {
            item.classList.remove('active');
        });
        // Add active class to clicked part
        element.classList.add('active');
        // Show mascot speech bubble
        const speechBubble = document.querySelector('.speech-bubble');
        const bubbleTitle = document.querySelector('.bubble-title');
        const bubbleText = document.querySelector('.bubble-text');
        if (speechBubble && bubbleTitle && bubbleText) {
            bubbleTitle.textContent = part.name;
            bubbleText.textContent = part.detail;
            speechBubble.classList.remove('hidden');
            const mascotSprite = document.querySelector('.mascot-sprite');
            if (mascotSprite) {
                mascotSprite.classList.add('talking');
            }
        }
        activePartId = element.dataset.partId;
        // Mark this part as complete for progress tracking (use unique ID)
        markItemComplete(element.dataset.partId);
    }

    // Hide detail panel when clicking on image overlay
    const imageOverlay = document.querySelector('.image-overlay');
    if (imageOverlay) {
        imageOverlay.addEventListener('click', () => {
            const detailPanel = document.getElementById('detail-panel');
            if (detailPanel) {
                detailPanel.classList.remove('show');
            }
            document.querySelectorAll('.part-item').forEach(item => {
                item.classList.remove('active');
            });
            activePartId = null;
        });
    }

    // System selector event listeners
    systemBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Button clicked:', btn.dataset.system);
            
            // Update system data and UI
            initializeSystem(btn.dataset.system);
            
            // Reset detail panel
            const detailPanel = document.getElementById('detail-panel');
            if (detailPanel) {
                detailPanel.classList.remove('show');
            }
            
            // Hide speech bubble when switching systems
            const speechBubble = document.querySelector('.speech-bubble');
            const mascotSprite = document.querySelector('.mascot-sprite');
            if (speechBubble) {
                speechBubble.classList.add('hidden');
            }
            if (mascotSprite) {
                mascotSprite.classList.remove('talking');
            }
            
            activePartId = null;
        });
    });

    // Initialize with female system
    initializeSystem('female');

    // Initialize completion button handler
    const completeBtn = document.getElementById('completeBtn');
    if (completeBtn) {
        completeBtn.addEventListener('click', async () => {
            // Save progress to server using the correct endpoint
            try {
                const response = await fetch('/api/sync_quiz_state/2/progress', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        progress: {
                            completedItems: Array.from(completedItems),
                            totalItems: TOTAL_ITEMS,
                            percentComplete: (completedItems.size / TOTAL_ITEMS) * 100,
                            timestamp: new Date().toISOString()
                        }
                    }),
                    credentials: 'same-origin'
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

    // Load saved progress
    loadSavedProgress();
});