// ... existing code ...

class ResourceManager {
    constructor() {
        this.initializeUI();
        this.attachEventListeners();
    }

    initializeUI() {
        this.modal = document.getElementById('resourceModal');
        this.form = document.getElementById('resourceForm');
        this.addResourceBtn = document.getElementById('addResourceBtn');
        this.closeModalBtn = document.getElementById('closeModal');
        this.resourceList = document.getElementById('resourcesGrid');
        
        // Add type change handler
        const typeSelect = document.getElementById('resourceType');
        if (typeSelect) {
            typeSelect.addEventListener('change', () => this.handleTypeChange());
        }
    }

    handleTypeChange() {
        const typeSelect = document.getElementById('resourceType');
        const flashcardsContainer = document.getElementById('flashcardsContainer');
        const urlGroup = document.getElementById('urlGroup');
        
        if (typeSelect.value === 'flashcards') {
            flashcardsContainer.style.display = 'block';
            if (urlGroup) urlGroup.style.display = 'none';
        } else if (typeSelect.value === 'link') {
            if (flashcardsContainer) flashcardsContainer.style.display = 'none';
            if (urlGroup) urlGroup.style.display = 'block';
        } else {
            if (flashcardsContainer) flashcardsContainer.style.display = 'none';
            if (urlGroup) urlGroup.style.display = 'none';
        }
    }

