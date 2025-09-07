import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, serverTimestamp, updateDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const auth = getAuth();
const db = getFirestore();

// Helper to determine if pre-quiz is completed from Firebase progress
function checkPreQuizComplete(progress, moduleId) {
    if (!progress || !moduleId) return false;
    const moduleData = progress[moduleId];
    if (!moduleData) return false;

    // Check for explicit pre_quiz_completed flag
    if (moduleData.pre_quiz_completed === true) return true;
    
    // Also check if there's a pre_quiz_score (legacy support)
    if (typeof moduleData.pre_quiz_score === 'number' && moduleData.pre_quiz_score > 0) return true;
    
    return false;
}

// Helper to determine if post-quiz is completed from Firebase progress
function checkPostQuizComplete(progress, moduleId) {
    if (!progress || !moduleId) return false;
    const moduleData = progress[moduleId];
    if (!moduleData) return false;

    // Check for explicit post_quiz_completed flag
    if (moduleData.post_quiz_completed === true) return true;
    
    // Also check if there's a post_quiz_score (legacy support)
    if (typeof moduleData.post_quiz_score === 'number' && moduleData.post_quiz_score > 0) return true;
    
    return false;
}

async function syncQuizStates(uid) {
    try {
        console.log('Starting quiz state sync for uid:', uid);
        
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            console.log('User document does not exist in Firestore');
            // Try to create basic user document if missing
            await userRef.set({
                uid: uid,
                role: 'student',
                progress: {},
                created_at: serverTimestamp()
            });
            return;
        }
        
        const progress = userSnap.data().progress || {};
        const modules = ['1', '2', '3', '5', '6', '7'];
        
        console.log('Firebase progress data:', progress);
        
        // Sync each module's quiz states
        for (const mid of modules) {
            const moduleProgress = progress[mid] || {};
            
            // Sync pre-quiz state
            if (checkPreQuizComplete(progress, mid)) {
                console.log(`Module ${mid} pre-quiz marked as completed`);
                localStorage.setItem(`module_${mid}_pre_quiz`, 'true');
                
                // Call server to update session
                try {
                    const response = await fetch(`/api/sync_quiz_state/${mid}/pre`, {
                        method: 'POST',
                        credentials: 'same-origin'
                    });
                    if (response.ok) {
                        console.log(`Successfully synced pre-quiz state for module ${mid}`);
                    } else {
                        console.warn(`Failed to sync pre-quiz state for module ${mid}:`, response.status);
                    }
                } catch (fetchError) {
                    console.warn(`Error syncing pre-quiz state for module ${mid}:`, fetchError);
                }
            } else {
                // Ensure it's not marked as completed if it shouldn't be
                localStorage.removeItem(`module_${mid}_pre_quiz`);
            }
            
            // Sync post-quiz state
            if (checkPostQuizComplete(progress, mid)) {
                console.log(`Module ${mid} post-quiz marked as completed`);
                localStorage.setItem(`module_${mid}_post_quiz`, 'true');
                
                // Call server to update session
                try {
                    const response = await fetch(`/api/sync_quiz_state/${mid}/post`, {
                        method: 'POST',
                        credentials: 'same-origin'
                    });
                    if (response.ok) {
                        console.log(`Successfully synced post-quiz state for module ${mid}`);
                    } else {
                        console.warn(`Failed to sync post-quiz state for module ${mid}:`, response.status);
                    }
                } catch (fetchError) {
                    console.warn(`Error syncing post-quiz state for module ${mid}:`, fetchError);
                }
            } else {
                // Ensure it's not marked as completed if it shouldn't be
                localStorage.removeItem(`module_${mid}_post_quiz`);
            }
        }
        
        console.log('Quiz states synced from Firebase for uid:', uid);
    } catch (e) {
        console.error('Failed to sync quiz states:', e);
    }
}

