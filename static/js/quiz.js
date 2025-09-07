// Import Firebase dependencies
import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    doc, 
    updateDoc,
    setDoc, 
    getDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

class EnhancedQuizSystem {
    constructor(moduleId, quizType, quizData) {
        this.moduleId = moduleId;
        this.quizType = quizType;
        this.currentQuestion = 0;
        this.selectedAnswers = {};
        this.showingResults = false;
        this.quizData = quizData;
        this.form = document.getElementById('quizForm');

        this.init();
    }

    init() {
        if (!this.quizData || !this.quizData.questions || this.quizData.questions.length === 0) {
            this.showError('Quiz data is not available. Please try reloading the page.');
            return;
        }

        this.bindEvents();
        this.renderQuestion();
        this.updateProgress();
        this.checkPreviousAttempt();
    }

    showError(message) {
        const errorContainer = document.getElementById('errorContainer');
        const errorText = document.getElementById('errorText');
        if (errorContainer && errorText) {
            errorText.textContent = message;
            errorContainer.style.display = 'block';
        }

        // Hide other elements
        const quizHeader = document.querySelector('.quiz-header');
        const progressContainer = document.querySelector('.progress-container');
        const quizForm = document.getElementById('quizForm');

        if (quizHeader) quizHeader.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';
        if (quizForm) quizForm.style.display = 'none';
    }

    bindEvents() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');

