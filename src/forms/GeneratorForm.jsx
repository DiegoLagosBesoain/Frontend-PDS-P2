import React, { useState, useEffect } from "react";

export default function GeneratorForm({ node, setEditingNode, elements, onSave }) {
  const [selectedElement, setSelectedElement] = useState(null);
  const [paramValues, setParamValues] = useState({});
  const [paramsState, setParamsState] = useState({
    sensors: node.data.params?.sensors || [],
    failures: node.data.params?.failures || [],
  });

  // 🔹 Normaliza distribución inicial si venía como string
  useEffect(() => {
    if (node.data.distribucion && typeof node.data.distribucion === "string") {
      setEditingNode((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          distribucion: { tipo: node.data.distribucion, params: {} },
        },
      }));
    }
  }, []);

  // 🔹 Inicializa parámetros dinámicos al seleccionar un elemento
  useEffect(() => {
    if (selectedElement) {
      const initParams = {};
      Object.keys(selectedElement.params || {}).forEach((param) => {
        initParams[param] = paramValues[param] || [{ key: "", value: "" }];
      });
      setParamValues(initParams);

      setEditingNode((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          elemento: selectedElement.type,
          params: { ...initParams, ...paramsState },
        },
      }));
    }
  }, [selectedElement]);

  // 🔹 Actualiza node.data.params cuando cambian parámetros dinámicos o sensores/fallas
  useEffect(() => {
    const normalized = normalizeParams();
    setEditingNode((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        ...normalized,
        params: { ...normalized.parametros, ...paramsState },
      },
    }));
  }, [paramValues, paramsState]);

  const updateField = (field, value) => {
    setEditingNode({
      ...node,
      data: { ...node.data, [field]: value },
    });
  };

  const updateDistribucion = (newDistribucion) => {
    setEditingNode((prev) => ({
      ...prev,
      data: { ...prev.data, distribucion: newDistribucion },
    }));
  };
  useEffect(() => {
  if (!selectedElement && node.data.elemento) {
    const el = elements.find((x) => x.type === node.data.elemento);
    if (el) {
      setSelectedElement(el);

      // Prepara los parámetros con lo que ya tiene guardado
      const initParams = {};
      Object.keys(el.params || {}).forEach((param) => {
        if (node.data.params?.[param]) {
          // Si ya tiene valores guardados, usarlos
          initParams[param] = Object.entries(node.data.params[param]).map(
            ([key, value]) => ({ key, value })
          );
        } else {
          // Si no tiene, inicializar vacío
          initParams[param] = [{ key: "", value: "" }];
        }
      });
      setParamValues(initParams);
    }
  }
}, [node, elements]);
  // --- Manejo de parámetros dinámicos ---
  const handleParamChange = (paramName, index, keyOrValue, newValue) => {
    const updated = { ...paramValues };
    updated[paramName][index][keyOrValue] = newValue;
    setParamValues(updated);
  };
  const addParamInstance = (paramName) => {
    setParamValues((prev) => ({
      ...prev,
      [paramName]: [...prev[paramName], { key: "", value: "" }],
    }));
  };
  const removeParamInstance = (paramName, index) => {
    setParamValues((prev) => ({
      ...prev,
      [paramName]: prev[paramName].filter((_, i) => i !== index),
    }));
  };

  // --- Sensores ---
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
    setParamsState((prev) => ({
      ...prev,
      sensors: prev.sensors.filter((_, i) => i !== index),
    }));
  };

  // --- Fallas ---
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
    setParamsState((prev) => ({
      ...prev,
      failures: prev.failures.filter((_, i) => i !== index),
    }));
  };

  // --- Sensores permitidos ---
  const getAllowedSensors = () => {
    switch (node.type?.toLowerCase()) {
      case "queue":
        return ["contador", "medidor_flujo", "maximo", "minimo", "porcentaje_tiempo_encendido", "porcentaje_tiempo_funcionamiento"];
      default:
        return ["contador", "medidor_flujo", "porcentaje_tiempo_encendido", "porcentaje_tiempo_funcionamiento"];
    }
  };

  // --- Normalización ---
  const normalizeParams = () => {
    const normalized = {};
    Object.keys(paramValues).forEach((paramName) => {
      const entries = paramValues[paramName].filter(
        (inst) => inst.key && inst.value !== ""
      );
      const total = entries.reduce(
        (sum, inst) => sum + parseFloat(inst.value || 0),
        0
      );
      normalized[paramName] = {};
      entries.forEach((inst) => {
        const val = parseFloat(inst.value || 0);
        normalized[paramName][inst.key] = total > 0 ? val / total : val;
      });
    });
    return {
      type: selectedElement?.type || node.data.elemento,
      parametros: normalized,
    };
  };

  return (
    <>
      {/* Label */}
      <label>
        Label:
        <input
          type="text"
          value={node.data.label || ""}
          onChange={(e) => updateField("label", e.target.value)}
        />
      </label>
      <br />

      {/* Elemento */}
      <label>
        Elemento:
        <select
          value={selectedElement?.id || ""}
          onChange={(e) => {
            const el = elements.find((x) => x.id === e.target.value);
            setSelectedElement(el || null);
          }}
        >
          <option value="">-- Seleccionar --</option>
          {elements.map((el) => (
            <option key={el.id} value={el.id}>
              {el.type}
            </option>
          ))}
        </select>
      </label>
      <br />

      {/* Parámetros dinámicos */}
      {selectedElement &&
        Object.keys(selectedElement.params || {}).map((paramName) => (
          <div key={paramName} style={{ marginBottom: "10px" }}>
            <strong>{paramName} ({selectedElement.params[paramName]}):</strong>
            {selectedElement.params[paramName] === "bool" ? (
              <div>
                <label>True: </label>
                <input
                  type="number"
                  value={paramValues[paramName]?.find(i => i.key === "true")?.value || ""}
                  onChange={(e) =>
                    setParamValues((prev) => ({
                      ...prev,
                      [paramName]: [
                        { key: "true", value: e.target.value },
                        { key: "false", value: prev[paramName]?.find(i => i.key === "false")?.value || "" },
                      ],
                    }))
                  }
                />
                <label>False: </label>
                <input
                  type="number"
                  value={paramValues[paramName]?.find(i => i.key === "false")?.value || ""}
                  onChange={(e) =>
                    setParamValues((prev) => ({
                      ...prev,
                      [paramName]: [
                        { key: "true", value: prev[paramName]?.find(i => i.key === "true")?.value || "" },
                        { key: "false", value: e.target.value },
                      ],
                    }))
                  }
                />
              </div>
            ) : (
              <>
                {paramValues[paramName]?.map((inst, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={inst.key}
                      onChange={(e) => handleParamChange(paramName, idx, "key", e.target.value)}
                    />
                    <input
                      type={selectedElement.params[paramName] === "number" ? "number" : "text"}
                      placeholder="Valor"
                      value={inst.value}
                      onChange={(e) => handleParamChange(paramName, idx, "value", e.target.value)}
                    />
                    <button type="button" onClick={() => removeParamInstance(paramName, idx)}>❌</button>
                  </div>
                ))}
                <button type="button" onClick={() => addParamInstance(paramName)}>➕ Agregar {paramName}</button>
              </>
            )}
          </div>
        ))}

     



{/* Sensores */}
<div>
  <strong>Sensores:</strong>
  {paramsState.sensors.map((s, idx) => (
    <div key={idx} style={{ marginBottom: "10px", padding: "5px", border: "1px solid #ccc" }}>
      <select
        value={s.type}
        onChange={(e) => updateSensor(idx, "type", e.target.value)}
      >
        <option value="">-- Tipo --</option>
        {getAllowedSensors().map((stype) => (
          <option key={stype} value={stype}>{stype}</option>
        ))}
      </select>

      {/* Intervalo de muestreo */}
      <label style={{ marginLeft: "10px" }}>
        Intervalo:
        <input
          type="number"
          min="0" // Evita valores negativos desde el input
          value={s.intervalo || ""}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            updateSensor(idx, "intervalo", val < 0 ? 0 : val);
          }}
          style={{ marginLeft: "5px", width: "80px" }}
        />
      </label>

      {/* Entradas */}
      {node.type.toLowerCase() !== "generator" && (
        <div>
          <strong>Entradas:</strong>
          {Array.from({ length: node.data.entradas || 0 }).map((_, i) => {
            const id = `in-${i}`;
            return (
              <label key={id} style={{ marginRight: "8px" }}>
                <input
                  type="checkbox"
                  checked={s.id_entradas?.includes(id) || false}
                  onChange={(e) => {
                    let updated = [...(s.id_entradas || [])];
                    if (e.target.checked) updated.push(id);
                    else updated = updated.filter(v => v !== id);
                    updateSensor(idx, "id_entradas", updated);
                  }}
                />
                {id}
              </label>
            );
          })}
        </div>
      )}

      {/* Salidas */}
      <div>
        <strong>Salidas:</strong>
        {node.type.toLowerCase() === "generator"
          ? (
            <label>
              <input
                type="checkbox"
                checked={s.id_salidas?.includes("out-0") || false}
                onChange={(e) => {
                  let updated = [...(s.id_salidas || [])];
                  if (e.target.checked) updated.push("out-0");
                  else updated = updated.filter(v => v !== "out-0");
                  updateSensor(idx, "id_salidas", updated);
                }}
              />
              out-0
            </label>
          )
          : Array.from({ length: node.data.salidas || 0 }).map((_, i) => {
              const id = `out-${i}`;
              return (
                <label key={id} style={{ marginRight: "8px" }}>
                  <input
                    type="checkbox"
                    checked={s.id_salidas?.includes(id) || false}
                    onChange={(e) => {
                      let updated = [...(s.id_salidas || [])];
                      if (e.target.checked) updated.push(id);
                      else updated = updated.filter(v => v !== id);
                      updateSensor(idx, "id_salidas", updated);
                    }}
                  />
                  {id}
                </label>
              );
            })
        }
      </div>

      <button type="button" onClick={() => removeSensor(idx)}>❌</button>
    </div>
  ))}
  <button type="button" onClick={addSensor}>➕ Agregar Sensor</button>
