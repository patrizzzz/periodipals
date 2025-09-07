import { db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export const QuizService = {
    async getQuizByLessonId(lessonId) {
        try {
            const quizQuery = query(
                collection(db, 'quizzes'),
                where('lesson_id', '==', lessonId)
            );
            
            const querySnapshot = await getDocs(quizQuery);
            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data();
            } else {
                console.error('No quiz found with lesson_id:', lessonId);
                return null;
            }
        } catch (error) {
            console.error('Error fetching quiz:', error);
            throw error;
        }
    },

    async getQuizByTypeAndTitle(type, title) {
        try {
            const quizQuery = query(
                collection(db, 'quizzes'),
                where('type', '==', type),
                where('title', '==', title)
            );
            
            const querySnapshot = await getDocs(quizQuery);
            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data();
            }
            return null;
        } catch (error) {
            console.error('Error fetching quiz:', error);
            throw error;
        }
    }
};