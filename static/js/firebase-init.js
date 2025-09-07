// Import Firebase dependencies
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB7j5oSrNFAHHIfLQZvEh-VRg_OVqQ4EQ4",
  authDomain: "menstrual-hygiene-manage-6b0ed.firebaseapp.com",
  projectId: "menstrual-hygiene-manage-6b0ed",
  storageBucket: "menstrual-hygiene-manage-6b0ed.appspot.com",
  messagingSenderId: "1002865022115",
  appId: "1:1002865022115:web:ab79150f8a8d82e9171b16",
  measurementId: "G-SSCG3ZV148"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { db, analytics };