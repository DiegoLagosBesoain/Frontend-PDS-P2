import React from "react";
import { auth, provider, signInWithPopup } from "../firebase";
import axios from "axios";
const API_URL = import.meta.env.API_URL;
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
    <div className="container mt-5">
      <h2>Iniciar sesión</h2>
      <button className="btn btn-danger" onClick={handleGoogleLogin}>
        Iniciar sesión con Google
      </button>
    </div>
  );
}

export default Login;