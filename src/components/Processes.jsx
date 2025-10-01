import React, { useEffect, useState } from "react";
import { useParams, Link,useNavigate } from "react-router-dom";
import axios from "axios";
import "./Processes.css";

const API_URL = import.meta.env.VITE_API_URL || "";
function Processes({ user, onLogout }) {
  const navigate=useNavigate()
  const { projectId } = useParams();
  const [processes, setProcesses] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/projects/${projectId}/processes`).then((res) => {
      setProcesses(res.data);
    });
  }, [projectId]);

  const handleCreate = async () => {
    const name = prompt("Nombre del proceso:");
    if (!name) return;
    const res = await axios.post(`${API_URL}/projects/${projectId}/processes`, {
      name,
    });
    setProcesses([...processes, res.data]);
  };

  const handleDelete = async (processId) => {
    if (!window.confirm("¿Seguro que deseas eliminar este proceso?")) return;
    await axios.delete(`${API_URL}/projects/${projectId}/processes/${processId}`);
    setProcesses((prev) => prev.filter((p) => p.id !== processId));
  };

  // ---------- Nuevo: duplicar proceso ----------
  const handleDuplicate = async (origProcess) => {
    const suggested = `${origProcess.name} copia`;
    const newName = prompt("Nombre del nuevo proceso duplicado:", suggested);
    if (!newName) return;

    try {
      const res = await axios.post(
        `${API_URL}/projects/${projectId}/processes/${origProcess.id}/duplicate`,
        { name: newName }
      );

      // res.data.process contiene el nuevo proceso (según backend)
      const newProcess = res.data.process;
      // si el endpoint devuelve componentes/conexiones y quieres mostrarlos de inmediato,
      // podrías guardarlos en algún estado. Aquí solo agregamos el proceso a la lista.
      setProcesses((prev) => [...prev, newProcess]);
      alert("Proceso duplicado correctamente.");
    } catch (err) {
      console.error("Error duplicando proceso:", err);
      alert("No se pudo duplicar el proceso.");
    }
  };
  // ------------------------------------------------


  return (
    <div className="processes-container">
      <h2>Procesos del Proyecto</h2>
      <button className="btn-create-process" onClick={handleCreate}>
        + Crear Proceso
      </button>

      <ul className="process-list">
        {processes.map((p) => (
          <li key={p.id} className="process-card">
            <div className="process-name">
              <Link to={`/projects/${projectId}/processes/${p.id}`}>{p.name}</Link>
            </div>

            <div className="process-actions">
              <button className="btn-secondary" onClick={() => handleDuplicate(p)}>
                Duplicar
              </button>

              <button className="btn-danger" onClick={() => handleDelete(p.id)}>
                Eliminar
              </button>

              <button
                className="btn-simulations"
                onClick={() =>
                  navigate(`/projects/${projectId}/processes/${p.id}/simulations`)
                }
              >
                Ver Simulaciones
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button className="btn-logout" onClick={onLogout}>
          Cerrar sesión
      </button>
    </div>
  );
}

export default Processes;

