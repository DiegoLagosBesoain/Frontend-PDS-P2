import React from "react";
import { Handle, Position } from "@xyflow/react";

export default function GeneratorNode({ data }) {
  const { label, elemento, distribucion, intervalo, limite, onDemand } = data;
  console.log("Generator data", data);

  const renderDistribucion = () => {
    if (onDemand) {
      return <p><b>Distribución:</b> On Demand</p>;
    }
    if (!distribucion) {
      return <p><b>Distribución:</b> N/A</p>;
    }

    const { tipo, params } = distribucion;

    return (
      <div>
        <p><b>Distribución:</b> {tipo}</p>
        {params &&
          Object.entries(params).map(([k, v]) => (
            <p key={k} style={{ marginLeft: "8px" }}>
              • {k}: {v}
            </p>
          ))}
      </div>
    );
  };

  return (
    <div
      style={{
        border: "2px solid #4CAF50",
        padding: "10px",
        borderRadius: "8px",
        background: "#e8f5e9",
        width: "200px",
        color: "#000",
        fontSize: "12px",
      }}
    >
      <strong style={{ color: "#000" }}>{label || "Generador"}</strong>
      <div>
        <p><b>Tipo:</b> Generador</p>
        <p><b>Elemento:</b> {elemento || "N/A"}</p>
        {renderDistribucion()}
        <p><b>Intervalo:</b> {intervalo ?? "N/A"}</p>
        {limite && <p><b>Límite:</b> {limite}</p>}
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
