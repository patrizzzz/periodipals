import { db } from './firebase-config.js';
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const FirebaseService = {
    // Quiz operations
    async saveQuizResult(uid, quizData) {
        try {
            const docRef = await addDoc(collection(db, 'quizResults'), {
                uid,
                ...quizData,
                timestamp: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error saving quiz result:', error);
            throw error;
        }
    },

    async getQuizResults(userId) {
        try {
            const querySnapshot = await getDocs(collection(db, 'quizResults'));
            return querySnapshot.docs
                .filter(doc => doc.data().userId === userId)
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
        } catch (error) {
            console.error('Error getting quiz results:', error);
            throw error;
        }
    },

    // Progress tracking
    async saveProgress(userId, moduleId, progress) {
        try {
            const docRef = await addDoc(collection(db, 'userProgress'), {
                userId,
                moduleId,
                progress,
                lastUpdated: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error saving progress:', error);
            throw error;
        }
    },

    async getProgress(userId) {
        try {
            const querySnapshot = await getDocs(collection(db, 'userProgress'));
            return querySnapshot.docs
                .filter(doc => doc.data().userId === userId)
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
        } catch (error) {
            console.error('Error getting progress:', error);
            throw error;
        }
    },

    // User data operations
    async saveUserData(userId, userData) {
        try {
            const docRef = await addDoc(collection(db, 'users'), {
                userId,
                ...userData,
                createdAt: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error saving user data:', error);
            throw error;
        }
    },

    async getUserData(userId) {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            return userDoc.exists() ? userDoc.data() : null;
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    },

    async updateUserData(userId, data) {
        try {
            await updateDoc(doc(db, 'users', userId), data);
            return true;
        } catch (error) {
            console.error('Error updating user data:', error);
            return false;
        }
    },

    async updateUserProgress(userId, progressData) {
        try {
            await db.collection('users').doc(userId).update({
                ...progressData,
                lastUpdated: new Date()
            });
            // Also update localStorage
            Object.keys(progressData).forEach(key => {
                if (typeof progressData[key] === 'object') {
                    localStorage.setItem(key, JSON.stringify(progressData[key]));
                } else {
                    localStorage.setItem(key, progressData[key].toString());
                }
            });
            return true;
        } catch (error) {
            console.error('Error updating user progress:', error);
            return false;
        }
    }
};