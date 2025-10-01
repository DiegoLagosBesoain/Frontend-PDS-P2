import React, { useState, useEffect } from "react";

const SENSOR_TYPES = [
  { value: "contador", label: "Contador" },
  { value: "flujo", label: "Medidor de flujo" },
  { value: "porcentaje_encendido", label: "Porcentaje de tiempo encendido" },
  { value: "porcentaje_funcionamiento", label: "Porcentaje de tiempo de funcionamiento" },
];

export default function OutputForm({ node, setEditingNode, elements }) {
  const [paramsState, setParamsState] = useState({
    sensors: node.data.params?.sensors || [],
    failures: node.data.params?.failures || [],
  });

  // 🔹 Sincroniza siempre con node.data.params
  useEffect(() => {
    setEditingNode((prev) => ({
      ...prev,
      data: { ...prev.data, params: paramsState },
    }));
  }, [paramsState]);

  const updateField = (field, value) => {
    setEditingNode((prev) => ({
      ...prev,
      data: { ...prev.data, [field]: value },
    }));
  };

  // 🔹 Sensores
  const handleAddSensor = () => {
    setParamsState((prev) => ({
      ...prev,
      sensors: [...prev.sensors, { type: "", id_entradas: [], interval: "" }], // permitir 0 y decimales al escribir
    }));
  };

  const handleSensorChange = (index, field, value) => {
    const updated = [...paramsState.sensors];
    updated[index][field] = value;
    setParamsState((prev) => ({ ...prev, sensors: updated }));
  };


  const handleToggleEntrada = (index, entradaId) => {
    const updated = [...paramsState.sensors];
    const arr = updated[index].id_entradas || [];
    updated[index].id_entradas = arr.includes(entradaId)
      ? arr.filter((v) => v !== entradaId)
      : [...arr, entradaId];
    setParamsState((prev) => ({ ...prev, sensors: updated }));
  };

  // 🔹 Fallas
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

  return (
    <div>
      <h3 style={{ color: "#000" }}>Editar Salida</h3>

      <label style={{ display: "flex", flexDirection: "column", marginBottom: 10 }}>
        Label:
        <input
          type="text"
          value={node.data.label || ""}
          onChange={(e) => updateField("label", e.target.value)}
          style={{ color: "#000", backgroundColor: "#fff" }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", marginBottom: 10 }}>
        Elemento:
        <select
          value={node.data.elemento || ""}
          onChange={(e) => updateField("elemento", e.target.value)}
          style={{ color: "#000", backgroundColor: "#fff" }}
        >
          <option value="">-- Selecciona un elemento --</option>
          {elements.map((el) => (
            <option key={el.id} value={el.type}>
              {el.type} ({Object.keys(el.params).join(", ")})
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", marginBottom: 10 }}>
        Entradas:
        <input
          type="number"
          min="1"
          value={node.data.entradas || 1}
          onChange={(e) => updateField("entradas", parseInt(e.target.value))}
          style={{ color: "#000", backgroundColor: "#fff" }}
        />
      </label>

      <hr />
      <h4>Sensores</h4>




      {paramsState.sensors.map((s, idx) => (
        <div key={idx} style={{ border: "1px solid #ccc", padding: 5, marginBottom: 5 }}>
          <label>
            Tipo:
            <select
              value={s.type}
              onChange={(e) => handleSensorChange(idx, "type", e.target.value)}
            >
              <option value="">-- Selecciona un sensor --</option>
              {SENSOR_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label>
            Intervalo (s):
            <input
              type="number"
              min="0"
              value={s.interval ?? ""}
              onChange={(e) => {
                const v = e.target.value === "" ? "" : parseFloat(e.target.value);
                handleSensorChange(idx, "interval", v);
              }}
              style={{ width: 80, marginLeft: 5 }}
            />
          </label>

          <div>
            <strong>Entradas:</strong>
            {Array.from({ length: node.data.entradas || 1 }).map((_, i) => {
              const id = `in-${i}`;
              return (
                <label key={id} style={{ marginRight: 8 }}>
                  <input
                    type="checkbox"
                    checked={s.id_entradas?.includes(id) || false}
                    onChange={() => handleToggleEntrada(idx, id)}
                  />
                  {id}
                </label>
              );
            })}
          </div>
        </div>
      ))}




      <button type="button" onClick={handleAddSensor}>➕ Agregar sensor</button>


<hr />
<h4>Fallas</h4>
{paramsState.failures.map((f, idx) => (
  <div
    key={idx}
    style={{ marginBottom: 10, padding: 8, border: "1px solid #ccc" }}
  >
    {/* Distribución de activación */}
    <label>
      Dist Activación:
      <select
        value={f.dist_activacion?.tipo || ""}
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
      <div>
        <label>
          λ (Lambda):
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
      </div>
    )}
    {f.dist_activacion?.tipo === "Normal" && (
      <div>
        <label>
          μ (Mu):
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
          σ (Sigma):
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
      </div>
    )}
    {f.dist_activacion?.tipo === "Uniforme" && (
      <div>
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
      </div>
    )}
    {f.dist_activacion?.tipo === "Fija" && (
      <div>
        <label>
          Valor fijo:
          <input
            type="number"
            value={f.dist_activacion.params?.valor ?? ""}
            onChange={(e) =>
              handleFailureChange(idx, "dist_activacion", {
                ...f.dist_activacion,
                params: { ...f.dist_activacion.params, valor: e.target.value === "" ? "" : parseFloat(e.target.value) },
              })
            }
          />
        </label>
      </div>
    )}

    {/* Distribución de duración */}
    <label>
      Dist Duración:
      <select
        value={f.dist_duracion?.tipo || ""}
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
      <div>
        <label>
          λ (Lambda):
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
      </div>
    )}
    {f.dist_duracion?.tipo === "Normal" && (
      <div>
        <label>
          μ (Mu):
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
          σ (Sigma):
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
      </div>
    )}
    {f.dist_duracion?.tipo === "Uniforme" && (
      <div>
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
      </div>
    )}
    {f.dist_duracion?.tipo === "Fija" && (
      <div>
        <label>
          Valor fijo:
          <input
            type="number"
            value={f.dist_duracion.params?.valor ?? ""}
            onChange={(e) =>
              handleFailureChange(idx, "dist_duracion", {
                ...f.dist_duracion,
                params: { ...f.dist_duracion.params, valor: e.target.value === "" ? "" : parseFloat(e.target.value) },
              })
            }
          />
        </label>
      </div>
    )}

    <button type="button" onClick={() => {
      setParamsState(prev => ({
        ...prev,
        failures: prev.failures.filter((_, i) => i !== idx)
      }))
    }}>❌</button>
  </div>
))}
<button type="button" onClick={handleAddFailure}>➕ Agregar falla</button>



    </div>
  );
}
