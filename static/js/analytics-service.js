import { db } from './firebase-config.js';
import { collection, addDoc, updateDoc, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export const AnalyticsService = {
    // Track user profile and preferences
    async saveUserProfile(userId, data) {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                await updateDoc(userRef, {
                    ...data,
                    lastUpdated: new Date()
                });
            } else {
                await addDoc(collection(db, 'users'), {
                    userId,
                    ...data,
                    createdAt: new Date(),
                    lastUpdated: new Date()
                });
            }
        } catch (error) {
            console.error('Error saving user profile:', error);
        }
    },

    // Track quiz attempts and scores
    async saveQuizAttempt(userId, quizData) {
        try {
            await addDoc(collection(db, 'quizAttempts'), {
                userId,
                ...quizData,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error saving quiz attempt:', error);
        }
    },

    // Track topic views and interactions
    async trackTopicView(userId, topicData) {
        try {
            await addDoc(collection(db, 'topicViews'), {
                userId,
                ...topicData,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error tracking topic view:', error);
        }
    },

    // Track learning progress
    async updateLearningProgress(userId, moduleId, progress) {
        try {
            await addDoc(collection(db, 'learningProgress'), {
                userId,
                moduleId,
                ...progress,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error updating learning progress:', error);
        }
    },

    // Track user session data
    async trackSessionActivity(userId, sessionData) {
        try {
            await addDoc(collection(db, 'userSessions'), {
                userId,
                ...sessionData,
                startTime: new Date(),
                browser: navigator.userAgent,
                platform: navigator.platform
            });
        } catch (error) {
            console.error('Error tracking session:', error);
        }
    }
};