// src/components/StepViewer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * StepViewer
 *
 * Props:
 *  - stepsObj: object/dictionary where keys -> step id (strings) and values -> array of messages
 *  - autoStart: boolean (optional) start playing on mount (default false)
 *  - initialIntervalMs: number (optional) playback tick interval in ms (default 2000) - **no control visible**
 *  - mode: "time" | "step" (default "time")
 *  - initialTimeDelta: number (optional, default 1) — amount of time units to advance on each tick (only in "time" mode)
 *  - getLabelForNodeId: optional function(nodeId) => string (para mostrar labels si lo deseas)
 *  - onTimeChange: optional function(currentTimeOrIndex, visibleMessages[]Strings) called when visible messages change
 *
 * Behavior:
 *  - keys parseable as numeric are sorted numerically; non-numeric keys go after numeric.
 *  - visible messages are *acumulados* hasta el tiempo/index actual.
 */
export default function StepViewer({
  stepsObj = {},
  autoStart = false,
  initialIntervalMs = 2000,
  mode = "time",
  initialTimeDelta = 1,
  getLabelForNodeId = null,
  onTimeChange = null,
  timeUnit = "s", // nuevo
}) {
  const [playing, setPlaying] = useState(Boolean(autoStart));
  // interval interno (no expuesto en UI según tu pedido)
  const [intervalMs] = useState(Number(initialIntervalMs) || 2000);
  // delta editable por el usuario (solo este control se muestra)
  const [timeDelta, setTimeDelta] = useState(Number(initialTimeDelta) || 1);

  const [currentTime, setCurrentTime] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Parse y normaliza steps en un array ordenado
  const stepsArray = useMemo(() => {
    if (!stepsObj || typeof stepsObj !== "object") return [];
    const entries = Object.entries(stepsObj).map(([k, v], idx) => {
      const knum = Number.parseFloat(String(k).replace(",", "."));
      const isNum = Number.isFinite(knum);
      const messages = Array.isArray(v) ? v.slice() : [];
      return { key: k, knum: isNum ? knum : NaN, isNum, messages, _origIdx: idx };
    });

    entries.sort((a, b) => {
      if (a.isNum && b.isNum) return a.knum - b.knum;
      if (a.isNum && !b.isNum) return -1;
      if (!a.isNum && b.isNum) return 1;
      return a._origIdx - b._origIdx;
    });

    // **Importante:** NO reordenamos mensajes dentro de cada step.
    // Sólo normalizamos a string y preservamos el orden original recibido.
    entries.forEach((entry) => {
      entry.messages = (entry.messages || []).map((m) => String(m));
    });

    return entries;
  }, [stepsObj]);

  // tiempos numericos únicos ordenados
  const { numericTimes, minTime, maxTime } = useMemo(() => {
    const times = stepsArray.filter((s) => s.isNum).map((s) => s.knum);
    const uniq = Array.from(new Set(times)).sort((a, b) => a - b);
    return {
      numericTimes: uniq,
      minTime: uniq.length ? uniq[0] : 0,
      maxTime: uniq.length ? uniq[uniq.length - 1] : 0,
    };
  }, [stepsArray]);

  // init cuando cambian steps
  useEffect(() => {
    if (!stepsArray.length) {
      setCurrentTime(null);
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex(0);
    setCurrentTime((prev) => (prev == null ? (numericTimes.length ? numericTimes[0] : 0) : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepsArray.length]);

  // calcular último índice visible dado currentTime
  const lastVisibleIndexByTime = useMemo(() => {
    if (!stepsArray.length) return -1;
    if (currentTime == null) return -1;
    let idx = -1;
    for (let i = 0; i < stepsArray.length; i++) {
      const s = stepsArray[i];
      if (s.isNum) {
        if (s.knum <= currentTime + 1e-9) idx = i;
      } else {
        // incluir no numéricos solo si alcanzamos maxTime
        if (numericTimes.length === 0) {
          // sin numeric keys no incluimos automáticamente (usuario puede saltar manualmente)
        } else {
          if (currentTime >= maxTime - 1e-9) idx = i;
        }
      }
    }
    return idx;
  }, [stepsArray, currentTime, numericTimes, maxTime]);

  // visibleMessages acumulado -> array de { time, text }
  const visibleMessages = useMemo(() => {
    if (!stepsArray.length) return [];
    const msgs = [];
    if (mode === "step") {
      const upto = Math.max(0, Math.min(currentIndex, stepsArray.length - 1));
      for (let i = 0; i <= upto; i++) {
        const s = stepsArray[i];
        const t = s.isNum ? s.knum : s.key;
        (s.messages || []).forEach((m) => msgs.push({ time: t, text: m }));
      }
      return msgs;
    }
    const upto = lastVisibleIndexByTime;
    if (upto < 0) return [];
    for (let i = 0; i <= upto; i++) {
      const s = stepsArray[i];
      const t = s.isNum ? s.knum : s.key;
      (s.messages || []).forEach((m) => msgs.push({ time: t, text: m }));
    }
    return msgs;
  }, [stepsArray, currentIndex, lastVisibleIndexByTime, mode]);

  // notificar padre (onTimeChange) -> enviamos array de strings con prefijo [time]
  const lastNotifiedRef = useRef({ len: 0, lastText: null });
  useEffect(() => {
    if (typeof onTimeChange !== "function") return;
    const lastText = visibleMessages.length ? visibleMessages[visibleMessages.length - 1].text : null;
    if (lastNotifiedRef.current.len === visibleMessages.length && lastNotifiedRef.current.lastText === lastText) return;
    lastNotifiedRef.current = { len: visibleMessages.length, lastText };
    const timeToSend = mode === "time" ? currentTime : (stepsArray[currentIndex]?.knum ?? null);
    try {
      const arr = visibleMessages.map((m) => `[${m.time} ${timeUnit}] ${m.text}`);
      onTimeChange(timeToSend, arr);
    } catch (e) { /* ignore */ }
  }, [visibleMessages, onTimeChange, mode, currentTime, currentIndex, stepsArray]);

  // auto-scroll al final cuando cambian mensajes
  useEffect(() => {
    const node = messagesContainerRef.current;
    if (!node) return;
    const t = setTimeout(() => { node.scrollTop = node.scrollHeight; }, 50);
    return () => clearTimeout(t);
  }, [visibleMessages.length]);

  // playback effect usando intervalMs interno (no expuesto)
  useEffect(() => {
    if (!playing) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (mode === "step") {
        setCurrentIndex((ci) => {
          const next = Math.min((stepsArray.length ? stepsArray.length - 1 : 0), ci + 1);
          if (next === ci) {
            setPlaying(false);
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          }
          return next;
        });
      } else {
        setCurrentTime((ct) => {
          const base = ct == null ? (numericTimes.length ? numericTimes[0] : 0) : ct;
          const next = base + Number(timeDelta || 1);
          if (numericTimes.length && next >= maxTime - 1e-9) {
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            setPlaying(false);
            return maxTime;
          }
          return next;
        });
      }
    }, Math.max(50, Number(intervalMs) || 100));

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [playing, intervalMs, mode, stepsArray.length, timeDelta, numericTimes.length, maxTime]);

  // controles
  const goPrev = () => {
    setPlaying(false);
    if (mode === "step") setCurrentIndex((ci) => Math.max(0, ci - 1));
    else setCurrentTime((ct) => {
      const base = ct == null ? (numericTimes.length ? numericTimes[0] : 0) : ct;
      return Math.max(numericTimes.length ? numericTimes[0] : 0, base - Number(timeDelta || 1));
    });
  };
  const goNext = () => {
    setPlaying(false);
    if (mode === "step") setCurrentIndex((ci) => Math.min((stepsArray.length ? stepsArray.length - 1 : 0), ci + 1));
    else setCurrentTime((ct) => {
      const base = ct == null ? (numericTimes.length ? numericTimes[0] : 0) : ct;
      return Math.min(maxTime, base + Number(timeDelta || 1));
    });
  };

  const goToIndex = (idx) => {
    setPlaying(false);
    if (!stepsArray.length) return;
    const i = Math.max(0, Math.min(stepsArray.length - 1, idx));
    if (mode === "step") setCurrentIndex(i);
    else {
      const target = stepsArray[i];
      if (!target) return;
      if (target.isNum) setCurrentTime(target.knum);
      else setCurrentTime(maxTime);
    }
  };

  // renderizar mensaje con reemplazo de node ids por labels si se pasa la función
  const renderMessage = (txt) => {
    if (typeof getLabelForNodeId !== "function") return <span>{txt}</span>;
    return txt.split(/(\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b)/i).map((part, i) => {
      if (i % 2 === 1) {
        const label = getLabelForNodeId(part);
        return <strong key={i} style={{ color: "#1a73e8" }}>{label || part}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const totalSteps = stepsArray.length;
  const displayIndex = mode === "step" ? Math.min(currentIndex, Math.max(0, totalSteps - 1)) : Math.max(0, Math.min(totalSteps - 1, lastVisibleIndexByTime));
  const displayTime = mode === "time" ? (currentTime == null ? (numericTimes.length ? numericTimes[0] : 0) : currentTime) : (stepsArray[displayIndex]?.knum ?? null);

  return (
    <div className="step-viewer" style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>Steps</div>
        <div style={{ color: "#666" }}>|</div>
        <div>
          {totalSteps === 0 ? "Sin pasos" : `Paso ${displayIndex + 1} de ${totalSteps}`}{" "}
          {displayTime != null && <span>— t={displayTime} {timeUnit}</span>}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <button className="btn" onClick={() => { setPlaying(false); goPrev(); }}>◀ Prev</button>

          <button
            className="btn"
            onClick={() => {
              if (playing) setPlaying(false);
              else {
                const atEnd = mode === "step"
                  ? currentIndex >= totalSteps - 1
                  : (numericTimes.length ? currentTime >= maxTime - 1e-9 : currentIndex >= totalSteps - 1);
                if (atEnd) {
                  setCurrentIndex(0);
                  if (numericTimes.length) setCurrentTime(numericTimes[0]);
                  else setCurrentTime(0);
                }
                setPlaying(true);
              }
            }}
          >
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>

          <button className="btn" onClick={() => { setPlaying(false); goNext(); }}>Next ▶</button>

          {/* solo mostrar el control Delta (timeDelta) como pediste */}
          {mode === "time" && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 12 }}>
              Delta:
              <input
                style={{ width: 70, padding: 6 }}
                type="number"
                value={timeDelta}
                onChange={(e) => {
                  const v = Number(e.target.value) || 1;
                  setTimeDelta(v);
                }}
              />
              <small style={{ color: "#666", marginLeft: 6 }}>time units</small>
            </label>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#444" }}>Mensajes (acumulado)</div>
          <div
            ref={messagesContainerRef}
            style={{ border: "1px solid var(--border, #ddd)", borderRadius: 6, padding: 8, background: "var(--bg, #fff)", maxHeight: 420, overflow: "auto" }}
          >
            {visibleMessages.length === 0 ? (
              <div style={{ color: "#666", padding: 8 }}>Sin mensajes en este rango</div>
            ) : (
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {visibleMessages.map((m, i) => (
                  <li key={i} style={{ marginBottom: 6, lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 700, marginRight: 8 }}>[{m.time} {timeUnit}]</span>
                    {renderMessage(m.text)}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div style={{ width: 260 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#444" }}>Índice de pasos</div>
          <div style={{ border: "1px solid var(--border, #ddd)", borderRadius: 6, padding: 8, background: "var(--bg, #fff)", maxHeight: 420, overflow: "auto" }}>
            {stepsArray.map((s, i) => {
              const isActive = (mode === "step" ? i === currentIndex : i <= (mode === "time" ? lastVisibleIndexByTime : currentIndex));
              return (
                <div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < stepsArray.length - 1 ? "1px dashed #eee" : "none" }}>
                  <div style={{ fontSize: 13 }}>
                    <div style={{ fontWeight: 700 }}>{i + 1}. {s.key}{s.isNum ? ` (t=${s.knum})` : ""}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{s.messages.length} mensaje{s.messages.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn" onClick={() => goToIndex(i)}>Ir</button>
                    <button className="btn" onClick={() => { goToIndex(i); setPlaying(true); }}>▶</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .btn {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #bbb;
          background: #f5f5f5;
          cursor: pointer;
        }
        .btn:disabled { opacity: 0.6; cursor: default; }
      `}</style>
    </div>
  );
}
