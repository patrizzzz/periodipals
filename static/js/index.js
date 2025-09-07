import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB7j5oSrNFAHHIfLQZvEh-VRg_OVqQ4EQ4",
  authDomain: "menstrual-hygiene-manage-6b0ed.firebaseapp.com",
  projectId: "menstrual-hygiene-manage-6b0ed",
  storageBucket: "menstrual-hygiene-manage-6b0ed.appspot.com",
  messagingSenderId: "1002865022115",
  appId: "1:1002865022115:web:ab79150f8a8d82e9171b16"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.useDeviceLanguage();

// Form Elements
const loginFormElement = document.getElementById('loginFormElement');
const loginBtn = document.getElementById('loginBtn');

// Check if user is already logged in and redirect based on role
function checkAuthState() {
    // Check if user explicitly logged out
    if (localStorage.getItem('userLoggedOut') === 'true') {
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                // Get role from backend API
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: user.email,
                        uid: user.uid
                    })
                });

                if (!response.ok) throw new Error('Failed to fetch role');
                const data = await response.json();
                
                // Redirect based on role
                if (data.role === 'teacher') {
                    window.location.href = '/teacher/dashboard';
                } else {
                    window.location.href = '/menu';
                }
            } catch (error) {
                console.error('Auth state check failed:', error);
            }
        }
    });
}

// Error handling
function showError(fieldId, message) {
    const errorElement = document.getElementById(fieldId);
    errorElement.textContent = message;
    errorElement.classList.add('show');
    const inputField = document.getElementById(fieldId.replace('Error', ''));
    inputField.classList.add('error');
}

function clearError(fieldId) {
    const errorElement = document.getElementById(fieldId);
    errorElement.textContent = '';
    errorElement.classList.remove('show');
    const inputField = document.getElementById(fieldId.replace('Error', ''));
    inputField.classList.remove('error');
}

function clearAllErrors() {
    clearError('loginEmailError');
    clearError('loginPasswordError');
}

// Loading state
function setLoadingState(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
        button.querySelector('.btn-text').textContent = 'Signing In...';
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        button.querySelector('.btn-text').textContent = 'Sign In';
    }
}

// Password toggle
document.getElementById('loginPasswordToggle').addEventListener('click', function() {
    const passwordInput = document.getElementById('loginPassword');
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    this.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
});

// Login form submission
loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Validation
    let isValid = true;
    
    if (!email) {
        showError('loginEmailError', 'Please enter your email address');
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('loginEmailError', 'Please enter a valid email address');
        isValid = false;
    }
    
    if (!password) {
        showError('loginPasswordError', 'Please enter your password');
        isValid = false;
    }
    
    if (!isValid) return;
    
    // Clear any existing errors
    clearAllErrors();
    
    // Show loading state
    setLoadingState(loginBtn, true);
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        
        // Get role from backend API
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                uid: auth.currentUser.uid
            })
        });

        if (!response.ok) throw new Error('Failed to get role');
        const data = await response.json();
        
        // Show success message
        const successMessage = document.getElementById('loginSuccess');
        successMessage.classList.add('show');
        
        // Redirect based on role after 1.5 seconds
        setTimeout(() => {
            window.location.href = data.role === 'teacher' ? '/teacher/dashboard' : '/menu';
        }, 1500);
    } catch (error) {
        showError('loginEmailError', error.message || 'Failed to sign in. Please try again.');
    } finally {
        setLoadingState(loginBtn, false);
    }
});

// Password reset functionality
const forgotPasswordBtn = document.getElementById('forgotPassword');
forgotPasswordBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    
    if (!email) {
        showError('loginEmailError', 'Please enter your email to reset password');
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        alert('Password reset email sent! Please check your inbox.');
    } catch (error) {
        showError('loginEmailError', 'Failed to send reset email. Please try again.');
    }
});

// Initialize auth state check
checkAuthState();