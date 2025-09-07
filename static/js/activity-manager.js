import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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

class ActivityManager {
    constructor() {
        this.storage = getStorage(app);
        this.db = db;
        this.initializeUI();
        this.loadActivities();
    }

    initializeUI() {
        this.modal = document.getElementById('activityModal');
        this.activityList = document.getElementById('activityList');
        this.form = document.getElementById('activityForm');
        this.addActivityBtn = document.getElementById('addActivityBtn');
        this.closeModalBtn = document.getElementById('closeModal');
        this.notification = document.getElementById('notification');
        this.attachmentsInput = document.getElementById('attachments');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.addActivityBtn.addEventListener('click', () => this.openModal());
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async loadActivities() {
        try {
            showLoading(true);
            await new Promise(resolve => {
                const unsubscribe = auth.onAuthStateChanged(user => {
                    unsubscribe();
                    resolve(user);
                });
            });

            const user = auth.currentUser;
            if (!user) {
                console.log('No authenticated user');
                return;
            }

            const activitiesRef = collection(db, 'activities');
            const q = query(
                activitiesRef, 
                where('teacherId', '==', user.uid),
                orderBy('dueDate', 'desc')
            );
            const querySnapshot = await getDocs(q);
            
            this.activityList.innerHTML = '';
            if (querySnapshot.empty) {
                this.showEmptyState();
                return;
            }

            querySnapshot.forEach(doc => {
                const activity = doc.data();
                this.renderActivityCard(doc.id, activity);
            });
        } catch (error) {
            console.error('Error loading activities:', error);
            this.showNotification('Error loading activities', 'error');
        } finally {
            showLoading(false);
        }
    }

    renderActivityCard(id, activity) {
        const dueDate = new Date(activity.dueDate);
        const now = new Date();
        const timeLeft = dueDate - now;
        const isOverdue = timeLeft < 0;
        const statusClass = isOverdue ? 'overdue' : timeLeft < 86400000 ? 'urgent' : 'active';
        
        const formattedDueDate = new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        }).format(dueDate);

