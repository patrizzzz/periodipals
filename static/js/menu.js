// Teacher connection handling
const connectTeacherBtn = document.getElementById('connectTeacherBtn');
const teacherCodeInput = document.getElementById('teacherCodeInput');
const teacherConnectError = document.getElementById('teacherConnectError');
const teacherConnectSuccess = document.getElementById('teacherConnectSuccess');

if (connectTeacherBtn && teacherCodeInput) {
    connectTeacherBtn.addEventListener('click', async () => {
        // Clear previous messages
        teacherConnectError.textContent = '';
        teacherConnectSuccess.textContent = '';
        
        const code = teacherCodeInput.value.trim();
        if (!code) {
            teacherConnectError.textContent = 'Please enter a teacher code';
            return;
        }
        
        try {
            const response = await fetch('/api/student/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ teacher_code: code })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                teacherConnectSuccess.textContent = data.message || 'Successfully connected to teacher!';
                teacherCodeInput.value = '';
                
                // Refresh the resources display
                if (typeof loadResources === 'function') {
                    await loadResources();
                }
            } else {
                teacherConnectError.textContent = data.error || 'Failed to connect to teacher';
            }
        } catch (error) {
            console.error('Error connecting to teacher:', error);
            teacherConnectError.textContent = 'Failed to connect. Please try again.';
        }
    });
}

// Copy teacher code functionality for teachers
const copyCodeBtn = document.getElementById('copyCode');
const teacherCodeElement = document.getElementById('teacherCode');

if (copyCodeBtn && teacherCodeElement) {
    copyCodeBtn.addEventListener('click', () => {
        const code = teacherCodeElement.textContent;
        navigator.clipboard.writeText(code).then(() => {
            const originalText = copyCodeBtn.innerHTML;
            copyCodeBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyCodeBtn.innerHTML = originalText;
            }, 2000);
        });
    });
}