import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs,
    doc,
    getDoc,
    updateDoc,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB7j5oSrNFAHHIfLQZvEh-VRg_OVqQ4EQ4",
    authDomain: "menstrual-hygiene-manage-6b0ed.firebaseapp.com",
    projectId: "menstrual-hygiene-manage-6b0ed",
    storageBucket: "menstrual-hygiene-manage-6b0ed.firebasestorage.app",
    messagingSenderId: "1002865022115",
    appId: "1:1002865022115:web:ab79150f8a8d82e9171b16",
    measurementId: "G-SSCG3ZV148"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

class LearningMaterialsManager {
    constructor() {
        this.materialsContainer = document.getElementById('materialsContainer');
        this.loadingState = document.getElementById('loadingState');
        this.emptyState = document.getElementById('emptyState');
        this.resourceTemplate = document.getElementById('resourceCardTemplate');
        this.searchInput = document.getElementById('searchInput');
        this.filterSelect = document.getElementById('filterSelect');
        this.sortSelect = document.getElementById('sortSelect');
        this.viewBtns = document.querySelectorAll('.view-btn');
        
        this.materials = [];
        this.filteredMaterials = [];
        this.teacherId = null;
        
        this.initializeUI();
    }

    async initializeUI() {
        // Wait for authentication
        await new Promise(resolve => {
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    this.loadUserData(user.uid);
                } else {
                    this.showEmptyState();
                }
                resolve();
            });
        });

        // Set up event listeners
        this.setupEventListeners();
    }

    async loadUserData(userId) {
        try {
            console.log('Loading user data for ID:', userId);
            // Determine if student is already linked to a teacher; hide connect button if so
            const userSnap = await getDoc(doc(db, 'users', userId));
            const userData = userSnap.exists() ? userSnap.data() : {};
            const teacherId = userData?.teacher_id;
            const connectBtn = document.getElementById('connectTeacherBtn');
            if (teacherId && connectBtn) {
                connectBtn.style.display = 'none';
            }

            console.log('Loading materials directly...');
            await this.loadMaterials();
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showError('Failed to load user data');
        }
    }

    async loadMaterials() {
        try {
            this.showLoading(true);
            
            console.log('Fetching materials from server...');
            
            // Use server-side API endpoint instead of direct Firestore access
            const response = await fetch('/api/student/resources', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('Not authorized to access resources');
                } else if (response.status === 404) {
                    throw new Error('No teacher assigned or teacher not found');
                } else {
                    throw new Error('Failed to load resources from server');
                }
            }

            const materials = await response.json();
            console.log('Materials received from server:', materials);
            
            this.materials = materials.map(material => ({
                id: material.id,
                title: material.title,
                description: material.description,
                type: material.type,
                url: material.url,
                content: material.content,
                interactiveElements: material.interactiveElements || [],
                created_at: material.created_at
            }));

            this.filteredMaterials = [...this.materials];
            console.log('Total materials loaded:', this.materials.length);
            this.renderMaterials();
            this.updateStats();

        } catch (error) {
            console.error('Error loading materials:', error);
            this.showError('Failed to load learning materials. Please try reconnecting with your teacher.');
        } finally {
            this.showLoading(false);
        }
    }

    renderMaterials() {
        if (!this.filteredMaterials.length) {
            this.showEmptyState();
            return;
        }

        this.emptyState.style.display = 'none';
        this.materialsContainer.innerHTML = '';

        this.filteredMaterials.forEach(material => {
            const card = this.resourceTemplate.content.cloneNode(true);
            
            // Set card content
            card.querySelector('.material-title').textContent = material.title;
            card.querySelector('.material-description').textContent = material.description;
            card.querySelector('.material-date').innerHTML = `<i class="fas fa-calendar"></i> ${this.formatDate(material.created_at)}`;
            card.querySelector('.material-type').innerHTML = `<i class="fas fa-${this.getTypeIcon(material.type)}"></i> ${material.type}`;
            
            // Set icon and badge
            const icon = card.querySelector('.material-icon i');
            icon.className = `fas fa-${this.getTypeIcon(material.type)}`;
            
            const badge = card.querySelector('.material-badge');
            const isRead = this.isResourceRead(material.id);
            badge.className = `material-badge ${isRead ? 'badge-read' : 'badge-unread'}`;
            badge.textContent = isRead ? '⭐ Completed' : '🆕 New';
            
            // Add click handler
            const viewBtn = card.querySelector('.view-material');
            viewBtn.addEventListener('click', () => this.openMaterial(material));
            
            this.materialsContainer.appendChild(card);
        });
    }

    getTypeIcon(type) {
        const icons = {
            'pdf': 'file-pdf',
            'video': 'video',
            'link': 'link',
            'quiz': 'question-circle',
            'lesson': 'book-open'
        };
        return icons[type] || 'file';
    }

    formatDate(timestamp) {
        if (!timestamp) return 'Unknown date';
        // Handle both Firestore timestamps and ISO strings
        let date;
        if (timestamp.toDate) {
            // Firestore timestamp
            date = timestamp.toDate();
        } else if (typeof timestamp === 'string') {
            // ISO string from server
            date = new Date(timestamp);
        } else {
            // Other timestamp formats
            date = new Date(timestamp);
        }
        return date.toLocaleDateString();
    }

    isResourceRead(resourceId) {
        const readMaterials = JSON.parse(localStorage.getItem('readMaterials') || '[]');
        return readMaterials.includes(resourceId);
    }

    markAsRead(resourceId) {
        const readMaterials = JSON.parse(localStorage.getItem('readMaterials') || '[]');
        if (!readMaterials.includes(resourceId)) {
            readMaterials.push(resourceId);
            localStorage.setItem('readMaterials', JSON.stringify(readMaterials));
            this.updateStats();
        }
    }

    updateStats() {
        const totalResources = this.materials.length;
        const readMaterials = JSON.parse(localStorage.getItem('readMaterials') || '[]');
        const materialsRead = readMaterials.length;
        const progressPercent = totalResources > 0 ? Math.round((materialsRead / totalResources) * 100) : 0;

        document.getElementById('totalResources').textContent = totalResources;
        document.getElementById('materialsRead').textContent = materialsRead;
        document.getElementById('progressPercent').textContent = progressPercent + '%';
        document.getElementById('progressFill').style.width = progressPercent + '%';
    }

    async openMaterial(material) {
        if (!material) return;

        let mainContent = '';
        let interactiveContent = '';

        // Format main content
        if (material.content) {
            mainContent = `
                <div class="content-section">
                    <p class="material-description">${material.description || ''}</p>
                    <div class="material-content">
                        ${material.content}
                    </div>
                </div>
            `;
        }

        // Handle interactive elements
        if (material.interactiveElements && material.interactiveElements.length > 0) {
            interactiveContent = this.renderInteractiveElements(material.interactiveElements);
        }

        // Special handling for links
        if (material.type === 'link') {
            mainContent = `
                <div class="content-section">
                    <p class="material-description">${material.description || ''}</p>
                    <div class="link-content">
                        <a href="${material.url}" target="_blank" class="resource-link">
                            <i class="fas fa-external-link-alt"></i> Open Resource
                        </a>
                    </div>
                </div>
            `;
        }

        const modal = document.createElement('div');
        modal.className = 'material-modal show';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="this.closest('.material-modal').remove()"></div>
            <div class="modal-content">
                <button class="close-btn" onclick="this.closest('.material-modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
                
                <div class="modal-header">
                    <div class="header-main">
                    <h2>${material.title}</h2>
                    <div class="material-meta">
                            <span class="material-type">
                                <i class="fas fa-${this.getTypeIcon(material.type)}"></i> 
                                ${material.type}
                            </span>
                            <span class="material-date">
                                <i class="fas fa-calendar"></i> 
                                ${this.formatDate(material.created_at)}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="modal-body">
                    ${mainContent}
                    ${interactiveContent}
                </div>

                <div class="modal-footer">
                    <button class="btn btn-primary complete-btn" data-material-id="${material.id}">
                        <i class="fas fa-check"></i> Mark as Complete
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Initialize any quiz functionality if present
        if (material.interactiveElements) {
            this.initializeQuizHandlers(material.interactiveElements);
        }

        // Hook up completion to progress update
        const completeBtn = modal.querySelector('.complete-btn');
        if (completeBtn) {
            completeBtn.addEventListener('click', async () => {
                try {
                    // Mark read locally
                    this.markAsRead(material.id);
                    // Persist lightweight progress to server (module-less resource read)
                    await fetch('/api/sync_all_progress', { method: 'POST' }).catch(()=>{});
                } catch (e) {
                    console.warn('Progress sync skipped:', e);
                } finally {
                    modal.remove();
                    this.updateStats();
                    this.renderMaterials();
                }
            });
        }
    }

    renderInteractiveElements(elements) {
        if (!Array.isArray(elements)) return '';
        
        return elements.map(element => {
            switch (element.type) {
                case 'quiz':
                    return this.renderQuiz(element);
                case 'poll':
                    return this.renderPoll(element);
                case 'flashcards':
                    return this.renderFlashcards(element);
                case 'matching':
                    return this.renderMatchingGame(element);
                case 'fillInTheBlanks':
                    return this.renderFillInTheBlanks(element);
                case 'trueFalse':
                    return this.renderTrueFalse(element);
                default:
                    return '';
            }
        }).join('');
    }

    renderQuiz(quiz) {
        if (!quiz.questions || !Array.isArray(quiz.questions)) return '';

        return `
            <div class="quiz-section" data-quiz-id="${quiz.id || Date.now()}">
                <h3 class="quiz-title">${quiz.title || 'Quiz'}</h3>
                <div class="quiz-questions">
                    ${quiz.questions.map((question, qIndex) => `
                        <div class="question" data-question="${qIndex}">
                            <p class="question-text">${question.text}</p>
                            <div class="options">
                                ${question.options.map((option, oIndex) => `
                                    <label class="option">
                                        <input type="${question.type === 'multiple' ? 'checkbox' : 'radio'}" 
                                               name="q_${qIndex}" 
                                               value="${oIndex}"
                                               ${option.isCorrect ? 'data-correct="true"' : ''}>
                                        <span>${option.text}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-primary submit-quiz" onclick="window.learningMaterialsManager.handleQuizSubmission(this)">
                    <i class="fas fa-check"></i> Submit Answers
                </button>
            </div>`;
    }

    async handleQuizSubmission(button) {
        const quizSection = button.closest('.quiz-section');
        const quizId = quizSection.dataset.quizId;
        const answers = [];

        // Collect answers
        quizSection.querySelectorAll('.question').forEach((questionEl, qIndex) => {
            const selectedInputs = questionEl.querySelectorAll('input:checked');
            const answer = {
                questionIndex: qIndex,
                selectedOptions: Array.from(selectedInputs).map(input => parseInt(input.value))
            };
            answers.push(answer);
        });

        try {
            // Process answers and check correct ones
            let score = 0;
            quizSection.querySelectorAll('.question').forEach((questionEl, qIndex) => {
                const options = questionEl.querySelectorAll('.option');
                options.forEach((option, oIndex) => {
                    const input = option.querySelector('input');
                    const isSelected = input.checked;
                    const isCorrect = input.dataset.correct === 'true';
                    
                    option.classList.remove('correct', 'incorrect');
                    if (isSelected) {
                        option.classList.add(isCorrect ? 'correct' : 'incorrect');
                        if (isCorrect) score++;
                    }
                });
            });

            const totalQuestions = quizSection.querySelectorAll('.question').length;
            const percentScore = Math.round((score / totalQuestions) * 100);

            // Replace submit button with results
            const resultsHtml = `
                <div class="quiz-results">
                    <p>Score: ${percentScore}%</p>
                    <p>${score} out of ${totalQuestions} correct</p>
                </div>`;
            button.insertAdjacentHTML('afterend', resultsHtml);
            button.remove();

            // Disable all inputs
            quizSection.querySelectorAll('input').forEach(input => {
                input.disabled = true;
            });

        } catch (error) {
            console.error('Error processing quiz submission:', error);
            // Show error message
            const errorMsg = document.createElement('div');
            errorMsg.className = 'quiz-error';
            errorMsg.textContent = 'Failed to submit quiz. Please try again.';
            button.parentElement.insertBefore(errorMsg, button);
        }
    }

    createLinkModal(material) {
        return `
            <div class="modal-header">
                <h2><i class="fas fa-link"></i> ${material.title}</h2>
                <div class="material-meta">
                    <span class="material-type"><i class="fas fa-${this.getTypeIcon(material.type)}"></i> ${material.type}</span>
                    <span class="material-date"><i class="fas fa-calendar"></i> ${this.formatDate(material.created_at)}</span>
                </div>
            </div>
            <div class="modal-body">
                <div class="link-content">
                    <p class="link-description">${material.description || 'Click the button below to open this resource.'}</p>
                    <a href="${material.url}" target="_blank" class="btn btn-primary btn-large">
                        <i class="fas fa-external-link-alt"></i> Open Link
                    </a>
                </div>
            </div>
        `;
    }

    createContentModal(material) {
        // Parse and format the content
        const formattedContent = this.formatContent(material.content);
        
        return `
            <div class="modal-header">
                <h2><i class="fas fa-${this.getTypeIcon(material.type)}"></i> ${material.title}</h2>
                <div class="material-meta">
                    <span class="material-type"><i class="fas fa-${this.getTypeIcon(material.type)}"></i> ${material.type}</span>
                    <span class="material-date"><i class="fas fa-calendar"></i> ${this.formatDate(material.created_at)}</span>
                </div>
            </div>
            <div class="modal-body">
                <div class="content-display">
                    ${formattedContent}
                </div>
                <div class="resource-actions">
                    <button class="btn btn-primary" onclick="this.closest('.material-modal').remove()">
                        <i class="fas fa-check"></i> Mark as Read
                    </button>
                </div>
            </div>
        `;
    }

    renderInteractiveElement(element, index) {
        switch (element.type) {
            case 'quiz':
                return this.renderQuizSection(element, index);
            case 'poll':
                return this.renderPollSection(element, index);
            default:
                return '';
        }
    }

    renderQuizSection(quiz, index) {
        return `
            <div class="quiz-section" data-quiz-id="${index}">
                <h3 class="quiz-title"><i class="fas fa-question-circle"></i> ${quiz.title}</h3>
                <div class="quiz-questions">
                    ${quiz.questions.map((question, qIndex) => `
                        <div class="question" data-question="${qIndex}">
                            <p class="question-text">${question.text}</p>
                            <div class="options">
                                ${question.options.map((option, oIndex) => `
                                    <label class="option">
                                        <input type="${question.type === 'multiple' ? 'checkbox' : 'radio'}" 
                                               name="q${index}_${qIndex}" 
                                               value="${oIndex}">
                                        <span>${option.text}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-primary submit-quiz" onclick="window.learningMaterialsManager.submitQuiz(${index})">
                    <i class="fas fa-check"></i> Submit Answers
                </button>
            </div>
        `;
    }

    renderPollSection(poll, index) {
        return `
            <div class="poll-section" data-poll-id="${index}">
                <h3 class="poll-title"><i class="fas fa-poll"></i> ${poll.title}</h3>
                <p class="poll-question">${poll.question}</p>
                <div class="poll-options">
                    ${poll.options.map((option, oIndex) => `
                        <label class="poll-option">
                            <input type="radio" name="poll${index}" value="${oIndex}">
                            <span>${option}</span>
                            <div class="poll-result" style="width: 0%"></div>
                        </label>
                    `).join('')}
                </div>
                <button class="btn btn-primary submit-poll" onclick="window.learningMaterialsManager.submitPoll(${index})">
                    <i class="fas fa-paper-plane"></i> Submit Vote
                </button>
            </div>
        `;
    }

    renderFlashcards(flashcards) {
        console.log('Rendering flashcards:', flashcards);
        
        if (!flashcards.cards || !Array.isArray(flashcards.cards)) {
            console.error('Invalid flashcards data:', flashcards);
            return '';
        }

        console.log('Flashcards cards:', flashcards.cards);

        return `
            <div class="flashcard-section" data-flashcard-id="${flashcards.id || Date.now()}">
                <h3 class="flashcard-title"><i class="fas fa-cards-blank"></i> ${flashcards.title || 'Flashcards'}</h3>
                <div class="flashcard-container">
                    <div class="flashcard-controls">
                        <button class="btn btn-secondary prev-card" onclick="window.learningMaterialsManager.prevCard(this)">
                            <i class="fas fa-chevron-left"></i> Previous
                        </button>
                        <span class="card-counter">1 / ${flashcards.cards.length}</span>
                        <button class="btn btn-secondary next-card" onclick="window.learningMaterialsManager.nextCard(this)">
                            Next <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    <div class="flashcard-display">
                        ${flashcards.cards.map((card, index) => `
                            <div class="flashcard ${index === 0 ? 'active' : ''}" data-card-index="${index}">
                                <div class="flashcard-front">
                                    <h4>Question</h4>
                                    <p>${card.front}</p>
                                </div>
                                <div class="flashcard-back" style="display: none;">
                                    <h4>Answer</h4>
                                    <p>${card.back}</p>
                                </div>
                                <button class="btn btn-primary flip-card" onclick="window.learningMaterialsManager.flipCard(this)">
                                    <i class="fas fa-sync-alt"></i> Flip Card
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderMatchingGame(matching) {
        if (!matching.pairs || !Array.isArray(matching.pairs)) return '';

        // Create shuffled arrays for left and right items
        const leftItems = [...matching.pairs];
        const rightItems = [...matching.pairs];
        
        // Shuffle the arrays using Fisher-Yates algorithm
        this.shuffleArray(leftItems);
        this.shuffleArray(rightItems);

        return `
            <div class="matching-section" data-matching-id="${matching.id || Date.now()}">
                <h3 class="matching-title"><i class="fas fa-puzzle-piece"></i> ${matching.title || 'Matching Game'}</h3>
                <div class="matching-game">
                    <div class="matching-left">
                        <h4>Left Column</h4>
                        ${leftItems.map((pair, index) => `
                            <div class="matching-item" data-pair="${matching.pairs.findIndex(p => p.left === pair.left && p.right === pair.right)}" onclick="window.learningMaterialsManager.selectLeftItem(this, ${matching.pairs.findIndex(p => p.left === pair.left && p.right === pair.right)})">
                                ${pair.left}
                            </div>
                        `).join('')}
                    </div>
                    <div class="matching-right">
                        <h4>Right Column</h4>
                        ${rightItems.map((pair, index) => `
                            <div class="matching-item" data-pair="${matching.pairs.findIndex(p => p.left === pair.left && p.right === pair.right)}" onclick="window.learningMaterialsManager.selectRightItem(this, ${matching.pairs.findIndex(p => p.left === pair.left && p.right === pair.right)})">
                                ${pair.right}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="matching-results">
                    <p>Matches: <span class="match-count">0</span> / ${matching.pairs.length}</p>
                    <div class="matching-buttons">
                        <button class="btn btn-secondary shuffle-matching" onclick="window.learningMaterialsManager.shuffleMatchingGame(this)">
                            <i class="fas fa-random"></i> Shuffle
                        </button>
                        <button class="btn btn-primary check-matches" onclick="window.learningMaterialsManager.checkMatches(this)">
                            <i class="fas fa-check"></i> Check Matches
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderFillInTheBlanks(fill) {
        if (!fill.text || !fill.answers) return '';

        return `
            <div class="fill-section" data-fill-id="${fill.id || Date.now()}">
                <h3 class="fill-title"><i class="fas fa-edit"></i> ${fill.title || 'Fill in the Blanks'}</h3>
                <div class="fill-content">
                    <div class="fill-text">
                        ${fill.text.replace(/\[blank\]/g, '<input type="text" class="fill-blank" placeholder="Fill in the blank">')}
                    </div>
                    <button class="btn btn-primary check-fill" onclick="window.learningMaterialsManager.checkFillInTheBlanks(this)">
                        <i class="fas fa-check"></i> Check Answers
                    </button>
                    <div class="fill-feedback" style="display: none;"></div>
                </div>
            </div>
        `;
    }

    renderTrueFalse(trueFalse) {
        if (!trueFalse.questions || !Array.isArray(trueFalse.questions)) return '';

        return `
            <div class="truefalse-section" data-truefalse-id="${trueFalse.id || Date.now()}">
                <h3 class="truefalse-title"><i class="fas fa-check-circle"></i> ${trueFalse.title || 'True/False Quiz'}</h3>
                <div class="truefalse-questions">
                    ${trueFalse.questions.map((question, index) => `
                        <div class="truefalse-question">
                            <p class="question-text">${question.text}</p>
                            <div class="truefalse-options">
                                <label class="truefalse-option">
                                    <input type="radio" name="tf_${index}" value="true">
                                    <span>True</span>
                                </label>
                                <label class="truefalse-option">
                                    <input type="radio" name="tf_${index}" value="false">
                                    <span>False</span>
                                </label>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-primary submit-truefalse" onclick="window.learningMaterialsManager.submitTrueFalse(this)">
                    <i class="fas fa-check"></i> Submit Answers
                </button>
                <div class="truefalse-results" style="display: none;"></div>
            </div>
        `;
    }

    async submitQuiz(quizIndex) {
        const quizSection = document.querySelector(`[data-quiz-id="${quizIndex}"]`);
        if (!quizSection) return;

        const answers = [];
        quizSection.querySelectorAll('.question').forEach((questionEl, qIndex) => {
            const selected = questionEl.querySelector('input:checked');
            if (selected) {
                answers.push({
                    questionIndex: qIndex,
                    selectedOption: parseInt(selected.value)
                });
            }
        });

        try {
            const response = await fetch('/api/student/quiz/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quizIndex,
                    answers
                })
            });

            if (!response.ok) throw new Error('Failed to submit quiz');

            const result = await response.json();
            this.showNotification('Quiz submitted successfully!', 'success');
            
            // Show results
            this.displayQuizResults(quizSection, result.answers);

        } catch (error) {
            console.error('Error submitting quiz:', error);
            this.showNotification('Failed to submit quiz', 'error');
        }
    }

    displayQuizResults(quizSection, results) {
        quizSection.querySelectorAll('.question').forEach((questionEl, qIndex) => {
            const result = results[qIndex];
            if (result) {
                const options = questionEl.querySelectorAll('.option');
                options.forEach((option, oIndex) => {
                    const input = option.querySelector('input');
                    input.disabled = true;
                    
                    if (oIndex === result.correctOption) {
                        option.classList.add('correct');
                    } else if (oIndex === result.selectedOption && result.selectedOption !== result.correctOption) {
                        option.classList.add('incorrect');
                    }
                });
            }
        });

        // Replace submit button with score
        const submitBtn = quizSection.querySelector('.submit-quiz');
        if (submitBtn) {
            const score = results.filter(r => r.correct).length;
            const total = results.length;
            submitBtn.outerHTML = `
                <div class="quiz-result">
                    <p>Your score: ${score}/${total} (${Math.round((score/total) * 100)}%)</p>
                </div>
            `;
        }
    }

    initializeInteractiveElements(elements) {
        elements.forEach((element, index) => {
            if (element.type === 'quiz') {
                const quizSection = document.querySelector(`[data-quiz-id="${index}"]`);
                if (quizSection) {
                    // Add event listeners for quiz interactions
                    const submitBtn = quizSection.querySelector('.submit-quiz');
                    if (submitBtn) {
                        submitBtn.addEventListener('click', () => this.submitQuiz(index));
                    }
                }
            }
        });
    }

    formatContent(material) {
        if (!material.content && !material.interactiveElements?.length) {
            return '<p>No content available.</p>';
        }
        
        let contentHtml = '';
        
        // Add main content if exists
        if (material.content) {
            const sanitizedContent = material.content
                .replace(/onclick|onerror|onload/gi, '')
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            contentHtml += `<div class="rich-content">${sanitizedContent}</div>`;
        }
        
        // Add interactive elements if they exist
        if (material.interactiveElements?.length) {
            contentHtml += '<div class="interactive-elements">';
            material.interactiveElements.forEach((element, index) => {
                contentHtml += this.renderInteractiveElement(element, index);
            });
            contentHtml += '</div>';
        }
        
        return contentHtml;

        // Add CSS for rich content display
        const style = document.createElement('style');
        style.textContent = `
            .rich-content {
                font-size: 1.1rem;
                line-height: 1.6;
                color: #333;
            }
            .rich-content h1, .rich-content h2, .rich-content h3 {
                margin: 1.5rem 0 1rem;
                color: #111;
            }
            .rich-content p {
                margin-bottom: 1rem;
            }
            .rich-content ul, .rich-content ol {
                margin: 1rem 0;
                padding-left: 2rem;
            }
            .rich-content img {
                max-width: 100%;
                height: auto;
                border-radius: 8px;
                margin: 1rem 0;
            }
        `;
        document.head.appendChild(style);
        
        return sanitized;
    }

    setupEventListeners() {
        // Search functionality
        this.searchInput?.addEventListener('input', () => this.filterMaterials());

        // Filter by type
        this.filterSelect?.addEventListener('change', () => this.filterMaterials());

        // Sort functionality
        this.sortSelect?.addEventListener('change', () => this.sortMaterials());

        // View toggle
        this.viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.viewBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.materialsContainer.className = btn.id === 'gridView' ? 'materials-grid' : 'materials-list';
            });
        });

        // Teacher connection
        const connectBtn = document.getElementById('connectTeacherBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.handleTeacherConnection());
        }
    }

    filterMaterials() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const filterType = this.filterSelect.value;

        this.filteredMaterials = this.materials.filter(material => {
            const matchesSearch = material.title.toLowerCase().includes(searchTerm) ||
                                material.description.toLowerCase().includes(searchTerm);
            const matchesType = filterType === 'all' || material.type === filterType;
            
            return matchesSearch && matchesType;
        });

        this.sortMaterials(); // Apply current sort to filtered results
    }

    sortMaterials() {
        const sortType = this.sortSelect.value;

        this.filteredMaterials.sort((a, b) => {
            switch (sortType) {
                case 'date':
                    return b.created_at - a.created_at;
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'type':
                    return a.type.localeCompare(b.type);
                default:
                    return 0;
            }
        });

        this.renderMaterials();
    }

    async handleTeacherConnection() {
        const codeInput = document.getElementById('teacherCodeInput');
        const code = codeInput.value.trim();
        
        if (!code) {
            this.showError('Please enter a teacher code');
            return;
        }

        try {
            const response = await fetch('/teacher/code/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });

            const data = await response.json();
            if (data.success) {
                // Teacher connection successful, reload materials
                await this.loadMaterials();
                document.getElementById('teacherCodeDialog').style.display = 'none';
                this.showSuccess('Successfully connected to teacher!');
            } else {
                this.showError(data.error || 'Invalid teacher code');
            }
        } catch (error) {
            console.error('Error connecting to teacher:', error);
            this.showError('Failed to connect to teacher');
        }
    }

    showLoading(show = true) {
        this.loadingState.style.display = show ? 'flex' : 'none';
    }

    showEmptyState() {
        this.materialsContainer.innerHTML = '';
        this.emptyState.style.display = 'flex';
    }

    showError(message) {
        const errorDiv = document.getElementById('teacherConnectError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 3000);
        }
    }

    showSuccess(message) {
        const successDiv = document.getElementById('teacherConnectSuccess');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 3000);
        }
    }

    initializeQuizHandlers(interactiveElements) {
        // Set up global reference for quiz submission handler
        window.learningMaterialsManager = this;
        
        // Add any additional quiz initialization logic here
        console.log('Quiz handlers initialized for elements:', interactiveElements);
    }

    // Helper function to shuffle arrays using Fisher-Yates algorithm
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Flashcard handlers
    prevCard(button) {
        const section = button.closest('.flashcard-section');
        if (!section) {
            console.error('Flashcard section not found');
            return;
        }
        
        const activeCard = section.querySelector('.flashcard.active');
        if (!activeCard) {
            console.error('No active flashcard found');
            return;
        }
        
        const prevCard = activeCard.previousElementSibling;
        
        if (prevCard && prevCard.classList.contains('flashcard')) {
            activeCard.classList.remove('active');
            prevCard.classList.add('active');
            this.updateCardCounter(section);
        }
    }

    nextCard(button) {
        const section = button.closest('.flashcard-section');
        if (!section) {
            console.error('Flashcard section not found');
            return;
        }
        
        const activeCard = section.querySelector('.flashcard.active');
        if (!activeCard) {
            console.error('No active flashcard found');
            return;
        }
        
        const nextCard = activeCard.nextElementSibling;
        
        if (nextCard && nextCard.classList.contains('flashcard')) {
            activeCard.classList.remove('active');
            nextCard.classList.add('active');
            this.updateCardCounter(section);
        }
    }

    flipCard(button) {
        const card = button.closest('.flashcard');
        if (!card) {
            console.error('Flashcard not found');
            return;
        }
        
        const front = card.querySelector('.flashcard-front');
        const back = card.querySelector('.flashcard-back');
        
        if (!front || !back) {
            console.error('Flashcard front or back not found');
            return;
        }
        
        if (front.style.display === 'none') {
            front.style.display = 'block';
            back.style.display = 'none';
        } else {
            front.style.display = 'none';
            back.style.display = 'block';
        }
    }

    updateCardCounter(section) {
        if (!section) {
            console.error('Section not provided to updateCardCounter');
            return;
        }
        
        const activeCard = section.querySelector('.flashcard.active');
        if (!activeCard) {
            console.error('No active flashcard found for counter update');
            return;
        }
        
        const cardIndex = parseInt(activeCard.dataset.cardIndex) + 1;
        const totalCards = section.querySelectorAll('.flashcard').length;
        const counter = section.querySelector('.card-counter');
        if (counter) {
            counter.textContent = `${cardIndex} / ${totalCards}`;
        }
    }

    // Matching game handlers
    selectLeftItem(element, index) {
        const section = element.closest('.matching-section');
        section.dataset.selectedLeft = index;
        element.classList.add('selected');
    }

    selectRightItem(element, index) {
        const section = element.closest('.matching-section');
        const selectedLeft = section.dataset.selectedLeft;
        
        if (selectedLeft !== undefined) {
            if (selectedLeft == index) {
                element.classList.add('matched');
                section.querySelector(`[data-pair="${selectedLeft}"]`).classList.add('matched');
                this.updateMatchCount(section);
            }
            section.removeAttribute('data-selected-left');
            section.querySelectorAll('.matching-item').forEach(item => item.classList.remove('selected'));
        }
    }

    updateMatchCount(section) {
        const matchedCount = section.querySelectorAll('.matched').length / 2;
        section.querySelector('.match-count').textContent = matchedCount;
    }

    checkMatches(button) {
        const section = button.closest('.matching-section');
        const totalPairs = section.querySelectorAll('.matching-item').length / 2;
        const matchedCount = section.querySelectorAll('.matched').length / 2;
        
        if (matchedCount === totalPairs) {
            button.textContent = '🎉 Perfect! All matched!';
            button.classList.add('success');
        } else {
            button.textContent = `Keep trying! ${matchedCount}/${totalPairs} matched`;
        }
    }

    shuffleMatchingGame(button) {
        const section = button.closest('.matching-section');
        const leftColumn = section.querySelector('.matching-left');
        const rightColumn = section.querySelector('.matching-right');
        
        // Get all items from both columns
        const leftItems = Array.from(leftColumn.querySelectorAll('.matching-item'));
        const rightItems = Array.from(rightColumn.querySelectorAll('.matching-item'));
        
        // Shuffle both arrays
        this.shuffleArray(leftItems);
        this.shuffleArray(rightItems);
        
        // Clear existing items
        leftColumn.innerHTML = '<h4>Left Column</h4>';
        rightColumn.innerHTML = '<h4>Right Column</h4>';
        
        // Add shuffled items back
        leftItems.forEach(item => {
            leftColumn.appendChild(item);
        });
        
        rightItems.forEach(item => {
            rightColumn.appendChild(item);
        });
        
        // Reset match count and clear selections
        section.querySelector('.match-count').textContent = '0';
        section.querySelectorAll('.matching-item').forEach(item => {
            item.classList.remove('selected', 'matched');
        });
        
        // Reset check button
        const checkButton = section.querySelector('.check-matches');
        checkButton.textContent = 'Check Matches';
        checkButton.classList.remove('success');
        
        // Add shuffle animation
        section.style.animation = 'shuffleAnimation 0.5s ease-in-out';
        setTimeout(() => {
            section.style.animation = '';
        }, 500);
    }

    // Fill in the blanks handlers
    checkFillInTheBlanks(button) {
        const section = button.closest('.fill-section');
        const blanks = section.querySelectorAll('.fill-blank');
        const feedback = section.querySelector('.fill-feedback');
        
        let correctCount = 0;
        let totalBlanks = blanks.length;
        
        blanks.forEach((blank, index) => {
            const userAnswer = blank.value.toLowerCase().trim();
            // This would need to be compared with the correct answers from the data
            // For now, we'll just show a simple feedback
            if (userAnswer) {
                correctCount++;
                blank.classList.add('filled');
            } else {
                blank.classList.add('empty');
            }
        });
        
        feedback.innerHTML = `
            <p>You filled ${correctCount} out of ${totalBlanks} blanks!</p>
            <p>${correctCount === totalBlanks ? '🎉 Great job!' : 'Keep trying!'}</p>
        `;
        feedback.style.display = 'block';
    }

    // True/False handlers
    submitTrueFalse(button) {
        const section = button.closest('.truefalse-section');
        const questions = section.querySelectorAll('.truefalse-question');
        const results = section.querySelector('.truefalse-results');
        
        let answeredCount = 0;
        questions.forEach((question, index) => {
            const selected = question.querySelector('input:checked');
            if (selected) {
                answeredCount++;
                // Here you would check against correct answers
                question.classList.add('answered');
            }
        });
        
        results.innerHTML = `
            <h4>Results</h4>
            <p>You answered ${answeredCount} out of ${questions.length} questions.</p>
            <p>${answeredCount === questions.length ? '🎉 Complete!' : 'Please answer all questions.'}</p>
        `;
        results.style.display = 'block';
    }
}

// Initialize the manager when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new LearningMaterialsManager();
});