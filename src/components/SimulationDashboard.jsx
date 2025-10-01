// src/components/SimulationDashboard.jsx
import React from "react";
import SmallLineChart from "./charts/SmallLineChart";
import SmallBarChart from "./charts/SmallBarChart";

/**
 * Props:
 *  - kpis
 *  - timelineSeries
 *  - histogram
 *  - perComponent
 *  - topSlow
 *  - topFast
 *  - outputsList
 *  - goToTableWithElement(name)
 */
export default function SimulationDashboard({
  kpis,
  timelineSeries,
  histogram,
  perComponent,
  topSlow,
  topFast,
  outputsList,
  goToTableWithElement,
  timeUnit
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <StatCard title={`Total elementos`}value={kpis.totalElems} />
        <StatCard title={`Tiempo sim. máximo (${timeUnit}) `} value={kpis.maxTotal} />
        <StatCard title={`Tiempo medio por elemento (${timeUnit})`} value={kpis.avgTotal} />
        <StatCard title="Elementos completos (outputs)" value={kpis.completed} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12 }}>
        <div style={panelStyle}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Timeline acumulado "{timeUnit}"</div>
          <SmallLineChart data={timelineSeries} />
        </div>

        <div style={panelStyle}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Top 5 elementos más lentos</div>
          {topSlow.length === 0 ? <div>-</div> : topSlow.map((t) => (
            <div key={t.name} style={{ padding: 6, borderBottom: "1px dashed var(--border)" }}>
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: "#666" }}>Tiempo total: {t.total?.toFixed(2) +" ("+timeUnit+")" || "-"}</div>
              <div style={{ marginTop: 6 }}>
                <button className="btn" onClick={() => goToTableWithElement(t.name)}>Ir a Tabla</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div style={panelStyle}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Histograma de tiempos totales "{timeUnit}"</div>
          <div style={{ width: "100%", height: 200, overflow: "hidden" }}>
            <SmallBarChart data={histogram.map(h => ({ label: h.binLabel, value: h.count }))} height={200} width={800} barColor="#8884d8" leftMargin={70} />
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Tiempo de llegada promedio por componente (top) "{timeUnit}"</div>
          <div style={{ width: "100%", height: 200, overflow: "auto" }}>
            <SmallBarChart data={perComponent.slice(0, 10).map(p => ({ label: p.label, value: p.avg }))} height={200} width={800} barColor="var(--accent)" />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div style={panelStyle}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Elementos por salida (outputs)</div>
          {outputsList.length === 0 ? <div>No hay nodos de tipo 'output' en el process_def</div> : outputsList.map(({ output, reached }) => (
            <div key={output.id} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>{output.params?.label || output.label || `${output.type} ${String(output.id).slice(0,8)}`} ({reached.length})</div>
              <div style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
                {reached.length === 0 ? <em>Ninguno</em> : (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {reached.slice(0, 30).map((name) => (
                      <button key={name} className="btn" onClick={() => goToTableWithElement(name)}>{name}</button>
                    ))}
                    {reached.length > 30 && <span style={{ alignSelf: "center" }}>+{reached.length - 30} más</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={panelStyle}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Quick top ( {timeUnit} )</div>
          {topFast.length === 0 ? <div>-</div> : topFast.map((t) => (
            <div key={t.name} style={{ padding: 6, borderBottom: "1px dashed var(--border)" }}>
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: "#666" }}>Tiempo total: {t.total?.toFixed(2) || "-"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div style={{ flex: "0 0 200px", padding: 12, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-alt)" }}>
      <div style={{ fontSize: 12, color: "#666" }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const panelStyle = { padding: 8, border: "1px solid var(--border)", borderRadius: 6, minHeight: 220, background: "var(--bg)" };