</div>


      




{/* Fallas */}
<div style={{ marginTop: "10px" }}>
  <strong>Fallas:</strong>
  {paramsState.failures.map((f, idx) => (
    <div
      key={idx}
      style={{
        marginBottom: "10px",
        padding: "8px",
        border: "1px solid #ccc",
      }}
    >
      {/* Distribución de activación */}
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
        <div>
          <label>
            λ (Lambda):
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
        </div>
      )}
      {f.dist_activacion?.tipo === "Normal" && (
        <div>
          <label>
            μ (Mu):
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
            σ (Sigma):
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
        </div>
      )}
      {f.dist_activacion?.tipo === "Uniforme" && (
        <div>
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
        </div>
      )}
      {f.dist_activacion?.tipo === "Fija" && (
        <div>
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
        </div>
      )}

      {/* Distribución de duración */}
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

      {/* Parámetros duración (misma lógica que activación) */}
      {f.dist_duracion?.tipo === "Exponencial" && (
        <div>
          <label>
            λ (Lambda):
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
        </div>
      )}
      {f.dist_duracion?.tipo === "Normal" && (
        <div>
          <label>
            μ (Mu):
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
            σ (Sigma):
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
        </div>
      )}
      {f.dist_duracion?.tipo === "Uniforme" && (
        <div>
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
        </div>
      )}
      {f.dist_duracion?.tipo === "Fija" && (
        <div>
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
        </div>
      )}

      <button type="button" onClick={() => removeFailure(idx)}>❌</button>
    </div>
  ))}
  <button type="button" onClick={addFailure}>➕ Agregar Falla</button>
