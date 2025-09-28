import { useEffect, useState } from "react";
const API_URL = import.meta.env.API_URL;

export default function CreateElementModal({
  project_id,
  onClose,
  onSave,
  initialElement = null, // <-- nuevo
}) {
  const [type, setType] = useState("element");
  const [params, setParams] = useState([{ key: "", dtype: "string" }]);

  useEffect(() => {
    if (initialElement) {
      setType(initialElement.type);
      const arr = Object.entries(initialElement.params || {}).map(([k, v]) => ({
        key: k,
        dtype: v,
      }));
      setParams(arr.length ? arr : [{ key: "", dtype: "string" }]);
    }
  }, [initialElement]);

  const addParam = () => setParams([...params, { key: "", dtype: "string" }]);
  const removeParam = (i) => setParams(params.filter((_, idx) => idx !== i));
  const updateParam = (i, field, val) =>
    setParams(params.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));

  const handleSave = async () => {
    const paramsDict = {};
    params.forEach((p) => {
      if (p.key.trim()) paramsDict[p.key.trim()] = p.dtype;
    });

    const payload = { type, params: paramsDict };
    let res;
    if (initialElement) {
      res = await fetch(
        `${API_URL}/elements/${initialElement.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
    } else {
      res = await fetch(`${API_URL}/processes/${project_id}/elements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    const el = await res.json();
    onSave(el);
  };

  return (
    <div
      style={{
        position: "absolute",
        color: "#000",
        top: "20%",
        left: "40%",
        background: "#fff",
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        zIndex: 1000,
      }}
    >
      <h3>{initialElement ? "Editar elemento" : "Crear nuevo elemento"}</h3>
      <label>
        Tipo:
        <input value={type} onChange={(e) => setType(e.target.value)} />
      </label>

      <h4>Atributos</h4>
      {params.map((p, i) => (
        <div key={i} style={{ display: "flex", gap: "5px", marginBottom: "5px" }}>
          <input
            placeholder="atributo"
            value={p.key}
            onChange={(e) => updateParam(i, "key", e.target.value)}
          />
          <select
            value={p.dtype}
            onChange={(e) => updateParam(i, "dtype", e.target.value)}
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="bool">bool</option>
          </select>
          <button onClick={() => removeParam(i)}>Eliminar</button>
        </div>
      ))}

      <button onClick={addParam}>Agregar atributo</button>
      <br />
      <br />

      <button onClick={handleSave}>Guardar</button>
      <button onClick={onClose}>Cancelar</button>
    </div>
  );
}