        if (prevBtn) prevBtn.addEventListener('click', () => this.previousQuestion());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextQuestion());
        if (this.form) this.form.addEventListener('submit', (e) => this.submitQuiz(e));

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && prevBtn && !prevBtn.disabled) {
                this.previousQuestion();
            } else if (e.key === 'ArrowRight' && nextBtn && !nextBtn.disabled) {
                this.nextQuestion();
            } else if (e.key >= '1' && e.key <= '9') {
                const num = parseInt(e.key);
                if (num <= this.quizData.questions[this.currentQuestion].a.length) {
                    this.selectAnswer(num - 1);
                }
            }
        });
    }

    renderQuestion() {
        const container = document.getElementById('questionContainer');
        if (!container) return;

        const question = this.quizData.questions[this.currentQuestion];
        if (!question) return;

        // Build answers as buttons with ARIA attributes
        const answersHtml = question.a.map((answer, index) => {
            const isSelected = this.selectedAnswers[this.currentQuestion] === index;
            const disabled = this.showingResults ? 'disabled' : '';
            return `
                <button type="button" 
                        class="answer-btn ${isSelected ? 'selected' : ''}"
                        role="button"
                        aria-label="Answer option ${index + 1}: ${answer}"
                        aria-pressed="${isSelected ? 'true' : 'false'}"
                        data-answer="${index}"
                        ${disabled}>
                    <div class="answer-icon">${String.fromCharCode(65 + index)}</div>
                    <div class="answer-text">${answer}</div>
                    <div class="result-badge" aria-hidden="true" style="display:none;"></div>
                </button>
            `;
        }).join('');

        container.innerHTML = `
            <div class="question-card" role="group" aria-labelledby="questionTitle">
                <div class="question-number">Question ${this.currentQuestion + 1}</div>
                <div class="question" id="questionTitle">${question.q}</div>
                <div class="answers answers-grid">${answersHtml}</div>
                <div class="feedback" id="feedback" aria-live="polite"></div>
            </div>
        `;

        // Attach event listeners to answer buttons
        container.querySelectorAll('.answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.dataset.answer, 10);
                this.selectAnswer(idx);
                // Provide immediate tactile feedback
                btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.98)' }, { transform: 'scale(1)' }], { duration: 160 });
            });
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                }
            });
        });

        if (this.showingResults) {
            this.showFeedback();
        }
    }

    showFeedback() {
        const question = this.quizData.questions[this.currentQuestion];
        const userAnswer = this.selectedAnswers[this.currentQuestion];
        const feedback = document.getElementById('feedback');

        if (!feedback || userAnswer === undefined) return;

        const isCorrect = userAnswer === question.correct;
        feedback.style.display = 'block';
        feedback.className = `feedback ${isCorrect ? 'correct-feedback' : 'incorrect-feedback'}`;

        if (isCorrect) {
            feedback.innerHTML = `
                <i class="fas fa-check-circle icon"></i>
                Correct! Well done!
            `;
        } else {
            feedback.innerHTML = `
                <i class="fas fa-times-circle icon"></i>
                Incorrect. The correct answer is: <strong>${question.a[question.correct]}</strong>
            `;
        }

        // Update answer button visuals
        const buttons = document.querySelectorAll('.answer-btn');
        buttons.forEach((btn, index) => {
            const badge = btn.querySelector('.result-badge');
            badge.style.display = 'none';
            btn.classList.remove('correct-answer', 'user-incorrect', 'selected');

            if (index === question.correct) {
                btn.classList.add('correct-answer');
                badge.textContent = '✓';
                badge.style.display = 'flex';
            } else if (index === userAnswer && userAnswer !== question.correct) {
                btn.classList.add('user-incorrect');
                badge.textContent = '✕';
                badge.style.display = 'flex';
            }

            // Disable buttons after answer
            btn.disabled = true;
        });

        // Announce for screen readers
        if (feedback) {
            const sr = document.createElement('div');
            sr.className = 'sr-live';
            sr.textContent = isCorrect ? 'Correct answer' : `Incorrect. Correct answer is ${question.a[question.correct]}`;
            document.body.appendChild(sr);
            setTimeout(() => sr.remove(), 2000);
        }
    }

    selectAnswer(answerIndex) {
        if (this.showingResults) return;

        this.selectedAnswers[this.currentQuestion] = answerIndex;

        // Update button states visually
        document.querySelectorAll('.answer-btn').forEach((btn, idx) => {
            btn.classList.toggle('selected', idx === answerIndex);
            btn.setAttribute('aria-pressed', idx === answerIndex ? 'true' : 'false');
        });

        this.updateNavigation();
        this.updateSubmitButton();
    }

    previousQuestion() {
        if (this.currentQuestion > 0) {
            this.currentQuestion--;
            this.renderQuestion();
            this.updateProgress();
            this.updateNavigation();
        }
    }

    nextQuestion() {
        if (this.currentQuestion < this.quizData.questions.length - 1) {
            this.currentQuestion++;
            this.renderQuestion();
            this.updateProgress();
            this.updateNavigation();
        }
    }

    updateProgress() {
        const progress = ((this.currentQuestion + 1) / this.quizData.questions.length) * 100;
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (progressFill) progressFill.style.width = progress + '%';
        if (progressText) {
            progressText.textContent = `Question ${this.currentQuestion + 1} of ${this.quizData.questions.length}`;
        }
    }

    updateNavigation() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (prevBtn) prevBtn.disabled = this.currentQuestion === 0;
        if (nextBtn) {
            nextBtn.disabled = this.currentQuestion === this.quizData.questions.length - 1 ||
                this.selectedAnswers[this.currentQuestion] === undefined;
        }
    }

    updateSubmitButton() {
        const submitBtn = document.getElementById('submitBtn');
        if (!submitBtn) return;

        const allAnswered = this.quizData.questions.every((_, index) =>
            this.selectedAnswers[index] !== undefined
        );
        submitBtn.disabled = !allAnswered;
    }

    async submitQuiz(e) {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        if (!submitBtn) return;

        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;

        try {
            const correctAnswers = this.calculateScore();
            const totalQuestions = this.quizData.questions.length;
            const score = (correctAnswers / totalQuestions) * 100;

            console.log('Calculated score:', {
                correctAnswers,
                totalQuestions,
                score,
                selectedAnswers: this.selectedAnswers
            });

            // Submit to Flask backend
            const formData = new FormData();
            formData.append('quiz_type', this.quizType);
            formData.append('module_id', this.moduleId);
            formData.append('score', score);
            formData.append('answers', JSON.stringify(this.selectedAnswers));

            console.log('Submitting quiz to Flask backend...', {
                moduleId: this.moduleId,
                quizType: this.quizType,
                score: score
            });

            // Submit to Flask backend (this will set the session flag)
            const response = await fetch(window.location.href, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Try parse JSON response to get canonical redirect target from server
            let jsonResp = null;
            try {
                jsonResp = await response.json();
            } catch (e) {
                // If server didn't return JSON, fall back to text
                console.warn('Server did not return JSON after quiz submit', e);
            }

            // FIXED: Always show results first before any redirect
            this.showingResults = true;
            this.showResults(correctAnswers, totalQuestions, score);
            
            // FIXED: Safely update submit button without replaceChild
            this.updateSubmitButtonToContinue(submitBtn, jsonResp, response);

            // Also save to Firebase for backup/analytics
            try {
                const auth = getAuth();
                const user = auth.currentUser;
                if (!user) {
                    throw new Error('No authenticated user found');
                }
                await addDoc(collection(db, 'quizResults'), {
                    moduleId: this.moduleId,
                    quizType: this.quizType,
                    score: score,
                    answers: this.selectedAnswers,
                    timestamp: serverTimestamp(),
                    userId: user.uid,
                    userEmail: user.email || 'unknown'
                });
                console.log('Quiz results also saved to Firebase');
            } catch (firebaseError) {
                console.warn('Failed to save to Firebase:', firebaseError);
                // Don't fail the whole process if Firebase fails
            }

            // Update user progress in Firebase
            const auth = getAuth();
            const user = auth.currentUser;
            if (user) {
                const userId = user.uid;
                try {
                    const userProgressRef = doc(db, 'users', userId);
                    const docSnap = await getDoc(userProgressRef);
                    
                    const progressData = {
                        [`modules.${this.moduleId}.${this.quizType}QuizCompleted`]: true,
                        [`modules.${this.moduleId}.${this.quizType}QuizScore`]: score,
                        [`modules.${this.moduleId}.lastQuizAttempt`]: serverTimestamp()
                    };

                    if (!docSnap.exists()) {
                        // Create new user document if it doesn't exist
                        await setDoc(userProgressRef, {
                            userId: userId,
                            email: localStorage.getItem('userEmail') || 'unknown',
                            createdAt: serverTimestamp(),
                            modules: {
                                [this.moduleId]: {
                                    [`${this.quizType}QuizCompleted`]: true,
                                    [`${this.quizType}QuizScore`]: score,
                                    lastQuizAttempt: serverTimestamp()
                                }
                            }
                        });
                    } else {
                        // Update existing document
                        await updateDoc(userProgressRef, progressData);
                    }
                    console.log('User progress updated in Firebase');
                } catch (error) {
                    console.warn('Failed to update user progress:', error);
                }
            }

        } catch (error) {
            console.error('Error submitting quiz:', error);

            // Show error state
            submitBtn.classList.remove('loading');
            submitBtn.textContent = 'Error - Try Again';
            submitBtn.disabled = false;

            // Show error message to user
            const feedback = document.getElementById('feedback');
            if (feedback) {
                feedback.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        Failed to submit quiz. Please try again.
                    </div>
                `;
                feedback.style.display = 'block';
            }
        }
    }

    // FIXED: Safe method to update submit button without replaceChild
    updateSubmitButtonToContinue(submitBtn, jsonResp, response) {
        if (!submitBtn) {
            console.warn('Submit button not found');
            return;
        }

        // Update button appearance
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.classList.add('proceed-btn');
        
        // Set button text based on quiz type
        if (this.quizType === 'pre') {
            submitBtn.textContent = 'Continue to Module';
        } else {
            submitBtn.textContent = 'Continue';
        }
        
        // Add custom styling for the continue button
        submitBtn.style.cssText = `
            background: #28a745;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            font-weight: bold;
            margin-top: 10px;
            transition: background-color 0.3s ease;
        `;
        
        // Remove all existing event listeners by cloning (safer approach)
        const buttonParent = submitBtn.parentNode;
        if (buttonParent) {
            const newBtn = submitBtn.cloneNode(true);
            
            // Add new event listener
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Continue button clicked');
                
                // Handle redirects after showing results
                if (jsonResp && jsonResp.redirect) {
                    console.log('Server returned redirect target, navigating to:', jsonResp.redirect);
                    window.location.href = jsonResp.redirect;
                } else if (response && response.redirected) {
                    console.log('Quiz submitted successfully, redirecting to:', response.url);
                    window.location.href = response.url;
                } else {
                    this.proceedAfterQuiz();
                }
            });
            
            // Add hover effect
            newBtn.addEventListener('mouseenter', () => {
                newBtn.style.backgroundColor = '#218838';
            });
            newBtn.addEventListener('mouseleave', () => {
                newBtn.style.backgroundColor = '#28a745';
            });
            
            // Safely replace the button
            try {
                buttonParent.replaceChild(newBtn, submitBtn);
                console.log('Submit button successfully updated to continue button');
            } catch (error) {
                console.error('Error replacing button:', error);
                // Fallback: just update the existing button
                this.updateExistingButton(submitBtn, jsonResp, response);
            }
        } else {
            console.error('Button parent not found, using fallback method');
            this.updateExistingButton(submitBtn, jsonResp, response);
        }
    }

    // Fallback method to update existing button without replacing
    updateExistingButton(submitBtn, jsonResp, response) {
        // Remove existing event listeners by setting onclick to null
        submitBtn.onclick = null;
        
        // Add new event listener
        submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Continue button clicked (fallback method)');
            
            // Handle redirects after showing results
            if (jsonResp && jsonResp.redirect) {
                console.log('Server returned redirect target, navigating to:', jsonResp.redirect);
                window.location.href = jsonResp.redirect;
            } else if (response && response.redirected) {
                console.log('Quiz submitted successfully, redirecting to:', response.url);
                window.location.href = response.url;
            } else {
                this.proceedAfterQuiz();
            }
        });
    }

    proceedAfterQuiz() {
        console.log('Proceeding after quiz completion...');
        
        if (this.quizType === 'pre') {
            // For pre-quiz, redirect to module page
            window.location.href = `/module/${this.moduleId}`;
        } else {
            // For post-quiz, redirect to menu or module
            window.location.href = `/module/${this.moduleId}`;
        }
    }

    checkPreviousAttempt() {
        const userId = localStorage.getItem('userId');
        const quizType = this.quizType;
        
        // Check if quiz was already completed
        if (userId && localStorage.getItem(`${quizType}QuizCompleted`) === 'true') {
            const previousScore = localStorage.getItem(`${quizType}QuizScore`);
            if (previousScore) {
                this.displayPreviousAttempt(previousScore);
            }
        }
    }

    displayPreviousAttempt(score) {
        const previousScoreDiv = document.createElement('div');
        previousScoreDiv.classList.add('previous-score');
        previousScoreDiv.innerHTML = `Your previous attempt score: ${score}%`;
        document.querySelector('.quiz-container').prepend(previousScoreDiv);
    }

    // FIXED: Modified showResults to accept parameters and ensure score display
    showResults(correctAnswers = null, totalQuestions = null, score = null) {
        // Calculate score if not provided
        if (correctAnswers === null) {
            correctAnswers = this.calculateScore();
        }
        if (totalQuestions === null) {
            totalQuestions = this.quizData.questions.length;
        }
        if (score === null) {
            score = (correctAnswers / totalQuestions) * 100;
        }

        console.log('Showing results with score:', { correctAnswers, totalQuestions, score });

        // Reset to first question to show results
        this.currentQuestion = 0;
        this.renderQuestion();
        
        // FIXED: Ensure score is displayed immediately
        this.displayScore(correctAnswers, totalQuestions, score);
        
        // Show feedback for current question
        this.showFeedback();
        
        // Update navigation for results mode
        this.showAllFeedback();

        // Show confetti for perfect scores
        if (correctAnswers === totalQuestions) {
            this.showConfetti();
        }
    }

    showAllFeedback() {
        // Update navigation to show all questions
        const navigation = document.querySelector('.navigation');
        if (navigation) {
            navigation.innerHTML = `
                <button type="button" class="nav-btn" onclick="window.quiz.showQuestion(${Math.max(0, this.currentQuestion - 1)})" ${this.currentQuestion === 0 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
                <span>Results: Question ${this.currentQuestion + 1} of ${this.quizData.questions.length}</span>
                <button type="button" class="nav-btn" onclick="window.quiz.showQuestion(${Math.min(this.quizData.questions.length - 1, this.currentQuestion + 1)})" ${this.currentQuestion === this.quizData.questions.length - 1 ? 'disabled' : ''}>
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }
    }

    showQuestion(index) {
        this.currentQuestion = index;
        this.renderQuestion();
        this.updateProgress();
        this.showFeedback(); // Make sure feedback is shown for results
        this.showAllFeedback();
    }

    calculateScore() {
        const correctCount = this.quizData.questions.reduce((score, question, index) => {
            const isCorrect = this.selectedAnswers[index] === question.correct;
            console.log(`Question ${index + 1}: User answer ${this.selectedAnswers[index]}, Correct answer ${question.correct}, Correct: ${isCorrect}`);
            return score + (isCorrect ? 1 : 0);
        }, 0);
        
        console.log('Total correct answers:', correctCount);
        return correctCount;
    }

    // FIXED: Modified displayScore to accept parameters and create score display if missing
    displayScore(correctAnswers = null, totalQuestions = null, score = null) {
        // Calculate values if not provided
        if (correctAnswers === null) {
            correctAnswers = this.calculateScore();
        }
        if (totalQuestions === null) {
            totalQuestions = this.quizData.questions.length;
        }
        if (score === null) {
            score = (correctAnswers / totalQuestions) * 100;
        }

        console.log('Displaying score:', { correctAnswers, totalQuestions, score });

        // Find or create score display element
        let scoreDisplay = document.getElementById('scoreDisplay');
        let scoreText = document.getElementById('scoreText');
        
        // FIXED: Create score display if it doesn't exist
        if (!scoreDisplay) {
            console.log('Creating score display element');
            scoreDisplay = document.createElement('div');
            scoreDisplay.id = 'scoreDisplay';
            scoreDisplay.className = 'score-display';
            scoreDisplay.style.cssText = `
                background: #f8f9fa;
                border: 2px solid #28a745;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                position: sticky;
                top: 12px;
                z-index: 100;
            `;
            
            scoreText = document.createElement('div');
            scoreText.id = 'scoreText';
            scoreDisplay.appendChild(scoreText);
            
            // Insert at the top of the quiz container
            const quizContainer = document.querySelector('.quiz-container') || document.getElementById('questionContainer')?.parentNode;
            if (quizContainer) {
                quizContainer.insertBefore(scoreDisplay, quizContainer.firstChild);
            } else {
                // Fallback: append to body
                document.body.insertBefore(scoreDisplay, document.body.firstChild);
            }
        }

        if (!scoreText) {
            scoreText = document.getElementById('scoreText') || scoreDisplay.querySelector('#scoreText');
        }

        // Show and populate score display
        if (scoreDisplay && scoreText) {
            scoreDisplay.style.display = 'block';
            scoreText.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #28a745; font-size: 24px;">Your Score: ${score.toFixed(1)}%</h3>
                <p style="margin: 5px 0; font-size: 18px; font-weight: bold;">You got ${correctAnswers} out of ${totalQuestions} questions correct!</p>
                <p class="score-message" style="margin: 10px 0; font-size: 16px; color: #666;">${this.getScoreMessage(score)}</p>
            `;

            console.log('Score display updated successfully');
        } else {
            console.error('Failed to create or find score display elements');
        }

        // Show celebration animation for good scores
        if (score >= 70) {
            this.showConfetti();
        }

        // Hide original submit button during results display
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn && submitBtn.textContent !== 'Continue' && submitBtn.textContent !== 'Continue to Module') {
            submitBtn.style.display = 'none';
        }

        // REMOVED: Don't add separate continue button here since we transform the submit button
    }

    getScoreMessage(percentage) {
        if (percentage === 100) return "Perfect! You got everything right! 🎉";
        if (percentage >= 80) return "Great job! You have a solid understanding! 👏";
        if (percentage >= 60) return "Good work! Keep studying to improve! 📚";
        if (percentage >= 40) return "Not bad! Review the material and try again! 💪";
        return "Keep learning! Practice makes perfect! 🌟";
    }

    showConfetti() {
        // Remove any existing confetti
        const existingConfetti = document.querySelector('.confetti');
        if (existingConfetti) existingConfetti.remove();

        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;

        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];

        for (let i = 0; i < 100; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}vw;
                animation: confetti-fall ${(Math.random() * 3 + 2)}s linear infinite;
                animation-delay: ${Math.random() * 3}s;
            `;
            confetti.appendChild(piece);
        }

        // Add CSS animation if not exists
        if (!document.getElementById('confetti-styles')) {
            const style = document.createElement('style');
            style.id = 'confetti-styles';
            style.textContent = `
                @keyframes confetti-fall {
                    0% { transform: translateY(-100vh) rotate(0deg); }
                    100% { transform: translateY(100vh) rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 5000);
    }
}

// FIXED: Ensure single initialization
document.addEventListener('DOMContentLoaded', () => {
    // Prevent double initialization
    if (window.quiz) {
        console.log('Quiz already initialized, skipping...');
        return;
    }

    // Check if quiz data is provided by Flask template
    if (typeof window.quizData !== 'undefined' && typeof window.moduleId !== 'undefined' && typeof window.quizType !== 'undefined') {
        console.log('Initializing quiz with Flask data:', {
            moduleId: window.moduleId,
            quizType: window.quizType,
            questionsCount: window.quizData?.questions?.length || 0
        });
        
        const quiz = new EnhancedQuizSystem(
            window.moduleId,
            window.quizType,
            window.quizData
        );
        window.quiz = quiz;
    } else {
        console.error('Quiz data not provided by Flask template');
        const errorContainer = document.getElementById('errorContainer');
        const errorText = document.getElementById('errorText');
        if (errorContainer && errorText) {
            errorText.textContent = 'Quiz data not loaded properly. Please refresh the page.';
            errorContainer.style.display = 'block';
        }
    }
});

// Export for module use
window.EnhancedQuizSystem = EnhancedQuizSystem;
export { EnhancedQuizSystem };