</div>






      {/* On Demand */}
      <label>
        <input
          type="checkbox"
          checked={node.data.onDemand || false}
          onChange={(e) => updateField("onDemand", e.target.checked)}
        />
        On Demand
      </label>
      <br />

    {/* Distribución */}
    {!node.data.onDemand && (
      <div>
        <label>
          Distribución:
          <select
            value={node.data.distribucion?.tipo || ""}
            onChange={(e) =>
              updateDistribucion({ tipo: e.target.value, params: {} })
            }
          >
            <option value="">-- Selecciona --</option>
            <option value="Exponencial">Exponencial</option>
            <option value="Normal">Normal</option>
            <option value="Uniforme">Uniforme</option>
            <option value="Fija">Fija</option>
          </select>
        </label>

        {/* Parámetros según la distribución */}
        {node.data.distribucion?.tipo === "Exponencial" && (
          <div>
            <label>
              λ (Lambda):
              <input
                type="number"
                value={node.data.distribucion.params.lambda || ""}
                onChange={(e) =>
                  updateDistribucion({
                    ...node.data.distribucion,
                    params: { ...node.data.distribucion.params, lambda: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </label>
          </div>
        )}

        {node.data.distribucion?.tipo === "Normal" && (
          <div>
            <label>
              μ (Mu):
              <input
                type="number"
                value={node.data.distribucion.params.mu || ""}
                onChange={(e) =>
                  updateDistribucion({
                    ...node.data.distribucion,
                    params: { ...node.data.distribucion.params, mu: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </label>
            <label>
              σ (Sigma):
              <input
                type="number"
                value={node.data.distribucion.params.sigma || ""}
                onChange={(e) =>
                  updateDistribucion({
                    ...node.data.distribucion,
                    params: { ...node.data.distribucion.params, sigma: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </label>
          </div>
        )}

        {node.data.distribucion?.tipo === "Uniforme" && (
          <div>
            <label>
              a:
              <input
                type="number"
                value={node.data.distribucion.params.a || ""}
                onChange={(e) =>
                  updateDistribucion({
                    ...node.data.distribucion,
                    params: { ...node.data.distribucion.params, a: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </label>
            <label>
              b:
              <input
                type="number"
                value={node.data.distribucion.params.b || ""}
                onChange={(e) =>
                  updateDistribucion({
                    ...node.data.distribucion,
                    params: { ...node.data.distribucion.params, b: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </label>
          </div>
        )}

        {node.data.distribucion?.tipo === "Fija" && (
          <div>
            <label>
              Valor fijo:
              <input
                type="number"
                value={node.data.distribucion.params.valor || ""}
                onChange={(e) =>
                  updateDistribucion({
                    ...node.data.distribucion,
                    params: { ...node.data.distribucion.params, valor: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </label>
          </div>
        )}
      </div>
    )}



      {/* Intervalo y Límite */}
      {node.data.onDemand && (
        <label>
          Intervalo:
          <input
            type="number"
            value={node.data.intervalo || ""}
            onChange={(e) => updateField("intervalo", parseFloat(e.target.value) || 0)}
          />
        </label>
      )}
      <br />
      <label>
        Límite:
        <input
          type="number"
          value={node.data.limite || ""}
          onChange={(e) => updateField("limite", parseInt(e.target.value) || 0)}
        />
      </label>
      <br />



    </>
  );
}
