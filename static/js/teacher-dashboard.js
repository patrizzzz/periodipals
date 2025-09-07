// Function to fetch connected students
async function fetchConnectedStudents() {
    try {
        const response = await fetch('/api/teacher/students');
        if (!response.ok) throw new Error('Failed to fetch students');
        
        const data = await response.json();
        return data.students;
    } catch (error) {
        console.error('Error fetching students:', error);
        return [];
    }
}

// Function to format last active time
function formatLastActive(timestamp) {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const lastActive = new Date(timestamp);
    const diffMinutes = Math.floor((now - lastActive) / (1000 * 60));
    
    if (diffMinutes < 5) return 'Online';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes/60)}h ago`;
    return `${Math.floor(diffMinutes/1440)}d ago`;
}

// Function to render students list
function renderStudentsList(students) {
    const studentList = document.getElementById('studentList');
    if (!studentList) return;
    
    if (!students.length) {
        studentList.innerHTML = `
            <div class="no-students">
                <i class="fas fa-users-slash"></i>
                <p>No students connected yet</p>
                <small>Share your teacher code to connect with students</small>
            </div>
        `;
        return;
    }
    
    const studentItems = students.map(student => `
        <div class="student-item">
            <span class="status ${student.lastActive && new Date() - new Date(student.lastActive) < 300000 ? 'online' : ''}"></span>
            <span class="name">${student.name || student.email}</span>
            <span class="time">${formatLastActive(student.lastActive)}</span>
        </div>
    `).join('');
    
    studentList.innerHTML = studentItems;
}

// Function to fetch and update dashboard stats
async function updateDashboardStats() {
    try {
        // Get connected students count
        const studentsResponse = await fetch('/api/teacher/students');
        const studentsData = await studentsResponse.json();
        const activeStudents = studentsData.students.filter(s => 
            s.lastActive && new Date() - new Date(s.lastActive) < 300000
        ).length;
        const activeStudentsEl = document.getElementById('activeStudentsCount');
        if (activeStudentsEl) activeStudentsEl.textContent = activeStudents;

        // Get resources count
        const resourcesResponse = await fetch('/api/teacher/resources');
        const resourcesData = await resourcesResponse.json();
        const resourcesCount = resourcesData.resources ? resourcesData.resources.length : 0;
        const resourcesCountEl = document.getElementById('resourcesCount');
        if (resourcesCountEl) resourcesCountEl.textContent = resourcesCount;

        // Get active quizzes count and compute average completion from progress API
        const quizzesResponse = await fetch('/api/teacher/quizzes');
        const quizzesData = await quizzesResponse.json();
        const activeQuizzes = quizzesData.quizzes ? quizzesData.quizzes.filter(q => (q.status === 'active')).length : 0;
        const quizzesCountEl = document.getElementById('quizzesCount');
        if (quizzesCountEl) quizzesCountEl.textContent = activeQuizzes;

        // Average completion from students progress overall average
        const progressRes = await fetch('/api/teacher/students/progress');
        const progressData = await progressRes.json();
        const overalls = (progressData.students || []).map(s => s.overall || 0);
        const avg = overalls.length ? Math.round(overalls.reduce((a,b)=>a+b,0) / overalls.length) : 0;
        const avgEl = document.getElementById('avgCompletion');
        if (avgEl) avgEl.textContent = `${avg}%`;
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

// Function to copy teacher code
async function copyTeacherCode() {
    try {
        const teacherCodeInput = document.getElementById('teacherCode');
        const code = teacherCodeInput.value;
        
        // Only make API call if no code is displayed or user explicitly requests new code
        if (!code || code.trim() === '') {
            const response = await fetch('/api/teacher/code/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            
            if (data.success && data.code) {
                teacherCodeInput.value = data.code;
            } else {
                throw new Error('Failed to generate code');
            }
        }
        
        teacherCodeInput.select();
        document.execCommand('copy');
        showNotification('Teacher code copied to clipboard!', 'success');
    } catch (error) {
        console.error('Error with teacher code:', error);
        showNotification('Failed to copy teacher code', 'error');
    }
}

// Function to validate teacher code
async function validateTeacherCode(code) {
    try {
        const response = await fetch('/api/teacher/code/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('Successfully connected to teacher!', 'success');
            return true;
        } else {
            showNotification(data.error || 'Invalid teacher code', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error validating teacher code:', error);
        showNotification('Failed to validate teacher code', 'error');
        return false;
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });
    }
    
    // Initial students fetch
    const students = await fetchConnectedStudents();
    renderStudentsList(students);
    
    // Initial stats update
    await updateDashboardStats();
    
    // Refresh students list every 30 seconds
    setInterval(async () => {
        const updatedStudents = await fetchConnectedStudents();
        renderStudentsList(updatedStudents);
    }, 30000);

    // Refresh stats every minute
    setInterval(updateDashboardStats, 60000);

    // Profile dropdown
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });

        document.addEventListener('click', function(e) {
            if (!profileDropdown.contains(e.target) && !profileBtn.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        }
    });

    // Handle file uploads
    const fileUpload = document.getElementById('resourceUpload');
    if (fileUpload) {
        fileUpload.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/teacher/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Upload failed');
                }

                const result = await response.json();
                console.log('Upload successful:', result);
                
                // Refresh resource list or show success message
                showNotification('File uploaded successfully!', 'success');

            } catch (error) {
                console.error('Upload error:', error);
                showNotification('Upload failed. Please try again.', 'error');
            }
        });
    }

    // Notification system
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Automatically remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Quiz form handling
    const quizForm = document.getElementById('createQuizForm');
    if (quizForm) {
        quizForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(quizForm);
            const quizData = {
                title: formData.get('title'),
                description: formData.get('description'),
                questions: []
            };

            // Collect questions and answers
            const questionContainers = document.querySelectorAll('.question-container');
            questionContainers.forEach(container => {
                const question = {
                    text: container.querySelector('.question-text').value,
                    options: [],
                    correct: container.querySelector('.correct-answer').value
                };

                container.querySelectorAll('.answer-option').forEach(option => {
                    question.options.push(option.value);
                });

                quizData.questions.push(question);
            });

            try {
                const response = await fetch('/api/teacher/quiz', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(quizData)
                });

                if (!response.ok) {
                    throw new Error('Failed to create quiz');
                }

                const result = await response.json();
                console.log('Quiz created:', result);
                
                showNotification('Quiz created successfully!', 'success');
                quizForm.reset();

            } catch (error) {
                console.error('Quiz creation error:', error);
                showNotification('Failed to create quiz. Please try again.', 'error');
            }
        });
    }

    // Add question button
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    if (addQuestionBtn) {
        addQuestionBtn.addEventListener('click', function() {
            const questionContainer = document.createElement('div');
            questionContainer.className = 'question-container card';
            questionContainer.innerHTML = `
                <input type="text" class="question-text" placeholder="Enter question">
                <div class="options-container">
                    <input type="text" class="answer-option" placeholder="Option 1">
                    <input type="text" class="answer-option" placeholder="Option 2">
                    <input type="text" class="answer-option" placeholder="Option 3">
                    <input type="text" class="answer-option" placeholder="Option 4">
                </div>
                <select class="correct-answer">
                    <option value="0">Option 1 is correct</option>
                    <option value="1">Option 2 is correct</option>
                    <option value="2">Option 3 is correct</option>
                    <option value="3">Option 4 is correct</option>
                </select>
                <button type="button" class="remove-question">Remove Question</button>
            `;

            const questionsContainer = document.getElementById('questionsContainer');
            questionsContainer.appendChild(questionContainer);

            // Add remove handler
            questionContainer.querySelector('.remove-question').addEventListener('click', function() {
                questionContainer.remove();
            });
        });
    }

    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                // Set explicit logout flag
                localStorage.setItem('userLoggedOut', 'true');
                
                // Clear localStorage except logout flag
                const logoutFlag = localStorage.getItem('userLoggedOut');
                localStorage.clear();
                localStorage.setItem('userLoggedOut', logoutFlag);
                
                // Clear sessionStorage
                sessionStorage.clear();

                // Sign out from Firebase
                const auth = getAuth();
                await signOut(auth);

                // Redirect to home page
                window.location.href = '/';
            } catch (error) {
                console.error('Logout error:', error);
                // Still redirect on error to ensure user can logout
                window.location.href = '/';
            }
        });
    }

    // Teacher code copy handler
    const copyCodeBtn = document.getElementById('copyCode');
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', copyTeacherCode);
    }
});