// src/components/SensorsView.jsx
import React from "react";

/**
 * Props:
 *  - nodeStats (array)
 *  - components (array)
 *  - selectedSensorByNode (object)
 *  - selectSensorForNode(nodeId, idx)
 *  - onBack()
 */
export default function SensorsView({ nodeStats = [], components = [], selectedSensorByNode = {}, selectSensorForNode, onBack, timeUnit = "s" }) {
  // Helper para obtener tiempo / valor de un punto de serie de forma tolerante
  const readPoint = (pt) => {
    if (!pt) return { time: "-", value: "-" };
    const time = pt?.t ?? pt?.time ?? pt?.timestamp ?? pt?.ts ?? "-";
    const value = pt?.value ?? pt?.v ?? pt?.val ?? "-";
    return { time, value };
  };

  return (
    <div style={{ marginTop: 12 }}>
      <h4>Resultados por nodo / sensors</h4>
      {!nodeStats || nodeStats.length === 0 ? (
        <div>No hay datos de nodeStats en los resultados de la simulación.</div>
      ) : (
        nodeStats.map((node) => {
          const sensors = Array.isArray(node.sensors) ? node.sensors : [];
          const nodeId = node.nodeId || node.id || "unknown";
          const selectedIdx = selectedSensorByNode[nodeId] ?? 0;

          // buscar componente para obtener label
          const comp = components.find((c) => String(c.id) === String(nodeId));
          const compLabel = comp ? (comp.params?.label || comp.label || `${comp.type} ${String(comp.id).slice(0,8)}`) : null;

          return (
            <div key={nodeId} style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12, background: "var(--bg-alt)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {compLabel ? `${compLabel} — ${nodeId}` : nodeId}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "#666" }}>{sensors.length} sensor{(sensors.length !== 1) ? "es" : ""}</div>
                  <button className="btn" onClick={onBack}>Volver</button>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {sensors.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#666" }}>No hay sensores en este nodo.</div>
                  ) : sensors.map((sensor, idx) => {
                    const isActive = idx === selectedIdx;
                    return (
                      <button
                        key={idx}
                        className="btn"
                        onClick={() => selectSensorForNode(nodeId, idx)}
                        style={{
                          background: isActive ? "var(--accent)" : undefined,
                          color: isActive ? "#fff" : undefined,
                          borderColor: isActive ? "transparent" : undefined,
                        }}
                      >
                        Sensor {idx + 1}{sensor.type ? ` (${sensor.type})` : ""}
                      </button>
                    );
                  })}
                </div>

                {sensors.length > 0 && (() => {
                  const sidx = selectedIdx >= 0 && selectedIdx < sensors.length ? selectedIdx : 0;
                  const sensor = sensors[sidx];
                  const series = Array.isArray(sensor?.series) ? sensor.series: sensor.values?sensor.values : [];

                  return (
                    <div>
                      <div style={{ marginBottom: 8, fontSize: 13, color: "#333" }}>
                        Mostrando sensor {sidx + 1} — {series.length} puntos
                      </div>

                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--bg)" }}>
                          <thead>
                            <tr>
                              <th style={{ border: "1px solid var(--border)", padding: 8, background: "var(--bg-alt)" }}>t / time</th>
                              <th style={{ border: "1px solid var(--border)", padding: 8, background: "var(--bg-alt)" }}>value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {series.length === 0 ? (
                              <tr>
                                <td colSpan={2} style={{ padding: 10, color: "#666" }}>Sin datos</td>
                              </tr>
                            ) : series.map((pt, i) => {
                              const { time, value } = readPoint(pt);
                              return (
                                <tr key={i}>
                                  <td style={{ border: "1px solid var(--border)", padding: 8 }}>
                                    {(pt?.t ?? pt?.time) == null ? "-" : `${pt?.t ?? pt?.time} ${timeUnit}`}
                                  </td>
                                  <td style={{ border: "1px solid var(--border)", padding: 8 }}>{value}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
