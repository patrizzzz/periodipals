import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
    import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

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

    // Generate unique teacher code
    async function generateTeacherCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code;
        let isUnique = false;
        
        while (!isUnique) {
            code = '';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            try {
                const db = getFirestore();
                const existing = await db.collection('users').where('teacher_code', '==', code).get();
                isUnique = existing.empty;
            } catch (error) {
                console.error('Error checking teacher code uniqueness:', error);
                isUnique = true;
            }
        }
        
        return code;
    }

    const passwordRequirements = {
        minLength: (password) => password.length >= 8,
        uppercase: (password) => /[A-Z]/.test(password),
        number: (password) => /\d/.test(password)
    };

    // Helper functions for error display
    function showError(fieldId, message) {
        const errorElement = document.getElementById(fieldId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
            const inputField = document.getElementById(fieldId.replace('Error', ''));
            if (inputField) inputField.classList.add('error');
        }
    }
    function clearError(fieldId) {
        const errorElement = document.getElementById(fieldId);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
            const inputField = document.getElementById(fieldId.replace('Error', ''));
            if (inputField) inputField.classList.remove('error');
        }
    }
    function clearAllErrors() {
        clearError('registerUsernameError');
        clearError('registerEmailError');
        clearError('registerPasswordError');
    }
    function setLoadingState(button, isLoading) {
        if (!button) return;
        button.classList[isLoading ? 'add' : 'remove']('loading');
        button.disabled = isLoading;
        button.querySelector('.btn-text').textContent = isLoading ? 'Creating Account...' : 'Create Account';
    }

    let selectedAge = null;
    let selectedRole = 'student';

    document.addEventListener('DOMContentLoaded', () => {
        const registerForm = document.getElementById('registerFormElement');
        const registerBtn = document.getElementById('registerBtn');
        const registerPassword = document.getElementById('registerPassword');
        const passwordToggle = document.getElementById('registerPasswordToggle');
        const ageSelection = document.querySelector('.age-selection');
        
        // Role selection handler
        document.querySelectorAll('.role-btn')?.forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                selectedRole = this.dataset.role;
                
                if (selectedRole === 'teacher') {
                    selectedAge = '19+';
                    if (ageSelection) {
                        ageSelection.style.display = 'none';
                    }
                } else {
                    if (ageSelection) {
                        ageSelection.style.display = 'block';
                        selectedAge = null;
                        document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
                    }
                }
            });
        });

        // Age selection
        document.querySelectorAll('.age-btn')?.forEach(btn => {
            btn.addEventListener('click', function() {
                if (selectedRole !== 'teacher') {
                    document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedAge = this.dataset.age;
                }
            });
        });

        // Password requirements validation
        if (registerPassword) {
            registerPassword.addEventListener('input', function() {
                const password = this.value;
                const requirementsEl = document.getElementById('passwordRequirements');
                if (password.length > 0) {
                    requirementsEl.style.display = 'block';
                } else {
                    requirementsEl.style.display = 'none';
                }
                
                Object.entries(passwordRequirements).forEach(([requirement, validate]) => {
                    const element = document.querySelector(`[data-requirement="${requirement}"]`);
                    if (element) {
                        const isMet = validate(password);
                        element.classList.toggle('met', isMet);
                        element.querySelector('.requirement-icon').textContent = isMet ? '●' : '○';
                    }
                });
            });
        }

        // Password visibility toggle
        if (passwordToggle) {
            passwordToggle.addEventListener('click', function() {
                const passwordInput = document.getElementById('registerPassword');
                const type = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = type;
                this.textContent = type === 'password' ? '👁️' : '🔒';
            });
        }

        // Firebase registration form submission
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                clearAllErrors();

                const username = document.getElementById('registerUsername').value;
                const email = document.getElementById('registerEmail').value;
                const password = document.getElementById('registerPassword').value;

                // Validate inputs
                if (!username || !email || !password || (!selectedAge && selectedRole !== 'teacher')) {
                    showError('registerUsernameError', !username ? 'Username is required' : '');
                    showError('registerEmailError', !email ? 'Email is required' : '');
                    showError('registerPasswordError', !password ? 'Password is required' : '');
                    if (!selectedAge && selectedRole !== 'teacher') {
                        showError('registerEmailError', 'Please select your age group');
                    }
                    return;
                }

                // Show loading state
                setLoadingState(registerBtn, true);

                try {
                    // Create user in Firebase
                    const auth = getAuth();
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const user = userCredential.user;

                    // Update profile with username
                    await updateProfile(user, {
                        displayName: username
                    });

                    // Create user document in Firestore
                    const db = getFirestore();
                    
                    // Generate teacher code if registering as teacher
                    let teacherCode = null;
                    if (selectedRole === 'teacher') {
                        teacherCode = await generateTeacherCode();
                    }
                    
                    const userData = {
                        username,
                        email,
                        age_group: selectedRole === 'teacher' ? '19+' : selectedAge,
                        role: selectedRole,
                        created_at: serverTimestamp(),
                        progress: {}
                    };
                    
                    // Add teacher code if generated
                    if (teacherCode) {
                        userData.teacher_code = teacherCode;
                    }
                    
                    await setDoc(doc(db, "users", user.uid), userData);

                    // Sync with server
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: email,
                            uid: user.uid,
                            role: selectedRole
                        })
                    });

                    if (!response.ok) throw new Error('Failed to sync with server');
                    const data = await response.json();
                    
                    // Show success message
                    const successElement = document.getElementById('registerSuccess');
                    if (selectedRole === 'teacher' && teacherCode) {
                        successElement.innerHTML = `
                            Account created successfully! Welcome to PeriodiPal! 🎉<br>
                            <strong>Your Teacher Code: ${teacherCode}</strong><br>
                            <small>Share this code with your students so they can connect to your class.</small>
                        `;
                    }
                    successElement.classList.add('show');
                    
                    // Redirect based on role after 3 seconds (longer for teachers to see their code)
                    setTimeout(() => {
                        window.location.href = selectedRole === 'teacher' ? '/teacher/dashboard' : '/menu';
                    }, selectedRole === 'teacher' ? 3000 : 1500);

                } catch (error) {
                    console.error('Registration error:', error);
                    let errorMessage = 'Registration failed. Please try again.';
                    
                    switch (error.code) {
                        case 'auth/email-already-in-use':
                            errorMessage = 'This email is already registered.';
                            showError('registerEmailError', errorMessage);
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Please enter a valid email address.';
                            showError('registerEmailError', errorMessage);
                            break;
                        case 'auth/weak-password':
                            errorMessage = 'Password is too weak. Please choose a stronger password.';
                            showError('registerPasswordError', errorMessage);
                            break;
                        case 'auth/operation-not-allowed':
                            errorMessage = 'Email/Password sign up is not enabled. Please contact support.';
                            showError('registerEmailError', errorMessage);
                            break;
                        case 'auth/network-request-failed':
                            errorMessage = 'Network error. Please check your internet connection.';
                            showError('registerEmailError', errorMessage);
                            break;
                        case 'auth/too-many-requests':
                            errorMessage = 'Too many attempts. Please try again later.';
                            showError('registerEmailError', errorMessage);
                            break;
                        case 'auth/requests-to-this-api-identitytoolkit-method-google.cloud.identitytoolkit.v1.authenticationservice.signup-are-blocked':
                            errorMessage = 'Registration is temporarily disabled. Please try again later or contact support.';
                            showError('registerEmailError', errorMessage);
                            break;
                        default:
                            showError('registerEmailError', errorMessage);
                    }
                } finally {
                    setLoadingState(registerBtn, false);
                }
            });
        }
    });

    // Tour functionality
    const tour = {
      currentStep: 0,
      steps: [
        {
          element: '.app-logo',
          title: "Welcome to PeriodiPal! 👋",
          content: "Hi! I'm Peri, and I'll help you create your account! Let's get started!",
          mascotState: 'happy'
        },
        {
          element: '#registerUsername',
          title: "Choose Your Username 📝",
          content: "Pick a unique username that will identify you in our community!",
          mascotState: 'pointing'
        },
        {
          element: '#registerEmail',
          title: "Email Address 📧",
          content: "We'll use this email to secure your account and help you if you forget your password.",
          mascotState: 'explaining'
        },
        {
          element: '#registerPassword',
          title: "Create Password 🔒",
          content: "Choose a strong password to keep your account safe!",
          mascotState: 'pointing'
        },
        {
          element: '#passwordRequirements',
          title: "Password Requirements ✅",
          content: "Make sure your password meets all these requirements for better security!",
          mascotState: 'explaining'
        },
        {
          element: '.age-options',
          title: "Age Group 📅",
          content: "Select your age group so we can provide content that's just right for you!",
          mascotState: 'pointing'
        },
        {
          element: '.role-selection',
          title: "Select Your Role 🎭",
          content: "Are you a student or a teacher? This helps us customize your experience.",
          mascotState: 'pointing'
        },
        {
          element: '#registerBtn',
          title: "Create Account 🚀",
          content: "All set? Click here to join our community!",
          mascotState: 'happy'
        }
      ],

      init() {
        this.overlay = document.getElementById('tourOverlay');
        this.tooltip = document.getElementById('tourTooltip');
        this.mascot = document.getElementById('mascotSprite');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.skipBtn = document.getElementById('skipBtn');
        this.progress = document.getElementById('tourProgress');

        this.setupEventListeners();
        this.start();
      },

      setupEventListeners() {
        this.prevBtn.addEventListener('click', () => this.prev());
        this.nextBtn.addEventListener('click', () => this.next());
        this.skipBtn.addEventListener('click', () => this.end());
      },

      start() {
        this.overlay.style.display = 'block';
        this.updateProgress();
        this.showStep(0);
      },

      showStep(index) {
        const step = this.steps[index];
        const target = document.querySelector(step.element);
        const rect = target.getBoundingClientRect();

        // Add smooth fade for tooltip
        this.tooltip.style.opacity = '0';
        this.tooltip.style.display = 'block';
        this.tooltip.querySelector('.tour-content').innerHTML = `
          <h3>${step.title}</h3>
          <p>${step.content}</p>
        `;
        setTimeout(() => this.tooltip.style.opacity = '1', 50);

        // Update overlay spotlight position
        const centerX = rect.left + (rect.width / 2);
        const centerY = rect.top + (rect.height / 2);
        this.overlay.style.background = `
          radial-gradient(
            circle at ${centerX}px ${centerY}px,
            rgba(0, 0, 0, 0.5) 30px,
            rgba(0, 0, 0, 0.8) 100px
          )
        `;

        // Update mascot state
        const states = {
          'happy': { x: 0 },
          'pointing': { x: 1 },
          'explaining': { x: 2 },
          'idle': { x: 3 }
        };
        
        const position = states[step.mascotState] || states.idle;
        this.mascot.style.backgroundPosition = `${position.x * 33.33}% 0`;

        // Position tooltip based on available space
        const tooltipRect = this.tooltip.getBoundingClientRect();
        let top = rect.top + window.scrollY;
        let left = rect.right + 20;

        if (left + tooltipRect.width > window.innerWidth) {
          left = rect.left - tooltipRect.width - 20;
        }

        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;

        // Highlight the target element
        document.querySelectorAll('.tour-target').forEach(el => el.classList.remove('tour-target'));
        target.classList.add('tour-target');

        // Show/hide prev/next buttons
        this.prevBtn.style.display = index === 0 ? 'none' : 'inline-block';
        this.nextBtn.style.display = index === this.steps.length - 1 ? 'none' : 'inline-block';

        this.currentStep = index;
        this.updateProgress();
      },

      next() {
        if (this.currentStep < this.steps.length - 1) {
          this.showStep(this.currentStep + 1);
        }
      },

      prev() {
        if (this.currentStep > 0) {
          this.showStep(this.currentStep - 1);
        }
      },

      end() {
        this.overlay.style.display = 'none';
        this.tooltip.style.display = 'none';
        document.querySelectorAll('.tour-target').forEach(el => el.classList.remove('tour-target'));
      },

      updateProgress() {
        this.progress.innerHTML = '';
        for (let i = 0; i < this.steps.length; i++) {
          const dot = document.createElement('div');
          dot.className = 'tour-dot' + (i === this.currentStep ? ' active' : '');
          this.progress.appendChild(dot);
        }
      }
    };

    // Start the tour on page load (optional - remove if not needed)
    // window.addEventListener('DOMContentLoaded', () => {
    //   setTimeout(() => {
    //     tour.init();
    //   }, 800);
    // });