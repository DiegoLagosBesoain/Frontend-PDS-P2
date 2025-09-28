// src/components/SimulationPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";

const API_URL = "http://localhost:4000/api";

function shortId(id = "") {
  return String(id).slice(0, 8);
}
function fmtNumber(n) {
  if (n == null || Number.isNaN(n)) return "-";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return Number(n).toFixed(2);
}

/** SmallLineChart (SVG) - usa variables CSS para colores */
function SmallLineChart({ data = [], width = 600, height = 160, stroke = "var(--accent)" }) {
  if (!data || data.length === 0) return <div style={{ padding: 8 }}>Sin datos</div>;

  const valsX = data.map((d) => Number(d.time));
  const valsY = data.map((d) => Number(d.cumulative));
  const minX = Math.min(...valsX);
  const maxX = Math.max(...valsX);
  const minY = Math.min(...valsY);
  const maxY = Math.max(...valsY) || 1;

  const margin = { top: 8, right: 8, bottom: 22, left: 36 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  const xScale = (x) => ((x - minX) / (maxX - minX || 1)) * w + margin.left;
  const yScale = (y) => margin.top + h - ((y - minY) / (maxY - minY || 1)) * h;

  const pathD = data.map((d, i) => {
    const x = xScale(d.time);
    const y = yScale(d.cumulative);
    return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");

  const ticks = 4;
  const xTicks = new Array(ticks + 1).fill(0).map((_, i) => (minX + (i / ticks) * (maxX - minX)));
  const yTicks = new Array(ticks + 1).fill(0).map((_, i) => Math.round(minY + (i / ticks) * (maxY - minY)));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Timeline acumulado">
      <rect x="0" y="0" width={width} height={height} fill="transparent" />
      <g>
        {yTicks.map((t, i) => {
          const y = yScale(t);
          return <line key={i} x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />;
        })}
      </g>

      <path d={pathD} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      <g>
        {data.map((d, i) => {
          const x = xScale(d.time);
          const y = yScale(d.cumulative);
          return <circle key={i} cx={x} cy={y} r={1.5} fill={stroke} />;
        })}
      </g>

      <g>
        {xTicks.map((t, i) => {
          const x = xScale(t);
          return (
            <text key={i} x={x} y={height - 6} fontSize="10" fill="var(--text)" textAnchor="middle">
              {Number(t).toFixed(1)}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

/** SmallBarChart (SVG) - admite leftMargin opcional y calcula barH limitado */
function SmallBarChart({ data = [], width = 600, height = 200, barColor = "var(--accent)", leftMargin }) {
  if (!data || data.length === 0) return <div style={{ padding: 8 }}>Sin datos</div>;

  // calcular left margin si no se pasa (según longitud de labels)
  const estimatedLeft = leftMargin ?? Math.min(160, Math.max(60, Math.max(...data.map(d => String(d.label || "").length)) * 7));
  const margin = { top: 8, right: 12, bottom: 8, left: estimatedLeft };
  const w = width;
  const innerW = Math.max(60, w - margin.left - margin.right);

  // barH: intenta adaptar al número de barras, limitando a [12,20]
  const maxAvailable = Math.max(12, Math.floor((height - margin.top - margin.bottom) / Math.max(1, data.length)));
  const barH = Math.min(20, Math.max(12, maxAvailable));

  const totalH = margin.top + margin.bottom + data.length * barH;
  const maxVal = Math.max(...data.map((d) => Number(d.value || 0)), 1);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${totalH}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Bar chart">
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {data.map((d, i) => {
          const y = i * barH;
          const val = Number(d.value || 0);
          const barW = (val / maxVal) * innerW;
          const label = String(d.label || "");
          return (
            <g key={label + i} transform={`translate(0, ${y})`}>
              <text x={-8} y={barH / 2} fontSize="11" fill="var(--text)" textAnchor="end" alignmentBaseline="middle" style={{ pointerEvents: "none" }}>
                {label}
              </text>
              <rect x={0} y={2} width={barW} height={barH - 6} rx={4} fill={barColor} />
              <text x={Math.min(barW + 6, innerW)} y={barH / 2} fontSize="11" fill="var(--text)" alignmentBaseline="middle">
                {Number(val).toFixed(2)}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export default function SimulationPage() {
  const { projectId, pid, SimId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [components, setComponents] = useState([]);
  const [maxTime, setMaxTime] = useState(0);
  const [exporting, setExporting] = useState(false);

  const [view, setView] = useState("dashboard");
  const [filterParamKey, setFilterParamKey] = useState("");
  const [filterParamValue, setFilterParamValue] = useState("");
  const [searchElementName, setSearchElementName] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const simRes = await axios.get(`${API_URL}/simulations/${SimId}`);
        if (!mounted) return;
        const sim = simRes.data;

        let processDef = null;
        if (sim.process_def) {
          if (typeof sim.process_def === "string") {
            try { processDef = JSON.parse(sim.process_def); } catch (e) { processDef = null; }
          } else { processDef = sim.process_def; }
        } else if (sim.processDef) {
          processDef = sim.processDef;
        }

        setSimulation(sim);

        if (processDef && Array.isArray(processDef.nodes)) {
          setComponents(processDef.nodes);
        } else {
          try {
            const compsRes = await axios.get(`${API_URL}/processes/${pid}/components`);
            if (!mounted) return;
            setComponents(compsRes.data || []);
          } catch (err) {
            console.warn("No se pudieron obtener componentes actuales:", err);
            setComponents([]);
          }
        }

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
      const reached = rows.filter(([name, rowObj]) => {
        return Object.keys(rowObj).some((k) => k !== "params" && k.indexOf(outId) !== -1);
      }).map(([name]) => name);
      return { output: o, reached, count: reached.length };
    });
  }, [components, rows]);

  const paramKeys = useMemo(() => {
    const s = new Set();
    elemsStats.forEach((e) => {
      Object.keys(e.params || {}).forEach((k) => s.add(k));
    });
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

  const exportToXLSX = async () => {
    try {
      setExporting(true);
      const aoa = buildAoa();
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const colWidths = [
        { wch: 30 },
        { wch: 30 },
        ...components.map(() => ({ wch: 18 })),
        { wch: 14 },
      ];
      ws["!cols"] = colWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Simulación");
      const filename = `simulation_${SimId || "unknown"}_${pid || "proc"}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Error exportando a xlsx:", err);
      alert("Error exportando a Excel. Revisa la consola.");
    } finally {
      setExporting(false);
    }
  };

  const goToTableWithElement = (elementName) => {
    setSearchElementName(String(elementName));
    setView("table");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) return <div>Cargando simulación…</div>;
  if (error) return <div style={{ color: "red" }}>Error: {String(error)}</div>;
  if (!simulation) return <div>No se encontró la simulación.</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Simulación: {simulation.id}</h3>
          <div style={{ fontSize: 13, color: "#666" }}>
            <strong>Process:</strong> {pid} — <strong>Creada:</strong>{" "}
            {simulation.timestamp ? new Date(simulation.timestamp).toLocaleString() : "-"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn" onClick={() => setView((v) => (v === "dashboard" ? "table" : "dashboard"))}>
            {view === "dashboard" ? "Ver Tabla" : "Ver Dashboard"}
          </button>
          <button className="btn btn-outline-primary" onClick={exportToXLSX} disabled={exporting}>
            {exporting ? "Generando..." : "Descargar .xlsx"}
          </button>
        </div>
      </div>

      {view === "dashboard" && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ flex: "0 0 200px", padding: 12, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-alt)" }}>
              <div style={{ fontSize: 12, color: "#666" }}>Total elementos</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{kpis.totalElems}</div>
            </div>
            <div style={{ flex: "0 0 200px", padding: 12, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-alt)" }}>
              <div style={{ fontSize: 12, color: "#666" }}>Tiempo sim. máximo (s)</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{fmtNumber(kpis.maxTotal)}</div>
            </div>
            <div style={{ flex: "0 0 200px", padding: 12, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-alt)" }}>
              <div style={{ fontSize: 12, color: "#666" }}>Tiempo medio por elemento (s)</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{fmtNumber(kpis.avgTotal)}</div>
            </div>
            <div style={{ flex: "0 0 200px", padding: 12, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-alt)" }}>
              <div style={{ fontSize: 12, color: "#666" }}>Elementos completos (outputs)</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{kpis.completed}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12 }}>
            <div style={{ padding: 8, border: "1px solid var(--border)", borderRadius: 6, minHeight: 220, background: "var(--bg)" }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Timeline acumulado</div>
              <SmallLineChart data={timelineSeries} />
            </div>

            <div style={{ padding: 8, border: "1px solid var(--border)", borderRadius: 6, minHeight: 220, background: "var(--bg)" }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Top 5 elementos más lentos</div>
              {topSlow.length === 0 ? <div>-</div> : topSlow.map((t) => (
                <div key={t.name} style={{ padding: 6, borderBottom: "1px dashed var(--border)" }}>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>Tiempo total: {t.total?.toFixed(2) || "-"}</div>
                  <div style={{ marginTop: 6 }}>
                    <button className="btn" onClick={() => goToTableWithElement(t.name)}>Ir a Tabla</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div style={{ padding: 8, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)" }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Histograma de tiempos totales</div>
              <div style={{ width: "100%", height: 200, overflow: "hidden" }}>
                {/* leftMargin más pequeño para histogram (evita overflow por etiquetas largas) */}
                <SmallBarChart data={histogram.map(h => ({ label: h.binLabel, value: h.count }))} height={200} width={800} barColor="#8884d8" leftMargin={70} />
              </div>
            </div>

            <div style={{ padding: 8, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)" }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Tiempo de llegada promedio por componente (top)</div>
              <div style={{ width: "100%", height: 200, overflow: "auto" }}>
                <SmallBarChart data={perComponent.slice(0, 10).map(p => ({ label: p.label, value: p.avg }))} height={200} width={800} barColor="var(--accent)" />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div style={{ padding: 8, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)" }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Elementos por salida (outputs)</div>
              {outputsList.length === 0 ? <div>No hay nodos de tipo 'output' en el process_def</div> : outputsList.map(({ output, reached }) => (
                <div key={output.id} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>{output.params?.label || output.label || `${output.type} ${shortId(output.id)}`} ({reached.length})</div>
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

            <div style={{ padding: 8, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)" }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Filtros rápidos</div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 13 }}>Campo params: </label>
                <select value={filterParamKey} onChange={(e) => { setFilterParamKey(e.target.value); setFilterParamValue(""); }}>
                  <option value="">-- seleccionar --</option>
                  {paramKeys.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              {filterParamKey && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 13 }}>Valor: </label>
                  <select value={filterParamValue} onChange={(e) => setFilterParamValue(e.target.value)}>
                    <option value="">-- cualquier valor --</option>
                    {paramValuesForKey.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>Top rápidos</div>
                {topFast.length === 0 ? <div>-</div> : topFast.map((t) => (
                  <div key={t.name} style={{ padding: 6, borderBottom: "1px dashed var(--border)" }}>
                    <div style={{ fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>Tiempo total: {t.total?.toFixed(2) || "-"}</div>
                    <div style={{ marginTop: 6 }}>
                      <button className="btn" onClick={() => goToTableWithElement(t.name)}>Ir a tabla</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "table" && (
        <>
          <div style={{ marginTop: 12, marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <input placeholder="Buscar elemento" value={searchElementName} onChange={(e) => setSearchElementName(e.target.value)} />
            <select value={filterParamKey} onChange={(e) => { setFilterParamKey(e.target.value); setFilterParamValue(""); }}>
              <option value="">-- filtro por param --</option>
              {paramKeys.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            {filterParamKey && (
              <select value={filterParamValue} onChange={(e) => setFilterParamValue(e.target.value)}>
                <option value="">-- cualquier valor --</option>
                {paramValuesForKey.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
            <div style={{ marginLeft: "auto" }}>
              <button className="btn" onClick={() => { setSearchElementName(""); setFilterParamKey(""); setFilterParamValue(""); }}>Reset filtros</button>
            </div>
          </div>

          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table className="sim-table">
              <thead>
                <tr>
                  <th>Elemento</th>
                  <th>Parámetros</th>
                  {components.map((col) => <th key={col.id}>{col.params?.label || col.label || `${col.type} ${shortId(col.id)}`}</th>)}
                  <th>Tiempo total</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(([elemName, rowObj]) => {
                  const params = rowObj.params || {};
                  const paramsText = Object.entries(params).map(([k, v]) => `${k}: ${v}`).join(", ");
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
                  const totalTime = minT != null && maxT != null ? (maxT - minT).toFixed(2) : "-";
                  const highlight = searchElementName && elemName === searchElementName;
                  return (
                    <tr key={elemName} style={highlight ? { background: "#fffbdd" } : {}}>
                      <td><strong>{elemName}</strong></td>
                      <td>{paramsText || "-"}</td>
                      {times.map((t, i) => (
                        <td key={components[i].id} title={t == null ? "" : String(t)}>
                          {t == null ? "-" : Number(t).toFixed(2)}
                          {t != null && maxTime > 0 && (
                            <div className="time-bar">
                              <div className="time-bar-fill" style={{ width: `${(Number(t) / (maxTime || 1)) * 100}%` }} />
                            </div>
                          )}
                        </td>
                      ))}
                      <td>{totalTime}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style>{`
        :root {
          --bg: #ffffff;
          --bg-alt: #f5f5f5;
          --text: #1a1a1a;
          --border: #dcdcdc;
          --accent: #4caf50;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --bg: #111216;
            --bg-alt: #16181b;
            --text: #eceff1;
            --border: #2a2a2a;
            --accent: #81c784;
          }
        }

        body { background: var(--bg); color: var(--text); }

        .sim-table {
          border-collapse: collapse;
          width: 100%;
          background: var(--bg);
          color: var(--text);
        }

        .sim-table th, .sim-table td {
          border: 1px solid var(--border);
          padding: 8px 10px;
          text-align: left;
          vertical-align: top;
        }

        .sim-table thead th {
          background: var(--bg-alt);
          position: sticky;
          top: 0;
          z-index: 2;
        }

        .time-bar {
          margin-top: 6px;
          height: 8px;
          background: var(--border);
          border-radius: 4px;
        }

        .time-bar-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 4px;
        }

        .btn {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #bbb;
          background: var(--bg-alt);
          color: var(--text);
          cursor: pointer;
        }
        .btn:disabled { opacity: 0.6; cursor: default; }
        .btn-outline-primary { border-color: #0d6efd; color: #0d6efd; background: transparent; }
      `}</style>
    </div>
  );
}
