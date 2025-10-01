import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/login.jsx";
import Projects from "./components/Projects.jsx";
import Processes from "./components/Processes.jsx";
import Playground from "./Playground.jsx";
import SimulationPage from "./components/SimulationPage.jsx"
import SimulationIndex from "./components/SimulationIndex.jsx";
import GuestProcessAndSimulations from "./components/GuestPlaygroundAndSimulations.jsx";
function App() {
  const [user, setUser] = useState(() => {
  const storedUser = localStorage.getItem("user");
  return storedUser ? JSON.parse(storedUser) : null;
  
});
const handleLogout = () => {
  localStorage.removeItem("user");
  setUser(null);
};

  return (
    <Router>
      <Routes>
        {/* Login (página por defecto) */}
        <Route
          path="/"
          element={
            user ? <Navigate to="/projects" /> : <Login onLogin={setUser} />
          }
        />

        {/* Rutas protegidas */}
        <Route
          path="/projects"
          element={user ? <Projects user={user} onLogout={handleLogout}/> : <Navigate to="/" />}
        />
        <Route
          path="/projects/:projectId"
          element={user ? <Processes user={user} onLogout={handleLogout}/> : <Navigate to="/" />}
        />
        <Route
          path="/projects/:projectId/processes/:pid"
          element={user ? <Playground user={user} /> : <Navigate to="/" />}
        
        />
        <Route
          path="/projects/:projectId/processes/:pid/simulations/:SimId"
          element={true ? <SimulationPage  /> : <Navigate to="/" />}
        
        />
        <Route
          path="/projects/:projectId/processes/:pid/simulations"
          element={user ? <SimulationIndex  /> : <Navigate to="/" />}
        
        />
        <Route path="/guest/projects/:projectId/processes/:pid/simulations/:SimId" element={<GuestProcessAndSimulations />} />
        
        
      </Routes>
        {/* <button onClick={handleLogout}>Cerrar sesión</button> */}
      </Router>
  );
}

export default App;