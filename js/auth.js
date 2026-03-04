import { auth, db } from "./firebase-config.js";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInAnonymously,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

export function setOnAuthStateChangeCallback(callback) {
    // Track auth state explicitly when UI is ready to avoid race conditions
    onAuthStateChanged(auth, async (user) => {
        let profile = null;
        if (user && !user.isAnonymous) {
            // Load profile from Firestore
            profile = await getUserProfile(user.uid);
        }
        callback(user, profile);
    });
}

export async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function register(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function loginAsGuest() {
    try {
        const userCredential = await signInAnonymously(auth);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function logout() {
    await signOut(auth);
}

// Database Operations
export async function saveUserProfile(uid, profileData) {
    try {
        await setDoc(doc(db, "users", uid), profileData, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error saving profile:", error);
        return { success: false, error: error.message };
    }
}

export async function getUserProfile(uid) {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error getting profile:", error);
        return null;
    }
}

export { auth };
