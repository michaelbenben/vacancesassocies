import { initializeApp } from 'firebase/app';
import {
    initializeFirestore,
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    CACHE_SIZE_UNLIMITED,
    persistentLocalCache,
    persistentMultipleTabManager
} from 'firebase/firestore';
// Initialize Firebase
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings optimized for web
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

console.log('🔥 Firebase initialized with project:', firebaseConfig.projectId);

// Document reference for vacation data
const DATA_DOC = 'vacation-data';
const COLLECTION = 'app-data';

/**
 * Get the initial data from Firestore
 */
export async function getVacationData() {
    console.log('📡 Connecting to Firestore...');
    console.log('📍 Project:', firebaseConfig.projectId);

    try {
        const docRef = doc(db, COLLECTION, DATA_DOC);
        console.log('📄 Fetching document:', COLLECTION, '/', DATA_DOC);

        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log('✅ Data loaded from Firestore');
            return docSnap.data();
        }

        console.log('📭 No data in Firestore, will initialize');
        return null;
    } catch (error) {
        console.error('❌ Firestore error:', error.code, error.message);
        throw error;
    }
}

/**
 * Save data to Firestore
 */
export async function saveVacationData(data) {
    console.log('💾 Saving to Firestore...');
    try {
        const docRef = doc(db, COLLECTION, DATA_DOC);
        await setDoc(docRef, data);
        console.log('✅ Data saved to Firestore');
    } catch (error) {
        console.error('❌ Error saving to Firestore:', error.code, error.message);
        throw error;
    }
}

/**
 * Subscribe to real-time updates
 */
export function subscribeToVacationData(callback) {
    const docRef = doc(db, COLLECTION, DATA_DOC);
    return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data(), snapshot.metadata.hasPendingWrites);
        }
    }, (error) => {
        console.error('❌ Snapshot error:', error.code, error.message);
    });
}

export { db };
