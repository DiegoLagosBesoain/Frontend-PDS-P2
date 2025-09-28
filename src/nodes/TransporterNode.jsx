import React from "react";
import { Handle, Position } from "@xyflow/react";

export default function TransporterNode({ data }) {
  const {
    label,
    tipo, // "continuo" o "movil"
    elemento,
    distribucion, // { tipo: "Exponencial"|"Normal"|"Uniforme"|"Fija", params: {...} }
    t_viaje,
    t_min_entrada,
    capacidad,
    t_espera_max,
  } = data;
  console.log("transporter data: ", data)
  // Render dinámico de parámetros de distribución
  const renderDistribucionParams = () => {
    if (!distribucion?.tipo) return null;

    switch (distribucion.tipo) {
      case "Exponencial":
        return <p>λ: {distribucion.params?.lambda ?? "N/A"}</p>;
      case "Normal":
        return (
          <>
            <p>μ: {distribucion.params?.mu ?? "N/A"}</p>
            <p>σ: {distribucion.params?.sigma ?? "N/A"}</p>
          </>
        );
      case "Uniforme":
        return (
          <>
            <p>a: {distribucion.params?.a ?? "N/A"}</p>
            <p>b: {distribucion.params?.b ?? "N/A"}</p>
          </>
        );
      case "Fija":
        return <p>Valor: {distribucion.params?.valor ?? "N/A"}</p>;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        padding: 10,
        border: "2px solid #ff9800",
        borderRadius: 5,
        background: "#fff3e0",
        color: "#000",
        minWidth: 200,
        position: "relative",
      }}
    >
      <p><b>Tipo:</b> Transportador ({tipo || "N/A"})</p>
      <strong>{label}</strong>
      <p><b>Elemento:</b> {elemento || "N/A"}</p>
      <p><b>Distribución:</b> {distribucion?.tipo || "N/A"}</p>
      {renderDistribucionParams()}
      

      {tipo === "continuo" && (
        <p><b>Tiempo mínimo entre entradas:</b> {t_min_entrada ?? "N/A"}</p>
      )}

      {tipo === "movil" && (
        <>
          <p><b>Capacidad:</b> {capacidad ?? "N/A"}</p>
          <p><b>Tiempo de espera máximo:</b> {t_espera_max ?? "N/A"}</p>
        </>
      )}

      {/* Handles */}
      <Handle type="target" position={Position.Left} id="in"/>
      <Handle type="source" position={Position.Right} id="out"/>
    </div>
  );
}
