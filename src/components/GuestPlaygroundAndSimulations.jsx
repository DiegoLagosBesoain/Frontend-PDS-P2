// src/components/GuestSimulationPage.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx"; // <-- import directo

import SimulationDashboard from "./SimulationDashboard";
import TableView from "./TableView";
import SensorsView from "./SensorsView";
import OutputsView from "./OutputsView";
import StepViewer from "./StepViewer";
import GuestProcessView from "./GuestProcessView"; // <-- usa el componente correcto

const API_URL = import.meta.env.VITE_API_URL || "";

function shortId(id = "") {
  return String(id).slice(0, 8);
}

/**
 * GuestSimulationPage
 * - Vista de solo-lectura para un invitado: reproduce la lógica de SimulationPage
 *   pero sin controles de edición. Añade una vista "visualization" que muestra
 *   el process_def con GuestProcessView (read-only).
 */
export default function GuestSimulationPage() {
  const { projectId, pid, SimId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [components, setComponents] = useState([]);
  const [processDef, setProcessDef] = useState(null); // <-- guardamos processDef si está en la simulación
  const [maxTime, setMaxTime] = useState(0);
  const [exporting, setExporting] = useState(false);

  const [view, setView] = useState("dashboard"); // 'dashboard' | 'table' | 'sensors' | 'steps' | 'outputs' | 'visualization'
  const [filterParamKey, setFilterParamKey] = useState("");
  const [filterParamValue, setFilterParamValue] = useState("");
  const [searchElementName, setSearchElementName] = useState("");

  const [selectedSensorByNode, setSelectedSensorByNode] = useState({});
  const [visibleStepMessages, setVisibleStepMessages] = useState([]);
  
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const simRes = await axios.get(`${API_URL}/simulations/${SimId}`);
        if (!mounted) return;
        const sim = simRes.data;

        // parse processDef if viene dentro de la simulación
        let pd = null;
        if (sim.process_def) {
          if (typeof sim.process_def === "string") {
            try { pd = JSON.parse(sim.process_def); } catch (e) { pd = null; }
          } else { pd = sim.process_def; }
        } else if (sim.processDef) {
          pd = sim.processDef;
        }

        setSimulation(sim);
        setProcessDef(pd ?? null);

        if (pd && Array.isArray(pd.nodes)) {
          setComponents(pd.nodes);
        } else {
          // fallback: intentar obtener componentes del proceso
          try {
            const compsRes = await axios.get(`${API_URL}/processes/${pid}/components`);
            if (!mounted) return;
            setComponents(compsRes.data || []);
          } catch (err) {
            console.warn("No se pudieron obtener componentes:", err);
            setComponents([]);
          }
        }

        // encontrar max time en register
        const register = sim?.results?.register || {};
        let localMax = 0;
        Object.values(register).forEach((row) => {
          Object.entries(row).forEach(([k, v]) => {
            if (k === "params") return;
            const num = Number(v);
            if (!Number.isNaN(num) && num > localMax) localMax = num;
          });
        });
        setMaxTime(localMax);

        // inicializar selectedSensorByNode si nodeStats existe
        const nodeStats = sim?.results?.nodeStats || null;
        if (nodeStats && Array.isArray(nodeStats)) {
          const map = {};
          nodeStats.forEach((n) => { if (n && n.nodeId) map[n.nodeId] = 0; });
          setSelectedSensorByNode((prev) => ({ ...map, ...prev }));
        }
      } catch (err) {
        console.error("Error cargando simulación o componentes:", err);
        setError(err.response?.data?.error || err.message || "Error desconocido");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [SimId, pid]);

  // ---------- Derived data (match SimulationPage behavior) ----------
  const rows = useMemo(() => {
    const reg = simulation?.results?.register || {};
    return Object.entries(reg);
  }, [simulation]);

  const elemsStats = useMemo(() => {
    return rows.map(([name, rowObj]) => {
      const times = Object.entries(rowObj)
        .filter(([k]) => k !== "params")
        .map(([, v]) => Number(v))
        .filter((v) => !Number.isNaN(v))
        .sort((a, b) => a - b);
      const min = times.length ? times[0] : null;
      const max = times.length ? times[times.length - 1] : null;
      const total = min != null && max != null ? max - min : null;
      return { name, params: rowObj.params || {}, times, min, max, total, raw: rowObj };
    });
  }, [rows]);

  const kpis = useMemo(() => {
    const totalElems = elemsStats.length;
    const totals = elemsStats.map((e) => e.total).filter((t) => t != null);
    const avgTotal = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
    const maxTotal = totals.length ? Math.max(...totals) : null;

    const outputNodes = components.filter((c) => String(c.type).toLowerCase() === "output");
    const outputIds = outputNodes.map((o) => String(o.id));
    const completedSet = new Set();
    elemsStats.forEach((e) => {
      const keys = Object.keys(e.raw).filter((k) => k !== "params");
      for (const k of keys) {
        for (const outId of outputIds) {
          if (k.indexOf(outId) !== -1) {
            completedSet.add(e.name);
            break;
          }
        }
        if (completedSet.has(e.name)) break;
      }
    });

    return { totalElems, avgTotal, maxTotal, completed: completedSet.size, outputNodes };
  }, [elemsStats, components]);

  const events = useMemo(() => {
    const ev = [];
    rows.forEach(([name, rowObj]) => {
      Object.entries(rowObj).forEach(([k, v]) => {
        if (k === "params") return;
        const t = Number(v);
        if (Number.isNaN(t)) return;
        ev.push({ time: t, key: k, element: name });
      });
    });
    ev.sort((a, b) => a.time - b.time);
    return ev;
  }, [rows]);

  const timelineSeries = useMemo(() => {
    if (!events.length) return [];
    const minT = events[0].time;
    const maxT = events[events.length - 1].time;
    const range = Math.max(1, maxT - minT);
    const buckets = 40;
    const bucketSize = Math.max(range / buckets, 0.0001);
    const arr = [];
    let evIndex = 0;
    let cumulative = 0;
    for (let b = 0; b <= buckets; b++) {
      const t = minT + b * bucketSize;
      while (evIndex < events.length && events[evIndex].time <= t + 1e-9) {
        cumulative++;
        evIndex++;
      }
      arr.push({ time: Number(t.toFixed(3)), cumulative });
    }
    return arr;
  }, [events]);

  const histogram = useMemo(() => {
    const totals = elemsStats.map((e) => e.total).filter((t) => t != null);
    if (!totals.length) return [];
    const bins = 12;
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    const step = (max - min) / bins || 1;
    const counts = new Array(bins).fill(0);
    totals.forEach((v) => {
      const idx = Math.min(bins - 1, Math.floor((v - min) / step || 0));
      counts[idx]++;
    });
    return counts.map((c, i) => ({
      binLabel: `${(min + i * step).toFixed(2)} - ${(min + (i + 1) * step).toFixed(2)}`,
      count: c,
      mid: min + (i + 0.5) * step,
    }));
  }, [elemsStats]);

  const perComponent = useMemo(() => {
    const map = new Map();
    rows.forEach(([name, rowObj]) => {
      Object.entries(rowObj).forEach(([k, v]) => {
        if (k === "params") return;
        const t = Number(v);
        if (Number.isNaN(t)) return;
        const uuidMatch = k.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        const keyId = uuidMatch ? uuidMatch[0] : k;
        if (!map.has(keyId)) map.set(keyId, { sum: 0, count: 0, sampleKey: k });
        const obj = map.get(keyId);
        obj.sum += t;
        obj.count += 1;
      });
    });
    const arr = Array.from(map.entries()).map(([compId, v]) => ({
      compId,
      avg: v.count ? v.sum / v.count : 0,
      count: v.count,
      sampleKey: v.sampleKey,
    }));
    arr.sort((a, b) => b.count - a.count);
    const withLabels = arr.map((a) => {
      const comp = components.find((c) => String(c.id) === String(a.compId));
      return { ...a, label: comp ? (comp.params?.label || comp.label || `${comp.type} ${shortId(comp.id)}`) : a.sampleKey };
    });
    return withLabels;
  }, [rows, components]);

  const topSlow = useMemo(() => elemsStats.filter((e) => e.total != null).sort((a, b) => b.total - a.total).slice(0, 5), [elemsStats]);
  const topFast = useMemo(() => elemsStats.filter((e) => e.total != null).sort((a, b) => a.total - b.total).slice(0, 5), [elemsStats]);

  const outputsList = useMemo(() => {
    const outputs = components.filter((c) => String(c.type).toLowerCase() === "output");
    return outputs.map((o) => {
      const outId = String(o.id);
      const reached = rows
        .filter(([name, rowObj]) => {
          return Object.keys(rowObj).some((k) => k !== "params" && k.indexOf(outId) !== -1);
        })
        .map(([name]) => name);
      return { output: o, reached, count: reached.length };
    });
  }, [components, rows]);

  const paramKeys = useMemo(() => {
    const s = new Set();
    elemsStats.forEach((e) => { Object.keys(e.params || {}).forEach((k) => s.add(k)); });
    return Array.from(s);
  }, [elemsStats]);

  const paramValuesForKey = useMemo(() => {
    if (!filterParamKey) return [];
    const s = new Set();
    elemsStats.forEach((e) => {
      if (e.params && e.params[filterParamKey] != null) s.add(String(e.params[filterParamKey]));
    });
    return Array.from(s);
  }, [elemsStats, filterParamKey]);

  const filteredRows = useMemo(() => {
    return rows.filter(([name, rowObj]) => {
      if (searchElementName && !String(name).toLowerCase().includes(searchElementName.toLowerCase())) return false;
      if (filterParamKey) {
        const val = rowObj.params?.[filterParamKey];
        if (filterParamValue) {
          if (String(val) !== String(filterParamValue)) return false;
        } else {
          if (val == null) return false;
        }
      }
      return true;
    });
  }, [rows, searchElementName, filterParamKey, filterParamValue]);
   
  // Export XLSX (keeps same behavior as SimulationPage)
  const buildAoa = () => {
    const header = ["Elemento", "Parámetros", ...components.map((c) => c.params?.label || c.label || `${c.type} ${shortId(c.id)}`), "Tiempo total"];
    const dataRows = filteredRows.map(([elemName, rowObj]) => {
      const params = rowObj.params || {};
      const paramsText = Object.entries(params).map(([k, v]) => `${k}: ${v}`).join(", ") || "-";
      const times = components.map((col) => {
        const keyExact = `${col.id}-${col.type}`;
        const keys = Object.keys(rowObj).filter((k) => k !== "params");
        if (keys.includes(keyExact)) return Number(rowObj[keyExact]);
        for (const k of keys) if (k.indexOf(String(col.id)) !== -1) return Number(rowObj[k]);
        return null;
      });
      const validTimes = times.filter((t) => t != null);
      const minT = validTimes.length ? Math.min(...validTimes) : null;
      const maxT = validTimes.length ? Math.max(...validTimes) : null;
      const totalTime = minT != null && maxT != null ? Number((maxT - minT).toFixed(2)) : null;
      return [elemName, paramsText, ...times.map((t) => (t == null ? null : Number(t.toFixed ? t.toFixed(2) : t))), totalTime];
    });
    return [header, ...dataRows];
  };
  const timeUnit = simulation?.stats?.timeUnit
    || simulation?.results?.stats?.timeUnit
    || simulation?.results?.timeUnit
    || "s";
  const exportToXLSX = async () => {
    try {
      setExporting(true);
      const wb = XLSX.utils.book_new();
      
      // Hoja 1: Datos de simulación (tabla principal)
      const aoa = buildAoa();
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const colWidths = [
        { wch: 30 },
        { wch: 30 },
        ...components.map(() => ({ wch: 18 })),
        { wch: 14 },
      ];
      ws["!cols"] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, "Simulación");

      // Hoja 2: Datos de sensores
      const nodeStats = simulation?.results?.nodeStats || [];
      if (nodeStats.length > 0) {
        const sensorsAoa = [];
        sensorsAoa.push(["Nodo ID", "Componente", "Sensor #", "Tipo Sensor", "Tiempo (" + timeUnit + ")", "Valor"]);
        
        nodeStats.forEach(node => {
          const nodeId = node.nodeId || node.id || "unknown";
          const comp = components.find(c => String(c.id) === String(nodeId));
          const compLabel = comp ? (comp.params?.label || comp.label || `${comp.type} ${String(comp.id).slice(0,8)}`) : nodeId;
          const sensors = Array.isArray(node.sensors) ? node.sensors : [];
          
          sensors.forEach((sensor, sensorIdx) => {
            const sensorType = sensor.type || "unknown";
            const series = Array.isArray(sensor?.series) ? sensor.series : sensor.values ? sensor.values : [];
            
            if (series.length === 0) {
              sensorsAoa.push([nodeId, compLabel, sensorIdx + 1, sensorType, "-", "-"]);
            } else {
              series.forEach(pt => {
                const time = pt?.t ?? pt?.time ?? pt?.timestamp ?? pt?.ts ?? "-";
                const value = pt?.value ?? pt?.v ?? pt?.val ?? "-";
                sensorsAoa.push([nodeId, compLabel, sensorIdx + 1, sensorType, time, value]);
              });
            }
          });
        });

        const wsS = XLSX.utils.aoa_to_sheet(sensorsAoa);
        wsS["!cols"] = [
          { wch: 20 }, // Nodo ID
          { wch: 25 }, // Componente  
          { wch: 12 }, // Sensor #
          { wch: 15 }, // Tipo Sensor
          { wch: 15 }, // Tiempo
          { wch: 15 }  // Valor
        ];
        XLSX.utils.book_append_sheet(wb, wsS, "Sensores");
      }

      // Hoja 3: Simulación por pasos
      const stepsObj = simulation?.results?.steps || {};
      if (Object.keys(stepsObj).length > 0) {
        const stepsAoa = [];
        stepsAoa.push(["Tiempo (" + timeUnit + ")", "Evento/Mensaje"]);
        
        // Convertir steps object a array ordenado
        const stepsEntries = Object.entries(stepsObj).map(([k, v]) => {
          const knum = Number.parseFloat(String(k).replace(",", "."));
          const isNum = Number.isFinite(knum);
          const messages = Array.isArray(v) ? v.slice() : [];
          return { key: k, knum: isNum ? knum : NaN, isNum, messages };
        });

        // Ordenar por tiempo numérico
        stepsEntries.sort((a, b) => {
          if (a.isNum && b.isNum) return a.knum - b.knum;
          if (a.isNum && !b.isNum) return -1;
          if (!a.isNum && b.isNum) return 1;
          return a.key.localeCompare(b.key);
        });

        // Agregar mensajes a la tabla
        stepsEntries.forEach(step => {
          const timeLabel = step.isNum ? step.knum : step.key;
          if (step.messages.length === 0) {
            stepsAoa.push([timeLabel, "Sin eventos"]);
          } else {
            step.messages.forEach(msg => {
              // Limpiar UUIDs de los nombres de elementos
              const cleanMsg = String(msg).replace(
                /(\b[\w-]+?)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
                "$1"
              );
              stepsAoa.push([timeLabel, cleanMsg]);
            });
          }
        });

        const wsSt = XLSX.utils.aoa_to_sheet(stepsAoa);
        wsSt["!cols"] = [
          { wch: 15 }, // Tiempo
          { wch: 60 }  // Evento/Mensaje
        ];
        XLSX.utils.book_append_sheet(wb, wsSt, "Pasos");
      }

      const filename = `simulation_${SimId || "unknown"}_${pid || "proc"}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Error exportando a xlsx:", err);
      alert("Error exportando a Excel. Revisa la consola.");
    } finally {
      setExporting(false);
    }
  };

  // select sensor tab per node
  const selectSensorForNode = (nodeId, sensorIdx) => {
    setSelectedSensorByNode((prev) => ({ ...prev, [nodeId]: sensorIdx }));
  };

  // StepViewer callback
  const handleStepChange = useCallback((currentTimeOrIndex, visibleMessagesArr) => {
    if (!Array.isArray(visibleMessagesArr)) return;
    setVisibleStepMessages(visibleMessagesArr.slice());
  }, []);

  // map de mensajes por componente (recientes)
  const compMessagesMap = useMemo(() => {
    const map = new Map();
    const maxPerComp = 8;
    const msgs = (visibleStepMessages || []).map((m) => ({ text: String(m), lc: String(m).toLowerCase() }));
    components.forEach((c) => {
      const label = (c.params?.label || c.label || `${c.type} ${shortId(c.id)}`) || "";
      const id = String(c.id);
      const matches = [];
      for (let i = msgs.length - 1; i >= 0; i--) {
        const mm = msgs[i];
        if (mm.lc.indexOf(id.toLowerCase()) !== -1 || (label && mm.lc.indexOf(String(label).toLowerCase()) !== -1)) {
          matches.push(mm.text);
          if (matches.length >= maxPerComp) break;
        }
      }
      map.set(String(c.id), matches.reverse());
    });
    return map;
  }, [visibleStepMessages, components]);

  if (loading) return <div>Cargando simulación…</div>;
  if (error) return <div style={{ color: "red" }}>Error: {String(error)}</div>;
  if (!simulation) return <div>No se encontró la simulación.</div>;

  // Render (very similar visual to SimulationPage)
  return (
    <div style={{ padding: 16, maxWidth: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Simulación (guest): {simulation.id}</h3>
          <div style={{ fontSize: 13, color: "#666" }}>
            <strong>Process:</strong> {pid} — <strong>Creada:</strong>{" "}
            {simulation.timestamp ? new Date(simulation.timestamp).toLocaleString() : "-"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn" onClick={() => setView((v) => (v === "dashboard" ? "table" : "dashboard"))}>
            {view === "dashboard" ? "Ver Tabla" : "Ver Dashboard"}
          </button>

          <button className="btn" onClick={() => setView("sensors")} disabled={!simulation?.results?.nodeStats || simulation.results.nodeStats.length === 0}>Ver Sensores</button>

          <button className="btn" onClick={() => setView("outputs")} disabled={!outputsList || outputsList.length === 0}>Ver Outputs</button>

          <button className="btn" onClick={() => setView("steps")} disabled={!simulation?.results?.steps || Object.keys(simulation.results.steps || {}).length === 0}>Ver Steps</button>

          <button
            className="btn"
            onClick={() => setView("visualization")}
            disabled={!(processDef || components.length > 0)}
            title={processDef ? "Visualización desde process_def" : components.length ? "Visualización desde componentes" : "No hay datos de proceso"}
          >
            Ver Visualización
          </button>

          <button className="btn btn-outline-primary" onClick={exportToXLSX} disabled={exporting}>{exporting ? "Generando..." : "Descargar .xlsx"}</button>
        </div>
      </div>

      {/* Views: exact same components usage as SimulationPage (no modifications) */}
      {view === "dashboard" && (
        <SimulationDashboard
          kpis={kpis}
          timelineSeries={timelineSeries}
          histogram={histogram}
          timeUnit={timeUnit}
          perComponent={perComponent}
          topSlow={topSlow}
          topFast={topFast}
          outputsList={outputsList}
          goToTableWithElement={(n) => { setSearchElementName(String(n)); setView("table"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      )}

      {view === "table" && (
        <TableView
          components={components}
          filteredRows={filteredRows}
          timeUnit={timeUnit}
          maxTime={maxTime}
          searchElementName={searchElementName}
          setSearchElementName={setSearchElementName}
          paramKeys={paramKeys}
          filterParamKey={filterParamKey}
          setFilterParamKey={setFilterParamKey}
          filterParamValue={filterParamValue}
          setFilterParamValue={setFilterParamValue}
          paramValuesForKey={paramValuesForKey}
        />
      )}

      {view === "sensors" && (
        <SensorsView
          nodeStats={simulation?.results?.nodeStats || []}
          components={components}
          selectedSensorByNode={selectedSensorByNode}
          selectSensorForNode={selectSensorForNode}
          timeUnit={timeUnit}
          onBack={() => setView("dashboard")}
        />
      )}

      {view === "outputs" && (
        <OutputsView outputsList={outputsList} goToTableWithElement={(n) => { setSearchElementName(String(n)); setView("table"); }} />
      )}

      {view === "steps" && (
        <div style={{ marginTop: 12 }}>
          <h4>Reproducción paso a paso (Steps)</h4>

          <StepViewer
            stepsObj={simulation?.results?.steps || {}}
            autoStart={false}
            intervalMs={1000}
            timeUnit={timeUnit}
            mode="time"
            timeDelta={1}
            getLabelForNodeId={(nodeId) => {
              const comp = components.find((c) => String(c.id) === String(nodeId));
              return comp ? (comp.params?.label || comp.label || `${comp.type} ${shortId(comp.id)}`) : nodeId;
            }}
            onTimeChange={handleStepChange}
          />

          {/* tarjetas horizontales que hacen wrap cuando llegan al ancho de la página */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Actividad por componente</div>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "flex-start",
                overflowX: "hidden",
                paddingBottom: 8,
                paddingTop: 8,
              }}
            >
              {components.length === 0 ? (
                <div style={{ color: "#666" }}>No hay componentes.</div>
              ) : (
                components.map((c) => {
                  const compId = String(c.id);
                  const label = c.params?.label || c.label || `${c.type} ${shortId(c.id)}`;
                  const msgs = compMessagesMap.get(compId) || [];
                  return (
                    <div
                      key={compId}
                      style={{
                        width: 320,
                        flex: "0 0 320px",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: 10,
                        background: "var(--bg-alt)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        boxSizing: "border-box",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{label}</div>
                      <div style={{ fontSize: 12, color: "#666", fontFamily: "monospace" }}>{compId}</div>
                      <div style={{ flex: 1, maxHeight: 160, overflowY: "auto" }}>
                        {msgs.length === 0 ? (
                          <div style={{ color: "#666" }}><em>Sin actividad hasta ahora</em></div>
                        ) : (
                          <ol style={{ margin: 0, paddingLeft: 18 }}>
                            {msgs.map((m, i) => <li key={i} style={{ marginBottom: 6, fontSize: 13 }}>{m}</li>)}
                          </ol>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visualization ahora usa GuestProcessView (se encarga de construir el graph ráfaga/fallback) */}
      {view === "visualization" && (
        <div style={{ marginTop: 12 }}>
          <h4>Visualización (solo lectura)</h4>
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 8, background: "var(--card-bg)" }}>
            <GuestProcessView projectId={projectId} pid={pid} SimId={SimId} processDef={processDef} fitOnLoad={true} />
            <div style={{ marginTop: 8 }}>
              <small style={{ color: "#666" }}>Vista read-only del proceso (nodos y conexiones).</small>
            </div>
          </div>
        </div>
      )}

<style>{`
  :root {
    --bg: #ffffff;
    --bg-alt: #f5f5f5;
    --text: #1a1a1a;
    --muted: #666;
    --border: #dcdcdc;
    --accent: #4caf50;
    --card-bg: #ffffff;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f1112;
      --bg-alt: #16181b;
      --text: #e9eef1;
      --muted: #bfc8cf;
      --border: #2b2f33;
      --accent: #81c784;
      --card-bg: #111316;
    }
  }

  body { background: var(--bg); color: var(--text); }

  .sim-table {
    border-collapse: collapse;
    width: 100%;
    background: var(--card-bg);
    color: var(--text);
    table-layout: auto;
  }
  .sim-table th,
  .sim-table td {
    border: 1px solid var(--border) !important;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
    background: transparent;
  }
  .sim-table thead th {
    background: var(--bg-alt);
    position: sticky;
    top: 0;
    z-index: 3;
  }

  .time-bar {
    margin-top: 6px;
    height: 8px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
  }
  .time-bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 4px;
    transition: width 240ms ease;
  }

  .btn {
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid #bbb;
    background: var(--bg-alt);
    color: var(--text);
    cursor: pointer;
    line-height: 1;
  }
  .btn:disabled { opacity: 0.6; cursor: default; }
  .btn-outline-primary { border-color: #0d6efd; color: #0d6efd; background: transparent; }

  /* React Flow específico - asegurar visibilidad de edges */
  .rf-visualization .react-flow__edge-path {
    stroke: #666666 !important;
    stroke-width: 2px !important;
    fill: none !important;
  }

  .rf-visualization .react-flow__arrowhead,
  .rf-visualization .react-flow__marker {
    fill: #666666 !important;
  }

  .rf-visualization .react-flow__edge:hover .react-flow__edge-path {
    stroke: #333333 !important;
    stroke-width: 3px !important;
  }

  /* Asegurar que los markers de las flechas sean visibles */
  .rf-visualization svg defs marker path,
  .rf-visualization svg defs marker polygon {
    fill: #666666 !important;
    stroke: none !important;
  }
`}</style>
    </div>
  );
}
