import React, { useState, useEffect } from "react";

export default function QueueForm({ node, setEditingNode, elements }) {
  const [selectedElement, setSelectedElement] = useState(
    elements.find((el) => el.type === node.data.elemento) || null
  );

  const [paramsState, setParamsState] = useState({
    sensors: node.data.params?.sensors || [],
    failures: node.data.params?.failures || [],
  });

  // Asegurar que capacidad siempre tenga un valor inicial
  useEffect(() => {
    if (node.data.capacidad === undefined) {
      setEditingNode((prev) => ({
        ...prev,
        data: { ...prev.data, capacidad: "inf" }
      }));
    }
  }, []);

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
      failures: [...prev.failures, { dist_activacion: { tipo: "", params: {} }, dist_duracion: { tipo: "", params: {} } }],
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

  // 🔹 Filtrado de sensores según tipo de componente
  const getAllowedSensors = () => [
    "contador",
    "medidor_flujo",
    "maximo",
    "minimo",
    "porcentaje_tiempo_encendido",
    "porcentaje_tiempo_funcionamiento",
  ];

  // 🔹 Guardar
  const handleSave = () => {
    const updatedParams = { ...paramsState };
    setEditingNode({
      ...node,
      data: {
        ...node.data,
        elemento: selectedElement?.type || node.data.elemento,
        params: updatedParams,
      },
    });
  };

  const labelStyle = { display: "flex", flexDirection: "column", marginBottom: "10px", color: "#000" };
  const inputStyle = { color: "#000", backgroundColor: "#fff" };
  const selectStyle = { color: "#000", backgroundColor: "#fff" };

  return (
    <div>
      <h3 style={{ color: "#000" }}>Editar Fila</h3>

      {/* Label */}
      <label style={labelStyle}>
        Label:
        <input
          type="text"
          value={node.data.label || ""}
          onChange={(e) => updateField("label", e.target.value)}
          style={inputStyle}
        />
      </label>

      {/* Elemento */}
      <label style={labelStyle}>
        Elemento:
        
        <select
            value={selectedElement?.id || ""}
            onChange={(e) => {
              const el = elements.find((x) => x.id === e.target.value);
              setSelectedElement(el || null);

              if (el) {
                updateField("elemento", el.type); // 👈 Guarda el type del elemento en node.data
              } else {
                updateField("elemento", null);
              }
            }}
            style={selectStyle}
          >


          <option value="">-- Selecciona un elemento --</option>
          {elements.map((el) => (
            <option key={el.id} value={el.id}>
              {el.type}
            </option>
          ))}
        </select>
      </label>


      {/* Estrategia */}
      <label style={labelStyle}>
        Estrategia:
        <select
          value={node.data.estrategia ?? ""}
          onChange={(e) => updateField("estrategia", e.target.value)}
          style={selectStyle}
        >
          <option value="">-- Seleccione la estrategia --</option>
          <option value="FIFO">FIFO</option>
          <option value="LIFO">LIFO</option>
          <option value="PRIORIDAD">Prioridad</option>
        </select>
      </label>

      {/* Configuración si es PRIORIDAD */}
      {node.data.estrategia === "PRIORIDAD" && selectedElement && (
        <div style={{ marginLeft: "10px", padding: "10px", border: "1px solid #ccc" }}>
          <strong>Configuración de Prioridad</strong>

          {/* Selección de atributo */}
          <label style={labelStyle}>
            Atributo:
            <select
              value={node.data.prioridad?.atributo || ""}
              onChange={(e) =>
                updateField("prioridad", {
                  atributo: e.target.value,
                  orden: [],
                })
              }
              style={selectStyle}
            >
              <option value="">-- Selecciona un atributo --</option>
              {Object.keys(selectedElement.params || {}).map((attr) => (
                <option key={attr} value={attr}>
                  {attr}
                </option>
              ))}
            </select>
          </label>

          {/* Orden de valores según tipo */}
          {node.data.prioridad?.atributo && (
            <div>
              <p>Orden de valores:</p>
              {(() => {
                const attr = node.data.prioridad.atributo;
                const ejemplo = selectedElement.params?.[attr];
                let tipo = typeof ejemplo;

                // Caso booleano
                if (tipo === "bool") {
                  return ["true", "false"].map((val) => (
                    <div key={val}>
                      <label>
                        {val} →
                        <input
                          type="number"
                          min="1"
                          value={
                            node.data.prioridad?.orden?.find((o) => o.valor === val)
                              ?.posicion || ""
                          }
                          onChange={(e) => {
                            const pos = parseInt(e.target.value) || 1;
                            const newOrden = [
                              ...(node.data.prioridad?.orden || []),
                            ].filter((o) => o.valor !== val);
                            newOrden.push({ valor: val, posicion: pos });
                            updateField("prioridad", {
                              ...node.data.prioridad,
                              orden: newOrden,
                            });
                          }}
                          style={{ width: "50px", marginLeft: "5px" }}
                        />
                      </label>
                    </div>
                  ));
                }

                // Caso string → usuario escribe valores
                if (tipo === "string") {
                  return (
                    <div>
                      {(node.data.prioridad?.orden || []).map((o, idx) => (
                        <div key={idx}>
                          <input
                            type="text"
                            placeholder="Valor"
                            value={o.valor}
                            onChange={(e) => {
                              const newOrden = [...node.data.prioridad.orden];
                              newOrden[idx].valor = e.target.value;
                              updateField("prioridad", {
                                ...node.data.prioridad,
                                orden: newOrden,
                              });
                            }}
                            style={{ marginRight: "5px" }}
                          />
                          <input
                            type="number"
                            min="1"
                            value={o.posicion}
                            onChange={(e) => {
                              const pos = parseInt(e.target.value) || 1;
                              const newOrden = [...node.data.prioridad.orden];
                              newOrden[idx].posicion = pos;
                              updateField("prioridad", {
                                ...node.data.prioridad,
                                orden: newOrden,
                              });
                            }}
                            style={{ width: "50px" }}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          updateField("prioridad", {
                            ...node.data.prioridad,
                            orden: [...(node.data.prioridad?.orden || []), { valor: "", posicion: 1 }],
                          })
                        }
                      >
                        ➕ Agregar valor
                      </button>
                    </div>
                  );
                }

                // Caso number → usuario escribe números
                if (tipo === "number") {
                  return (
                    <div>
                      {(node.data.prioridad?.orden || []).map((o, idx) => (
                        <div key={idx}>
                          <input
                            type="number"
                            placeholder="Número"
                            value={o.valor}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const newOrden = [...node.data.prioridad.orden];
                              newOrden[idx].valor = val;
                              updateField("prioridad", {
                                ...node.data.prioridad,
                                orden: newOrden,
                              });
                            }}
                            style={{ marginRight: "5px" }}
                          />
                          <input
                            type="number"
                            min="1"
                            value={o.posicion}
                            onChange={(e) => {
                              const pos = parseInt(e.target.value) || 1;
                              const newOrden = [...node.data.prioridad.orden];
                              newOrden[idx].posicion = pos;
                              updateField("prioridad", {
                                ...node.data.prioridad,
                                orden: newOrden,
                              });
                            }}
                            style={{ width: "50px" }}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          updateField("prioridad", {
                            ...node.data.prioridad,
                            orden: [...(node.data.prioridad?.orden || []), { valor: 0, posicion: 1 }],
                          })
                        }
                      >
                        ➕ Agregar número
                      </button>
                    </div>
                  );
                }

                return <p>⚠️ Tipo de atributo no soportado</p>;
              })()}
            </div>
          )}
        </div>
      )}




      {/* Capacidad */}
      <label style={labelStyle}>
        Capacidad:
        <input
          type="text"
          value={node.data.capacidad || "inf"}
          onChange={(e) => updateField("capacidad", e.target.value)}
          placeholder="Ej: 10 o 'inf'"
          style={inputStyle}
        />
      </label>

      {/* Entradas y Salidas */}
      <label style={labelStyle}>
        Entradas:
        <input
          type="number"
          min="1"
          value={node.data.entradas || 1}
          onChange={(e) => updateField("entradas", parseInt(e.target.value))}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Salidas:
        <input
          type="number"
          min="1"
          value={node.data.salidas || 1}
          onChange={(e) => updateField("salidas", parseInt(e.target.value))}
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

      {/* Intervalo de muestreo */}
      <label style={{ marginLeft: "10px" }}>
        Intervalo:
          <input
            type="number"
            min="0"
            value={s.intervalo ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              const parsed = raw === "" ? "" : parseFloat(raw);
              const safe = parsed === "" ? "" : (parsed < 0 ? 0 : parsed);
              updateSensor(idx, "intervalo", safe);
            }}
            style={{ marginLeft: "5px", width: "80px" }}
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
  <button type="button" onClick={addSensor}>➕ Agregar Sensor</button>
</div>






      {/* Fallas */}
      <div style={{ marginTop: "10px" }}>
        <strong>Fallas:</strong>
        {paramsState.failures.map((f, idx) => (
          <div key={idx} style={{ marginBottom: 10, padding: 8, border: "1px solid #ccc" }}>
            
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
              <label>
                λ:
                <input
                  type="number"
                  value={f.dist_activacion.params?.lambda ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateFailure(idx, "dist_activacion", {
                      ...f.dist_activacion,
                      params: { ...f.dist_activacion.params, lambda: val === "" ? "" : parseFloat(val) },
                    });
                  }}
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
                    onChange={(e) => {
                      const val = e.target.value;
                      updateFailure(idx, "dist_activacion", {
                        ...f.dist_activacion,
                        params: { ...f.dist_activacion.params, mu: val === "" ? "" : parseFloat(val) },
                      });
                    }}
                  />
                </label>
                <label>
                  σ:
                  <input
                    type="number"
                    value={f.dist_activacion.params?.sigma ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateFailure(idx, "dist_activacion", {
                        ...f.dist_activacion,
                        params: { ...f.dist_activacion.params, sigma: val === "" ? "" : parseFloat(val) },
                      });
                    }}
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
                    onChange={(e) => {
                      const val = e.target.value;
                      updateFailure(idx, "dist_activacion", {
                        ...f.dist_activacion,
                        params: { ...f.dist_activacion.params, a: val === "" ? "" : parseFloat(val) },
                      });
                    }}
                  />
                </label>
                <label>
                  b:
                  <input
                    type="number"
                    value={f.dist_activacion.params?.b ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateFailure(idx, "dist_activacion", {
                        ...f.dist_activacion,
                        params: { ...f.dist_activacion.params, b: val === "" ? "" : parseFloat(val) },
                      });
                    }}
                  />
                </label>
              </>
            )}
            {f.dist_activacion?.tipo === "Fija" && (
              <label>
                Valor fijo:
                <input
                  type="number"
                  value={f.dist_activacion.params?.valor ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateFailure(idx, "dist_activacion", {
                      ...f.dist_activacion,
                      params: { ...f.dist_activacion.params, valor: val === "" ? "" : parseFloat(val) },
                    });
                  }}
                />
              </label>
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

            {/* Parámetros duración */}
            {f.dist_duracion?.tipo === "Exponencial" && (
              <label>
                λ:
                <input
                  type="number"
                  value={f.dist_duracion.params?.lambda ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateFailure(idx, "dist_duracion", {
                      ...f.dist_duracion,
                      params: { ...f.dist_duracion.params, lambda: val === "" ? "" : parseFloat(val) },
                    });
                  }}
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
                      onChange={(e) => {
                        const val = e.target.value;
                        updateFailure(idx, "dist_duracion", {
                          ...f.dist_duracion,
                          params: { ...f.dist_duracion.params, mu: val === "" ? "" : parseFloat(val) },
                        });
                      }}
                    />
                </label>
                <label>
                  σ:
                    <input
                      type="number"
                      value={f.dist_duracion.params?.sigma ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateFailure(idx, "dist_duracion", {
                          ...f.dist_duracion,
                          params: { ...f.dist_duracion.params, sigma: val === "" ? "" : parseFloat(val) },
                        });
                      }}
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
                      onChange={(e) => {
                        const val = e.target.value;
                        updateFailure(idx, "dist_duracion", {
                          ...f.dist_duracion,
                          params: { ...f.dist_duracion.params, a: val === "" ? "" : parseFloat(val) },
                        });
                      }}
                    />
                </label>
                <label>
                  b:
                    <input
                      type="number"
                      value={f.dist_duracion.params?.b ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateFailure(idx, "dist_duracion", {
                          ...f.dist_duracion,
                          params: { ...f.dist_duracion.params, b: val === "" ? "" : parseFloat(val) },
                        });
                      }}
                    />
                </label>
              </>
            )}
            {f.dist_duracion?.tipo === "Fija" && (
              <label>
                Valor fijo:
                <input
                  type="number"
                  value={f.dist_duracion.params?.valor ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateFailure(idx, "dist_duracion", {
                      ...f.dist_duracion,
                      params: { ...f.dist_duracion.params, valor: val === "" ? "" : parseFloat(val) },
                    });
                  }}
                />
              </label>
            )}

            <button type="button" onClick={() => removeFailure(idx)}>❌</button>
          </div>
        ))}
        <button type="button" onClick={addFailure}>➕ Agregar Falla</button>
      </div>





      {/* <button onClick={handleSave}>💾 Guardar</button> */}
    </div>
  );
}