        const card = document.createElement('div');
        card.className = `activity-card ${statusClass}`;
        card.innerHTML = `
            <div class="activity-header">
                <h3>${activity.title}</h3>
                <span class="activity-type ${activity.type}">${activity.type}</span>
            </div>
            <p class="activity-description">${activity.description}</p>
            <div class="activity-meta">
                <span class="due-date ${isOverdue ? 'overdue' : ''}">
                    <i class="fas fa-clock"></i>
                    ${isOverdue ? 'Overdue' : 'Due'}: ${formattedDueDate}
                </span>
                <span class="points">
                    <i class="fas fa-star"></i>
                    ${activity.maxPoints || 100} points
                </span>
            </div>
            <div class="activity-stats">
                <span class="submissions">
                    <i class="fas fa-users"></i>
                    ${activity.submissions?.length || 0} submissions
                </span>
                <span class="completion">
                    <i class="fas fa-chart-pie"></i>
                    ${activity.submissions?.length ? Math.round((activity.submissions.filter(s => s.status === 'submitted').length / activity.submissions.length) * 100) : 0}% completed
                </span>
            </div>
            <div class="activity-actions">
                <button onclick="activityManager.viewSubmissions('${id}')" class="activity-btn btn-primary">
                    <i class="fas fa-inbox"></i> View Submissions
                </button>
                <button onclick="activityManager.editActivity('${id}')" class="activity-btn btn-secondary">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="activityManager.deleteActivity('${id}')" class="activity-btn btn-danger">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        this.activityList.appendChild(card);
    }

    showEmptyState() {
        this.activityList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <h3>No Activities Yet</h3>
                <p>Create your first activity to engage with your students!</p>
                <button onclick="activityManager.openModal()" class="activity-btn btn-primary">
                    <i class="fas fa-plus"></i> Create Activity
                </button>
            </div>
        `;
    }

    async handleSubmit(e) {
        e.preventDefault();
        try {
            const user = window.auth.currentUser;
            if (!user) {
                this.showNotification('Please log in first', 'error');
                return;
            }

            // Verify teacher role
            const userDoc = await getDoc(doc(window.db, 'users', user.uid));
            if (!userDoc.exists() || userDoc.data().role !== 'teacher') {
                this.showNotification('Only teachers can create activities', 'error');
                return;
            }

            showLoading(true);
            const formData = new FormData(this.form);
            const attachments = await this.uploadAttachments();

            const activityData = {
                title: formData.get('title'),
                description: formData.get('description'),
                type: formData.get('type'),
                dueDate: new Date(formData.get('dueDate')).toISOString(),
                maxPoints: parseInt(formData.get('maxPoints')),
                teacherId: user.uid,
                teacherEmail: user.email,
                attachments: attachments,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                status: 'active',
                submissions: []
            };

            await addDoc(collection(window.db, 'activities'), activityData);
            this.showNotification('Activity created successfully', 'success');
            this.closeModal();
            this.loadActivities();
        } catch (error) {
            console.error('Error creating activity:', error);
            this.showNotification('Error creating activity', 'error');
        } finally {
            showLoading(false);
        }
    }

    async uploadAttachments() {
        const files = this.attachmentsInput.files;
        if (!files.length) return [];

        const attachments = [];
        for (const file of files) {
            const storageRef = ref(this.storage, `activities/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            attachments.push({
                name: file.name,
                url: downloadURL,
                type: file.type
            });
        }
        return attachments;
    }

    async deleteActivity(activityId) {
        if (!confirm('Are you sure you want to delete this activity? All submissions will be lost.')) {
            return;
        }

        try {
            showLoading(true);
            await deleteDoc(doc(window.db, 'activities', activityId));
            this.showNotification('Activity deleted successfully', 'success');
            this.loadActivities();
        } catch (error) {
            console.error('Error deleting activity:', error);
            this.showNotification('Error deleting activity', 'error');
        } finally {
            showLoading(false);
        }
    }

    async editActivity(activityId) {
        try {
            const activityDoc = await getDoc(doc(window.db, 'activities', activityId));
            if (!activityDoc.exists()) {
                this.showNotification('Activity not found', 'error');
                return;
            }

            const activity = activityDoc.data();
            this.openModal(activity);
            
            // Populate form fields
            this.form.title.value = activity.title;
            this.form.description.value = activity.description;
            this.form.type.value = activity.type;
            this.form.dueDate.value = new Date(activity.dueDate).toISOString().slice(0, 16);
            this.form.maxPoints.value = activity.maxPoints || 100;
            
            // Store activity ID for update
            this.form.dataset.activityId = activityId;
        } catch (error) {
            console.error('Error loading activity:', error);
            this.showNotification('Error loading activity', 'error');
        }
    }

    async viewSubmissions(activityId) {
        try {
            const submissionsModal = document.getElementById('submissionsModal');
            const totalStudents = document.getElementById('totalStudents');
            const submittedCount = document.getElementById('submittedCount');
            const pendingCount = document.getElementById('pendingCount');
            const tableBody = document.getElementById('submissionsTableBody');

            // Get activity details
            const activityDoc = await getDoc(doc(window.db, 'activities', activityId));
            if (!activityDoc.exists()) {
                this.showNotification('Activity not found', 'error');
                return;
            }

            const activity = activityDoc.data();

            // Get all students for this teacher
            const studentsQuery = query(
                collection(window.db, 'users'),
                where('teacher_id', '==', window.auth.currentUser.uid),
                where('role', '==', 'student')
            );
            const studentsSnapshot = await getDocs(studentsQuery);
            const students = studentsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));

            // Get all submissions for this activity
            const submissionsQuery = query(
                collection(window.db, `activities/${activityId}/submissions`)
            );
            const submissionsSnapshot = await getDocs(submissionsQuery);
            const submissions = {};
            submissionsSnapshot.forEach(doc => {
                submissions[doc.id] = doc.data();
            });

            // Update stats
            totalStudents.textContent = students.length;
            const submitted = Object.keys(submissions).length;
            submittedCount.textContent = submitted;
            pendingCount.textContent = students.length - submitted;

            // Render submissions table
            tableBody.innerHTML = students.map(student => {
                const submission = submissions[student.id];
                const status = submission ? 
                    (new Date(submission.submittedAt) > new Date(activity.dueDate) ? 'late' : 'submitted') : 
                    'pending';
                const submittedAt = submission ? 
                    new Date(submission.submittedAt).toLocaleString() : 
                    'Not submitted';
                const grade = submission?.grade || '-';

                return `
                    <tr>
                        <td>${student.firstName} ${student.lastName}</td>
                        <td>
                            <span class="student-status ${status}">
                                ${status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                        </td>
                        <td>${submittedAt}</td>
                        <td>${grade}/100</td>
                        <td>
                            ${submission ? 
                                `<button class="activity-btn btn-secondary" onclick="activityManager.viewSubmissionDetail('${activityId}', '${student.id}')">
                                    <i class="fas fa-eye"></i> View
                                </button>` :
                                '<span class="text-muted">No submission</span>'
                            }
                        </td>
                    </tr>
                `;
            }).join('');

            // Show modal
            submissionsModal.classList.add('show');
            submissionsModal.style.display = 'block';

            // Setup filters
            const statusFilter = document.getElementById('statusFilter');
            const studentSearch = document.getElementById('studentSearch');
            
            const filterSubmissions = () => {
                const status = statusFilter.value;
                const search = studentSearch.value.toLowerCase();
                
                const rows = tableBody.querySelectorAll('tr');
                rows.forEach(row => {
                    const studentName = row.cells[0].textContent.toLowerCase();
                    const submissionStatus = row.cells[1].textContent.toLowerCase();
                    
                    const matchesStatus = status === 'all' || submissionStatus.includes(status);
                    const matchesSearch = !search || studentName.includes(search);
                    
                    row.style.display = matchesStatus && matchesSearch ? '' : 'none';
                });
            };
            
            statusFilter.addEventListener('change', filterSubmissions);
            studentSearch.addEventListener('input', filterSubmissions);
            
            // Setup close button
            const closeBtn = document.getElementById('closeSubmissionsModal');
            closeBtn.onclick = () => {
                submissionsModal.classList.remove('show');
                setTimeout(() => submissionsModal.style.display = 'none', 300);
            };

        } catch (error) {
            console.error('Error viewing submissions:', error);
            this.showNotification('Error loading submissions', 'error');
        }
    }

    async viewSubmissionDetail(activityId, studentId) {
        try {
            const detailModal = document.getElementById('submissionDetailModal');
            const contentDiv = document.getElementById('submissionDetailContent');
            const gradeInput = document.getElementById('grade');
            const feedbackInput = document.getElementById('feedback');

            // Get submission
            const submissionDoc = await getDoc(doc(window.db, `activities/${activityId}/submissions/${studentId}`));
            if (!submissionDoc.exists()) {
                this.showNotification('Submission not found', 'error');
                return;
            }

            const submission = submissionDoc.data();

            // Get student info
            const studentDoc = await getDoc(doc(window.db, 'users', studentId));
            const student = studentDoc.data();

            // Format submission content
            contentDiv.innerHTML = `
                <div class="submission-info">
                    <h4>${student.firstName} ${student.lastName}</h4>
                    <p class="submission-date">
                        Submitted: ${new Date(submission.submittedAt).toLocaleString()}
                    </p>
                    <div class="submission-content">
                        ${this.formatSubmissionContent(submission)}
                    </div>
                    ${submission.attachments ? `
                        <div class="submission-attachments">
                            <h5>Attachments</h5>
                            <ul>
                                ${submission.attachments.map(a => `
                                    <li>
                                        <a href="${a.url}" target="_blank">
                                            <i class="fas fa-paperclip"></i> ${a.name}
                                        </a>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;

            // Set current grade and feedback
            gradeInput.value = submission.grade || '';
            feedbackInput.value = submission.feedback || '';

            // Store IDs for grading
            gradeInput.dataset.activityId = activityId;
            gradeInput.dataset.studentId = studentId;

            // Show modal
            detailModal.classList.add('show');
            detailModal.style.display = 'block';

            // Setup close button
            const closeBtn = document.getElementById('closeDetailModal');
            closeBtn.onclick = () => {
                detailModal.classList.remove('show');
                setTimeout(() => detailModal.style.display = 'none', 300);
            };

        } catch (error) {
            console.error('Error viewing submission detail:', error);
            this.showNotification('Error loading submission details', 'error');
        }
    }

    formatSubmissionContent(submission) {
        if (submission.answers) {
            return `
                <div class="answers-list">
                    ${submission.answers.map((answer, idx) => `
                        <div class="answer-item">
                            <div class="question">${idx + 1}. ${answer.question}</div>
                            <div class="answer ${answer.correct ? 'correct' : 'incorrect'}">
                                ${answer.answer}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        return `<p class="submission-text">${submission.content || 'No content available'}</p>`;
    }

    async saveGrade() {
        try {
            const gradeInput = document.getElementById('grade');
            const feedbackInput = document.getElementById('feedback');
            const activityId = gradeInput.dataset.activityId;
            const studentId = gradeInput.dataset.studentId;

            if (!activityId || !studentId) {
                this.showNotification('Missing activity or student ID', 'error');
                return;
            }

            const grade = parseInt(gradeInput.value);
            if (isNaN(grade) || grade < 0 || grade > 100) {
                this.showNotification('Grade must be between 0 and 100', 'error');
                return;
            }

            // Update submission with grade and feedback
            const submissionRef = doc(window.db, `activities/${activityId}/submissions/${studentId}`);
            await updateDoc(submissionRef, {
                grade: grade,
                feedback: feedbackInput.value,
                gradedAt: serverTimestamp(),
                gradedBy: window.auth.currentUser.uid
            });

            this.showNotification('Grade saved successfully', 'success');
            
            // Close detail modal and refresh submissions view
            document.getElementById('submissionDetailModal').style.display = 'none';
            await this.viewSubmissions(activityId);

        } catch (error) {
            console.error('Error saving grade:', error);
            this.showNotification('Error saving grade', 'error');
        }
    }

    openModal(activity = null) {
        this.modal.style.display = 'flex';
        requestAnimationFrame(() => {
            this.modal.classList.add('show');
        });
        
        if (!activity) {
            this.form.reset();
            delete this.form.dataset.activityId;
        }

        // Close modal when clicking outside
        const closeOnOutsideClick = (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        };
        this.modal.addEventListener('click', closeOnOutsideClick);
    }

    closeModal() {
        this.modal.classList.remove('show');
        setTimeout(() => {
            this.modal.style.display = 'none';
            this.form.reset();
            delete this.form.dataset.activityId;
        }, 300);
    }

    showNotification(message, type) {
        this.notification.textContent = message;
        this.notification.className = `notification ${type}`;
        setTimeout(() => {
            this.notification.className = 'notification';
        }, 3000);
    }
}

function showLoading(show = true) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

// Initialize and export for global access
window.activityManager = new ActivityManager();