async function loginToServer(uid, email, idToken) {
    try {
        console.log('Starting loginToServer function...', { uid, email });
        
        // First get user data from Firestore to get role
        const userRef = doc(db, 'users', uid);
        console.log('Fetching user data from Firestore...');
        const userSnap = await getDoc(userRef);
        console.log('Firestore fetch complete:', userSnap.exists() ? 'User found' : 'User not found');
        const userData = userSnap.exists() ? userSnap.data() : {};
        console.log('User data from Firestore:', userData);
        
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ 
                idToken, 
                uid, 
                email,
                firstName: userData.firstName || userData.first_name,
                lastName: userData.lastName || userData.last_name,
                middleInitial: userData.middleInitial || userData.middle_initial,
                age: userData.age,
                role: userData.role || 'student',
                progress: userData.progress || {},
                age_group: userData.age_group,
                teacher_code: userData.teacher_code
            })
        });

        if (!response.ok) {
            throw new Error(`Login sync failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Server login successful:', result);

        // Try to update profile display if we're on a page with profile elements
        try {
            const profileName = document.getElementById('profileName');
            const profileFirstName = document.getElementById('profileFirstName');
            const profileMiddleInitial = document.getElementById('profileMiddleInitial');
            const profileLastName = document.getElementById('profileLastName');
            const profileAge = document.getElementById('profileAge');

            // Only update elements that exist
            if (profileName) profileName.textContent = `${result.firstName || ''} ${result.lastName || ''}`;
            if (profileFirstName) profileFirstName.textContent = result.firstName || '-';
            if (profileMiddleInitial) profileMiddleInitial.textContent = result.middleInitial || '-';
            if (profileLastName) profileLastName.textContent = result.lastName || '-';
            if (profileAge) profileAge.textContent = result.age || '-';
        } catch (profileError) {
            // Silently handle cases where profile elements don't exist
            console.debug('Profile elements not found on current page');
        }

        // Store role in localStorage for quick access
        if (result.role) {
            localStorage.setItem('user_role', result.role);
        }
        
        return result;
        
    } catch (error) {
        console.error('Server login failed:', error);
        throw error;
    }
}

// Profile data synchronization
async function syncProfileData(user, userData) {
    try {
        // Get stored profile data
        const storedProfile = localStorage.getItem('userProfile');
        const localData = storedProfile ? JSON.parse(storedProfile) : {};
        
        // Merge data, prioritizing Firestore data over local
        const mergedData = {
            ...localData,
            ...userData,
            email: user.email,
            lastLogin: serverTimestamp(),
            // Preserve existing progress and role
            moduleProgress: userData.moduleProgress || localData.moduleProgress || {},
            role: userData.role || localData.role || 'student'
        };

        // Update Firestore
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, mergedData);

        // Update localStorage
        localStorage.setItem('userProfile', JSON.stringify(mergedData));

        // Update profile display
        const profileName = document.getElementById('profileName');
        if (profileName) {
            profileName.textContent = `${mergedData.firstName || ''} ${mergedData.lastName || ''}`.trim() || user.email;
        }

        // Update form fields if they exist
        const formFields = {
            firstName: document.getElementById('firstName'),
            middleInitial: document.getElementById('middleInitial'),
            lastName: document.getElementById('lastName'),
            age: document.getElementById('age'),
            teacherCode: document.getElementById('teacherCode')
        };

        Object.entries(formFields).forEach(([key, element]) => {
            if (element && mergedData[key]) {
                element.value = mergedData[key];
            }
        });

        // Sync with server session
        await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'same-origin',
            body: JSON.stringify({
                uid: user.uid,
                email: user.email,
                profile: mergedData
            })
        });

        return mergedData;
    } catch (error) {
        console.error('Error syncing profile data:', error);
        throw error;
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.log('User signed out - clearing stored states');
        
        // Clear quiz completion states from localStorage
        const modules = ['1', '2', '3', '5', '6', '7'];
        modules.forEach(mid => {
            localStorage.removeItem(`module_${mid}_pre_quiz`);
            localStorage.removeItem(`module_${mid}_post_quiz`);
        });
        
        // Clear other auth-related data
        localStorage.removeItem('user_progress');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_uid');
        
        return;
    }

    try {
        console.log('User authenticated:', user.email, user.uid);
        
        const idToken = await user.getIdToken();
        const uid = user.uid;
        const email = user.email;

        // Store user info in localStorage for quick access
        localStorage.setItem('user_email', email);
        localStorage.setItem('user_uid', uid);

        // First: Sync quiz states from Firestore to localStorage and server session
        await syncQuizStates(uid);

        // Then: Login to server to establish server-side session
        await loginToServer(uid, email, idToken);

        // Optional: Trigger a full progress sync as backup
        try {
            const syncResponse = await fetch('/api/sync_all_progress', {
                method: 'POST',
                credentials: 'same-origin'
            });
            
            if (syncResponse.ok) {
                console.log('Full progress sync completed successfully');
            } else {
                console.warn('Full progress sync failed:', syncResponse.status);
            }
        } catch (syncError) {
            console.warn('Full progress sync error:', syncError);
        }

        console.log('Auth sync completed successfully for:', email);

    } catch (e) {
        console.error('Auth sync failed:', e);
        
        // Even if sync fails, try to maintain basic functionality
        try {
            localStorage.setItem('user_email', user.email);
            localStorage.setItem('user_uid', user.uid);
        } catch (storageError) {
            console.warn('Failed to store basic user info:', storageError);
        }
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            // Initialize with basic data
            const initialData = {
                email: user.email,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                moduleProgress: {},
                role: 'student'
            };
            await setDoc(userRef, initialData, { merge: true });
        }
        
        // Sync profile data
        const userData = userDoc.exists() ? userDoc.data() : {};
        await syncProfileData(user, userData);

    } catch (error) {
        console.error("Error in auth state change:", error);
    }
});