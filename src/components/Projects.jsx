import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import CreateElementModal from "../forms/CreateElementModal.jsx";

function Projects({ user }) {
  const [projects, setProjects] = useState([]);
  const [modalInfo, setModalInfo] = useState({ show: false, project: null, element: null });
  const API_URL = import.meta.env.VITE_API_URL || "";

  // Trae proyectos y sus elementos
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const projsRes = await axios.get(`${API_URL}/projects/${user.id}`);
        const projs = projsRes.data || [];

        const projsWithEmpty = projs.map((p) => ({ ...p, elements: [] }));
        if (!mounted) return;
        setProjects(projsWithEmpty);

        const elementsPromises = projs.map((p) =>
          axios
            .get(`${API_URL}/processes/${p.id}/elements`)
            .then((r) => r.data)
            .catch(() => [])
        );

        const elementsArrays = await Promise.all(elementsPromises);

        if (!mounted) return;
        const merged = projs.map((p, i) => ({ ...p, elements: elementsArrays[i] || [] }));
        setProjects(merged);
      } catch (err) {
        console.error("Error cargando proyectos y elementos:", err);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [user.id]);

  const handleCreateProject = async () => {
    const name = prompt("Nombre del nuevo proyecto:");
    if (!name) return;
    try {
      const res = await axios.post(`${API_URL}/projects`, {
        user_id: user.id,
        name,
        description: "Nuevo proyecto",
      });
      setProjects((prev) => [...prev, { ...res.data, elements: [] }]);
    } catch (err) {
      console.error("Error creando proyecto:", err);
      alert("No se pudo crear el proyecto.");
    }
  };

  const refreshProjectElements = async (projectId) => {
    try {
      const res = await axios.get(`${API_URL}/processes/${projectId}/elements`);
      const els = res.data || [];
      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, elements: els } : p)));
    } catch (err) {
      console.error("Error refrescando elementos del proyecto", projectId, err);
    }
  };

  const handleSaveElement = (el) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === modalInfo.project.id
          ? {
              ...p,
              elements: p.elements
                ? [...p.elements.filter((e) => e.id !== el.id), el]
                : [el],
            }
          : p
      )
    );
    setModalInfo({ show: false, project: null, element: null });
  };

  const handleDeleteElement = async (projectId, elId) => {
    try {
      await axios.delete(`${API_URL}/elements/${elId}`);
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, elements: p.elements.filter((e) => e.id !== elId) } : p
        )
      );
    } catch (err) {
      console.error("Error eliminando elemento:", err);
      alert("No se pudo eliminar el elemento.");
    }
  };

  // ------------------ NUEVA FUNCIÓN: borrar proyecto con confirmación ------------------
  const handleDeleteProject = async (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const ok = window.confirm(
      `¿Seguro quieres eliminar el proyecto "${project.name}"?\n\nEsta acción eliminará el proyecto y (dependiendo del backend) sus elementos/procesos relacionados.`
    );
    if (!ok) return;

    try {
      await axios.delete(`${API_URL}/projects/${projectId}`); // ajusta ruta si tu API es diferente
      setProjects((prev) => prev.filter((p) => p.id !== projectId));

      // si el modal estaba abierto para este proyecto, lo cerramos
      if (modalInfo.project && modalInfo.project.id === projectId) {
        setModalInfo({ show: false, project: null, element: null });
      }
    } catch (err) {
      console.error("Error borrando proyecto:", err);
      alert("No se pudo borrar el proyecto. Revisa la consola para más detalles.");
    }
  };
  // -------------------------------------------------------------------------------------

  return (
    <div className="container mt-5">
      <h2>Mis Proyectos</h2>
      <button className="btn btn-success mb-3" onClick={handleCreateProject}>
        + Crear Proyecto
      </button>

      <ul className="list-group">
        {projects.map((p) => (
          <li key={p.id} className="list-group-item">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <Link to={`/projects/${p.id}`}>{p.name}</Link>
                <br />
                <small className="text-muted">{p.description}</small>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setModalInfo({ show: true, project: p, element: null })}
                >
                  + Elemento
                </button>

                {/* BOTÓN BORRAR PROYECTO */}
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeleteProject(p.id)}
                  title="Eliminar proyecto"
                >
                  🗑 Borrar
                </button>
              </div>
            </div>

            {p.elements && p.elements.length > 0 ? (
              <ul style={{ marginTop: "10px" }}>
                {p.elements.map((el) => (
                  <li
                    key={el.id}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div>
                      <strong>{el.type}</strong>
                      {el.params && Object.keys(el.params).length > 0 && (
                        <div style={{ fontSize: "0.9em", marginTop: "4px" }}>
                          {Object.entries(el.params).map(([k, v]) => (
                            <span key={k} style={{ marginRight: 8 }}>
                              {k}: {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <button
                        className="btn btn-sm btn-secondary me-2"
                        onClick={() => setModalInfo({ show: true, project: p, element: el })}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteElement(p.id, el.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <small style={{ display: "block", marginTop: 8 }}>Sin elementos</small>
            )}
          </li>
        ))}
      </ul>

      {modalInfo.show && modalInfo.project && (
        <CreateElementModal
          project_id={modalInfo.project.id}
          initialElement={modalInfo.element}
          onClose={() => setModalInfo({ show: false, project: null, element: null })}
          onSave={handleSaveElement}
        />
      )}
    </div>
  );
}

export default Projects;
