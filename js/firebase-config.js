import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// TODO: Reemplaza esto con la configuración de tu proyecto en Firebase -> Project Settings -> General
const firebaseConfig = {
    apiKey: "AIzaSyAg5I_4dLyuL_TqzUZ1T8xAxmfVfkzDyyY",
    authDomain: "hydrofuel-7f870.firebaseapp.com",
    projectId: "hydrofuel-7f870",
    storageBucket: "hydrofuel-7f870.firebasestorage.app",
    messagingSenderId: "822307049574",
    appId: "1:822307049574:web:a42842b41cc972fcdedda7"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
