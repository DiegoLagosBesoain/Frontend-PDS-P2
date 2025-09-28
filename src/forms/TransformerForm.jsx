import React, { useState, useEffect } from "react";

export default function TransformerForm({ node, setEditingNode, elements = [] }) {
  const data = node.data || {};
  const {
    label = "",
    distribucion = "fijo",
    t_proceso = 0,
    entradasDef = [],
    salidasDef = [],
    tipo = "Transformador",
    salidas = 1,
    params = {},
  } = data;

  // ---------- Distribuciones helpers ----------
  const DIST_TYPES = ["Exponencial", "Uniforme", "Normal", "Fija"];

  const makeDefaultForType = (type) => {
    if (type === "Exponencial") return { type, params: { lambda: 1 } };
    if (type === "Uniforme") return { type, params: { min: 0, max: 1 } };
    if (type === "Normal") return { type, params: { mu: 0, sigma: 1 } };
    return { type: "Fija", params: { value: "" } };
  };

  // normalizar failures entrantes (si vienen en formatos antiguos)
  const normalizedFailures = (params.failures || []).map((f) => {
    const distAct =
      f && f.dist_activacion && typeof f.dist_activacion === "object"
        ? f.dist_activacion
        : makeDefaultForType("Fija");
    const distDur =
      f && f.dist_duracion && typeof f.dist_duracion === "object"
        ? f.dist_duracion
        : makeDefaultForType("Fija");
    return { ...f, dist_activacion: distAct, dist_duracion: distDur };
  });

  // ---------- Estados locales ----------
  // entradas ahora incluyen cantidad (cuántas unidades consume el transformador de esa entrada)
  const [localEntradas, setLocalEntradas] = useState(
    (entradasDef && entradasDef.length
      ? entradasDef.map((e) => ({ elemento: e.elemento || "", cantidad: e.cantidad ?? 1 }))
      : []
    )
  );

  // salidasDef ya tiene cantidad pero aseguramos estructura
  const [localSalidas, setLocalSalidas] = useState(
    (salidasDef && salidasDef.length
      ? salidasDef.map((s) => ({ elemento: s.elemento || "", cantidad: s.cantidad ?? 1, params: s.params || {} }))
      : []
    )
  );

const [paramsState, setParamsState] = useState({
  sensors: (params.sensors || []).map((s) => ({
    type: s.type || "",
    id_entradas: s.id_entradas || [],
    id_salidas: s.id_salidas || [],
    samplingInterval: s.samplingInterval ?? 1,
  })),
  failures: normalizedFailures,
  distribution: {
    default: params.distribution?.default || makeDefaultForType("Fija"),
    conditions: Array.isArray(params.distribution?.conditions)
      ? params.distribution.conditions
      : [],
  },
});


  // ---------- Entradas ----------
  const addEntrada = () => setLocalEntradas([...localEntradas, { elemento: "", cantidad: 1 }]);
  const removeEntrada = (idx) => setLocalEntradas(localEntradas.filter((_, i) => i !== idx));
  const handleEntradaSelect = (idx, value) => {
    const updated = [...localEntradas];
    updated[idx] = { elemento: value, cantidad: updated[idx]?.cantidad ?? 1 };
    setLocalEntradas(updated);
  };
  const handleEntradaCantidad = (idx, val) => {
    const updated = [...localEntradas];
    updated[idx] = { ...(updated[idx] || {}), cantidad: Math.max(1, parseInt(val || "1", 10)) };
    setLocalEntradas(updated);
  };

  // ---------- Salidas ----------
  useEffect(() => {
    const updated = [...localSalidas];
    while (updated.length < salidas) updated.push({ cantidad: 1, elemento: "", params: {} });
    setLocalSalidas(updated.slice(0, salidas));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salidas]);

  const handleSalidaSelect = (idx, elementType) => {
    const elObj = elements.find((e) => e.type === elementType);
    const updated = [...localSalidas];
    updated[idx] = {
      ...updated[idx],
      elemento: elementType,
      cantidad: updated[idx]?.cantidad ?? 1,
      params: elObj
        ? Object.keys(elObj.params || {}).reduce((acc, k) => {
            const dtype = elObj.params[k];
            if (dtype === "bool") return { ...acc, [k]: false };
            if (dtype === "number") return { ...acc, [k]: 0 };
            return { ...acc, [k]: "" };
          }, {})
        : {},
    };
    setLocalSalidas(updated);
  };

  const handleSalidaCantidad = (idx, val) => {
    const updated = [...localSalidas];
    updated[idx] = { ...(updated[idx] || {}), cantidad: Math.max(1, parseInt(val || "1", 10)) };
    setLocalSalidas(updated);
  };

  const handleSalidaParamChange = (idx, key, dtype, raw) => {
    const updated = [...localSalidas];
    let value = raw;
    if (dtype === "number") value = raw === "" ? "" : parseFloat(raw);
    else if (dtype === "bool") value = raw === "true";
    updated[idx].params = { ...(updated[idx].params || {}), [key]: value };
    setLocalSalidas(updated);
  };

  // ---------- Sensores ----------
  const allowedSensors = [
    "contador",
    "medidor_flujo",
    "porcentaje_tiempo_encendido",
    "porcentaje_tiempo_funcionamiento",
  ];

  const addSensor = () =>
    setParamsState((prev) => ({
      ...prev,
      sensors: [...prev.sensors, { type: "", id_entradas: [], id_salidas: [], samplingInterval: 1 }],
    }));

  const removeSensor = (idx) =>
    setParamsState((prev) => ({
      ...prev,
      sensors: prev.sensors.filter((_, i) => i !== idx),
    }));

  const updateSensor = (idx, field, value) => {
    setParamsState((prev) => {
      const sensors = [...prev.sensors];
      sensors[idx] = { ...sensors[idx], [field]: value };
      return { ...prev, sensors };
    });
  };

  // ---------- Fallas ----------
  const addFalla = () =>
    setParamsState((prev) => ({
      ...prev,
      failures: [
        ...prev.failures,
        { dist_activacion: makeDefaultForType("Fija"), dist_duracion: makeDefaultForType("Fija") },
      ],
    }));

  const removeFalla = (idx) =>
    setParamsState((prev) => ({
      ...prev,
      failures: prev.failures.filter((_, i) => i !== idx),
    }));

  const updateFalla = (idx, field, value) => {
    setParamsState((prev) => {
      const failures = [...prev.failures];
      failures[idx] = { ...failures[idx], [field]: value };
      return { ...prev, failures };
    });
  };

  // ---------- Helpers elementos de entrada (únicos) ----------
  const availableEntradaTypes = Array.from(
    new Set(localEntradas.map((e) => e.elemento).filter(Boolean))
  );

  // ---------- Distribuciones: CRUD de condiciones ----------
const addCondition = () => {
  if (availableEntradaTypes.length === 0) {
    alert("No hay elementos en las entradas para condicionar. Agrega primero una entrada.");
    return;
  }

  const existingElement =
    paramsState.distribution?.conditions?.find((c) => c.elementType)?.elementType;

  setParamsState((prev) => ({
    ...prev,
    distribution: {
      ...prev.distribution,
      conditions: [
        ...(prev.distribution?.conditions || []),
        {
          id: `${Date.now()}-${Math.random()}`,
          elementType: existingElement || "",
          paramKey: "",
          operator: "=",
          value: "",
          distribution: makeDefaultForType("Fija"),
        },
      ],
    },
  }));
};


  const updateCondition = (id, patch) => {
    const existingElement = paramsState.distribution.conditions.find((c) => c.elementType)?.elementType;
    if (patch.elementType && existingElement && patch.elementType !== existingElement) {
      alert(`Ya existe un elemento condicionante ("${existingElement}"). Todas las condiciones deben usar ese mismo elemento.`);
      return;
    }
    if (patch.elementType && !availableEntradaTypes.includes(patch.elementType)) {
      alert("El elemento condicionante debe ser uno de los elementos de las entradas.");
      return;
    }
    if (patch.paramKey && patch.paramKey !== "") {
      const elType = patch.elementType || paramsState.distribution.conditions.find((c) => c.id === id)?.elementType;
      const elDef = elements.find((el) => el.type === elType);
      const dtype = elDef?.params?.[patch.paramKey];
      if (dtype === "bool") {
        const existsOther = paramsState.distribution.conditions.some((c) => c.id !== id && c.paramKey === patch.paramKey);
        if (existsOther) {
          alert("Solo se permite una condición por parámetro booleano.");
          return;
        }
      }
    }
    setParamsState((prev) => ({
      ...prev,
      distribution: {
        ...prev.distribution,
        conditions: prev.distribution.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
    }));
  };

  const removeCondition = (id) => {
    setParamsState((prev) => ({
      ...prev,
      distribution: {
        ...prev.distribution,
        conditions: prev.distribution.conditions.filter((c) => c.id !== id),
      },
    }));
  };

  // ---------- Sync form -> editingNode (incluye receta) ----------
  useEffect(() => {
    // hymn: actualizar editingNode.data con entradas/salidas y receta
    setEditingNode((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        label,
        tipo,
        distribucion,
        t_proceso,
        entradasDef: localEntradas,
        salidasDef: localSalidas,
        salidas,
        params: { ...params, ...paramsState },
        // receta: inputs (entradas con cantidad) and outputs (salidas with cantidad)
        receta: {
          inputs: localEntradas.map((e) => ({ elemento: e.elemento, cantidad: e.cantidad || 1 })),
          outputs: localSalidas.map((s) => ({ elemento: s.elemento, cantidad: s.cantidad || 1 })),
        },
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localEntradas, localSalidas, salidas, paramsState, label, tipo, distribucion, t_proceso]);

  // ---------- Helpers for element param types ----------
  const getElementDef = (elementType) => elements.find((el) => el.type === elementType) || null;

  // UI helpers for distribution param inputs
  const DistributionEditor = ({ value, onChange }) => {
    const { type: dType = "Fija", params: dParams = {} } = value || {};
    const setType = (t) => onChange(makeDefaultForType(t));
    const setParam = (key, v) => onChange({ ...value, params: { ...dParams, [key]: v } });

    return (
      <div style={{ padding: 8, border: "1px dashed #ddd", marginTop: 6 }}>
        <label>
          Tipo de distribución:
          <select value={dType} onChange={(e) => setType(e.target.value)} style={{ marginLeft: 8 }}>
            {DIST_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        {dType === "Exponencial" && (
          <div style={{ marginTop: 8 }}>
            <label>
              λ:
              <input type="number" value={dParams.lambda ?? ""} onChange={(e) => setParam("lambda", parseFloat(e.target.value) || "")} style={{ marginLeft: 8 }} />
            </label>
          </div>
        )}

        {dType === "Uniforme" && (
          <div style={{ marginTop: 8 }}>
            <label>
              Mín:
              <input type="number" value={dParams.min ?? ""} onChange={(e) => setParam("min", parseFloat(e.target.value) || "")} style={{ marginLeft: 8, marginRight: 12 }} />
            </label>
            <label>
              Máx:
              <input type="number" value={dParams.max ?? ""} onChange={(e) => setParam("max", parseFloat(e.target.value) || "")} style={{ marginLeft: 8 }} />
            </label>
          </div>
        )}

        {dType === "Normal" && (
          <div style={{ marginTop: 8 }}>
            <label>
              μ:
              <input type="number" value={dParams.mu ?? ""} onChange={(e) => setParam("mu", parseFloat(e.target.value) || "")} style={{ marginLeft: 8, marginRight: 12 }} />
            </label>
            <label>
              σ:
              <input type="number" value={dParams.sigma ?? ""} onChange={(e) => setParam("sigma", parseFloat(e.target.value) || "")} style={{ marginLeft: 8 }} />
            </label>
          </div>
        )}

        {dType === "Fija" && (
          <div style={{ marginTop: 8 }}>
            <label>
              Valor:
              <input type="text" value={dParams.value ?? ""} onChange={(e) => setParam("value", e.target.value)} style={{ marginLeft: 8 }} />
            </label>
          </div>
        )}
      </div>
    );
  };

  const inputStyle = {
    width: "100%",
    padding: "6px 8px",
    marginTop: 4,
    borderRadius: 6,
    border: "1px solid #888",
    background: "#fff",
    color: "#000",
  };
  const labelStyle = { display: "flex", flexDirection: "column", marginBottom: 10 };

  return (
    <div style={{ background: "#fff", padding: 10, borderRadius: 6 }}>
      <h3>Editar Transformador</h3>

      {/* Campos básicos */}
      <label style={labelStyle}>
        Label:
        <input style={inputStyle} value={label} onChange={(e) => setEditingNode({ ...node, data: { ...data, label: e.target.value } })} />
      </label>

      <label style={labelStyle}>
        Tipo:
        <input style={inputStyle} value={tipo} onChange={(e) => setEditingNode({ ...node, data: { ...data, tipo: e.target.value } })} />
      </label>

      <label style={labelStyle}>
        Distribución general (default):
        <DistributionEditor
          value={paramsState.distribution?.default}
          onChange={(d) => setParamsState((prev) => ({ ...prev, distribution: { ...prev.distribution, default: d } }))}
        />
      </label>

      <div style={{ marginTop: 8 }}>
        <b>Distribuciones condicionales</b>
        <p style={{ margin: "6px 0", color: "#555" }}>
          Puedes añadir condiciones basadas en un parámetro de un elemento (de las entradas). <br />
          Nota: todas las condiciones deben usar el mismo elemento condicionante (si eliges uno, las demás deberán usarlo).
        </p>

        {paramsState.distribution?.conditions?.map((cond) => {
          const elDef = getElementDef(cond.elementType);
          const paramKeys = elDef ? Object.keys(elDef.params || {}) : [];
          const dtype = elDef && cond.paramKey ? elDef.params[cond.paramKey] : null;

          return (
            <div key={cond.id} style={{ border: "1px solid #eee", padding: 8, marginBottom: 8 }}>
              <label>
                Elemento condicionante (solo de las entradas):
                <select
                  value={cond.elementType || ""}
                  onChange={(e) => updateCondition(cond.id, { elementType: e.target.value, paramKey: "" })}
                  style={{ marginLeft: 8 }}
                >
                  <option value="">-- Seleccionar elemento --</option>
                  {availableEntradaTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ marginTop: 6 }}>
                Parámetro:
                <select value={cond.paramKey || ""} onChange={(e) => updateCondition(cond.id, { paramKey: e.target.value })} style={{ marginLeft: 8 }}>
                  <option value="">-- Seleccionar parámetro --</option>
                  {paramKeys.map((k) => (
                    <option key={k} value={k}>
                      {k} ({elDef.params[k]})
                    </option>
                  ))}
                </select>
              </label>

              {cond.paramKey && (
                <div style={{ marginTop: 6 }}>
                  {dtype === "bool" && (
                    <>
                      <label>
                        Valor:
                        <select value={String(cond.value ?? "true")} onChange={(e) => updateCondition(cond.id, { operator: "=", value: e.target.value === "true" })} style={{ marginLeft: 8 }}>
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      </label>
                      <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>Nota: boolean solo permite igualdad y una condición por parámetro bool.</div>
                    </>
                  )}

                  {dtype === "number" && (
                    <>
                      <label>
                        Operador:
                        <select value={cond.operator || "="} onChange={(e) => updateCondition(cond.id, { operator: e.target.value })} style={{ marginLeft: 8 }}>
                          <option value=">">{">"}</option>
                          <option value="<">{"<"}</option>
                          <option value=">=">{">="}</option>
                          <option value="<=">{"<="}</option>
                          <option value="=">{"="}</option>
                        </select>
                      </label>

                      <label style={{ marginTop: 6 }}>
                        Valor:
                        <input type="number" value={cond.value ?? ""} onChange={(e) => updateCondition(cond.id, { value: e.target.value === "" ? "" : parseFloat(e.target.value) })} style={{ marginLeft: 8 }} />
                      </label>
                    </>
                  )}

                  {(!dtype || dtype === "string") && (
                    <>
                      <label>
                        Valor (string):
                        <input type="text" value={cond.value ?? ""} onChange={(e) => updateCondition(cond.id, { value: e.target.value })} style={{ marginLeft: 8 }} />
                      </label>
                      <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>Nota: strings solo permiten igualdad.</div>
                    </>
                  )}
                </div>
              )}

              <div style={{ marginTop: 8 }}>
                <b>Distribución si condición se cumple</b>
                <DistributionEditor value={cond.distribution} onChange={(d) => updateCondition(cond.id, { distribution: d })} />
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button onClick={() => removeCondition(cond.id)}>❌ Eliminar condición</button>
              </div>
            </div>
          );
        })}

        <button onClick={() => addCondition()} style={{ marginTop: 8 }}>
          ➕ Agregar condición
        </button>
      </div>

      <hr />

      {/* Entradas */}
      <div>
        <b>Entradas (cantidad requerida por lote)</b>
        {localEntradas.map((cur, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <select style={{ flex: 1, ...inputStyle }} value={cur.elemento} onChange={(e) => handleEntradaSelect(i, e.target.value)}>
              <option value="">-- Seleccionar elemento --</option>
              {elements.map((el) => (
                <option key={el.id} value={el.type}>
                  {el.type}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              style={{ width: 90, ...inputStyle }}
              value={cur.cantidad ?? 1}
              onChange={(e) => handleEntradaCantidad(i, e.target.value)}
            />

            <button onClick={() => removeEntrada(i)} style={{ marginLeft: 8 }}>
              ❌
            </button>
          </div>
        ))}
        <button onClick={addEntrada}>➕ Agregar Entrada</button>
      </div>

      <hr />

      {/* Salidas */}
      <label style={labelStyle}>
        Salidas:
        <input type="number" style={inputStyle} min="1" value={salidas} onChange={(e) => setEditingNode({ ...node, data: { ...data, salidas: Math.max(1, parseInt(e.target.value) || 1) } })} />
      </label>

      {localSalidas.map((cur, i) => {
        const selEl = elements.find((el) => el.type === cur.elemento);
        return (
          <div key={i} style={{ marginBottom: 12, border: "1px solid #eee", padding: 6 }}>
            <label>Salida #{i + 1}:</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
              <select style={{ flex: 1, ...inputStyle }} value={cur.elemento} onChange={(e) => handleSalidaSelect(i, e.target.value)}>
                <option value="">-- Seleccionar elemento --</option>
                {elements.map((el) => (
                  <option key={el.id} value={el.type}>
                    {el.type}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                style={{ width: 90, ...inputStyle }}
                value={cur.cantidad ?? 1}
                onChange={(e) => handleSalidaCantidad(i, e.target.value)}
              />
            </div>

            {selEl &&
              Object.entries(selEl.params || {}).map(([k, dtype]) => (
                <div key={k} style={{ marginTop: 8 }}>
                  <label>{k}:</label>
                  {dtype === "bool" ? (
                    <select style={inputStyle} value={String(cur.params[k] ?? false)} onChange={(e) => handleSalidaParamChange(i, k, "bool", e.target.value)}>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input type={dtype === "number" ? "number" : "text"} style={inputStyle} value={cur.params[k] ?? ""} onChange={(e) => handleSalidaParamChange(i, k, dtype, e.target.value)} />
                  )}
                </div>
              ))}
          </div>
        );
      })}

      <hr />

      {/* Sensores */}
      <div>
        <b>Sensores</b>
        {paramsState.sensors.map((s, i) => (
          <div key={i} style={{ border: "1px solid #eee", padding: 6, marginBottom: 6 }}>
            <label>Tipo de sensor:</label>
            <select style={inputStyle} value={s.type} onChange={(e) => updateSensor(i, "type", e.target.value)}>
              <option value="">-- Seleccionar sensor --</option>
              {allowedSensors.map((stype) => (
                <option key={stype} value={stype}>
                  {stype}
                </option>
              ))}
            </select>

            <label style={{ marginTop: 6 }}>
              Intervalo de muestreo (entero):
              <input
                type="number"
                min="1"
                style={inputStyle}
                value={s.samplingInterval ?? 1}
                onChange={(e) => updateSensor(i, "samplingInterval", Math.max(1, parseInt(e.target.value || "1", 10)))}
              />
            </label>

            {/* Entradas con checkboxes */}
            <label style={{ marginTop: 6 }}>Entradas conectadas:</label>
            <div>
              {localEntradas.map((entrada, idx) => {
                const val = entrada.elemento || `Entrada ${idx + 1}`;
                const checked = s.id_entradas?.includes(val);
                return (
                  <label key={idx} style={{ display: "block" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        let newEntradas = [...(s.id_entradas || [])];
                        if (e.target.checked) newEntradas.push(val);
                        else newEntradas = newEntradas.filter((v) => v !== val);
                        updateSensor(i, "id_entradas", newEntradas);
                      }}
                    />
                    {val}
                  </label>
                );
              })}
            </div>

            {/* Salidas con checkboxes */}
            <label style={{ marginTop: 6 }}>Salidas conectadas:</label>
            <div>
              {localSalidas.map((salida, idx) => {
                const val = salida.elemento || `Salida ${idx + 1}`;
                const checked = s.id_salidas?.includes(val);
                return (
                  <label key={idx} style={{ display: "block" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        let newSalidas = [...(s.id_salidas || [])];
                        if (e.target.checked) newSalidas.push(val);
                        else newSalidas = newSalidas.filter((v) => v !== val);
                        updateSensor(i, "id_salidas", newSalidas);
                      }}
                    />
                    {val}
                  </label>
                );
              })}
            </div>

            <button onClick={() => removeSensor(i)} style={{ marginTop: 6 }}>
              ❌ Eliminar sensor
            </button>
          </div>
        ))}
        <button onClick={addSensor}>➕ Agregar sensor</button>
      </div>

      <hr />

      {/* Fallas */}
      <div>
        <b>Fallas</b>
        {paramsState.failures.map((f, i) => (
          <div key={i} style={{ border: "1px solid #eee", padding: 6, marginBottom: 6 }}>
            <label>Distribución de activación:</label>
            <DistributionEditor value={f.dist_activacion} onChange={(d) => updateFalla(i, "dist_activacion", d)} />

            <label style={{ marginTop: 8 }}>Distribución de duración:</label>
            <DistributionEditor value={f.dist_duracion} onChange={(d) => updateFalla(i, "dist_duracion", d)} />

            <button onClick={() => removeFalla(i)} style={{ marginTop: 6 }}>
              ❌ Eliminar falla
            </button>
          </div>
        ))}
        <button onClick={addFalla}>➕ Agregar falla</button>
      </div>
    </div>
  );
}
