import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, where, orderBy, serverTimestamp, doc, query, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Real-time listener for quiz updates
let quizUpdateListener = null;

class QuizManager {
    constructor() {
        this.db = db;
        this.questions = [];
        this.initializeUI();
        this.loadQuizzes();
    }

    initializeUI() {
        this.modal = document.getElementById('quizModal');
        this.questionModal = document.getElementById('questionModal');
        this.resultsModal = document.getElementById('resultsModal');
        this.quizList = document.getElementById('quizList');
        this.quizForm = document.getElementById('quizForm');
        this.questionForm = document.getElementById('questionForm');
        this.addQuizBtn = document.getElementById('addQuizBtn');
        this.closeModalBtn = document.getElementById('closeModal');
        this.closeQuestionModalBtn = document.getElementById('closeQuestionModal');
        this.closeResultsModalBtn = document.getElementById('closeResultsModal');
        this.notification = document.getElementById('notification');
        this.questionTypeSelect = document.getElementById('questionType');
        this.optionsContainer = document.getElementById('optionsContainer');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Quiz modal events
        if (this.addQuizBtn) {
            this.addQuizBtn.addEventListener('click', () => this.openModal());
        }
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeModal());
        }
        if (this.quizForm) {
            this.quizForm.addEventListener('submit', (e) => this.handleQuizSubmit(e));
        }

        // Results modal events
        if (this.closeResultsModalBtn) {
            this.closeResultsModalBtn.addEventListener('click', () => this.closeResultsModal());
        }

        // Questions modal events
        if (this.closeQuestionModalBtn) {
            this.closeQuestionModalBtn.addEventListener('click', () => this.closeQuestionModal());
        }
        if (this.questionForm) {
            this.questionForm.addEventListener('submit', (e) => this.handleQuestionSubmit(e));
        }
        if (this.questionTypeSelect) {
            this.questionTypeSelect.addEventListener('change', () => this.toggleOptionsContainer());
        }

        // Search and filter events
        const searchInput = document.getElementById('quizSearch');
        const filterButtons = document.querySelectorAll('.filter-btn');
        const filterSelect = document.getElementById('quizFilter');
        const sortSelect = document.getElementById('sortQuizzes');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterQuizzes());
        }

        if (filterButtons && filterButtons.length){
            filterButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    filterButtons.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.filterQuizzes();
                });
            });
        }
        if (filterSelect){
            filterSelect.addEventListener('change', () => this.filterQuizzes());
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', () => this.sortQuizzes());
        }

        // Clear search
        const clearSearchBtn = document.getElementById('clearSearch');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    this.filterQuizzes();
                }
            });
        }
    }

    async loadQuizzes() {
        try {
            showLoading(true);
            
            // Wait for authentication
            await new Promise(resolve => {
                const unsubscribe = auth.onAuthStateChanged(user => {
                    unsubscribe();
                    resolve(user);
                });
            });

            const user = auth.currentUser;
            if (!user) {
                console.log('No authenticated user');
                this.showEmptyState();
                this.updateStats({ total: 0, active: 0, attempts: 0, avgScore: 0 });
                return;
            }

            // Check if user has teacher role
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    this.showNotification('User profile not found. Please complete your profile setup.', 'error');
                    return;
                }
                
                const userData = userDoc.data();
                if (userData.role !== 'teacher') {
                    this.showNotification('Access denied. Teacher role required.', 'error');
                    return;
                }
            } catch (roleError) {
                console.error('Error checking user role:', roleError);
                this.showNotification('Error verifying permissions', 'error');
                return;
            }

            const activitiesRef = collection(db, 'activities');
            const q = query(
                activitiesRef, 
                where('teacherId', '==', user.uid),
                where('type', '==', 'quiz'),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            
            this.quizList.innerHTML = '';
            if (querySnapshot.empty) {
                this.showEmptyState();
                this.updateStats({ total: 0, active: 0, attempts: 0, avgScore: 0 });
                return;
            }

            let totalAttempts = 0;
            let totalScore = 0;
            let scoreCount = 0;

            // Process each quiz and fetch its submissions
            for (const doc of querySnapshot.docs) {
                const quiz = doc.data();
                await this.renderQuizCard(doc.id, quiz);
                
                // Fetch submissions from subcollection for accurate stats
                try {
                    const submissionsRef = collection(db, `activities/${doc.id}/submissions`);
                    const submissionsSnapshot = await getDocs(submissionsRef);
                    const submissions = submissionsSnapshot.docs.map(subDoc => subDoc.data());
                    
                    totalAttempts += submissions.length;
                    submissions.forEach(submission => {
                        if (submission.score !== undefined) {
                            totalScore += submission.score;
                            scoreCount++;
                        }
                    });
                } catch (error) {
                    console.error(`Error fetching submissions for quiz ${doc.id}:`, error);
                }
            }

            const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
            this.updateStats({ 
                total: querySnapshot.size, 
                active: querySnapshot.docs.filter(doc => doc.data().status === 'active').length,
                attempts: totalAttempts,
                avgScore: avgScore
            });

        } catch (error) {
            console.error('Error loading quizzes:', error);
            if (error.code === 'permission-denied') {
                this.showNotification('Permission denied. Please check your account permissions.', 'error');
            } else if (error.code === 'unavailable') {
                this.showNotification('Service temporarily unavailable. Please try again later.', 'error');
            } else {
                this.showNotification('Error loading quizzes: ' + error.message, 'error');
            }
            this.showEmptyState();
            this.updateStats({ total: 0, active: 0, attempts: 0, avgScore: 0 });
        } finally {
            showLoading(false);
        }
    }

    async renderQuizCard(id, quiz) {
        const card = document.createElement('div');
        card.className = 'quiz-card';
        
        const totalQuestions = quiz.questions ? quiz.questions.length : 0;
        
        // Fetch submissions from subcollection for accurate stats
        let totalAttempts = 0;
        let avgScore = 0;
        try {
            const submissionsRef = collection(db, `activities/${id}/submissions`);
            const submissionsSnapshot = await getDocs(submissionsRef);
            const submissions = submissionsSnapshot.docs.map(doc => doc.data());
            totalAttempts = submissions.length;
            avgScore = this.calculateAverageScore(submissions);
        } catch (error) {
            console.error(`Error fetching submissions for quiz ${id}:`, error);
        }

        card.innerHTML = `
            <div class="quiz-header">
                <h3>${quiz.title}</h3>
                <span class="quiz-status ${quiz.status}">${quiz.status}</span>
            </div>
            <p class="quiz-description">${quiz.description}</p>
            <div class="quiz-meta">
                <span><i class="fas fa-clock"></i> ${quiz.duration} min</span>
                <span><i class="fas fa-question-circle"></i> ${totalQuestions} questions</span>
                <span><i class="fas fa-users"></i> ${totalAttempts} attempts</span>
                <span><i class="fas fa-percentage"></i> ${quiz.passingScore}% to pass</span>
            </div>
            <div class="quiz-stats">
                <span>Average Score: ${avgScore}%</span>
                <span>Max Attempts: ${quiz.maxAttempts}</span>
            </div>
            <div class="action-buttons">
                <button onclick="quizManager.viewResults('${id}')" class="quiz-btn btn-primary" title="Results" aria-label="Results">
                    <i class="fas fa-chart-bar"></i>
                </button>
                <button onclick="quizManager.toggleQuizStatus('${id}', '${quiz.status}')" class="quiz-btn ${quiz.status === 'draft' ? 'btn-primary' : 'btn-secondary'}" title="${quiz.status === 'draft' ? 'Release Quiz' : 'Unpublish'}" aria-label="${quiz.status === 'draft' ? 'Release Quiz' : 'Unpublish'}">
                    <i class="fas ${quiz.status === 'draft' ? 'fa-paper-plane' : 'fa-archive'}"></i>
                </button>
                <button onclick="quizManager.manageQuestions('${id}')" class="quiz-btn btn-secondary" title="Questions" aria-label="Questions">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="quizManager.editQuiz('${id}')" class="quiz-btn btn-secondary" title="Edit" aria-label="Edit">
                    <i class="fas fa-cog"></i>
                </button>
                <button onclick="quizManager.deleteQuiz('${id}')" class="quiz-btn btn-danger" title="Delete" aria-label="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        this.quizList.appendChild(card);
    }

    calculateAverageScore(attempts) {
        if (!attempts || attempts.length === 0) return 0;
        const totalScore = attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
        return Math.round(totalScore / attempts.length);
    }

    updateStats(stats) {
        document.getElementById('totalQuizzes').textContent = stats.total;
        document.getElementById('activeQuizzes').textContent = stats.active;
        document.getElementById('totalAttempts').textContent = stats.attempts;
        document.getElementById('avgScore').textContent = stats.avgScore > 0 ? `${stats.avgScore}%` : '-';
    }

    showEmptyState() {
        this.quizList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-question-circle"></i>
                <h3>No Quizzes Yet</h3>
                <p>Create your first quiz to engage with your students!</p>
            </div>
        `;
    }

    async handleQuizSubmit(e) {
        e.preventDefault();
        try {
            const user = auth.currentUser;
            if (!user) {
                this.showNotification('Please log in first', 'error');
                return;
            }

            showLoading(true);
            const formData = new FormData(this.quizForm);
            
            // Collect questions data
            const questionsList = document.getElementById('questionsList');
            const questions = [];
            
            questionsList.querySelectorAll('.question-field').forEach((field, index) => {
                const questionType = field.querySelector('.question-type-select').value;
                const questionText = field.querySelector('input[placeholder="Enter your question"]').value;
                
                const questionData = {
                    id: index + 1,
                    type: questionType,
                    text: questionText,
                    points: 10
                };

                if (questionType === 'multiple-choice') {
                    const options = [];
                    field.querySelectorAll('.option-row').forEach((row, optIndex) => {
                        const optionText = row.querySelector('input[type="text"]').value;
                        const isCorrect = row.querySelector('input[type="radio"]').checked;
                        options.push({
                            id: optIndex + 1,
                            text: optionText,
                            isCorrect: isCorrect
                        });
                    });
                    questionData.options = options;
                } else if (questionType === 'true-false') {
                    const correctAnswer = field.querySelector('input[type="radio"]:checked').value;
                    questionData.correctAnswer = correctAnswer === 'true';
                } else if (questionType === 'short-answer') {
                    const correctAnswer = field.querySelector('input[placeholder="Enter the correct answer"]').value;
                    questionData.correctAnswer = correctAnswer;
                }

                questions.push(questionData);
            });

            const quizData = {
                title: formData.get('title'),
                description: formData.get('description'),
                type: 'quiz',
                duration: parseInt(formData.get('duration')),
                maxAttempts: parseInt(formData.get('maxAttempts')),
                passingScore: parseInt(formData.get('passingScore')),
                status: formData.get('status'),
                teacherId: user.uid,
                teacherEmail: user.email,
                questions: questions,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const quizId = this.quizForm.dataset.quizId;
            if (quizId) {
                // Update existing quiz
                const quizRef = doc(db, 'activities', quizId);
                await updateDoc(quizRef, quizData);
                this.showNotification('Quiz updated successfully', 'success');
            } else {
                // Create new quiz
                await addDoc(collection(db, 'activities'), quizData);
                this.showNotification('Quiz created successfully', 'success');
            }
            
            this.closeModal();
            this.loadQuizzes();
        } catch (error) {
            console.error('Error creating/updating quiz:', error);
            this.showNotification('Error saving quiz: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    async handleQuestionSubmit(e) {
        e.preventDefault();
        try {
            if (!this.currentQuizId) {
                this.showNotification('No quiz selected', 'error');
                return;
            }

            const formData = new FormData(this.questionForm);
            const questionType = formData.get('questionType');
            
            let questionData = {
                text: formData.get('questionText'),
                type: questionType,
                points: parseInt(formData.get('points')),
                createdAt: serverTimestamp()
            };

            if (questionType === 'multiple-choice' || questionType === 'true-false') {
                const options = [];
                const optionInputs = document.querySelectorAll('.option-text');
                const correctAnswer = document.querySelector('input[name="correctAnswer"]:checked');
                
                optionInputs.forEach((input, index) => {
                    if (input.value.trim()) {
                        options.push({
                            text: input.value.trim(),
                            isCorrect: correctAnswer && correctAnswer.value == index
                        });
                    }
                });

                if (options.length < 2) {
                    this.showNotification('At least 2 options required for multiple choice', 'error');
                    return;
                }

                if (!correctAnswer) {
                    this.showNotification('Please select a correct answer', 'error');
                    return;
                }

                questionData.options = options;
            }

            // Add question to quiz
            const quizRef = doc(db, 'activities', this.currentQuizId);
            const quizDoc = await getDoc(quizRef);
            
            if (!quizDoc.exists()) {
                this.showNotification('Quiz not found', 'error');
                return;
            }

            const quiz = quizDoc.data();
            const questions = quiz.questions || [];
            questions.push(questionData);

            await updateDoc(quizRef, {
                questions: questions,
                updatedAt: serverTimestamp()
            });

            this.showNotification('Question added successfully', 'success');
            this.closeQuestionModal();
            this.loadQuestions(this.currentQuizId);

        } catch (error) {
            console.error('Error adding question:', error);
            this.showNotification('Error adding question', 'error');
        }
    }

    async deleteQuiz(quizId) {
        const proceed = await this.openConfirmModal('Are you sure you want to delete this quiz? All questions and attempts will be lost.');
        if (!proceed) return;
        try {
            showLoading(true);
            await deleteDoc(doc(db, 'activities', quizId));
            this.showNotification('Quiz deleted successfully', 'success');
            this.loadQuizzes();
        } catch (error) {
            console.error('Error deleting quiz:', error);
            this.showNotification('Error deleting quiz', 'error');
        } finally {
            showLoading(false);
        }
    }

    async editQuiz(quizId) {
        try {
            const quizDoc = await getDoc(doc(db, 'activities', quizId));
            if (!quizDoc.exists()) {
                this.showNotification('Quiz not found', 'error');
                return;
            }

            const quiz = quizDoc.data();
            this.openModal(quiz);
            
            // Populate form fields
            this.quizForm.title.value = quiz.title;
            this.quizForm.description.value = quiz.description;
            this.quizForm.duration.value = quiz.duration;
            this.quizForm.maxAttempts.value = quiz.maxAttempts;
            this.quizForm.passingScore.value = quiz.passingScore;
            this.quizForm.status.value = quiz.status;
            
            // Store quiz ID for update
            this.quizForm.dataset.quizId = quizId;
        } catch (error) {
            console.error('Error loading quiz:', error);
            this.showNotification('Error loading quiz', 'error');
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

    async viewResults(quizId) {
        try {
            showLoading(true);
            const quizRef = doc(db, 'activities', quizId);
            
            // Clean up existing listener if any
            if (this.quizUpdateListener) {
                this.quizUpdateListener();
            }

            // Set up real-time listener
            this.quizUpdateListener = onSnapshot(quizRef, (doc) => {
                if (doc.exists()) {
                    const quiz = doc.data();
                    this.updateQuizResults(quiz, quizId);
                }
            }, (error) => {
                console.error("Real-time quiz update error:", error);
                this.showNotification('Error updating quiz results', 'error');
            });

            const quizDoc = await getDoc(quizRef);
            if (!quizDoc.exists()) {
                this.showNotification('Quiz not found', 'error');
                return;
            }

            // Show modal
            this.resultsModal.classList.add('show');
            this.resultsModal.style.display = 'block';

        } catch (error) {
            console.error('Error viewing results:', error);
            this.showNotification('Error loading results', 'error');
        } finally {
            showLoading(false);
        }
    }

    async manageQuestions(quizId) {
        this.currentQuizId = quizId;
        await this.loadQuestions(quizId);
        this.questionsModal.classList.add('show');
        this.questionsModal.style.display = 'block';
    }

    async loadQuestions(quizId) {
        try {
            const quizDoc = await getDoc(doc(db, 'activities', quizId));
            if (!quizDoc.exists()) {
                this.showNotification('Quiz not found', 'error');
                return;
            }

            const quiz = quizDoc.data();
            const questions = quiz.questions || [];
            this.questions = questions;

            const questionsList = document.getElementById('questionsList');
            questionsList.innerHTML = questions.map((question, index) => `
                <div class="question-item">
                    <div class="question-header">
                        <h4>Question ${index + 1}</h4>
                        <div class="question-meta">
                            <span class="question-type">${question.type}</span>
                            <span class="question-points">${question.points} pts</span>
                        </div>
                    </div>
                    <p class="question-text">${question.text}</p>
                    ${question.options ? `
                        <div class="question-options">
                            ${question.options.map((option, optIndex) => `
                                <div class="option ${option.isCorrect ? 'correct' : ''}">
                                    ${String.fromCharCode(65 + optIndex)}. ${option.text}
                                    ${option.isCorrect ? ' ✓' : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    <div class="question-actions">
                        <button onclick="quizManager.editQuestion(${index})" class="quiz-btn btn-secondary">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button onclick="quizManager.deleteQuestion(${index})" class="quiz-btn btn-danger">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading questions:', error);
            this.showNotification('Error loading questions', 'error');
        }
    }

    openQuestionModal() {
        this.questionModal.classList.add('show');
        this.questionModal.style.display = 'block';
        this.questionForm.reset();
        this.toggleOptionsContainer();
    }

    addOption() {
        const optionsList = document.getElementById('optionsList');
        const optionCount = optionsList.children.length;
        const optionItem = document.createElement('div');
        optionItem.className = 'option-item';
        optionItem.innerHTML = `
            <input type="text" name="option_text_${optionCount + 1}" class="form-input option-text" placeholder="Option ${optionCount + 1}" required>
            <div class="correct-toggle">
                <input type="radio" name="correctAnswer" value="${optionCount}" class="correct-radio" required>
                <label>Correct</label>
            </div>
            <button type="button" class="remove-option" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        optionsList.appendChild(optionItem);
        this.updateOptionNumbers();
    }

    updateOptionNumbers() {
        const options = document.querySelectorAll('.option-item');
        options.forEach((option, index) => {
            const input = option.querySelector('.option-text');
            input.name = `option_text_${index + 1}`;
            input.placeholder = `Option ${index + 1}`;
            const radio = option.querySelector('.correct-radio');
            radio.value = index;
        });
    }

    toggleOptionsContainer() {
        const questionType = this.questionTypeSelect.value;
        if (questionType === 'multiple-choice' || questionType === 'true-false') {
            this.optionsContainer.style.display = 'block';
        } else {
            this.optionsContainer.style.display = 'none';
        }
    }

    filterQuizzes() {
        const searchTerm = (document.getElementById('quizSearch')?.value || '').toLowerCase();
        let activeFilter = 'all';
        const activeBtn = document.querySelector('.filter-btn.active');
        if (activeBtn) activeFilter = activeBtn.dataset.filter;
        const filterSelect = document.getElementById('quizFilter');
        if (filterSelect) activeFilter = filterSelect.value;
        const cards = document.querySelectorAll('.quiz-card');

        cards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const description = card.querySelector('.quiz-description').textContent.toLowerCase();
            const status = card.querySelector('.quiz-status').textContent.toLowerCase();
            
            const matchesSearch = !searchTerm || title.includes(searchTerm) || description.includes(searchTerm);
            const matchesFilter = activeFilter === 'all' || status === activeFilter;
            
            card.style.display = matchesSearch && matchesFilter ? 'block' : 'none';
        });
    }

    sortQuizzes() {
        const sortBy = document.getElementById('sortQuizzes').value;
        const cards = Array.from(document.querySelectorAll('.quiz-card'));
        
        cards.sort((a, b) => {
            switch (sortBy) {
                case 'date-desc':
                    return 0; // Already sorted by date desc in loadQuizzes
                case 'date-asc':
                    return 0; // Would need to reverse
                case 'attempts':
                    const attemptsA = parseInt(a.querySelector('.quiz-meta span:nth-child(3)').textContent.split(' ')[0]);
                    const attemptsB = parseInt(b.querySelector('.quiz-meta span:nth-child(3)').textContent.split(' ')[0]);
                    return attemptsB - attemptsA;
                case 'score':
                    const scoreA = parseInt(a.querySelector('.quiz-stats span').textContent.split(': ')[1]);
                    const scoreB = parseInt(b.querySelector('.quiz-stats span').textContent.split(': ')[1]);
                    return scoreB - scoreA;
                default:
                    return 0;
            }
        });

        const quizList = document.getElementById('quizList');
        cards.forEach(card => quizList.appendChild(card));
    }

    addQuestionField() {
        const questionsList = document.getElementById('questionsList');
        const questionCount = questionsList.children.length + 1;
        
        const questionField = document.createElement('div');
        questionField.className = 'question-field';
        questionField.innerHTML = `
            <div class="question-header">
                <span class="question-number">Question ${questionCount}</span>
                <div class="question-controls">
                    <select name="question_type_${questionCount}" class="form-input question-type-select" onchange="window.quizManager.handleQuestionTypeChange(this)">
                        <option value="multiple-choice">Multiple Choice</option>
                        <option value="true-false">True/False</option>
                        <option value="short-answer">Short Answer</option>
                    </select>
                    <button type="button" class="remove-question" onclick="window.quizManager.removeQuestion(this)">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <input type="text" name="question_text_${questionCount}" class="form-input" placeholder="Enter your question" required>
            <div class="answer-options">
                <div class="option-row">
                    <input type="text" name="option_${questionCount}_1" class="form-input" placeholder="Option 1" required>
                    <div class="correct-toggle">
                        <input type="radio" name="correct_${questionCount}" value="0" required>
                        <label>Correct</label>
                    </div>
                </div>
                <div class="option-row">
                    <input type="text" name="option_${questionCount}_2" class="form-input" placeholder="Option 2" required>
                    <div class="correct-toggle">
                        <input type="radio" name="correct_${questionCount}" value="1" required>
                        <label>Correct</label>
                    </div>
                </div>
            </div>
            <button type="button" class="add-option-btn" onclick="window.quizManager.addOptionRow(this)">
                <i class="fas fa-plus"></i> Add Option
            </button>
        `;
        
        questionsList.appendChild(questionField);
    }

    handleQuestionTypeChange(select) {
        const questionField = select.closest('.question-field');
        const answerOptions = questionField.querySelector('.answer-options');
        const addOptionBtn = questionField.querySelector('.add-option-btn');
        const questionNumber = questionField.querySelector('.question-number').textContent.split(' ')[1];
        
        switch(select.value) {
            case 'true-false':
                answerOptions.innerHTML = `
                    <div class="option-row">
                        <label class="correct-toggle">
                            <input type="radio" name="correct_${questionNumber}" value="true" required>
                            <span>True</span>
                        </label>
                    </div>
                    <div class="option-row">
                        <label class="correct-toggle">
                            <input type="radio" name="correct_${questionNumber}" value="false" required>
                            <span>False</span>
                        </label>
                    </div>
                `;
                if (addOptionBtn) addOptionBtn.style.display = 'none';
                break;

            case 'short-answer':
                answerOptions.innerHTML = `
                    <div class="option-row">
                        <input type="text" class="form-input" name="answer_${questionNumber}" placeholder="Enter the correct answer" required>
                    </div>
                `;
                if (addOptionBtn) addOptionBtn.style.display = 'none';
                break;

            case 'multiple-choice':
                answerOptions.innerHTML = `
                    <div class="option-row">
                        <input type="text" name="option_${questionNumber}_1" class="form-input" placeholder="Option 1" required>
                        <div class="correct-toggle">
                            <input type="radio" name="correct_${questionNumber}" value="0" required>
                            <label>Correct</label>
                        </div>
                    </div>
                    <div class="option-row">
                        <input type="text" name="option_${questionNumber}_2" class="form-input" placeholder="Option 2" required>
                        <div class="correct-toggle">
                            <input type="radio" name="correct_${questionNumber}" value="1" required>
                            <label>Correct</label>
                        </div>
                    </div>
                `;
                if (addOptionBtn) addOptionBtn.style.display = 'block';
                break;
        }
    }

    addOptionRow(btn) {
        const questionField = btn.closest('.question-field');
        const answerOptions = questionField.querySelector('.answer-options');
        const optionCount = answerOptions.children.length + 1;
        
        const optionRow = document.createElement('div');
        optionRow.className = 'option-row';
        optionRow.innerHTML = `
            <input type="text" class="form-input" placeholder="Option ${optionCount}" required>
            <div class="correct-toggle">
                <input type="radio" name="correct_${questionField.dataset.questionId || Date.now()}" required>
                <label>Correct</label>
            </div>
            <button type="button" class="remove-option" onclick="this.closest('.option-row').remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        answerOptions.appendChild(optionRow);
    }

    removeQuestion(btn) {
        const questionField = btn.closest('.question-field');
        questionField.remove();
        
        // Renumber remaining questions
        const questions = document.querySelectorAll('.question-field');
        questions.forEach((q, index) => {
            q.querySelector('.question-number').textContent = `Question ${index + 1}`;
        });
    }

    openModal(quiz = null) {
        this.modal.style.display = 'flex';
        requestAnimationFrame(() => {
            this.modal.classList.add('show');
        });
        
        if (!quiz) {
            this.quizForm.reset();
            delete this.quizForm.dataset.quizId;
        }
    }

    closeModal() {
        this.modal.classList.remove('show');
        setTimeout(() => {
            this.modal.style.display = 'none';
            this.quizForm.reset();
            delete this.quizForm.dataset.quizId;
        }, 300);
    }

    closeQuestionModal() {
        this.questionModal.classList.remove('show');
        setTimeout(() => {
            this.questionModal.style.display = 'none';
            this.questionForm.reset();
        }, 300);
    }

    closeResultsModal() {
        // Clean up listener
        if (this.quizUpdateListener) {
            this.quizUpdateListener();
            this.quizUpdateListener = null;
        }
        
        this.resultsModal.classList.remove('show');
        setTimeout(() => {
            this.resultsModal.style.display = 'none';
        }, 300);
    }

    closeQuestionsModal() {
        this.questionsModal.classList.remove('show');
        setTimeout(() => {
            this.questionsModal.style.display = 'none';
        }, 300);
    }

    showNotification(message, type) {
        this.notification.textContent = message;
        this.notification.className = `notification ${type}`;
        setTimeout(() => {
            this.notification.className = 'notification';
        }, 3000);
    }

    async updateQuizResults(quizData, quizId) {
        try {
            // Fetch submissions from the submissions subcollection
            const submissionsRef = collection(db, `activities/${quizId}/submissions`);
            const submissionsSnapshot = await getDocs(submissionsRef);
            const attempts = submissionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                submittedAt: doc.data().submittedAt?.toDate ? doc.data().submittedAt.toDate() : doc.data().submittedAt
            }));
            
            // Get all students for this teacher
            const studentsQuery = query(
                collection(db, 'users'),
                where('teacher_id', '==', auth.currentUser.uid),
                where('role', '==', 'student')
            );
            const studentsSnapshot = await getDocs(studentsQuery);
            const students = studentsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));

            // Update stats in real-time
            document.getElementById('totalStudents').textContent = students.length;
            document.getElementById('attemptedCount').textContent = attempts.length;
            const passedCount = attempts.filter(attempt => attempt.score >= quizData.passingScore).length;
            document.getElementById('passedCount').textContent = passedCount;
            const avgScore = attempts.length > 0 ? 
                Math.round(attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / attempts.length) : 0;
            document.getElementById('averageScore').textContent = `${avgScore}%`;

            // Update results table
            const tableBody = document.getElementById('resultsTableBody');
            if (!tableBody) return;

            const tableContent = students.map(student => {
                const studentAttempts = attempts.filter(attempt => attempt.studentId === student.id);
                const bestAttempt = studentAttempts.reduce((best, current) => 
                    (current.score || 0) > (best.score || 0) ? current : best, { score: 0 });
                const status = studentAttempts.length === 0 ? 'not-attempted' : 
                    bestAttempt.score >= quizData.passingScore ? 'passed' : 'failed';
                const lastAttempt = studentAttempts.length > 0 ? 
                    new Date(studentAttempts[studentAttempts.length - 1].submittedAt).toLocaleString() : 
                    'Never';

                return `
                    <tr>
                        <td>${student.firstName} ${student.lastName}</td>
                        <td>${bestAttempt.score || 0}%</td>
                        <td>
                            <span class="quiz-status ${status}">
                                ${status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                            </span>
                        </td>
                        <td>${studentAttempts.length}/${quizData.maxAttempts}</td>
                        <td>${lastAttempt}</td>
                        <td>
                            ${studentAttempts.length > 0 ? 
                                `<button class="quiz-btn btn-secondary" onclick="quizManager.viewAttemptDetail('${quizId}', '${student.id}')">
                                    <i class="fas fa-eye"></i> View
                                </button>` :
                                '<span class="text-muted">No attempts</span>'
                            }
                        </td>
                    </tr>
                `;
            }).join('');
            
            tableBody.innerHTML = tableContent;

        } catch (error) {
            console.error('Error updating quiz results:', error);
        }
    }

    async viewAttemptDetail(quizId, studentId) {
        try {
            showLoading(true);
            const quizRef = doc(db, 'activities', quizId);
            const quizDoc = await getDoc(quizRef);
            
            if (!quizDoc.exists()) {
                this.showNotification('Quiz not found', 'error');
                return;
            }
            
            const quiz = quizDoc.data();
            
            // Fetch student's submissions from the submissions subcollection
            const submissionsRef = collection(db, `activities/${quizId}/submissions`);
            const studentSubmissionsQuery = query(
                submissionsRef,
                where('studentId', '==', studentId)
            );
            const submissionsSnapshot = await getDocs(studentSubmissionsQuery);
            const studentAttempts = submissionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                submittedAt: doc.data().submittedAt?.toDate ? doc.data().submittedAt.toDate() : doc.data().submittedAt
            }));
            
            const studentRef = doc(db, 'users', studentId);
            const studentDoc = await getDoc(studentRef);
            const student = studentDoc.data();

            // Create a modal for showing attempt details
            const detailModal = document.createElement('div');
            detailModal.className = 'modal';
            detailModal.id = 'attemptDetailModal';
            detailModal.innerHTML = `
                <div class="modal-content">
                    <button class="close-modal">&times;</button>
                    <div class="modal-header">
                        <h3>${student.firstName} ${student.lastName}'s Attempts</h3>
                    </div>
                    <div class="modal-body">
                        <div class="attempts-list">
                            ${studentAttempts.map((attempt, index) => `
                                <div class="attempt-card">
                                    <div class="attempt-header">
                                        <h4>Attempt ${index + 1}</h4>
                                        <span class="attempt-score ${attempt.score >= quiz.passingScore ? 'passed' : 'failed'}">
                                            Score: ${attempt.score}%
                                        </span>
                                    </div>
                                    <div class="attempt-meta">
                                        <span>Submitted: ${new Date(attempt.submittedAt).toLocaleString()}</span>
                                    </div>
                                    <div class="attempt-answers">
                                        ${attempt.answers.map((answer, qIndex) => `
                                            <div class="answer-item ${answer.correct ? 'correct' : 'incorrect'}">
                                                <div class="question-text">Q${qIndex + 1}: ${answer.question}</div>
                                                <div class="answer-text">
                                                    Answer: ${answer.answer}
                                                    ${answer.correct ? 
                                                        '<i class="fas fa-check-circle"></i>' : 
                                                        `<i class="fas fa-times-circle"></i> (Correct: ${answer.correctAnswer})`
                                                    }
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;

            // Add to document and show
            document.body.appendChild(detailModal);
            requestAnimationFrame(() => {
                detailModal.classList.add('show');
            });

            // Handle close button
            const closeBtn = detailModal.querySelector('.close-modal');
            closeBtn.onclick = () => {
                detailModal.classList.remove('show');
                setTimeout(() => detailModal.remove(), 300);
            };

        } catch (error) {
            console.error('Error viewing attempt details:', error);
            this.showNotification('Error loading attempt details', 'error');
        } finally {
            showLoading(false);
        }
    }

    async toggleQuizStatus(quizId, currentStatus) {
        try {
            showLoading(true);
            const newStatus = currentStatus === 'draft' ? 'active' : 'draft';
            
            // Update the quiz status in Firestore
            const quizRef = doc(db, 'activities', quizId);
            await updateDoc(quizRef, {
                status: newStatus,
                updatedAt: serverTimestamp()
            });

            this.showNotification(
                `Quiz ${newStatus === 'active' ? 'released' : 'unpublished'} successfully`, 
                'success'
            );
            
            // Refresh the quiz list
            this.loadQuizzes();
        } catch (error) {
            console.error('Error toggling quiz status:', error);
            this.showNotification('Error updating quiz status', 'error');
        } finally {
            showLoading(false);
        }
    }
}

function showLoading(show = true) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

// Initialize QuizManager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.quizManager = new QuizManager();
});
