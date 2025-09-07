// Analytics Service for tracking user interactions
class AnalyticsService {
    static async trackPageView(userId, page) {
        try {
            const db = firebase.firestore();
            await db.collection('pageViews').add({
                userId: userId,
                page: page,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });
        } catch (error) {
            console.error('Error tracking page view:', error);
        }
    }

    static async trackModuleStart(userId, moduleId) {
        try {
            const db = firebase.firestore();
            await db.collection('moduleInteractions').add({
                userId: userId,
                moduleId: moduleId,
                action: 'start',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });

            // Update first module statistics
            await db.collection('moduleStats').doc('firstModuleClicks').set({
                [moduleId]: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });
        } catch (error) {
            console.error('Error tracking module start:', error);
        }
    }

    static async trackUserSession(userId) {
        try {
            const db = firebase.firestore();
            await db.collection('userSessions').add({
                userId: userId,
                startTime: firebase.firestore.FieldValue.serverTimestamp(),
                deviceInfo: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language
                }
            });
        } catch (error) {
            console.error('Error tracking user session:', error);
        }
    }

    static async trackAgeGroup(userId, ageGroup) {
        try {
            const db = firebase.firestore();
            await db.collection('userDemographics').doc(userId).set({
                ageGroup: ageGroup,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error tracking age group:', error);
        }
    }

    static async updateUserStats(userId) {
        try {
            const db = firebase.firestore();
            const userRef = db.collection('userStats').doc(userId);
            
            await userRef.set({
                lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                visitCount: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });
        } catch (error) {
            console.error('Error updating user stats:', error);
        }
    }

    static async trackPreQuizScore(userId, moduleId, score) {
        try {
            const db = firebase.firestore();
            // Save individual pre-quiz score
            const docRef = await db.collection('quizScores').add({
                userId: userId,
                moduleId: moduleId,
                quizType: 'pre',
                score: score,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });
            console.log('Pre-quiz score added to quizScores with ID:', docRef.id);
            // Update total pre-quiz score for user
            const userTotalsRef = db.collection('userQuizTotals').doc(userId);
            await userTotalsRef.set({
                totalPreQuizScore: firebase.firestore.FieldValue.increment(score)
            }, { merge: true });
        } catch (error) {
            console.error('Error tracking pre-quiz score:', error);
        }
    }

    static async trackPostQuizScore(userId, moduleId, score) {
        try {
            const db = firebase.firestore();
            // Save individual post-quiz score
            const docRef = await db.collection('quizScores').add({
                userId: userId,
                moduleId: moduleId,
                quizType: 'post',
                score: score,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });
            console.log('Post-quiz score added to quizScores with ID:', docRef.id);
            // Update total post-quiz score for user
            const userTotalsRef = db.collection('userQuizTotals').doc(userId);
            await userTotalsRef.set({
                totalPostQuizScore: firebase.firestore.FieldValue.increment(score)
            }, { merge: true });
        } catch (error) {
            console.error('Error tracking post-quiz score:', error);
        }
    }
}

// Generate or retrieve user ID
function getUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
    }
    return userId;
}