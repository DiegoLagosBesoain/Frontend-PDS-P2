import React, { useState, useEffect } from "react";

export default function SelectorForm({ node, setEditingNode, elements = [] }) {
  const [paramsState, setParamsState] = useState({
    sensors: node.data.params?.sensors || [],
    failures: node.data.params?.failures || [],
  });

  // 🔹 Actualiza node.data.params cuando cambian sensores/fallas
  useEffect(() => {
    setEditingNode((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        params: { ...paramsState },
      },
    }));
  }, [paramsState]);

  const updateField = (field, value) => {
    setEditingNode({
      ...node,
      data: { ...node.data, [field]: value },
    });
  };

  // 🔹 Sensores
  const addSensor = () => {
    setParamsState((prev) => ({
      ...prev,
      sensors: [...prev.sensors, { type: "", id_entradas: [], id_salidas: [] }],
    }));
  };

  const updateSensor = (index, field, value) => {
    const updated = [...paramsState.sensors];
    updated[index][field] = value;
    setParamsState((prev) => ({ ...prev, sensors: updated }));
  };

  const removeSensor = (index) => {
    const updated = [...paramsState.sensors];
    updated.splice(index, 1);
    setParamsState((prev) => ({ ...prev, sensors: updated }));
  };

  // 🔹 Fallas
  const addFailure = () => {
    setParamsState((prev) => ({
      ...prev,
      failures: [...prev.failures, { dist_activacion: "", dist_duracion: "" }],
    }));
  };

  const updateFailure = (index, field, value) => {
    const updated = [...paramsState.failures];
    updated[index][field] = value;
    setParamsState((prev) => ({ ...prev, failures: updated }));
  };

  const removeFailure = (index) => {
    const updated = [...paramsState.failures];
    updated.splice(index, 1);
    setParamsState((prev) => ({ ...prev, failures: updated }));
  };

  // 🔹 Tipos de sensores permitidos en Selector (sin maximo/minimo)
  const getAllowedSensors = () => [
    "contador",
    "medidor_flujo",
    "porcentaje_tiempo_encendido",
    "porcentaje_tiempo_funcionamiento",
  ];

  const labelStyle = { display: "flex", flexDirection: "column", marginBottom: "10px", color: "#000" };
  const inputStyle = { color: "#000", backgroundColor: "#fff" };
  const selectStyle = { color: "#000", backgroundColor: "#fff" };

  return (
    <div>
      <h3 style={{ color: "#000" }}>Editar Selector</h3>

      <label style={labelStyle}>
        Label:
        <input
          type="text"
          value={node.data.label || ""}
          onChange={(e) => updateField("label", e.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Elemento:
        <select
          value={node.data.elemento || ""}
          onChange={(e) => updateField("elemento", e.target.value)}
          style={selectStyle}
        >
          <option value="">-- Selecciona un elemento --</option>
          {elements.map((el) => (
            <option key={el.id} value={el.type}>
              {el.type}
            </option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>
        Estrategia de selección:
        <select
          value={node.data.estrategia || "prioridad"}
          onChange={(e) => updateField("estrategia", e.target.value)}
          style={selectStyle}
        >
          <option value="prioridad">Prioridad de entrada</option>
          <option value="orden">Por orden</option>
        </select>
      </label>

      <label style={labelStyle}>
        Entradas:
        <input
          type="number"
          min="1"
          value={node.data.entradas || 1}
          onChange={(e) => updateField("entradas", Math.max(1, parseInt(e.target.value)))}
          style={inputStyle}
        />
      </label>



      {/* Orden o prioridad de entradas */}
      {["orden", "prioridad"].includes(node.data.estrategia) && (
        <div style={{ marginTop: "10px" }}>
          <strong>
            {node.data.estrategia === "orden"
              ? "Orden de Entradas"
              : "Prioridad de Entradas"}
            :
          </strong>
          {Array.from({ length: node.data.entradas || 1 }).map((_, i) => {
            const used = (node.data.orden_entradas || []).filter((_, idx) => idx !== i);
            return (
              <label key={i} style={{ display: "block", marginBottom: "5px" }}>
                Posición {i + 1}:
                <select
                  value={node.data.orden_entradas?.[i] || ""}
                  onChange={(e) => {
                    const newOrder = [
                      ...(node.data.orden_entradas ||
                        Array.from({ length: node.data.entradas }, () => "")),
                    ];
                    newOrder[i] = e.target.value;
                    updateField("orden_entradas", newOrder);
                  }}
                  style={{ marginLeft: "5px" }}
                >
                  <option value="">-- Seleccionar entrada --</option>
                  {Array.from({ length: node.data.entradas || 1 }).map((_, j) => {
                    const id = `in-${j}`;
                    if (used.includes(id)) return null;
                    return (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    );
                  })}
                </select>
              </label>
            );
          })}
        </div>
      )}




      <label style={labelStyle}>
        Salidas:
        <input
          type="number"
          min="1"
          value={node.data.salidas || 1}
          onChange={(e) => updateField("salidas", Math.max(1, parseInt(e.target.value)))}
          style={inputStyle}
        />
      </label>




      {/* Sensores */}
      <div>
        <strong>Sensores:</strong>
        {paramsState.sensors.map((s, idx) => (
          <div key={idx} style={{ marginBottom: "10px", padding: "5px", border: "1px solid #ccc" }}>
            
            {/* Tipo de sensor */}
            <select
              value={s.type}
              onChange={(e) => updateSensor(idx, "type", e.target.value)}
            >
              <option value="">-- Tipo --</option>
              {getAllowedSensors().map((stype) => (
                <option key={stype} value={stype}>{stype}</option>
              ))}
            </select>

            {/* Intervalo (entero) */}
            <label style={{ marginLeft: "10px" }}>
              Intervalo:
              <input
                type="number"
                min="1"
                step="1"
                value={s.interval || 1}
                onChange={(e) => updateSensor(idx, "interval", parseInt(e.target.value) || 1)}
                style={{ marginLeft: "5px" }}
              />
            </label>

            {/* Entradas disponibles */}
            <div>
              <strong>Entradas:</strong>
              {Array.from({ length: node.data.entradas || 1 }).map((_, i) => {
                const id = `in-${i}`;
                return (
                  <label key={id} style={{ marginRight: "8px" }}>
                    <input
                      type="checkbox"
                      checked={s.id_entradas?.includes(id) || false}
                      onChange={(e) => {
                        let updated = [...(s.id_entradas || [])];
                        if (e.target.checked) updated.push(id);
                        else updated = updated.filter((v) => v !== id);
                        updateSensor(idx, "id_entradas", updated);
                      }}
                    />
                    {id}
                  </label>
                );
              })}
            </div>

            {/* Salidas disponibles */}
            <div>
              <strong>Salidas:</strong>
              {Array.from({ length: node.data.salidas || 1 }).map((_, i) => {
                const id = `out-${i}`;
                return (
                  <label key={id} style={{ marginRight: "8px" }}>
                    <input
                      type="checkbox"
                      checked={s.id_salidas?.includes(id) || false}
                      onChange={(e) => {
                        let updated = [...(s.id_salidas || [])];
                        if (e.target.checked) updated.push(id);
                        else updated = updated.filter((v) => v !== id);
                        updateSensor(idx, "id_salidas", updated);
                      }}
                    />
                    {id}
                  </label>
                );
              })}
            </div>

            <button type="button" onClick={() => removeSensor(idx)}>❌</button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setParamsState((prev) => ({
            ...prev,
            sensors: [...prev.sensors, { type: "", id_entradas: [], id_salidas: [], interval: 1 }]
          }))}
        >
          ➕ Agregar Sensor
        </button>
      </div>



      {/* Fallas */}
      <div style={{ marginTop: "10px" }}>
      <hr />
      <h4>Fallas</h4>
      {paramsState.failures.map((f, idx) => (
        <div key={idx} style={{ border: "1px solid #ccc", padding: 5, marginBottom: 5 }}>
          
          {/* Distribución activación */}
          <label>
            Dist Activación:
            <select
              value={f.dist_activacion?.tipo || ""}
              onChange={(e) =>
                updateFailure(idx, "dist_activacion", { tipo: e.target.value, params: {} })
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
                value={f.dist_activacion.params?.lambda || ""}
                onChange={(e) =>
                  updateFailure(idx, "dist_activacion", {
                    ...f.dist_activacion,
                    params: { ...f.dist_activacion.params, lambda: parseFloat(e.target.value) || 0 },
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
                  value={f.dist_activacion.params?.mu || ""}
                  onChange={(e) =>
                    updateFailure(idx, "dist_activacion", {
                      ...f.dist_activacion,
                      params: { ...f.dist_activacion.params, mu: parseFloat(e.target.value) || 0 },
                    })
                  }
                />
              </label>
              <label>
                σ:
                <input
                  type="number"
                  value={f.dist_activacion.params?.sigma || ""}
                  onChange={(e) =>
                    updateFailure(idx, "dist_activacion", {
                      ...f.dist_activacion,
                      params: { ...f.dist_activacion.params, sigma: parseFloat(e.target.value) || 0 },
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
                  value={f.dist_activacion.params?.a || ""}
                  onChange={(e) =>
                    updateFailure(idx, "dist_activacion", {
                      ...f.dist_activacion,
                      params: { ...f.dist_activacion.params, a: parseFloat(e.target.value) || 0 },
                    })
                  }
                />
              </label>
              <label>
                b:
                <input
                  type="number"
                  value={f.dist_activacion.params?.b || ""}
                  onChange={(e) =>
                    updateFailure(idx, "dist_activacion", {
                      ...f.dist_activacion,
                      params: { ...f.dist_activacion.params, b: parseFloat(e.target.value) || 0 },
                    })
                  }
                />
              </label>
            </>
          )}
          {f.dist_activacion?.tipo === "Fija" && (
            <label>
              Valor fijo:
              <input
                type="number"
                value={f.dist_activacion.params?.valor || ""}
                onChange={(e) =>
                  updateFailure(idx, "dist_activacion", {
                    ...f.dist_activacion,
                    params: { ...f.dist_activacion.params, valor: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </label>
          )}

          {/* Distribución duración */}
          <label>
            Dist Duración:
            <select
              value={f.dist_duracion?.tipo || ""}
              onChange={(e) =>
                updateFailure(idx, "dist_duracion", { tipo: e.target.value, params: {} })
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
                value={f.dist_duracion.params?.lambda || ""}
                onChange={(e) =>
                  updateFailure(idx, "dist_duracion", {
                    ...f.dist_duracion,
                    params: { ...f.dist_duracion.params, lambda: parseFloat(e.target.value) || 0 },
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
                  value={f.dist_duracion.params?.mu || ""}
                  onChange={(e) =>
                    updateFailure(idx, "dist_duracion", {
                      ...f.dist_duracion,
                      params: { ...f.dist_duracion.params, mu: parseFloat(e.target.value) || 0 },
                    })
                  }
                />
              </label>
              <label>
                σ:
                <input
                  type="number"
                  value={f.dist_duracion.params?.sigma || ""}
                  onChange={(e) =>
                    updateFailure(idx, "dist_duracion", {
                      ...f.dist_duracion,
                      params: { ...f.dist_duracion.params, sigma: parseFloat(e.target.value) || 0 },
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
                  value={f.dist_duracion.params?.a || ""}
                  onChange={(e) =>
                    updateFailure(idx, "dist_duracion", {
                      ...f.dist_duracion,
                      params: { ...f.dist_duracion.params, a: parseFloat(e.target.value) || 0 },
                    })
                  }
                />
              </label>
              <label>
                b:
                <input
                  type="number"
                  value={f.dist_duracion.params?.b || ""}
                  onChange={(e) =>
                    updateFailure(idx, "dist_duracion", {
                      ...f.dist_duracion,
                      params: { ...f.dist_duracion.params, b: parseFloat(e.target.value) || 0 },
                    })
                  }
                />
              </label>
            </>
          )}
          {f.dist_duracion?.tipo === "Fija" && (
            <label>
              Valor fijo:
              <input
                type="number"
                value={f.dist_duracion.params?.valor || ""}
                onChange={(e) =>
                  updateFailure(idx, "dist_duracion", {
                    ...f.dist_duracion,
                    params: { ...f.dist_duracion.params, valor: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </label>
          )}

          <button type="button" onClick={() => removeFailure(idx)}>❌</button>
        </div>
      ))}
      <button type="button" onClick={addFailure}>➕ Agregar Falla</button>

      </div>
    </div>
  );
}
