import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./SimulationIndex.css"; // 👈 importa tu css

const API_URL = import.meta.env.VITE_API_URL || "";

export default function SimulationIndex() {
  const { projectId, pid } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sims, setSims] = useState([]);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${API_URL}/processes/${pid}/simulations`);
        if (!mounted) return;
        setSims(res.data || []);
      } catch (err) {
        console.error("Error cargando simulaciones:", err);
        setError(err.response?.data?.error || err.message || "Error desconocido");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [pid]);

  const handleDelete = async (simId) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta simulación?")) return;
    try {
      setDeletingId(simId);
      await axios.delete(`${API_URL}/simulations/${simId}`);
      setSims((prev) => prev.filter((s) => s.id !== simId));
    } catch (err) {
      console.error("Error eliminando simulación:", err);
      alert("No se pudo eliminar la simulación.");
    } finally {
      setDeletingId(null);
    }
  };

  const fmtDate = (ts) => {
    if (!ts) return "-";
    const d = new Date(ts);
    return d.toLocaleString();
  };

  if (loading) return <div className="simulation-container">Cargando simulaciones…</div>;
  if (error) return <div className="simulation-container" style={{ color: "red" }}>Error: {String(error)}</div>;

  return (
    <div className="simulation-container">
      <div className="simulation-header">
        <h3>Simulaciones del proceso {pid}</h3>
        <div className="simulation-actions">
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            ← Volver
          </button>
          <Link to={`/projects/${projectId}/processes/${pid}`} className="btn btn-primary">
            Ir al proceso
          </Link>
        </div>
      </div>

      {sims.length === 0 ? (
        <div className="simulation-empty">No hay simulaciones para este proceso.</div>
      ) : (
        <div className="simulation-table-wrapper">
          <table className="simulation-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Duración (s)</th>
                <th>Nodos</th>
                <th>Edges</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sims.map((s) => {
                const duration = s.duration ?? (s.stats?.durationProvided ?? "-");
                const nodesCount = s.stats?.nodesCount ?? "-";
                const edgesCount = s.stats?.edgesCount ?? "-";

                return (
                  <tr key={s.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(s.timestamp)}</td>
                    <td>{duration}</td>
                    <td>{nodesCount}</td>
                    <td>{edgesCount}</td>
                    <td>
                      <Link
                        to={`/projects/${projectId}/processes/${pid}/simulations/${s.id}`}
                        className="btn btn-sm btn-outline-primary me-2"
                      >
                        Ver
                      </Link>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                      >
                        {deletingId === s.id ? "Eliminando…" : "Eliminar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
