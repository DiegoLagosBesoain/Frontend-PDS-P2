// ...existing code...
import React, { useState, useEffect } from "react";

const SENSOR_TYPES = [
  { value: "contador", label: "Contador" },
  { value: "flujo", label: "Medidor de flujo" },
  { value: "porcentaje_tiempo_encendido", label: "Porcentaje de tiempo encendido" },
  { value: "porcentaje_tiempo_funcionamiento", label: "Porcentaje de tiempo de funcionamiento" },
];

export default function TransporterForm({ node, setEditingNode, elements }) {
  // Estado local para sensores y fallas
  const [paramsState, setParamsState] = useState({
    sensors: node.data.params?.sensors || [],
    failures: node.data.params?.failures || [],
  });

  // 🔹 sincroniza siempre con node.data.params
  useEffect(() => {
    setEditingNode((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        params: paramsState,
      },
    }));
  }, [paramsState]);

  // 🔹 Manejo de sensores
  const handleAddSensor = () => {
    setParamsState((prev) => ({
      ...prev,
      sensors: [...prev.sensors, { type: "", id_entradas: ["in-0"], id_salidas: ["out-0"] }],
    }));
  };

  const handleSensorChange = (index, field, value) => {
    const updated = [...paramsState.sensors];
    updated[index][field] = value;

    // Si es contador o flujo, siempre inicializamos in-0 y out-0
    if (field === "type" && (value === "contador" || value === "flujo")) {
      updated[index].id_entradas = ["in-0"];
      updated[index].id_salidas = ["out-0"];
    }

    setParamsState((prev) => ({ ...prev, sensors: updated }));
  };

  const handleToggleIO = (index, ioType, id) => {
    const updated = [...paramsState.sensors];
    const arr = updated[index][ioType] || [];
    updated[index][ioType] = arr.includes(id) ? arr.filter((v) => v !== id) : [...arr, id];
    setParamsState((prev) => ({ ...prev, sensors: updated }));
  };

  // 🔹 Manejo de fallas
  const handleAddFailure = () => {
    setParamsState((prev) => ({
      ...prev,
      failures: [...prev.failures, { dist_activacion: "", dist_duracion: "" }],
    }));
  };

  const handleFailureChange = (index, field, value) => {
    const updated = [...paramsState.failures];
    updated[index][field] = value;
    setParamsState((prev) => ({ ...prev, failures: updated }));
  };

  // 🔹 Actualizar campos generales
  const updateField = (field, value) => {
    setEditingNode((prev) => ({
      ...prev,
      data: { ...prev.data, [field]: value },
    }));
  };

  return (
    <>
      {/* --- AÑADIDO: campo para editar el label / nombre --- */}
      <label>
        Nombre:
        <input
          value={node.data.label ?? ""}
          onChange={(e) => updateField("label", e.target.value)}
          style={{ marginLeft: 8 }}
        />
      </label>
      <br />

      <label>
        Tipo:
        <select
          value={node.data.tipo ?? ""}
          onChange={(e) => updateField("tipo", e.target.value)}
        >
          <option value="">-- Selecciona un tipo --</option>
          <option value="continuo">Continuo</option>
          <option value="movil">Móvil</option>
        </select>
      </label>

      <label>
        Elemento:
        <select
          value={node.data.elemento ?? ""}
          onChange={(e) => updateField("elemento", e.target.value)}
        >
          <option value="">-- Selecciona un elemento --</option>
          {elements.map((el) => (
            <option key={el.id} value={el.type}>
              {el.type}
            </option>
          ))}
        </select>
      </label>
      <br />

      <label>
        Distribución:
        <select
          value={node.data.distribucion?.tipo ?? ""}
          onChange={(e) =>
            updateField("distribucion", { tipo: e.target.value, params: {} })
          }
        >
          <option value="">-- Selecciona --</option>
          <option value="Exponencial">Exponencial</option>
          <option value="Normal">Normal</option>
          <option value="Uniforme">Uniforme</option>
          <option value="Fija">Fija</option>
        </select>
      </label>
      <br />

      {/* Parámetros según la distribución */}
      {node.data.distribucion?.tipo === "Exponencial" && (
        <label>
          λ (Lambda):
          <input
            type="number"
            value={node.data.distribucion.params?.lambda ?? ""}
            onChange={(e) =>
              updateField("distribucion", {
                ...node.data.distribucion,
                params: {
                  ...node.data.distribucion.params,
                  lambda: e.target.value === "" ? "" : parseFloat(e.target.value),
                },
              })
            }
          />
        </label>
      )}

      {node.data.distribucion?.tipo === "Normal" && (
        <>
          <label>
            μ (Mu):
            <input
              type="number"
              value={node.data.distribucion.params?.mu ?? ""}
              onChange={(e) =>
                updateField("distribucion", {
                  ...node.data.distribucion,
                  params: {
                    ...node.data.distribucion.params,
                    mu: e.target.value === "" ? "" : parseFloat(e.target.value),
                  },
                })
              }
            />
          </label>
          <label>
            σ (Sigma):
            <input
              type="number"
              value={node.data.distribucion.params?.sigma ?? ""}
              onChange={(e) =>
                updateField("distribucion", {
                  ...node.data.distribucion,
                  params: {
                    ...node.data.distribucion.params,
                    sigma: e.target.value === "" ? "" : parseFloat(e.target.value),
                  },
                })
              }
            />
          </label>
        </>
      )}

      {node.data.distribucion?.tipo === "Uniforme" && (
        <>
          <label>
            a:
            <input
              type="number"
              value={node.data.distribucion.params?.a ?? ""}
              onChange={(e) =>
                updateField("distribucion", {
                  ...node.data.distribucion,
                  params: {
                    ...node.data.distribucion.params,
                    a: e.target.value === "" ? "" : parseFloat(e.target.value),
                  },
                })
              }
            />
          </label>
          <label>
            b:
            <input
              type="number"
              value={node.data.distribucion.params?.b ?? ""}
              onChange={(e) =>
                updateField("distribucion", {
                  ...node.data.distribucion,
                  params: {
                    ...node.data.distribucion.params,
                    b: e.target.value === "" ? "" : parseFloat(e.target.value),
                  },
                })
              }
            />
          </label>
        </>
      )}

      {node.data.distribucion?.tipo === "Fija" && (
        <label>
          Valor fijo:
          <input
            type="number"
            value={node.data.distribucion.params?.valor ?? ""}
            onChange={(e) =>
              updateField("distribucion", {
                ...node.data.distribucion,
                params: {
                  ...node.data.distribucion.params,
                  valor: e.target.value === "" ? "" : parseFloat(e.target.value),
                },
              })
            }
          />
        </label>
      )}

      <br />

      {node.data.tipo === "continuo" && (
        <label>
          Tiempo mínimo entre entradas:
          <input
            type="number"
            value={node.data.t_min_entrada ?? ""}
            onChange={(e) => updateField("t_min_entrada", e.target.value === "" ? "" : parseFloat(e.target.value))}
          />
        </label>
      )}
      <br />

      {node.data.tipo === "movil" && (
        <>
          <label>
            Capacidad:
            <input
              type="number"
              value={node.data.capacidad ?? ""}
              onChange={(e) => updateField("capacidad", e.target.value === "" ? "" : parseInt(e.target.value, 10))}
            />
          </label>
          <br />
          <label>
            Tiempo de espera máximo:
            <input
              type="number"
              value={node.data.t_espera_max ?? ""}
              onChange={(e) => updateField("t_espera_max", e.target.value === "" ? "" : parseFloat(e.target.value))}
            />
          </label>
        </>
      )}

      <hr />
      <h4>Sensores</h4>
      {paramsState.sensors.map((s, idx) => (
        <div key={idx} style={{ border: "1px solid #ccc", padding: 5, marginBottom: 5 }}>
          <label>
            Tipo:
            <select
              value={s.type ?? ""}
              onChange={(e) => handleSensorChange(idx, "type", e.target.value)}
            >
              <option value="">-- Selecciona un sensor --</option>
              {SENSOR_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {/* Intervalo de muestreo */}
          <label style={{ marginLeft: "10px" }}>
            Intervalo:
            <input
              type="number"
              min="0"
              value={s.intervalo ?? ""}
              onChange={(e) => {
                const str = e.target.value;
                const parsed = str === "" ? "" : parseFloat(str);
                const val = parsed === "" ? "" : (parsed < 0 ? 0 : parsed);
                handleSensorChange(idx, "intervalo", val);
              }}
              style={{ marginLeft: "5px", width: "80px" }}
            />
          </label>

          {(s.type === "contador" || s.type === "flujo") && (
            <>
              <div>
                <strong>Entradas:</strong>
                <label style={{ marginLeft: 5 }}>
                  <input
                    type="checkbox"
                    checked={s.id_entradas?.includes("in-0")}
                    onChange={() => handleToggleIO(idx, "id_entradas", "in-0")}
                  />
                  in-0
                </label>
              </div>

              <div>
                <strong>Salidas:</strong>
                <label style={{ marginLeft: 5 }}>
                  <input
                    type="checkbox"
                    checked={s.id_salidas?.includes("out-0")}
                    onChange={() => handleToggleIO(idx, "id_salidas", "out-0")}
                  />
                  out-0
                </label>
              </div>
            </>
          )}
        </div>
      ))}
      <button type="button" onClick={handleAddSensor}>
        ➕ Agregar sensor
      </button>

      <hr />
      <h4>Fallas</h4>
      {paramsState.failures.map((f, idx) => (
        <div key={idx} style={{ border: "1px solid #ccc", padding: 5, marginBottom: 5 }}>
          
          {/* Distribución activación */}
          <label>
            Dist Activación:
            <select
              value={f.dist_activacion?.tipo ?? ""}
              onChange={(e) =>
                handleFailureChange(idx, "dist_activacion", { tipo: e.target.value, params: {} })
              }
            >
              <option value="">-- Selecciona --</option>
              <option value="Exponencial">Exponencial</option>
              <option value="Normal">Normal</option>
              <option value="Uniforme">Uniforme</option>
              <option value="Fija">Fija</option>
            </select>
          </label>

          {/* Parámetros activación */}
          {f.dist_activacion?.tipo === "Exponencial" && (
            <label>
              λ:
              <input
                type="number"
                value={f.dist_activacion.params?.lambda ?? ""}
                onChange={(e) =>
                  handleFailureChange(idx, "dist_activacion", {
                    ...f.dist_activacion,
                    params: { ...f.dist_activacion.params, lambda: e.target.value === "" ? "" : parseFloat(e.target.value) },
                  })
                }
              />
            </label>
          )}
          {f.dist_activacion?.tipo === "Normal" && (
            <>
              <label>
                μ:
                <input
                  type="number"
                  value={f.dist_activacion.params?.mu ?? ""}
                  onChange={(e) =>
                    handleFailureChange(idx, "dist_activacion", {
                      ...f.dist_activacion,
                      params: { ...f.dist_activacion.params, mu: e.target.value === "" ? "" : parseFloat(e.target.value) },
                    })
                  }
                />
              </label>
              <label>
                σ:
                <input
                  type="number"
                  value={f.dist_activacion.params?.sigma ?? ""}
                  onChange={(e) =>
                    handleFailureChange(idx, "dist_activacion", {
                      ...f.dist_activacion,
                      params: { ...f.dist_activacion.params, sigma: e.target.value === "" ? "" : parseFloat(e.target.value) },
                    })
                  }
                />
              </label>
            </>
          )}
          {f.dist_activacion?.tipo === "Uniforme" && (
            <>
              <label>
                a:
                <input
                  type="number"
                  value={f.dist_activacion.params?.a ?? ""}
                  onChange={(e) =>
                    handleFailureChange(idx, "dist_activacion", {
                      ...f.dist_activacion,
                      params: { ...f.dist_activacion.params, a: e.target.value === "" ? "" : parseFloat(e.target.value) },
                    })
                  }
                />
              </label>
              <label>
                b:
                <input
                  type="number"
                  value={f.dist_activacion.params?.b ?? ""}
                  onChange={(e) =>
                    handleFailureChange(idx, "dist_activacion", {
                      ...f.dist_activacion,
                      params: { ...f.dist_activacion.params, b: e.target.value === "" ? "" : parseFloat(e.target.value) },
                    })
                  }
                />
              </label>
            </>
          )}

          {/* Distribución duración */}
          <label>
            Dist Duración:
            <select
              value={f.dist_duracion?.tipo ?? ""}
              onChange={(e) =>
                handleFailureChange(idx, "dist_duracion", { tipo: e.target.value, params: {} })
              }
            >
              <option value="">-- Selecciona --</option>
              <option value="Exponencial">Exponencial</option>
              <option value="Normal">Normal</option>
              <option value="Uniforme">Uniforme</option>
              <option value="Fija">Fija</option>
            </select>
          </label>

          {/* Parámetros duración */}
          {f.dist_duracion?.tipo === "Exponencial" && (
            <label>
              λ:
              <input
                type="number"
                value={f.dist_duracion.params?.lambda ?? ""}
                onChange={(e) =>
                  handleFailureChange(idx, "dist_duracion", {
                    ...f.dist_duracion,
                    params: { ...f.dist_duracion.params, lambda: e.target.value === "" ? "" : parseFloat(e.target.value) },
                  })
                }
              />
            </label>
          )}
          {f.dist_duracion?.tipo === "Normal" && (
            <>
              <label>
                μ:
                <input
                  type="number"
                  value={f.dist_duracion.params?.mu ?? ""}
                  onChange={(e) =>
                    handleFailureChange(idx, "dist_duracion", {
                      ...f.dist_duracion,
                      params: { ...f.dist_duracion.params, mu: e.target.value === "" ? "" : parseFloat(e.target.value) },
                    })
                  }
                />
              </label>
              <label>
                σ:
                <input
                  type="number"
                  value={f.dist_duracion.params?.sigma ?? ""}
                  onChange={(e) =>
                    handleFailureChange(idx, "dist_duracion", {
                      ...f.dist_duracion,
                      params: { ...f.dist_duracion.params, sigma: e.target.value === "" ? "" : parseFloat(e.target.value) },
                    })
                  }
                />
              </label>
            </>
          )}

          {f.dist_duracion?.tipo === "Uniforme" && (
            <>
              <label>
                a:
                <input
                  type="number"
                  value={f.dist_duracion.params?.a ?? ""}
                  onChange={(e) =>
                    handleFailureChange(idx, "dist_duracion", {
                      ...f.dist_duracion,
                      params: { ...f.dist_duracion.params, a: e.target.value === "" ? "" : parseFloat(e.target.value) },
                    })
                  }
                />
              </label>
              <label>
                b:
                <input
                  type="number"
                  value={f.dist_duracion.params?.b ?? ""}
                  onChange={(e) =>
                    handleFailureChange(idx, "dist_duracion", {
                      ...f.dist_duracion,
                      params: { ...f.dist_duracion.params, b: e.target.value === "" ? "" : parseFloat(e.target.value) },
                    })
                  }
                />
              </label>
            </>
          )}

          <button type="button" onClick={() => {
            const updated = [...paramsState.failures];
            updated.splice(idx, 1);
            setParamsState(prev => ({ ...prev, failures: updated }));
          }}>
            ❌
          </button>
        </div>
      ))}
      <button type="button" onClick={handleAddFailure}>
        ➕ Agregar falla
      </button>
    </>
  );
}
// ...existing code...