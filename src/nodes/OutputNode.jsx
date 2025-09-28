import React from "react";
import { Handle, Position } from "@xyflow/react";

export default function OutputNode({ data }) {
  const { label, entradas = 1, elemento = "NA" } = data;
  console.log("output data:", data)

  return (
    <div
      style={{
  border: "2px solid #f44336", // borde rojo
  borderRadius: "8px",
  background: "#ffebee",       // fondo rosado claro
  width: "180px",
  color: "#000",
  fontSize: "12px",
  textAlign: "center",
  position: "relative",        // importante para los Handles
}}
    >
      <p><b>Tipo:</b> Salida</p>
      <strong>{label}</strong>
      <p><b>Elemento:</b> {elemento}</p>

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
      
    </div>
  );
}