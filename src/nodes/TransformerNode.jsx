import React from "react";
import { Handle, Position } from "@xyflow/react";

/**
 * data expected shape:
 * {
 *  label,
 *  distribucion,
 *  entradasDef: [{ elemento, cantidad }],
 *  salidasDef: [{ cantidad, elemento, params: {key: value} }],
 *  receta: { inputs: [{elemento,cantidad}], outputs: [{elemento,cantidad}] }
 * }
 */
export default function TransformerNode({ data }) {
  const {
    label,
    distribucion = "fijo",
    entradasDef = [],
    salidasDef = [],
    tipo = "Transformador",
  } = data;
  console.log("data del transformar",data)
  // Únicos por elemento (mantiene cantidad asociado al primer match)
  const uniqueByElement = (arr) => {
    const seen = new Set();
    return arr.filter((item) => {
      if (!item || !item.elemento || seen.has(item.elemento)) return false;
      seen.add(item.elemento);
      return true;
    });
  };

  const entradasUnique = uniqueByElement(entradasDef || []);
  const salidasUnique = uniqueByElement(salidasDef || []);
  data.params = data.params ?? {};
  data.params.distribution = data.params.distribution ?? {};
  data.params.distribution.default = data.params.distribution.default ?? {};
  data.params.distribution.default.type = data.params.distribution.default.type ?? "fijo";
  // helper para calcular top offset
  const handleTop = (index, total) => 40 + index * Math.max(20, 120 / Math.max(1, total));

  return (
    <div
      style={{
        padding: 10,
        border: "2px solid #9c27b0",
        borderRadius: 5,
        background: "#f3e5f5",
        minWidth: 220,
        color: "#000",
        position: "relative",
      }}
    >
      <p><b>Tipo:</b> {tipo}</p>
      <strong>{label}</strong>
      <p><b>Distribución:</b> {data.params.distribution.default.type}</p>

      <div>
        <b>Receta (entradas requeridas)</b>
        <ul>
          {entradasUnique.length > 0
            ? entradasUnique.map((e, i) => (
                <li key={e.elemento + i}>
                  {(e.cantidad || 1)} × {e.elemento || "N/A"}
                </li>
              ))
            : <li>N/A</li>}
        </ul>
      </div>

      <div>
        <b>Receta (salidas producidas)</b>
        <ul>
          {salidasUnique.length > 0
            ? salidasUnique.map((s, i) => (
                <li key={s.elemento + i}>
                  {(s.cantidad || 1)} × {s.elemento || "N/A"}
                  {s.params && Object.keys(s.params).length > 0 && (
                    <ul>
                      {Object.entries(s.params).map(([k, v]) => (
                        <li key={k}>
                          {k}: {String(v)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))
            : <li>N/A</li>}
        </ul>
      </div>

      {/* Handles entradas: un único handle por elemento */}
      {entradasUnique.map((e, i) => (
        <Handle
          key={`in-${e.elemento}`}
          type="target"
          position={Position.Left}
          id={`${e.elemento}`}
          style={{ top: `${handleTop(i, entradasUnique.length)}px` }}
        />
      ))}

      {/* Handles salidas: un único handle por elemento */}
      {salidasUnique.map((s, i) => (
        <Handle
          key={`out-${s.elemento}`}
          type="source"
          position={Position.Right}
          id={`${s.elemento}`}
          style={{ top: `${handleTop(i, salidasUnique.length)}px` }}
        />
      ))}
    </div>
  );
}