    attachEventListeners() {
        if (this.addResourceBtn) {
            this.addResourceBtn.addEventListener('click', () => this.openModal());
        }
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeModal());
        }
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    validateFlashcardData(formData) {
        const title = formData.get('title')?.trim();
        if (!title) {
            throw new Error('Flashcard set title is required');
        }

        const flashcards = [];
        const fronts = formData.getAll('front[]');
        const backs = formData.getAll('back[]');

        if (fronts.length !== backs.length || fronts.length === 0) {
            throw new Error('Each flashcard must have both front and back content');
        }

        for (let i = 0; i < fronts.length; i++) {
            const front = fronts[i].trim();
            const back = backs[i].trim();
            if (!front || !back) {
                throw new Error('All flashcard fields must be filled out');
            }
            flashcards.push({ front, back });
        }

        return {
            title,
            cards: flashcards,
            type: 'flashcards'
        };
    }

    processFormData(formData) {
        const resourceType = formData.get('type');
        let resourceData = {
            title: formData.get('title')?.trim(),
            type: resourceType,
            description: formData.get('description')?.trim() || '',
            content: formData.get('content')?.trim() || '',
            teacherId: auth.currentUser.uid,
            createdAt: serverTimestamp()
        };

        if (resourceType === 'flashcards') {
            const flashcardData = this.validateFlashcardData(formData);
            resourceData.flashcards = flashcardData.cards;
        } else if (resourceType === 'link') {
            const url = formData.get('url')?.trim();
            if (!url) {
                throw new Error('URL is required for link resources');
            }
            resourceData.url = url;
        }

        return resourceData;
    }

    async handleSubmit(e) {
    try {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            this.showNotification('Please log in first', 'error');
            return;
        }

        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        if (submitBtn.querySelector('.loading-spinner')) {
            submitBtn.querySelector('.loading-spinner').style.display = 'block';
        }

        const formData = new FormData(e.target);
        const resourceData = {
            title: formData.get('title').trim(),
            type: formData.get('type'),
            description: formData.get('description').trim(),
            content: formData.get('content').trim(),
            url: formData.get('url')?.trim() || '',
            teacherId: user.uid,
            createdAt: serverTimestamp(),
            interactiveElements: []
        };

        // Collect interactive elements
        const interactiveContainer = document.getElementById('interactiveElements');
        
        // Collect quizzes
        const quizSections = interactiveContainer.querySelectorAll('.quiz-section');
        quizSections.forEach(section => {
            const quizData = {
                type: 'quiz',
                id: section.dataset.quizId,
                title: section.querySelector('.quiz-title')?.value || 'Quiz',
                questions: []
            };

            section.querySelectorAll('.question').forEach(questionEl => {
                const questionData = {
                    text: questionEl.querySelector('.question-text').value,
                    type: 'single', // or 'multiple' based on input type
                    options: []
                };

                questionEl.querySelectorAll('.option').forEach(optionEl => {
                    questionData.options.push({
                        text: optionEl.querySelector('input[type="text"]').value,
                        isCorrect: optionEl.querySelector('input[type="radio"], input[type="checkbox"]').checked
                    });
                });

                quizData.questions.push(questionData);
            });

            resourceData.interactiveElements.push(quizData);
        });

        // Collect flashcards
        const flashcardSections = interactiveContainer.querySelectorAll('.flashcard-section');
        flashcardSections.forEach(section => {
            const flashcardData = {
                type: 'flashcard',
                id: section.dataset.flashcardId,
                title: section.querySelector('.flashcard-title')?.value || 'Flashcards',
                cards: []
            };

            section.querySelectorAll('.flashcard').forEach(cardEl => {
                const frontInput = cardEl.querySelector('.flashcard-side:first-child input');
                const backInput = cardEl.querySelector('.flashcard-side:last-child input');
                
                if (frontInput && backInput && frontInput.value.trim() && backInput.value.trim()) {
                    flashcardData.cards.push({
                        front: frontInput.value.trim(),
                        back: backInput.value.trim()
                    });
                }
            });

            if (flashcardData.cards.length > 0) {
                resourceData.interactiveElements.push(flashcardData);
            }
        });

        // Collect matching games
        const matchingSections = interactiveContainer.querySelectorAll('.matching-section');
        matchingSections.forEach(section => {
            const matchingData = {
                type: 'matching',
                id: section.dataset.matchingId,
                title: section.querySelector('.matching-title')?.value || 'Matching Game',
                pairs: []
            };

            const leftItems = section.querySelectorAll('.matching-left .matching-item');
            const rightItems = section.querySelectorAll('.matching-right .matching-item');
            
            for (let i = 0; i < leftItems.length; i++) {
                matchingData.pairs.push({
                    left: leftItems[i].querySelector('input').value,
                    right: rightItems[i].querySelector('input').value
                });
            }

            resourceData.interactiveElements.push(matchingData);
        });

        // Collect fill in the blanks
        const fillSections = interactiveContainer.querySelectorAll('.fill-section');
        fillSections.forEach(section => {
            const fillData = {
                type: 'fill',
                id: section.dataset.fillId,
                title: section.querySelector('.fill-title')?.value || 'Fill in the Blanks',
                text: section.querySelector('.fill-text').value,
                answers: Array.from(section.querySelectorAll('.fill-answer input')).map(input => input.value)
            };

            resourceData.interactiveElements.push(fillData);
        });

        // Collect true/false questions
        const trueFalseSections = interactiveContainer.querySelectorAll('.truefalse-section');
        trueFalseSections.forEach(section => {
            const trueFalseData = {
                type: 'truefalse',
                id: section.dataset.truefalseId,
                title: section.querySelector('.truefalse-title')?.value || 'True/False Quiz',
                questions: []
            };

            section.querySelectorAll('.truefalse-question').forEach(questionEl => {
                trueFalseData.questions.push({
                    text: questionEl.querySelector('.question-text').value,
                    correct: questionEl.querySelector('input[type="radio"][value="true"]').checked
                });
            });

            resourceData.interactiveElements.push(trueFalseData);
        });

        // Save to Firestore
        const docRef = await addDoc(collection(db, 'resources'), resourceData);
        
        this.showNotification('Resource created successfully', 'success');
        this.closeModal();
        await this.loadResources(); // Refresh the resources list

    } catch (error) {
        console.error('Error creating resource:', error);
        this.showNotification('Error creating resource', 'error');
    } finally {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.querySelector('.loading-spinner').style.display = 'none';
    }
}

    addFlashcard() {
        const flashcardsList = document.getElementById('flashcardsList');
        const flashcardItem = document.createElement('div');
        flashcardItem.className = 'flashcard-item';
        flashcardItem.innerHTML = `
            <div class="flashcard-side">
                <label>Front:</label>
                <input type="text" name="front[]" class="form-input" placeholder="Question or term" required>
            </div>
            <div class="flashcard-side">
                <label>Back:</label>
                <input type="text" name="back[]" class="form-input" placeholder="Answer or definition" required>
            </div>
            <button type="button" class="remove-flashcard" onclick="this.closest('.flashcard-item').remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        flashcardsList.appendChild(flashcardItem);
    }

        // Interactive content methods
    addQuiz() {
        const element = document.createElement('div');
        element.className = 'interactive-item';
        element.innerHTML = `
            <div class="item-header">
                <h4 class="item-title">Quiz</h4>
                <div class="item-actions">
                    <button type="button" onclick="window.resourceManager.editInteractiveItem(this)">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" onclick="window.resourceManager.previewInteractiveItem(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" onclick="this.closest('.interactive-item').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="item-content" style="display: none;">
                <input type="text" class="form-input" placeholder="Quiz Title" required>
                <div class="questions-container">
                    <!-- Questions will be added here -->
                </div>
                <button type="button" class="btn btn-secondary" onclick="window.resourceManager.addQuestion(this)">
                    <i class="fas fa-plus"></i> Add Question
                </button>
            </div>
        `;
        const container = document.getElementById('interactiveElements');
        if (container) {
            container.appendChild(element);
        }
    }

    addFlashcards() {
        const element = document.createElement('div');
        element.className = 'interactive-item';
        element.innerHTML = `
            <div class="item-header">
                <h4 class="item-title">Flashcards</h4>
                <div class="item-actions">
                    <button type="button" onclick="window.resourceManager.editInteractiveItem(this)">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" onclick="window.resourceManager.previewInteractiveItem(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" onclick="this.closest('.interactive-item').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="item-content" style="display: none;">
                <input type="text" class="form-input" placeholder="Flashcard Set Title" required>
                <div class="flashcards-container">
                    <!-- Flashcards will be added here -->
                </div>
                <button type="button" class="btn btn-secondary" onclick="window.resourceManager.addFlashcardPair(this)">
                    <i class="fas fa-plus"></i> Add Flashcard
                </button>
            </div>
        `;
        const container = document.getElementById('interactiveElements');
        if (container) {
            container.appendChild(element);
        }
    }

    addMatchingGame() {
        const element = document.createElement('div');
        element.className = 'interactive-item';
        element.innerHTML = `
            <div class="item-header">
                <h4 class="item-title">Matching Game</h4>
                <div class="item-actions">
                    <button type="button" onclick="window.resourceManager.editInteractiveItem(this)">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" onclick="window.resourceManager.previewInteractiveItem(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" onclick="this.closest('.interactive-item').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="item-content" style="display: none;">
                <input type="text" class="form-input" placeholder="Matching Game Title" required>
                <div class="matching-pairs">
                    <!-- Matching pairs will be added here -->
                </div>
                <button type="button" class="btn btn-secondary" onclick="window.resourceManager.addMatchingPair(this)">
                    <i class="fas fa-plus"></i> Add Pair
                </button>
            </div>
        `;
        const container = document.getElementById('interactiveElements');
        if (container) {
            container.appendChild(element);
        }
    }

    addFillInBlanks() {
        const element = document.createElement('div');
        element.className = 'interactive-item';
        element.innerHTML = `
            <div class="item-header">
                <h4 class="item-title">Fill in the Blanks</h4>
                <div class="item-actions">
                    <button type="button" onclick="window.resourceManager.editInteractiveItem(this)">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" onclick="window.resourceManager.previewInteractiveItem(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" onclick="this.closest('.interactive-item').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="item-content" style="display: none;">
                <input type="text" class="form-input" placeholder="Fill in the Blanks Title" required>
                <textarea class="form-input" placeholder="Enter text with [blank] placeholders" rows="4" required></textarea>
                <div class="blanks-answers">
                    <!-- Answers will be added here -->
                </div>
                <button type="button" class="btn btn-secondary" onclick="window.resourceManager.addBlankAnswer(this)">
                    <i class="fas fa-plus"></i> Add Answer
                </button>
            </div>
        `;
        const container = document.getElementById('interactiveElements');
        if (container) {
            container.appendChild(element);
        }
    }

    // Helper functions for interactive content
    addQuestion(btn) {
        const container = btn.previousElementSibling;
        const questionCount = container.children.length + 1;
        const questionElement = document.createElement('div');
        questionElement.className = 'question';
        questionElement.innerHTML = `
            <input type="text" class="form-input question-text" placeholder="Question ${questionCount}" required>
            <div class="options">
                <div class="option">
                    <input type="radio" name="q${Date.now()}" required>
                    <input type="text" placeholder="Option 1" required>
                </div>
                <div class="option">
                    <input type="radio" name="q${Date.now()}" required>
                    <input type="text" placeholder="Option 2" required>
                </div>
            </div>
            <button type="button" class="btn btn-secondary" onclick="this.closest('.question').remove()">
                <i class="fas fa-trash"></i> Remove Question
            </button>
        `;
        container.appendChild(questionElement);
    }

    addFlashcardPair(btn) {
        const container = btn.previousElementSibling;
        const cardElement = document.createElement('div');
        cardElement.className = 'flashcard';
        cardElement.innerHTML = `
            <div class="card-sides">
                <input type="text" class="form-input" placeholder="Front side" required>
                <input type="text" class="form-input" placeholder="Back side" required>
            </div>
            <button type="button" class="btn btn-secondary" onclick="this.closest('.flashcard').remove()">
                <i class="fas fa-trash"></i> Remove Card
            </button>
        `;
        container.appendChild(cardElement);
    }

    addMatchingPair(btn) {
        const container = btn.previousElementSibling;
        const pairElement = document.createElement('div');
        pairElement.className = 'matching-pair';
        pairElement.innerHTML = `
            <input type="text" class="form-input" placeholder="Left item" required>
            <span class="match-arrow">↔</span>
            <input type="text" class="form-input" placeholder="Right item" required>
            <button type="button" class="btn btn-secondary" onclick="this.closest('.matching-pair').remove()">
                <i class="fas fa-trash"></i> Remove Pair
            </button>
        `;
        container.appendChild(pairElement);
    }

    addBlankAnswer(btn) {
        const container = btn.previousElementSibling;
        const answerElement = document.createElement('div');
        answerElement.className = 'blank-answer';
        answerElement.innerHTML = `
            <input type="text" class="form-input" placeholder="Answer for blank" required>
            <button type="button" class="btn btn-secondary" onclick="this.closest('.blank-answer').remove()">
                <i class="fas fa-trash"></i> Remove Answer
            </button>
        `;
        container.appendChild(answerElement);
    }

    editInteractiveItem(button) {
        const item = button.closest('.interactive-item');
        const content = item.querySelector('.item-content');
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
    }

    previewInteractiveItem(button) {
        const item = button.closest('.interactive-item');
        const content = item.querySelector('.item-content');
        const previewArea = document.getElementById('previewArea');
        
        // Get the data from the interactive item
        const data = this.collectItemData(item);
        
        // Show preview
        previewArea.innerHTML = this.generatePreview(data);
    }

    collectItemData(item) {
        const type = item.querySelector('.item-title').textContent.toLowerCase();
        const title = item.querySelector('input[type="text"]').value;
        const data = { type, title };
        
        switch(type) {
            case 'quiz':
                data.questions = this.collectQuizQuestions(item);
                break;
            case 'flashcards':
                data.cards = this.collectFlashcards(item);
                break;
            // Add more cases for other types
        }
        
        return data;
    }

    generatePreview(data) {
        switch(data.type) {
            case 'quiz':
                return this.generateQuizPreview(data);
            case 'flashcards':
                return this.generateFlashcardsPreview(data);
            default:
                return '<p>Preview not available</p>';
        }
    }

    generateQuizPreview(data) {
        return `
            <div class="preview-quiz">
                <h4>${data.title}</h4>
                ${data.questions.map((q, i) => `
                    <div class="preview-question">
                        <p><strong>Q${i + 1}:</strong> ${q.text}</p>
                        <div class="preview-options">
                            ${q.options.map(opt => `
                                <label>
                                    <input type="radio" name="q${i}" disabled>
                                    ${opt.text}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    generateFlashcardsPreview(data) {
        return `
            <div class="preview-flashcards">
                <h4>${data.title}</h4>
                <div class="flashcard-preview-container">
                    ${data.cards.map((card, i) => `
                        <div class="preview-flashcard">
                            <div class="preview-side front">
                                <p>${card.front}</p>
                            </div>
                            <div class="preview-side back">
                                <p>${card.back}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

// Initialize ResourceManager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.resourceManager = new ResourceManager();
});