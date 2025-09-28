import React from "react";
import { Handle, Position } from "@xyflow/react";

/**
 * SelectorNode
 * Props: data = {
 *   label,
 *   elemento,
 *   entradas = 1,
 *   salidas = 1,
 *   estrategia = "prioridad", // "prioridad" o "orden"
 * }
 */
export default function SelectorNode({ data }) {
  const { label, elemento, entradas = 1, salidas = 1, estrategia = "prioridad" } = data;
  console.log("selector data:", data)
  // Helper para calcular posición vertical de los handles
  const handleTop = (index, total) => `${(index + 1) * (100 / (total + 1))}%`;

  return (
    <div
      style={{
        border: "2px solid #FF9800",
        padding: "10px",
        borderRadius: "8px",
        background: "#fff3e0",
        width: "200px",
        color: "#000",
        fontSize: "12px",
        textAlign: "center",
        position: "relative",
      }}
    >
      <p><b>Tipo:</b> Selector</p>
      <strong>{label}</strong>

      <div>
        <p><b>Elemento:</b> {elemento || "N/A"}</p>
        <p><b>Estrategia:</b> {estrategia}</p>
      </div>

      {/* Handles de entrada */}
      {Array.from({ length: entradas }).map((_, i) => (
        <Handle
          key={`in-${i}`}
          type="target"
          position={Position.Left}
          id={`in-${i}`}
          style={{ top: handleTop(i, entradas) }}
        />
      ))}

      {/* Handles de salida */}
      {Array.from({ length: salidas }).map((_, i) => (
        <Handle
          key={`out-${i}`}
          type="source"
          position={Position.Right}
          id={`out-${i}`}
          style={{ top: handleTop(i, salidas) }}
        />
      ))}

      
    </div>
  );
}
