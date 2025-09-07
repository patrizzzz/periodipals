import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Check if we're online
const isOnline = () => navigator.onLine;

class DatabaseService {
    static _offlineData = [];
    
    // Initialize offline storage and sync listeners
    static init() {
        // Listen for online/offline events
        window.addEventListener('online', this._syncOfflineData.bind(this));
        window.addEventListener('offline', () => console.log('App is offline'));
        
        // Start real-time sync with Firebase
        this._startRealtimeSync();
    }
    // Private method to handle offline data storage
    static _storeOfflineData(data, type) {
        this._offlineData.push({ data, type, timestamp: new Date() });
        // Store in localStorage as backup
        localStorage.setItem('offlineData', JSON.stringify(this._offlineData));
    }

    // Private method to sync offline data when back online
    static async _syncOfflineData() {
        console.log('Back online, syncing data...');
        const offlineData = [...this._offlineData];
        this._offlineData = [];
        localStorage.removeItem('offlineData');

        for (const item of offlineData) {
            try {
                if (item.type === 'quiz') {
                    await this.saveQuizData(item.data);
                } else if (item.type === 'progress') {
                    await this.saveProgress(item.data);
                }
            } catch (error) {
                console.error('Error syncing offline data:', error);
                // Re-add failed items back to offline storage
                this._storeOfflineData(item.data, item.type);
            }
        }
    }

    // Start real-time sync with Firebase
    static _startRealtimeSync() {
        // Listen for quiz changes
        onSnapshot(collection(db, 'quizzes'), (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added' || change.type === 'modified') {
                    // Update local SQLite through API
                    await fetch('/api/sync_quiz', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            firebaseId: change.doc.id,
                            ...change.doc.data()
                        })
                    });
                }
            });
        });

        // Listen for progress changes
        onSnapshot(collection(db, 'progress'), (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added' || change.type === 'modified') {
                    // Update local SQLite through API
                    await fetch('/api/sync_progress', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            firebaseId: change.doc.id,
                            ...change.doc.data()
                        })
                    });
                }
            });
        });
    }

    // Quiz data operations
    static async saveQuizData(data) {
        if (!isOnline()) {
            this._storeOfflineData(data, 'quiz');
            return 'offline';
        }
        try {
            // Save to Firebase
            const quizRef = await addDoc(collection(db, 'quizzes'), {
                ...data,
                timestamp: new Date(),
                synced: true
            });
            
            // Save to local SQLite through Flask endpoint
            await fetch('/api/save_quiz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...data,
                    firebaseId: quizRef.id
                })
            });

            return quizRef.id;
        } catch (error) {
            console.error('Error saving quiz data:', error);
            throw error;
        }
    }

    // Progress tracking
    static async saveProgress(data) {
        if (!isOnline()) {
            this._storeOfflineData(data, 'progress');
            return 'offline';
        }
        try {
            // Save to Firebase
            const progressRef = await addDoc(collection(db, 'progress'), {
                ...data,
                timestamp: new Date(),
                synced: true
            });

            // Save to local SQLite
            await fetch('/api/save_progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...data,
                    firebaseId: progressRef.id
                })
            });

            return progressRef.id;
        } catch (error) {
            console.error('Error saving progress:', error);
            throw error;
        }
    }

    // Sync data from SQLite to Firebase
    static async syncLocalData() {
        try {
            const response = await fetch('/api/get_unsynced_data');
            const unsyncedData = await response.json();

            for (const item of unsyncedData) {
                if (item.type === 'quiz') {
                    await addDoc(collection(db, 'quizzes'), {
                        ...item.data,
                        synced: true,
                        timestamp: new Date()
                    });
                } else if (item.type === 'progress') {
                    await addDoc(collection(db, 'progress'), {
                        ...item.data,
                        synced: true,
                        timestamp: new Date()
                    });
                }
            }

            // Mark data as synced in SQLite
            await fetch('/api/mark_synced', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: unsyncedData.map(item => item.id) })
            });
        } catch (error) {
            console.error('Error syncing data:', error);
            throw error;
        }
    }
}

export default DatabaseService;