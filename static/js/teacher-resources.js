// Teacher Resources Management
class ResourceManager {
    constructor() {
        // Bind all methods that need 'this' context
        this.handleSubmit = this.handleSubmit.bind(this);
        this.openModal = this.openModal.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.loadResources = this.loadResources.bind(this);
        this.resources = [];
        this.notificationContainer = null;
        
        // Initialize after binding
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async openAssignModal(resourceId) {
        this.assignModal = document.getElementById('assignModal');
        this.assignList = document.getElementById('assignStudentsList');
        this.assignSelectAll = document.getElementById('assignSelectAll');
        this.confirmAssignBtn = document.getElementById('confirmAssignBtn');
        this.closeAssignBtn = document.getElementById('closeAssignModal');
        this.cancelAssignBtn = document.getElementById('cancelAssignBtn');

        if (!this.assignModal) return;

        // Load students
        try {
            const res = await fetch('/api/teacher/students');
            const data = await res.json();
            const students = (data && data.students) ? data.students : [];
            this.assignList.innerHTML = students.map(s => `
                <label style="display:flex;align-items:center;gap:.5rem;">
                    <input type="checkbox" class="assign-student" value="${s.id}"> ${s.name || s.email || 'Student'}
                </label>
            `).join('') || '<div>No students found.</div>';

            // Select all
            if (this.assignSelectAll) {
                this.assignSelectAll.checked = false;
                this.assignSelectAll.onchange = () => {
                    document.querySelectorAll('.assign-student').forEach(cb => cb.checked = this.assignSelectAll.checked);
                };
            }

            // Confirm assignment
            if (this.confirmAssignBtn) {
                this.confirmAssignBtn.onclick = async () => {
                    const selected = Array.from(document.querySelectorAll('.assign-student:checked')).map(cb => cb.value);
                    await this.publishResource(resourceId, selected);
                };
            }

            // Close handlers
            const closeFn = () => this.assignModal.classList.remove('show');
            if (this.closeAssignBtn) this.closeAssignBtn.onclick = closeFn;
            if (this.cancelAssignBtn) this.cancelAssignBtn.onclick = closeFn;

            this.assignModal.classList.add('show');
        } catch (e) {
            this.showError('Failed to load students');
        }
    }

    async publishResource(resourceId, studentIds) {
        try {
            const res = await fetch(`/api/teacher/resources/${resourceId}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ student_ids: Array.isArray(studentIds) ? studentIds : [] })
            });
            if (!res.ok) {
                let msg = 'Publish failed';
                try { const err = await res.json(); msg = err.error || msg; } catch(e) {}
                throw new Error(msg);
            }
            this.assignModal.classList.remove('show');
            await this.loadResources();
            this.renderResources(this.resources);
            this.showSuccess('Resource assigned successfully!');
        } catch (e) {
            this.showError('Failed to assign resource');
        }
    }

    init() {
        this.bindUIElements();
        this.attachEventListeners();
        this.loadResources();
        this.initializeFileUpload();
        this.attachSortingListeners();
        this.initializeRichEditor();
    }

    bindUIElements() {
        // Query elements and store them
        this.modal = document.querySelector('#resourceModal');
        this.form = document.querySelector('#resourceForm');
        this.searchInput = document.querySelector('#resourceSearch');
        this.resourcesGrid = document.querySelector('#resourcesGrid');
        // Filter buttons removed
        this.filterBtns = null;
        this.addBtn = document.querySelector('#addResourceBtn');
        this.closeBtn = document.querySelector('#closeModal');
        this.cancelBtn = document.querySelector('#cancelBtn');
        this.resourceSort = document.getElementById('resourceSort');
    }

    attachEventListeners() {
        // Only attach if elements exist
        if (this.addBtn) {
            this.addBtn.addEventListener('click', this.openModal);
        }
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', this.closeModal);
        }
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', this.closeModal);
        }
        if (this.form) {
            this.form.addEventListener('submit', this.handleSubmit);
        }
        // Type is now always 'lesson', no need for change handler
        if (this.searchInput) {
            const debounced = (fn, delay=250) => {
                let t; return (...args) => { clearTimeout(t); t = setTimeout(()=>fn.apply(this,args), delay); };
            };
            const onInput = debounced((e) => {
                this.searchTerm = (e.target.value || '').toLowerCase();
                this.filterResources();
            }, 300);
            this.searchInput.addEventListener('input', onInput);
            const clearBtn = document.getElementById('clearSearch');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.searchInput.value = '';
                    this.searchTerm = '';
                    this.filterResources();
            });
            }
        }
        if (this.resourceSort) {
            this.resourceSort.addEventListener('change', () => {
                this.sortResources(this.resourceSort.value);
            });
        }
    }

    // Type is now always 'lesson', no need for type change handling

    initializeRichEditor() {
        const editor = document.getElementById('resourceEditor');
        const toolbar = document.querySelector('.editor-toolbar');
        
        if (!editor || !toolbar) return;

        // Add event listeners to toolbar buttons
        toolbar.addEventListener('click', (e) => {
            if (e.target.closest('.toolbar-btn')) {
                e.preventDefault();
                const action = e.target.closest('.toolbar-btn').dataset.action;
                this.executeEditorCommand(action);
                this.updateToolbarState();
            }
        });

        // Update toolbar state when selection changes
        editor.addEventListener('keyup', () => this.updateToolbarState());
        editor.addEventListener('mouseup', () => this.updateToolbarState());

        // Update hidden input when editor content changes
        editor.addEventListener('input', () => {
            const contentInput = document.getElementById('resourceContent');
            if (contentInput) {
                contentInput.value = editor.innerHTML;
            }
        });

        // Handle paste events to clean up formatting
        editor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
        });
    }

    executeEditorCommand(action) {
        const editor = document.getElementById('resourceEditor');
        if (!editor) return;

        // Focus the editor first
        editor.focus();

        switch (action) {
            case 'bold':
                document.execCommand('bold', false, null);
                break;
            case 'italic':
                document.execCommand('italic', false, null);
                break;
            case 'heading':
                // Toggle between normal text and heading
                if (document.queryCommandState('formatBlock')) {
                    document.execCommand('formatBlock', false, 'div');
        } else {
                    document.execCommand('formatBlock', false, 'h3');
                }
                break;
            case 'list':
                // Toggle unordered list
                if (document.queryCommandState('insertUnorderedList')) {
                    document.execCommand('removeFormat', false, null);
                } else {
                    document.execCommand('insertUnorderedList', false, null);
                }
                break;
        }

        // Update the hidden input
        const contentInput = document.getElementById('resourceContent');
        if (contentInput) {
            contentInput.value = editor.innerHTML;
        }
    }

    updateToolbarState() {
        const toolbar = document.querySelector('.editor-toolbar');
        if (!toolbar) return;

        // Update button states based on current selection
        const buttons = toolbar.querySelectorAll('.toolbar-btn');
        buttons.forEach(button => {
            const action = button.dataset.action;
            let isActive = false;

            switch (action) {
                case 'bold':
                    isActive = document.queryCommandState('bold');
                    break;
                case 'italic':
                    isActive = document.queryCommandState('italic');
                    break;
                case 'heading':
                    isActive = document.queryCommandState('formatBlock');
                    break;
                case 'list':
                    isActive = document.queryCommandState('insertUnorderedList');
                    break;
            }

            if (isActive) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    async loadResources() {
        try {
            const response = await fetch('/api/teacher/resources');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.resources = Array.isArray(data.resources) ? data.resources : [];
            this.renderResources(this.resources);
        } catch (error) {
            console.error('Error loading resources:', error);
            this.showError('Failed to load resources. Please try again.');
        }
    }

    filterResources() {
        if (!Array.isArray(this.resources)) {
            return;
        }
        
        const searchTerm = (this.searchTerm || this.searchInput?.value || '').toLowerCase();
        const filtered = this.resources.filter(resource => 
            resource.title.toLowerCase().includes(searchTerm) || 
            resource.description.toLowerCase().includes(searchTerm)
        );
        this.renderResources(filtered);
    }

    sortResources(sortBy) {
        if (!Array.isArray(this.resources)) {
            return;
        }

        this.resources.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'name':
                    return a.title.localeCompare(b.title);
                case 'type':
                    return a.type.localeCompare(b.type);
                default:
                    return 0;
            }
        });
        this.filterResources();
    }

    renderResources(resources = []) {
        if (!this.resourcesGrid) {
            return;
        }
        
        if (!Array.isArray(resources) || resources.length === 0) {
            this.resourcesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>No resources found</p>
                </div>
            `;
            return;
        }

        this.resourcesGrid.innerHTML = resources.map(resource => this.createResourceCard(resource)).join('');
        
        // Attach event listeners to action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                if (action === 'assign') {
                    this.openAssignModal(id);
                } else if (action === 'edit') {
                    this.editResource(id);
                } else if (action === 'delete') {
                    this.deleteResource(id);
                }
            });
        });
    }

    createResourceCard(resource) {
        const date = new Date(resource.updated_at || resource.created_at).toLocaleDateString();
        const typeIcons = {
            pdf: 'fa-file-pdf',
            video: 'fa-video',
            link: 'fa-link',
            lesson: 'fa-book',
            quiz: 'fa-question',
            text: 'fa-file-alt'
        };

        return `
            <div class="resource-card" data-id="${resource.id}">
                <div class="resource-top">
                    <span class="badge badge-type">${resource.type.toUpperCase()}</span>
                    ${!resource.published ? '<span class="badge badge-draft">DRAFT</span>' : ''}
                </div>
                <div class="resource-content">
                    <div class="resource-main">
                <h3 class="resource-title">${this.escapeHtml(resource.title)}</h3>
                <p class="resource-description">${this.escapeHtml(resource.description)}</p>
                ${resource.content ? `<div class="resource-preview">${this.escapeHtml(resource.content.substring(0, 100))}...</div>` : ''}
                    </div>
                    <div class="resource-cta">
                        ${!resource.published ? `<button class="action-btn primary full" data-action="assign" data-id="${resource.id}"><i class=\"fas fa-share\"></i> Assign</button>` : ''}
                        <button class="action-btn secondary full" data-action="view" data-id="${resource.id}">
                            View
                        </button>
                        <button class="action-btn secondary full" data-action="edit" data-id="${resource.id}">
                            Edit
                        </button>
                        <button class="action-btn danger full" data-action="delete" data-id="${resource.id}">
                            Delete
                        </button>
                    </div>
                </div>
                <div class="resource-bottom">
                    <span class="resource-date">
                        ${date}
                    </span>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    showNotification(notification) {
        // Create container if it doesn't exist
        if (!this.notificationContainer) {
            this.notificationContainer = document.createElement('div');
            this.notificationContainer.className = 'notification-container';
            document.body.appendChild(this.notificationContainer);
        }

        // Create notification element
        const notifElement = document.createElement('div');
        notifElement.className = `notification ${notification.type || 'info'}`;
        
        const messageElement = document.createElement('span');
        messageElement.textContent = notification.message;
        notifElement.appendChild(messageElement);

        // Add to container
        this.notificationContainer.appendChild(notifElement);

        // Remove after timeout
        setTimeout(() => {
            notifElement.classList.add('fade-out');
            setTimeout(() => {
                if (notifElement.parentNode === this.notificationContainer) {
                    this.notificationContainer.removeChild(notifElement);
                }
            }, 300);
        }, 3000);
    }

    showError(message) {
        this.showNotification({
            type: 'error',
            message: message
        });
    }

    showSuccess(message) {
        this.showNotification({
            type: 'success',
            message: message
        });
    }

    initializeFileUpload() {
        const dropZone = document.querySelector('.file-upload');
        const fileInput = document.getElementById('resourceFile');
        const placeholder = document.querySelector('.upload-placeholder');
        const progress = document.querySelector('.upload-progress');
        
        if (!dropZone || !fileInput) return;

        const progressFill = progress?.querySelector('.progress-fill');
        const progressText = progress?.querySelector('.progress-text');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('highlight');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('highlight');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file) {
                if (file.type === 'application/pdf' || file.type.startsWith('video/')) {
                    fileInput.files = e.dataTransfer.files;
                    if (placeholder) {
                        placeholder.innerHTML = `
                            <i class="fas ${file.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-video'}"></i>
                            <span>${file.name}</span>
                        `;
                    }
                } else {
                    this.showError('Please upload a PDF or video file');
                }
            }
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && placeholder) {
                placeholder.innerHTML = `
                    <i class="fas ${file.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-video'}"></i>
                    <span>${file.name}</span>
                `;
            }
        });
    }

    attachSortingListeners() {
        const sortSelect = document.getElementById('sortResources');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                const sortBy = sortSelect.value;
                if (!this.resources) return;
                
                this.resources.sort((a, b) => {
                    switch (sortBy) {
                        case 'newest':
                            return new Date(b.created_at) - new Date(a.created_at);
                        case 'oldest':
                            return new Date(a.created_at) - new Date(b.created_at);
                        case 'name':
                            return a.title.localeCompare(b.title);
                        case 'type':
                            return a.type.localeCompare(b.type);
                        default:
                            return 0;
                    }
                });
                this.renderResources();
            });
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        try {
            // Get the content from the rich editor
            const richEditor = document.getElementById('resourceEditor');
            const contentInput = document.getElementById('resourceContent');
            contentInput.value = richEditor.innerHTML;

            const formData = new FormData(this.form);
            
            // Small delay to ensure DOM is fully updated
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const interactiveElements = [];
            
            // Debug: Check what elements are in the DOM
            console.log('Flashcard sections found:', document.querySelectorAll('.flashcard-section').length);
            console.log('Quiz sections found:', document.querySelectorAll('.quiz-section').length);
            console.log('Poll sections found:', document.querySelectorAll('.poll-section').length);
            console.log('Matching sections found:', document.querySelectorAll('.matching-section').length);
            console.log('True/False sections found:', document.querySelectorAll('.truefalse-section').length);
            
            // Collect quiz data
            document.querySelectorAll('.quiz-section').forEach(quizSection => {
                const titleElement = quizSection.querySelector('.quiz-title');
                if (!titleElement) return;
                
                const quizData = {
                    type: 'quiz',
                    title: titleElement.value || '',
                    questions: []
                };

                quizSection.querySelectorAll('.question').forEach(questionEl => {
                    const questionTextElement = questionEl.querySelector('.question-text');
                    if (!questionTextElement) return;
                    
                    const question = {
                        text: questionTextElement.value || '',
                        type: 'single',
                        options: []
                    };

                    // Collect options and correct answer
                    const options = questionEl.querySelectorAll('.option');
                    options.forEach(optionEl => {
                        const textInput = optionEl.querySelector('input[type="text"]');
                        const radioInput = optionEl.querySelector('input[type="radio"]');
                        
                        if (textInput) {
                        question.options.push({
                                text: textInput.value || '',
                                isCorrect: radioInput ? radioInput.checked : false
                        });
                        }
                    });

                    if (question.text) {
                    quizData.questions.push(question);
                    }
                });

                if (quizData.questions.length > 0 || quizData.title) {
                interactiveElements.push(quizData);
                }
            });

            // Collect poll data
            document.querySelectorAll('.poll-section').forEach(pollSection => {
                const titleElement = pollSection.querySelector('.poll-title');
                const questionElement = pollSection.querySelector('.poll-question');
                
                if (!titleElement || !questionElement) return;
                
                const pollData = {
                    type: 'poll',
                    title: titleElement.value || '',
                    question: questionElement.value || '',
                    options: []
                };

                pollSection.querySelectorAll('.option input[type="text"]').forEach(option => {
                    if (option.value) {
                    pollData.options.push(option.value);
                    }
                });

                if (pollData.title || pollData.question || pollData.options.length > 0) {
                interactiveElements.push(pollData);
                }
            });

            // Collect flashcard data
            document.querySelectorAll('.flashcard-section').forEach(flashcardSection => {
                const titleElement = flashcardSection.querySelector('.flashcard-title');
                if (!titleElement) return; // Skip if no title element found
                
                const flashcardData = {
                    type: 'flashcards',
                    title: titleElement.value || '',
                    cards: []
                };

                console.log('Processing flashcard section:', flashcardData.title);
                console.log('Found flashcard elements:', flashcardSection.querySelectorAll('.flashcard').length);

                flashcardSection.querySelectorAll('.flashcard').forEach((cardEl, index) => {
                    console.log(`Processing flashcard ${index + 1}:`, cardEl);
                    
                    // Try different selectors to find the inputs
                    const allInputs = cardEl.querySelectorAll('input[type="text"]');
                    console.log('All inputs found:', allInputs.length);
                    
                    if (allInputs.length >= 2) {
                        const front = allInputs[0].value;
                        const back = allInputs[1].value;
                        console.log(`Card ${index + 1} - Front: "${front}", Back: "${back}"`);
                        
                        if (front && back) {
                            flashcardData.cards.push({
                                front: front,
                                back: back
                            });
                        }
                    } else {
                        console.log(`Card ${index + 1} - Not enough inputs found (${allInputs.length})`);
                    }
                });

                console.log('Final flashcard data:', flashcardData);

                // Only add if we have cards or a title
                if (flashcardData.cards.length > 0 || flashcardData.title) {
                    interactiveElements.push(flashcardData);
                }
            });

            // Collect matching game data
            document.querySelectorAll('.matching-section').forEach(matchingSection => {
                const titleElement = matchingSection.querySelector('.matching-title');
                if (!titleElement) return;
                
                const matchingData = {
                    type: 'matching',
                    title: titleElement.value || '',
                    pairs: []
                };

                matchingSection.querySelectorAll('.matching-pair').forEach(pairEl => {
                    const inputs = pairEl.querySelectorAll('input[type="text"]');
                    const left = inputs[0] ? inputs[0].value.trim() : '';
                    const right = inputs[1] ? inputs[1].value.trim() : '';
                    if (left && right) {
                        matchingData.pairs.push({ left, right });
                    }
                });

                if (matchingData.pairs.length > 0 || matchingData.title) {
                    interactiveElements.push(matchingData);
                }
            });

            // Fill in the Blanks removed

            // Collect true/false data
            document.querySelectorAll('.truefalse-section').forEach(trueFalseSection => {
                const titleElement = trueFalseSection.querySelector('.truefalse-title');
                if (!titleElement) return;
                
                const trueFalseData = {
                    type: 'trueFalse',
                    title: titleElement.value || '',
                    questions: []
                };

                trueFalseSection.querySelectorAll('.truefalse-question').forEach(questionEl => {
                    const questionTextElement = questionEl.querySelector('.question-text');
                    if (!questionTextElement) return;
                    
                    const questionText = questionTextElement.value;
                    const trueRadio = questionEl.querySelector('input[value="true"]:checked');
                    const falseRadio = questionEl.querySelector('input[value="false"]:checked');
                    const correctAnswer = trueRadio ? true : falseRadio ? false : null;
                    
                    if (questionText && correctAnswer !== null) {
                        trueFalseData.questions.push({
                            text: questionText,
                            correctAnswer: correctAnswer
                        });
                    }
                });

                if (trueFalseData.questions.length > 0 || trueFalseData.title) {
                    interactiveElements.push(trueFalseData);
                }
            });

            // Prepare the resource data with all properties
            const resourceData = {
                title: formData.get('title'),
                type: formData.get('type'),
                description: formData.get('description'),
                content: contentInput.value,
                url: formData.get('url'),
                interactiveElements: interactiveElements,
                created_at: new Date().toISOString()
            };

            // Debug: Log the collected interactive elements
            console.log('Collected interactive elements:', interactiveElements);
            console.log('Total interactive elements found:', interactiveElements.length);
            
            // Log each element type
            interactiveElements.forEach((element, index) => {
                console.log(`Element ${index + 1}:`, element.type, element);
            });

            // Debug: Log the complete resource data being sent
            console.log('Complete resource data being sent:', resourceData);
            console.log('Interactive elements in resource data:', resourceData.interactiveElements);
            console.log('Interactive elements length:', resourceData.interactiveElements.length);
            console.log('Content field:', resourceData.content);
            console.log('Title field:', resourceData.title);
            console.log('Type field:', resourceData.type);

            // Check if we're editing an existing resource
            const resourceId = this.form.dataset.resourceId;
            const isEdit = !!resourceId;
            
            // Make the API request
            const url = isEdit ? `/api/teacher/resources/${resourceId}` : '/api/teacher/resources';
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(resourceData)
            });

            if (!response.ok) {
                throw new Error(await response.text() || response.statusText);
            }

            const result = await response.json();
            
            if (isEdit) {
                this.showNotification('Resource updated successfully!', 'success');
                // Update the resource in the local array
                await this.loadResources();
            } else {
                this.showNotification('Resource created successfully!', 'success');
                // Reload from server to ensure consistency
                await this.loadResources();
            }
            
            this.closeModal();
            this.renderResources(this.resources);

        } catch (error) {
            console.error('Error saving resource:', error);
            this.showNotification('Error saving resource: ' + error.message, 'error');
        }
    }

    async editResource(id) {
        try {
            // Find resource in existing resources array
            const resource = this.resources.find(r => r.id === id);
            if (!resource) {
                throw new Error('Resource not found');
            }
            
            // Set form fields
            this.form.querySelector('[name="title"]').value = resource.title;
            this.form.querySelector('[name="description"]').value = resource.description || '';
            // Type is always 'lesson' now, no need to set it
            
            const richEditor = document.getElementById('resourceEditor');
            if (richEditor && resource.content) {
                richEditor.innerHTML = resource.content;
            }
            
            // Load interactive elements if they exist
            if (resource.interactiveElements && resource.interactiveElements.length > 0) {
                this.loadInteractiveElements(resource.interactiveElements);
            }
            
            // Set resource ID in form dataset
            this.form.dataset.resourceId = id;
            
            // Update modal title
            const modalTitle = document.querySelector('#modalTitle span');
            if (modalTitle) {
                modalTitle.textContent = 'Edit Resource';
            }
            
            // Type is always 'lesson', no need to show/hide fields
            
            // Open modal
            this.openModal();
            
        } catch (error) {
            console.error('Error editing resource:', error);
            this.showError('Failed to load resource for editing');
        }
    }

    async deleteResource(id) {
        const proceed = await this.openConfirmModal('Are you sure you want to delete this resource? This cannot be undone.');
        if (!proceed) return;

        try {
            const response = await fetch(`/api/teacher/resources/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                let errorMessage = 'Failed to delete resource';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (e) {
                    // If response isn't JSON, use status text
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            await this.loadResources();
            this.renderResources(this.resources);
            this.showSuccess('Resource deleted successfully!');
            
        } catch (error) {
            console.error('Error deleting resource:', error);
            this.showError(error.message || 'Failed to delete resource. Please try again.');
        }
    }

    openConfirmModal(message) {
        return new Promise((resolve) => {
            const existing = document.getElementById('confirmModal');
            if (existing) existing.remove();
            const modal = document.createElement('div');
            modal.id = 'confirmModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content small">
                    <div class="modal-header">
                        <h3>Confirm</h3>
                        <button class="close-modal" aria-label="Close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer" style="display:flex;gap:.5rem;justify-content:flex-end;">
                        <button class="quiz-btn btn-secondary" id="confirmCancel">Cancel</button>
                        <button class="quiz-btn btn-danger" id="confirmOk">Delete</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);
            requestAnimationFrame(() => modal.classList.add('show'));
            const cleanup = (result) => {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 200);
                resolve(result);
            };
            modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(false); });
            modal.querySelector('.close-modal').onclick = () => cleanup(false);
            modal.querySelector('#confirmCancel').onclick = () => cleanup(false);
            modal.querySelector('#confirmOk').onclick = () => cleanup(true);
        });
    }

    openModal() {
        // Clear form dataset when opening for new resource
        if (!this.form.dataset.resourceId) {
            this.form.reset();
            delete this.form.dataset.resourceId;
            // Update modal title for new resource
            const modalTitle = document.querySelector('#modalTitle span');
            if (modalTitle) {
                modalTitle.textContent = 'Add New Resource';
            }
        }
        
        if (this.modal) {
            this.modal.classList.add('show');
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.classList.remove('show');
            this.form.reset();
            delete this.form.dataset.resourceId;
            
            // Clear interactive elements
            const interactiveContainer = document.getElementById('interactiveElements');
            if (interactiveContainer) {
                interactiveContainer.innerHTML = '';
            }
            
            // Reset modal title
            const modalTitle = document.querySelector('#modalTitle span');
            if (modalTitle) {
                modalTitle.textContent = 'Add New Resource';
            }
        }
    }

    loadInteractiveElements(interactiveElements) {
        const container = document.getElementById('interactiveElements');
        if (!container) return;

        // Clear existing elements
        container.innerHTML = '';

        interactiveElements.forEach(element => {
            switch (element.type) {
                case 'quiz':
                    this.loadQuizElement(element);
                    break;
                case 'poll':
                    this.loadPollElement(element);
                    break;
                case 'flashcards':
                    this.loadFlashcardElement(element);
                    break;
                case 'matching':
                    this.loadMatchingElement(element);
                    break;
                // Fill in the Blanks removed
                case 'trueFalse':
                    this.loadTrueFalseElement(element);
                    break;
            }
        });
    }

    loadQuizElement(quiz) {
        const quizId = Date.now();
        const quizHtml = `
            <div class="quiz-section" data-quiz-id="${quizId}">
                <div class="quiz-header">
                    <input type="text" class="quiz-title" placeholder="Quiz Title" value="${quiz.title || ''}" required>
                    <button type="button" class="remove-quiz" onclick="removeQuizSection(${quizId})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="questions-container">
                    ${quiz.questions ? quiz.questions.map((question, qIndex) => `
                        <div class="question">
                            <input type="text" class="question-text" placeholder="Enter your question" value="${question.text || ''}" required>
                            <div class="options">
                                ${question.options ? question.options.map((option, oIndex) => `
                                    <div class="option">
                                        <input type="radio" name="correct_${quizId}_${qIndex}" ${option.isCorrect ? 'checked' : ''}>
                                        <input type="text" placeholder="Option ${oIndex + 1}" value="${option.text || ''}" required>
                                    </div>
                                `).join('') : ''}
                            </div>
                            <button type="button" class="add-option" onclick="addQuizOption(this)">
                                <i class="fas fa-plus"></i> Add Option
                            </button>
                        </div>
                    `).join('') : ''}
                </div>
                <button type="button" class="add-question" onclick="addQuizQuestion(${quizId})">
                    <i class="fas fa-plus"></i> Add Question
                </button>
            </div>
        `;
        document.getElementById('interactiveElements').insertAdjacentHTML('beforeend', quizHtml);
    }

    loadPollElement(poll) {
        const pollId = Date.now();
        const pollHtml = `
            <div class="poll-section" data-poll-id="${pollId}">
                <div class="poll-header">
                    <input type="text" class="poll-title" placeholder="Poll Title" value="${poll.title || ''}" required>
                    <button type="button" class="remove-poll" onclick="removePoll(${pollId})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <input type="text" class="poll-question" placeholder="Enter your poll question" value="${poll.question || ''}" required>
                <div class="poll-options">
                    ${poll.options ? poll.options.map((option, index) => `
                        <div class="option">
                            <input type="text" placeholder="Option ${index + 1}" value="${option}" required>
                        </div>
                    `).join('') : ''}
                </div>
                <button type="button" class="add-option" onclick="addPollOption(this)">
                    <i class="fas fa-plus"></i> Add Option
                </button>
            </div>
        `;
        document.getElementById('interactiveElements').insertAdjacentHTML('beforeend', pollHtml);
    }

    loadFlashcardElement(flashcards) {
        const flashcardId = Date.now();
        const flashcardHtml = `
            <div class="flashcard-section" data-flashcard-id="${flashcardId}">
                <div class="flashcard-header">
                    <input type="text" class="flashcard-title" placeholder="Flashcard Set Title" value="${flashcards.title || ''}" required>
                    <button type="button" class="remove-flashcard" onclick="removeFlashcard(${flashcardId})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="flashcards-container">
                    ${flashcards.cards ? flashcards.cards.map(card => `
                        <div class="flashcard">
                            <div class="flashcard-side">
                                <label>Front:</label>
                                <input type="text" placeholder="Question or term" value="${card.front || ''}" required>
                            </div>
                            <div class="flashcard-side">
                                <label>Back:</label>
                                <input type="text" placeholder="Answer or definition" value="${card.back || ''}" required>
                            </div>
                            <button type="button" class="remove-flashcard-item" onclick="this.parentElement.remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `).join('') : ''}
                </div>
                <button type="button" class="add-flashcard" onclick="addFlashcardItem(${flashcardId})">
                    <i class="fas fa-plus"></i> Add Flashcard
                </button>
            </div>
        `;
        document.getElementById('interactiveElements').insertAdjacentHTML('beforeend', flashcardHtml);
    }

    loadMatchingElement(matching) {
        const matchingId = Date.now();
        const matchingHtml = `
            <div class="matching-section" data-matching-id="${matchingId}">
                <div class="matching-header">
                    <input type="text" class="matching-title" placeholder="Matching Game Title" value="${matching.title || ''}" required>
                    <button type="button" class="remove-matching" onclick="removeMatchingGame(${matchingId})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="matching-pairs">
                    ${matching.pairs ? matching.pairs.map(pair => `
                        <div class="matching-pair">
                            <input type="text" placeholder="Left item" value="${pair.left || ''}" required>
                            <span class="matching-arrow">↔</span>
                            <input type="text" placeholder="Right item" value="${pair.right || ''}" required>
                            <button type="button" class="remove-pair" onclick="this.parentElement.remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `).join('') : ''}
                </div>
                <button type="button" class="add-pair" onclick="addMatchingPair(${matchingId})">
                    <i class="fas fa-plus"></i> Add Pair
                </button>
            </div>
        `;
        document.getElementById('interactiveElements').insertAdjacentHTML('beforeend', matchingHtml);
    }

    // Fill in the Blanks removed

    loadTrueFalseElement(trueFalse) {
        const trueFalseId = Date.now();
        const trueFalseHtml = `
            <div class="truefalse-section" data-truefalse-id="${trueFalseId}">
                <div class="truefalse-header">
                    <input type="text" class="truefalse-title" placeholder="True/False Quiz Title" value="${trueFalse.title || ''}" required>
                    <button type="button" class="remove-truefalse" onclick="removeTrueFalse(${trueFalseId})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="truefalse-questions">
                    ${trueFalse.questions ? trueFalse.questions.map((question, index) => `
                        <div class="truefalse-question">
                            <input type="text" class="question-text" placeholder="Enter your statement" value="${question.text || ''}" required>
                            <div class="truefalse-options">
                                <label>
                                    <input type="radio" name="answer_${trueFalseId}_${index}" value="true" ${question.correctAnswer === true ? 'checked' : ''} required>
                                    True
                                </label>
                                <label>
                                    <input type="radio" name="answer_${trueFalseId}_${index}" value="false" ${question.correctAnswer === false ? 'checked' : ''} required>
                                    False
                                </label>
                            </div>
                            <button type="button" class="remove-question" onclick="this.parentElement.remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `).join('') : ''}
                </div>
                <button type="button" class="add-question" onclick="addTrueFalseQuestion(${trueFalseId})">
                    <i class="fas fa-plus"></i> Add Question
                </button>
            </div>
        `;
        document.getElementById('interactiveElements').insertAdjacentHTML('beforeend', trueFalseHtml);
    }

    // Interactive element methods
    addQuiz() {
        const quizId = Date.now();
        const quizHtml = `
            <div class="quiz-section" data-quiz-id="${quizId}">
                <div class="quiz-header">
                    <input type="text" class="quiz-title" placeholder="Quiz Title" required>
                    <button type="button" class="remove-quiz" onclick="removeQuizSection(${quizId})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="questions-container">
                    <div class="question">
                        <input type="text" class="question-text" placeholder="Enter your question" required>
                        <div class="options">
                            <div class="option">
                                <input type="radio" name="correct_${quizId}_1" required>
                                <input type="text" placeholder="Option 1" required>
                            </div>
                            <div class="option">
                                <input type="radio" name="correct_${quizId}_1" required>
                                <input type="text" placeholder="Option 2" required>
                            </div>
                        </div>
                        <button type="button" class="add-option" onclick="addQuizOption(this)">
                            <i class="fas fa-plus"></i> Add Option
                        </button>
                    </div>
                </div>
                <button type="button" class="add-question" onclick="addQuizQuestion(${quizId})">
                    <i class="fas fa-plus"></i> Add Question
                </button>
            </div>
        `;
        document.getElementById('interactiveElements').insertAdjacentHTML('beforeend', quizHtml);
    }

    addFlashcards() {
        const flashcardId = Date.now();
        const flashcardHtml = `
            <div class="flashcard-section" data-flashcard-id="${flashcardId}">
                <div class="flashcard-header">
                    <input type="text" class="flashcard-title" placeholder="Flashcard Set Title" required>
                    <button type="button" class="remove-flashcard" onclick="removeFlashcard(${flashcardId})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="flashcards-container">
                    <div class="flashcard">
                        <div class="flashcard-side">
                            <label>Front:</label>
                            <input type="text" placeholder="Question or term" required>
                        </div>
                        <div class="flashcard-side">
                            <label>Back:</label>
                            <input type="text" placeholder="Answer or definition" required>
                        </div>
                        <button type="button" class="remove-flashcard-item" onclick="this.parentElement.remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <button type="button" class="add-flashcard" onclick="addFlashcardItem(${flashcardId})">
                    <i class="fas fa-plus"></i> Add Flashcard
                </button>
            </div>
        `;
        document.getElementById('interactiveElements').insertAdjacentHTML('beforeend', flashcardHtml);
    }

    addMatchingGame() {
        const matchingId = Date.now();
        const matchingHtml = `
            <div class="matching-section" data-matching-id="${matchingId}">
                <div class="matching-header">
                    <input type="text" class="matching-title" placeholder="Matching Game Title" required>
                    <button type="button" class="remove-matching" onclick="removeMatchingGame(${matchingId})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="matching-pairs">
                    <div class="matching-pair">
                        <input type="text" placeholder="Left item" required>
                        <span class="matching-arrow">↔</span>
                        <input type="text" placeholder="Right item" required>
                        <button type="button" class="remove-pair" onclick="this.parentElement.remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <button type="button" class="add-pair" onclick="addMatchingPair(${matchingId})">
                    <i class="fas fa-plus"></i> Add Pair
                </button>
            </div>
        `;
        document.getElementById('interactiveElements').insertAdjacentHTML('beforeend', matchingHtml);
    }

    // Fill in the Blanks removed
}

// Initialize when DOM is ready
// Function to add quiz section
function addQuizSection() {
    const quizId = Date.now();
    const quizHtml = `
        <div class="quiz-section" data-quiz-id="${quizId}">
            <div class="quiz-header">
                <input type="text" class="quiz-title" placeholder="Quiz Title" required>
                <button type="button" class="remove-quiz" onclick="removeQuizSection(${quizId})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="questions-container">
                <div class="question">
                    <input type="text" class="question-text" placeholder="Enter your question" required>
                    <div class="options">
                        <div class="option">
                            <input type="radio" name="correct_${quizId}_1" required>
                            <input type="text" placeholder="Option 1" required>
                        </div>
                        <div class="option">
                            <input type="radio" name="correct_${quizId}_1" required>
                            <input type="text" placeholder="Option 2" required>
                        </div>
                    </div>
                    <button type="button" class="add-option" onclick="addQuizOption(this)">
                        <i class="fas fa-plus"></i> Add Option
                    </button>
                </div>
            </div>
            <button type="button" class="add-question" onclick="addQuizQuestion(${quizId})">
                <i class="fas fa-plus"></i> Add Question
            </button>
        </div>
    `;
    document.getElementById('interactiveElements').insertAdjacentHTML('beforeend', quizHtml);
}

// Function to add poll
function addPoll() {
    const pollId = Date.now();
    const pollHtml = `
        <div class="poll-section" data-poll-id="${pollId}">
            <div class="poll-header">
                <input type="text" class="poll-title" placeholder="Poll Title" required>
                <button type="button" class="remove-poll" onclick="removePoll(${pollId})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <input type="text" class="poll-question" placeholder="Enter your poll question" required>
            <div class="poll-options">
                <div class="option">
                    <input type="text" placeholder="Option 1" required>
                </div>
                <div class="option">
                    <input type="text" placeholder="Option 2" required>
                </div>
            </div>
            <button type="button" class="add-option" onclick="addPollOption(this)">
                <i class="fas fa-plus"></i> Add Option
            </button>
        </div>
    `;
    document.getElementById('interactiveElements').insertAdjacentHTML('beforeend', pollHtml);
}

// Helper functions
function addQuizOption(btn) {
    const optionsContainer = btn.previousElementSibling;
    const questionId = optionsContainer.querySelector('input[type="radio"]').name;
    const optionCount = optionsContainer.children.length + 1;
    const optionHtml = `
        <div class="option">
            <input type="radio" name="${questionId}" required>
            <input type="text" placeholder="Option ${optionCount}" required>
            <button type="button" class="remove-option" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    optionsContainer.insertAdjacentHTML('beforeend', optionHtml);
}

function addQuizQuestion(quizId) {
    const questionCount = document.querySelector(`[data-quiz-id="${quizId}"] .questions-container`).children.length + 1;
    const questionHtml = `
        <div class="question">
            <input type="text" class="question-text" placeholder="Enter your question" required>
            <div class="options">
                <div class="option">
                    <input type="radio" name="correct_${quizId}_${questionCount}" required>
                    <input type="text" placeholder="Option 1" required>
                </div>
                <div class="option">
                    <input type="radio" name="correct_${quizId}_${questionCount}" required>
                    <input type="text" placeholder="Option 2" required>
                </div>
            </div>
            <button type="button" class="add-option" onclick="addQuizOption(this)">
                <i class="fas fa-plus"></i> Add Option
            </button>
        </div>
    `;
    document.querySelector(`[data-quiz-id="${quizId}"] .questions-container`).insertAdjacentHTML('beforeend', questionHtml);
}

function addPollOption(btn) {
    const optionsContainer = btn.previousElementSibling;
    const optionCount = optionsContainer.children.length + 1;
    const optionHtml = `
        <div class="option">
            <input type="text" placeholder="Option ${optionCount}" required>
            <button type="button" class="remove-option" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    optionsContainer.insertAdjacentHTML('beforeend', optionHtml);
}

function removeQuizSection(quizId) {
    document.querySelector(`[data-quiz-id="${quizId}"]`).remove();
}

function removePoll(pollId) {
    document.querySelector(`[data-poll-id="${pollId}"]`).remove();
}

// Function to add flashcards
function addFlashcards() {
    const flashcardId = Date.now();
    const flashcardHtml = `
        <div class="flashcard-section" data-flashcard-id="${flashcardId}">
            <div class="flashcard-header">
                <input type="text" class="flashcard-title" placeholder="Flashcard Set Title" required>
                <button type="button" class="remove-flashcard" onclick="removeFlashcard(${flashcardId})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="flashcards-container">
                <div class="flashcard">
                    <div class="flashcard-side">
                        <label>Front:</label>
                        <input type="text" placeholder="Question or term" required>
                    </div>
                    <div class="flashcard-side">
                        <label>Back:</label>
                        <input type="text" placeholder="Answer or definition" required>
                    </div>
                    <button type="button" class="remove-flashcard-item" onclick="this.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <button type="button" class="add-flashcard" onclick="addFlashcardItem(${flashcardId})">
                <i class="fas fa-plus"></i> Add Flashcard
            </button>
        </div>
    `;
    document.getElementById('interactiveElements').insertAdjacentHTML('beforeend', flashcardHtml);
}

// Function to add matching game
function addMatchingGame() {
    const matchingId = Date.now();
    const matchingHtml = `
        <div class="matching-section" data-matching-id="${matchingId}">
            <div class="matching-header">
                <input type="text" class="matching-title" placeholder="Matching Game Title" required>
                <button type="button" class="remove-matching" onclick="removeMatchingGame(${matchingId})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="matching-pairs">
                <div class="matching-pair">
                    <input type="text" placeholder="Left item" required>
                    <span class="matching-arrow">↔</span>
                    <input type="text" placeholder="Right item" required>
                    <button type="button" class="remove-pair" onclick="this.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <button type="button" class="add-pair" onclick="addMatchingPair(${matchingId})">
                <i class="fas fa-plus"></i> Add Pair
            </button>
        </div>
    `;
    document.getElementById('interactiveElements').insertAdjacentHTML('beforeend', matchingHtml);
}

// Function to add fill in the blanks
function addFillInTheBlanks() {
    const fillId = Date.now();
    const fillHtml = `
        <div class="fill-section" data-fill-id="${fillId}">
            <div class="fill-header">
                <input type="text" class="fill-title" placeholder="Fill in the Blanks Title" required>
                <button type="button" class="remove-fill" onclick="removeFillInTheBlanks(${fillId})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="fill-content">
                <textarea class="fill-text" placeholder="Enter your text with blanks. Use [blank] to mark where students should fill in answers." rows="4" required></textarea>
                <div class="fill-answers">
                    <div class="fill-answer">
                        <input type="text" placeholder="Answer for blank 1" required>
                        <button type="button" class="remove-answer" onclick="this.parentElement.remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
            <button type="button" class="add-answer" onclick="addFillAnswer(${fillId})">
                <i class="fas fa-plus"></i> Add Answer
            </button>
        </div>
    `;
    document.getElementById('interactiveElements').insertAdjacentHTML('beforeend', fillHtml);
}

// Function to add true/false questions
function addTrueFalse() {
    const trueFalseId = Date.now();
    const trueFalseHtml = `
        <div class="truefalse-section" data-truefalse-id="${trueFalseId}">
            <div class="truefalse-header">
                <input type="text" class="truefalse-title" placeholder="True/False Quiz Title" required>
                <button type="button" class="remove-truefalse" onclick="removeTrueFalse(${trueFalseId})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="truefalse-questions">
                <div class="truefalse-question">
                    <input type="text" class="question-text" placeholder="Enter your statement" required>
                    <div class="truefalse-options">
                        <label>
                            <input type="radio" name="answer_${trueFalseId}_1" value="true" required>
                            True
                        </label>
                        <label>
                            <input type="radio" name="answer_${trueFalseId}_1" value="false" required>
                            False
                        </label>
                    </div>
                    <button type="button" class="remove-question" onclick="this.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <button type="button" class="add-question" onclick="addTrueFalseQuestion(${trueFalseId})">
                <i class="fas fa-plus"></i> Add Question
            </button>
        </div>
    `;
    document.getElementById('interactiveElements').insertAdjacentHTML('beforeend', trueFalseHtml);
}

// Helper functions for new interactive elements
function addFlashcardItem(flashcardId) {
    const container = document.querySelector(`[data-flashcard-id="${flashcardId}"] .flashcards-container`);
    const itemCount = container.children.length + 1;
    const flashcardHtml = `
        <div class="flashcard">
            <div class="flashcard-side">
                <label>Front:</label>
                <input type="text" placeholder="Question or term" required>
            </div>
            <div class="flashcard-side">
                <label>Back:</label>
                <input type="text" placeholder="Answer or definition" required>
            </div>
            <button type="button" class="remove-flashcard-item" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', flashcardHtml);
}

function removeFlashcard(flashcardId) {
    document.querySelector(`[data-flashcard-id="${flashcardId}"]`).remove();
}

function addMatchingPair(matchingId) {
    const container = document.querySelector(`[data-matching-id="${matchingId}"] .matching-pairs`);
    const pairHtml = `
        <div class="matching-pair">
            <input type="text" placeholder="Left item" required>
            <span class="matching-arrow">↔</span>
            <input type="text" placeholder="Right item" required>
            <button type="button" class="remove-pair" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', pairHtml);
}

function removeMatchingGame(matchingId) {
    document.querySelector(`[data-matching-id="${matchingId}"]`).remove();
}

function addFillAnswer(fillId) {
    const container = document.querySelector(`[data-fill-id="${fillId}"] .fill-answers`);
    const answerCount = container.children.length + 1;
    const answerHtml = `
        <div class="fill-answer">
            <input type="text" placeholder="Answer for blank ${answerCount}" required>
            <button type="button" class="remove-answer" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', answerHtml);
}

function removeFillInTheBlanks(fillId) {
    document.querySelector(`[data-fill-id="${fillId}"]`).remove();
}

function addTrueFalseQuestion(trueFalseId) {
    const container = document.querySelector(`[data-truefalse-id="${trueFalseId}"] .truefalse-questions`);
    const questionCount = container.children.length + 1;
    const questionHtml = `
        <div class="truefalse-question">
            <input type="text" class="question-text" placeholder="Enter your statement" required>
            <div class="truefalse-options">
                <label>
                    <input type="radio" name="answer_${trueFalseId}_${questionCount}" value="true" required>
                    True
                </label>
                <label>
                    <input type="radio" name="answer_${trueFalseId}_${questionCount}" value="false" required>
                    False
                </label>
            </div>
            <button type="button" class="remove-question" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', questionHtml);
}

function removeTrueFalse(trueFalseId) {
    document.querySelector(`[data-truefalse-id="${trueFalseId}"]`).remove();
}

// Make functions globally available
window.addQuizSection = addQuizSection;
window.addPoll = addPoll;
window.addQuizOption = addQuizOption;
window.addQuizQuestion = addQuizQuestion;
window.addPollOption = addPollOption;
window.removeQuizSection = removeQuizSection;
window.removePoll = removePoll;

// New interactive element functions
window.addFlashcards = addFlashcards;
window.addMatchingGame = addMatchingGame;
window.addTrueFalse = addTrueFalse;
window.addFlashcardItem = addFlashcardItem;
window.removeFlashcard = removeFlashcard;
window.addMatchingPair = addMatchingPair;
window.removeMatchingGame = removeMatchingGame;
window.addTrueFalseQuestion = addTrueFalseQuestion;
window.removeTrueFalse = removeTrueFalse;

document.addEventListener('DOMContentLoaded', () => {
    window.resourceManager = new ResourceManager();

    const resourcesGrid = document.getElementById('resourcesGrid');
    const resourceSearch = document.getElementById('resourceSearch');
    const clearSearch = document.getElementById('clearSearch');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const resourceSort = document.getElementById('resourceSort');

    let resources = []; // Will be populated with resource data
    let currentFilter = 'all';

    // Fetch resources from the server
    const fetchResources = async () => {
        try {
            const response = await fetch('/api/teacher/resources');
            resources = await response.json();
            applyFiltersAndSort();
        } catch (error) {
            resourceManager.showNotification('Error loading resources', 'error');
        }
    };

    // Filter and sort resources
    const applyFiltersAndSort = () => {
        let filteredResources = resources;

        // Apply search filter
        const searchTerm = resourceSearch.value.toLowerCase();
        if (searchTerm) {
            filteredResources = filteredResources.filter(resource => 
                resource.title.toLowerCase().includes(searchTerm) ||
                resource.description.toLowerCase().includes(searchTerm)
            );
        }

        // Apply type filter
        if (currentFilter !== 'all') {
            filteredResources = filteredResources.filter(resource => 
                resource.type === currentFilter
            );
        }

        // Apply sorting
        const sortValue = resourceSort.value;
        filteredResources.sort((a, b) => {
            switch (sortValue) {
                case 'newest':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'name':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

        resourceManager.renderResources(filteredResources);
    };

    // Render resources to the grid
    const renderResources = (resources) => {
        resourcesGrid.innerHTML = resources.map(resource => `
            <div class="resource-card">
                <span class="resource-type ${resource.type}">
                    <i class="fas fa-${getTypeIcon(resource.type)}"></i>
                    ${capitalizeFirst(resource.type)}
                </span>
                <h3 class="resource-title">${resource.title}</h3>
                <p class="resource-description">${resource.description || ''}</p>
                <div class="resource-footer">
                    <span class="resource-date">
                        <i class="far fa-clock"></i>
                        ${formatDate(resource.createdAt)}
                    </span>
                    <div class="resource-actions">
                        <button class="action-btn" onclick="resourceManager.editResource('${resource.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="resourceManager.deleteResource('${resource.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    };

    // Helper functions
    const getTypeIcon = (type) => {
        switch (type) {
            case 'pdf': return 'file-pdf';
            case 'video': return 'video';
            case 'link': return 'link';
            default: return 'file';
        }
    };

    const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);

    const formatDate = (date) => { 
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Event listeners
    resourceSearch.addEventListener('input', applyFiltersAndSort);
    
    clearSearch.addEventListener('click', () => {
        resourceSearch.value = '';
        applyFiltersAndSort();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            applyFiltersAndSort();
        });
    });

    resourceSort.addEventListener('change', applyFiltersAndSort);

    // Initial load
    fetchResources();
});