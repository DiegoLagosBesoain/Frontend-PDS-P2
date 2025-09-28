import React from "react";
import { Handle, Position } from "@xyflow/react";

export default function QueueNode({ data }) {
  const { label, elemento, estrategia, capacidad, entradas = 1, salidas = 1 } = data;
  console.log("queue data:", data)
  return (
    <div
      style={{
        border: "2px solid #2196F3",
        padding: "10px",
        borderRadius: "8px",
        background: "#e3f2fd",
        width: "180px",
        color: "#000",
        fontSize: "12px",
        textAlign: "center",
        position: "relative", // importante para los Handles
      }}
    >
      <p><b>Tipo:</b> {"Fila"}</p>
      <strong>{label}</strong>
      <div>
        <p><b>Elemento:</b> {elemento || "N/A"}</p>
        <p><b>Estrategia:</b> {estrategia || "N/A"}</p>
        <p><b>Capacidad:</b> {capacidad || "inf"}</p>
      </div>

      {/* Handles de entrada */}
      {Array.from({ length: entradas }).map((_, i) => (
        <Handle
          key={`in-${i}`}
          type="target"
          position={Position.Left}
          id={`in-${i}`}
          style={{ top: `${(i + 1) * (100 / (entradas + 1))}%` }} // distribuye verticalmente
        />
      ))}

      {/* Handles de salida */}
      {Array.from({ length: salidas }).map((_, i) => (
        <Handle
          key={`out-${i}`}
          type="source"
          position={Position.Right}
          id={`out-${i}`}
          style={{ top: `${(i + 1) * (100 / (salidas + 1))}%` }} // distribuye verticalmente
        />
      ))}
    </div>
  );
}
