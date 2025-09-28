import React, { useEffect, useState } from "react";
import { useParams, Link,useNavigate } from "react-router-dom";
import axios from "axios";
const API_URL = import.meta.env.API_URL;
function Processes({ user }) {
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
    <div className="container mt-5">
      <h2>Procesos del Proyecto</h2>
      <button className="btn btn-primary mb-3" onClick={handleCreate}>
        + Crear Proceso
      </button>
      <ul className="list-group">
        {processes.map((p) => (
          <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <Link to={`/projects/${projectId}/processes/${p.id}`}>{p.name}</Link>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-sm btn-secondary" onClick={() => handleDuplicate(p)}>
                Duplicar
              </button>

              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleDelete(p.id)}
              >
                Eliminar
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => navigate(`/projects/${projectId}/processes/${p.id}/simulations`)}
              >
                ver Simulaciones
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Processes;
