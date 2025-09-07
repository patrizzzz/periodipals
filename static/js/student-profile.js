document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('studentProfileForm');
    const teacherCodeInput = document.getElementById('teacherCodeInput');
    const connectTeacherBtn = document.getElementById('connectTeacherBtn');
    const teacherConnectError = document.getElementById('teacherConnectError');
    const teacherConnectSuccess = document.getElementById('teacherConnectSuccess');
    const currentTeacher = document.getElementById('currentTeacher');

    // Load existing profile data
    async function loadProfile() {
        try {
            const response = await fetch('/api/student/profile');
            if (!response.ok) throw new Error('Failed to load profile');
            
            const data = await response.json();
            if (data.success) {
                // Fill form fields
                document.getElementById('firstName').value = data.profile.first_name || '';
                document.getElementById('middleInitial').value = data.profile.middle_initial || '';
                document.getElementById('lastName').value = data.profile.last_name || '';
                document.getElementById('age').value = data.profile.age || '';
                
                // Update teacher display if connected
                if (data.profile.teacher_name) {
                    currentTeacher.textContent = `Connected to: ${data.profile.teacher_name}`;
                    currentTeacher.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            showError('Failed to load profile data');
        }
    }

    // Save profile changes
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            firstName: document.getElementById('firstName').value,
            middleInitial: document.getElementById('middleInitial').value,
            lastName: document.getElementById('lastName').value,
            age: document.getElementById('age').value
        };

        try {
            const response = await fetch('/api/student/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to update profile');
            
            const result = await response.json();
            if (result.success) {
                showSuccess('Profile updated successfully!');
            } else {
                showError(result.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showError('Failed to update profile');
        }
    });

    // Connect to teacher
    connectTeacherBtn.addEventListener('click', async () => {
        const code = teacherCodeInput.value.trim().toUpperCase();
        if (!code) {
            teacherConnectError.textContent = 'Please enter a teacher code';
            teacherConnectSuccess.textContent = '';
            return;
        }

        teacherConnectError.textContent = '';
        teacherConnectSuccess.textContent = 'Connecting...';

        try {
            const response = await fetch('/api/student/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacher_code: code })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                teacherConnectSuccess.textContent = 'Successfully connected to teacher!';
                teacherCodeInput.value = '';
                
                // Update teacher display
                if (result.teacher_name) {
                    currentTeacher.textContent = `Connected to: ${result.teacher_name}`;
                    currentTeacher.style.display = 'block';
                }
            } else {
                teacherConnectError.textContent = result.error || 'Failed to connect to teacher';
                teacherConnectSuccess.textContent = '';
            }
        } catch (error) {
            teacherConnectError.textContent = error.message;
            teacherConnectSuccess.textContent = '';
        }
    });

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        profileForm.insertAdjacentElement('beforebegin', errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        profileForm.insertAdjacentElement('beforebegin', successDiv);
        setTimeout(() => successDiv.remove(), 5000);
    }

    // Load profile data when page loads
    loadProfile();
});