        // Import the functions you need from the SDKs
        import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
        import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
        import { getFirestore, collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
        
        // Your web app's Firebase configuration
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

        class QuizManager {
            constructor() {
                this.quizzes = [];
                this.auth = auth;
                this.db = db;
                this.initializeElements();
                this.addEventListeners();
                this.initializeFirebase();
            }

            async initializeFirebase() {
                // Wait for auth state to be ready
                await new Promise((resolve) => {
                    const unsubscribe = onAuthStateChanged(this.auth, (user) => {
                        unsubscribe();
                        resolve();
                        if (user) {
                            this.loadQuizzes();
                        }
                    });
                });
            }

            initializeElements() {
                this.quizList = document.getElementById('quizList');
                this.addQuizBtn = document.getElementById('addQuizBtn');
                this.quizModal = document.getElementById('quizModal');
                this.quizForm = document.getElementById('quizForm');
                this.closeModalBtn = document.getElementById('closeModal');
                this.addQuestionBtn = document.getElementById('addQuestionBtn');
                this.questionsContainer = document.getElementById('questionsContainer');
            }

            addEventListeners() {
                this.addQuizBtn.addEventListener('click', () => this.openModal());
                this.closeModalBtn.addEventListener('click', () => this.closeModal());
                this.quizForm.addEventListener('submit', (e) => this.handleQuizSubmit(e));
                this.addQuestionBtn.addEventListener('click', () => this.addQuestionField());
            }

            async loadQuizzes() {
                try {
                    // For demo purposes, we'll use mock data
                    // In a real app, you would use the code below:
                    /*
                    const user = this.auth.currentUser;
                    if (!user) return;

                    const quizSnapshot = await getDocs(
                        query(
                            collection(this.db, 'quizzes'),
                            where('teacherId', '==', user.uid)
                        )
                    );

                    this.quizzes = quizSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    */
                    
                    // Mock data for demonstration
                    this.quizzes = [
                        {
                            id: '1',
                            title: 'JavaScript Basics',
                            description: 'Test your knowledge of fundamental JavaScript concepts',
                            questions: [
                                {
                                    question: 'Which keyword is used to declare variables in JavaScript?',
                                    options: ['var', 'let', 'const', 'All of the above'],
                                    correctAnswer: 3
                                }
                            ],
                            attempts: 42
                        },
                        {
                            id: '2',
                            title: 'HTML5 Features',
                            description: 'Quiz about new features in HTML5',
                            questions: [
                                {
                                    question: 'Which element is used for drawing graphics on the fly?',
                                    options: ['<canvas>', '<graphic>', '<draw>', '<svg>'],
                                    correctAnswer: 0
                                }
                            ],
                            attempts: 28
                        },
                        {
                            id: '3',
                            title: 'CSS Selectors',
                            description: 'Test your knowledge of CSS selectors',
                            questions: [
                                {
                                    question: 'Which selector has the highest specificity?',
                                    options: ['Class selector', 'ID selector', 'Tag selector', 'Universal selector'],
                                    correctAnswer: 1
                                }
                            ],
                            attempts: 35
                        }
                    ];

                    this.renderQuizzes();
                    this.updateStats();
                } catch (error) {
                    console.error('Error loading quizzes:', error);
                    this.showNotification('Error loading quizzes', 'error');
                }
            }

            renderQuizzes() {
                if (!this.quizList) return;
                
                this.quizList.innerHTML = this.quizzes.map(quiz => `
                    <div class="quiz-card" data-id="${quiz.id}">
                        <h3 class="quiz-title">${quiz.title}</h3>
                        <p>${quiz.description}</p>
                        <div class="quiz-stats">
                            <div class="stat-item">
                                <i class="fas fa-question-circle"></i>
                                <span>${quiz.questions?.length || 0} Questions</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-users"></i>
                                <span>${quiz.attempts || 0} Attempts</span>
                            </div>
                        </div>
                        <div class="quiz-actions">
                            <button class="quiz-btn btn-primary" onclick="quizManager.editQuiz('${quiz.id}')">
                                Edit
                            </button>
                            <button class="quiz-btn btn-secondary" onclick="quizManager.deleteQuiz('${quiz.id}')">
                                Delete
                            </button>
                        </div>
                    </div>
                `).join('');
            }
            
            updateStats() {
                const totalQuizzes = this.quizzes.length;
                const totalQuestions = this.quizzes.reduce((acc, quiz) => acc + (quiz.questions?.length || 0), 0);
                const totalAttempts = this.quizzes.reduce((acc, quiz) => acc + (quiz.attempts || 0), 0);
                
                const elements = {
                    totalQuizzes: document.getElementById('totalQuizzes'),
                    totalQuestions: document.getElementById('totalQuestions'),
                    totalAttempts: document.getElementById('totalAttempts')
                };

                if (elements.totalQuizzes) elements.totalQuizzes.textContent = totalQuizzes;
                if (elements.totalQuestions) elements.totalQuestions.textContent = totalQuestions;
                if (elements.totalAttempts) elements.totalAttempts.textContent = totalAttempts;
            }

            openModal(quizData = null) {
                this.quizModal.style.display = 'flex';
                if (quizData) {
                    document.getElementById('quizTitle').value = quizData.title;
                    document.getElementById('quizDescription').value = quizData.description;
                    this.loadQuestions(quizData.questions || []);
                }
            }

            closeModal() {
                this.quizModal.style.display = 'none';
                this.quizForm.reset();
                this.questionsContainer.innerHTML = '';
            }

            addQuestionField() {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question-container';
                questionDiv.innerHTML = `
                    <div class="form-group">
                        <input type="text" class="form-input" placeholder="Enter question" required>
                    </div>
                    <div class="options-container">
                        <input type="text" class="answer-option form-input" placeholder="Option 1" required>
                        <input type="text" class="answer-option form-input" placeholder="Option 2" required>
                        <input type="text" class="answer-option form-input" placeholder="Option 3" required>
                        <input type="text" class="answer-option form-input" placeholder="Option 4" required>
                    </div>
                    <div class="form-group">
                        <select class="form-input" required>
                            <option value="">Select correct answer</option>
                            <option value="0">Option 1</option>
                            <option value="1">Option 2</option>
                            <option value="2">Option 3</option>
                            <option value="3">Option 4</option>
                        </select>
                    </div>
                    <button type="button" class="quiz-btn btn-secondary" onclick="this.parentElement.remove()">
                        Remove Question
                    </button>
                `;
                this.questionsContainer.appendChild(questionDiv);
            }
            
            loadQuestions(questions) {
                this.questionsContainer.innerHTML = '';
                questions.forEach(q => {
                    this.addQuestionField();
                    const lastQuestion = this.questionsContainer.lastChild;
                    lastQuestion.querySelector('input[type="text"]').value = q.question;
                    
                    const options = lastQuestion.querySelectorAll('.answer-option');
                    options.forEach((opt, i) => {
                        opt.value = q.options[i] || '';
                    });
                    
                    lastQuestion.querySelector('select').value = q.correctAnswer;
                });
            }

            async handleQuizSubmit(e) {
                e.preventDefault();
                const questions = Array.from(this.questionsContainer.children).map(container => {
                    const options = Array.from(container.querySelectorAll('.answer-option')).map(opt => opt.value);
                    return {
                        question: container.querySelector('input[type="text"]').value,
                        options: options,
                        correctAnswer: parseInt(container.querySelector('select').value)
                    };
                });

                const quizData = {
                    title: document.getElementById('quizTitle').value,
                    description: document.getElementById('quizDescription').value,
                    questions: questions,
                    teacherId: this.auth.currentUser ? this.auth.currentUser.uid : 'demo-user',
                    createdAt: serverTimestamp(),
                    attempts: 0
                };

                try {
                    // In a real app, you would use:
                    // const docRef = await addDoc(collection(this.db, 'quizzes'), quizData);
                    
                    // For demo, we'll just add to the local array
                    quizData.id = 'quiz-' + Date.now();
                    this.quizzes.push(quizData);
                    
                    this.showNotification('Quiz created successfully', 'success');
                    this.closeModal();
                    this.renderQuizzes();
                    this.updateStats();
                } catch (error) {
                    console.error('Error creating quiz:', error);
                    this.showNotification('Error creating quiz', 'error');
                }
            }

            async editQuiz(quizId) {
                const quiz = this.quizzes.find(q => q.id === quizId);
                if (quiz) {
                    this.openModal(quiz);
                }
            }

            async deleteQuiz(quizId) {
                if (confirm('Are you sure you want to delete this quiz?')) {
                    try {
                        // In a real app, you would use:
                        // await deleteDoc(doc(this.db, 'quizzes', quizId));
                        
                        // For demo, we'll just remove from the local array
                        this.quizzes = this.quizzes.filter(q => q.id !== quizId);
                        
                        this.showNotification('Quiz deleted successfully', 'success');
                        this.renderQuizzes();
                        this.updateStats();
                    } catch (error) {
                        console.error('Error deleting quiz:', error);
                        this.showNotification('Error deleting quiz', 'error');
                    }
                }
            }

            showNotification(message, type = 'info') {
                const notification = document.getElementById('notification');
                if (!notification) {
                    console.warn('Notification element not found:', message);
                    return;
                }
                
                notification.textContent = message;
                notification.className = 'notification ' + type;
                
                setTimeout(() => {
                    if (notification) {
                        notification.className = 'notification';
                    }
                }, 3000);
            }
        }

        // Initialize quiz manager when document is ready
        document.addEventListener('DOMContentLoaded', () => {
            window.quizManager = new QuizManager();
        });