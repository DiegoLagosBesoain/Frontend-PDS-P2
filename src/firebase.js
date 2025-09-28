// Importa los SDKs de Firebase
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Configuración de Firebase (la sacas de la consola de Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyAqksTuzKW-dxybBWKHZmuwr-F1EXCF404",
  authDomain: "pds-2-7a921.firebaseapp.com",
  projectId: "pds-2-7a921",
  storageBucket: "pds-2-7a921.firebasestorage.app",
  messagingSenderId: "788203661124",
  appId: "1:788203661124:web:1e69485264be59721e9911",
  measurementId: "G-GZVLRH7S1M"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup, signOut };