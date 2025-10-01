import React from "react";
import { auth, provider, signInWithPopup } from "../firebase";
import axios from "axios";
import "./Login.css";
const API_URL = import.meta.env.VITE_API_URL || "";
function Login({ onLogin }) {
  const handleGoogleLogin = async () => {
  try {
    // Login con Google
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Mandar usuario al backend para registrar en Postgres
    const res = await axios.post(`${API_URL}/users`, {
      email: user.email,
      username: user.displayName,
      uid: user.uid, // 🔹 UID único de Firebase
    });

    const backendUser = res.data.user;

    // Guardar en localStorage
    localStorage.setItem("user", JSON.stringify(backendUser));

    // Actualizar estado global
    onLogin(backendUser);

  } catch (error) {
    console.error("Error en login con Google", error);
  }
};

  return (
    <div className="login-container">
      <h2 className="login-title">Iniciar sesión</h2>
      <button className="google-btn" onClick={handleGoogleLogin}>
        Iniciar sesión con Google
      </button>
    </div>
  );
}

export default Login;