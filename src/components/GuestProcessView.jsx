// src/components/GuestProcessView.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
} from "@xyflow/react";

import GeneratorNode from "../nodes/GeneratorNode";
import QueueNode from "../nodes/QueueNode";
import TransporterNode from "../nodes/TransporterNode";
import TransformerNode from "../nodes/TransformerNode";
import OutputNode from "../nodes/OutputNode";
import SelectorNode from "../nodes/SelectorNode";

const API_URL = import.meta.env.VITE_API_URL || "";

const nodeTypes = {
  generator: GeneratorNode,
  queue: QueueNode,
  transporter: TransporterNode,
  transformer: TransformerNode,
  output: OutputNode,
  selector: SelectorNode,
};

export default function GuestProcessView({ projectId, pid, SimId, processDef = null, fitOnLoad = true }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rfNodes, setRfNodes] = useState([]);
  const [rfEdges, setRfEdges] = useState([]);
  const [elements, setElements] = useState([]);

  // ref al instance de ReactFlow para fitView
  const rfInstanceRef = useRef(null);

  const normalizeId = (x) => {
    if (x == null) return "";
    // si viene objeto con id, intentar extraerlo
    if (typeof x === "object") {
      return String(x.id ?? x._id ?? x.nodeId ?? x.component_id ?? x.componentId ?? "").trim();
    }
    return String(x).trim();
  };

  const extractNodeId = (n) => {
    if (!n) return "";
    return normalizeId(n.id ?? n._id ?? n.nodeId ?? n.component_id ?? n.componentId ?? n.key ?? n.name ?? "");
  };

  const extractEdgeEndpoints = (e) => {
    if (!e) return { from: null, to: null };
    return {
      from: e.from ?? e.source ?? e.from_component_id ?? e.fromComponentId ?? e.source_id ?? e.sourceId ?? e.fromId ?? null,
      to: e.to ?? e.target ?? e.to_component_id ?? e.toComponentId ?? e.target_id ?? e.targetId ?? e.toId ?? null,
    };
  };

  const buildFromProcessDef = useCallback((pd) => {
    if (!pd) return;

    const rawNodes = pd.nodes ?? pd.components ?? [];
    const rawEdgesRaw = pd.edges ?? pd.connections ?? pd.connectionsList ?? pd.links ?? [];

    const rawEdges = Array.isArray(rawEdgesRaw) ? rawEdgesRaw : Object.values(rawEdgesRaw || {});

    // Construyo nodos con ids normalizados a string y posiciones válidas (numéricas)
    const nodesArr = (rawNodes || []).map((n, i) => {
      const id = extractNodeId(n) || String(n.id ?? i);
      const type = String(n.type ?? n.nodeType ?? n.componentType ?? "default").toLowerCase();
      const posObj = n.position ?? { x: n.pos_x ?? n.x ?? (100 + i * 30), y: n.pos_y ?? n.y ?? (100 + i * 20) };
      const x = Number(posObj.x ?? posObj.pos_x ?? posObj.left ?? 100 + i * 30) || (100 + i * 30);
      const y = Number(posObj.y ?? posObj.pos_y ?? posObj.top ?? 100 + i * 20) || (100 + i * 20);
      return {
        id: normalizeId(id),
        type,
        position: { x, y },
        data: n.params ?? n.data ?? {},
        draggable: false,
        selectable: false,
      };
    });

    // set de ids disponibles (para filtrar aristas "rotas")
    const nodeIdSet = new Set(nodesArr.map((nn) => String(nn.id)));

    const edgesArr = [];
    rawEdges.forEach((eRaw, idx) => {
      // extraer endpoints robustamente
      const { from: rawFrom, to: rawTo } = extractEdgeEndpoints(eRaw);
      const sourceCandidate = rawFrom ?? eRaw.sourceId ?? eRaw.source_id ?? eRaw.from_component_id ?? eRaw.fromComponentId ?? eRaw.source;
      const targetCandidate = rawTo ?? eRaw.targetId ?? eRaw.target_id ?? eRaw.to_component_id ?? eRaw.toComponentId ?? eRaw.target;

      let src = sourceCandidate != null ? normalizeId(sourceCandidate) : "";
      let tgt = targetCandidate != null ? normalizeId(targetCandidate) : "";

      // si endpoints vienen como objetos (ej. { id: 'abc' }) intentar extraer
      if ((!src || !tgt) && typeof rawFrom === "object") src = extractNodeId(rawFrom);
      if ((!src || !tgt) && typeof rawTo === "object") tgt = extractNodeId(rawTo);

      // si aún no hay endpoints válidos, ignorar
      if (!src || !tgt) {
        console.warn("GuestProcessView: edge skipped (no endpoints found)", eRaw);
        return;
      }

      // verificar existencia de nodos con esos ids
      if (!nodeIdSet.has(src) || !nodeIdSet.has(tgt)) {
        console.warn("GuestProcessView: edge references missing node(s) — skipped", { edge: eRaw, src, tgt });
        return;
      }

      edgesArr.push({
        id: normalizeId(eRaw.id ?? eRaw._id ?? `${src}-${tgt}-${idx}`),
        source: src,
        target: tgt,
        sourceHandle: eRaw.sourceHandle ?? eRaw.sourcehandle ?? null,
        targetHandle: eRaw.targetHandle ?? eRaw.targethandle ?? null,
        type: eRaw.type ?? "smoothstep",
        animated: false,
        selectable: false,
        draggable: false,
        style: { 
          stroke: "#666666", 
          strokeWidth: 2,
          strokeOpacity: 1
        },
        markerEnd: { 
          type: "arrowclosed", 
          width: 20, 
          height: 20, 
          color: "#666666",
          strokeWidth: 1
        },
      });
    });

    setRfNodes(nodesArr);
    setRfEdges(edgesArr);

    // debug
    console.log("GuestProcessView — built nodes:", nodesArr.length, "edges:", edgesArr.length);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (processDef) {
        buildFromProcessDef(processDef);
        setElements(processDef.elements || processDef.elementsList || []);
        setLoading(false);
        // fit view after tiny delay to ensure rf is rendered
        setTimeout(() => { if (rfInstanceRef.current) rfInstanceRef.current.fitView({ padding: 0.15 }); }, 120);
        return;
      }

      if (SimId) {
        try {
          const r = await fetch(`${API_URL}/simulations/${SimId}`);
          if (r.ok) {
            const sim = await r.json();
            let pd = sim.process_def ?? sim.processDef ?? sim.process_def_json ?? null;
            if (typeof pd === "string") {
              try { pd = JSON.parse(pd); } catch (e) { pd = null; }
            }
            if (pd) {
              buildFromProcessDef(pd);
              setElements(pd.elements || []);
              setLoading(false);
              setTimeout(() => { if (rfInstanceRef.current) rfInstanceRef.current.fitView({ padding: 0.15 }); }, 120);
              return;
            }
          }
        } catch (e) { console.warn("GuestProcessView: no se pudo obtener simulación por id:", e); }
      }

      if (pid) {
        try {
          const r = await fetch(`${API_URL}/processes/${pid}`);
          if (r.ok) {
            const body = await r.json();
            let pd = body.process_def ?? body.processDef ?? null;
            if (typeof pd === "string") {
              try { pd = JSON.parse(pd); } catch (err) { pd = null; }
            }
            if (pd) {
              buildFromProcessDef(pd);
              setElements(pd.elements || []);
              setLoading(false);
              setTimeout(() => { if (rfInstanceRef.current) rfInstanceRef.current.fitView({ padding: 0.15 }); }, 120);
              return;
            }
          }
        } catch (e) { console.warn("GuestProcessView: no se pudo obtener /processes/:pid:", e); }
      }

      // fallback por componentes/conexiones
      if (pid) {
        const compsRes = await fetch(`${API_URL}/processes/${pid}/components`);
        const connsRes = await fetch(`${API_URL}/processes/${pid}/connections`);
        const comps = compsRes.ok ? await compsRes.json() : [];
        const conns = connsRes.ok ? await connsRes.json() : [];

        const nodesArr = (comps || []).map((c, i) => ({
          id: normalizeId(c.id),
          type: String(c.type).toLowerCase(),
          position: { x: Number(c.pos_x ?? (100 + i * 30)) || (100 + i * 30), y: Number(c.pos_y ?? (100 + i * 20)) || (100 + i * 20) },
          data: c.params || {},
          draggable: false,
          selectable: false,
        }));

        const nodeIdSet = new Set(nodesArr.map(n => n.id));

        const edgesArr = (conns || [])
          .map((c, idx) => {
            const src = normalizeId(c.from_component_id ?? c.from ?? "");
            const tgt = normalizeId(c.to_component_id ?? c.to ?? "");
            return {
              id: normalizeId(c.id ?? `${src}-${tgt}-${idx}`),
              source: src,
              target: tgt,
              sourceHandle: c.sourceHandle ?? c.sourcehandle ?? null,
              targetHandle: c.targetHandle ?? c.targethandle ?? null,
              type: "smoothstep",
              animated: false,
              selectable: false,
              draggable: false,
              style: { 
                stroke: "#666666", 
                strokeWidth: 2,
                strokeOpacity: 1
              },
              markerEnd: { 
                type: "arrowclosed", 
                width: 20, 
                height: 20, 
                color: "#666666",
                strokeWidth: 1
              },
            };
          })
          .filter(e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));

        setRfNodes(nodesArr);
        setRfEdges(edgesArr);

        try {
          const elemsRes = await fetch(`${API_URL}/processes/${projectId}/elements`);
          if (elemsRes.ok) setElements(await elemsRes.json());
        } catch (e) { /* ignore */ }

        setLoading(false);
        setTimeout(() => { if (rfInstanceRef.current) rfInstanceRef.current.fitView({ padding: 0.15 }); }, 120);
        return;
      }

      // nothing found
      setRfNodes([]);
      setRfEdges([]);
      setElements([]);
      setLoading(false);
    } catch (err) {
      console.error("GuestProcessView: Error cargando processDef:", err);
      setError("Error cargando proceso");
      setLoading(false);
    }
  }, [SimId, pid, projectId, processDef, buildFromProcessDef]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div>Cargando proceso…</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  // onInit handler para guardar instancia y ajustar vista
  const handleInit = (rfInstance) => {
    rfInstanceRef.current = rfInstance;
    // pequeño delay para que el DOM pinte nodos/edges y fitView calcule bien
    setTimeout(() => {
      try { rfInstance.fitView({ padding: 0.15 }); } catch (e) { /* ignore */ }
    }, 80);
  };

  return (
    <div style={{ width: "100%" }}>
      <ReactFlowProvider>
        <div className="rf-visualization" style={{ width: "100%", height: 520 }}>
            <div style={{ width: "100%", height: "100%", border: "1px solid var(--border)" }}>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            fitView={fitOnLoad}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            minZoom={0.2}
            maxZoom={2.5}
            onInit={handleInit}
          >
            <Background gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap />
          </ReactFlow>
        </div>
</div>


        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Elementos (meta)</div>
          {elements.length ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {elements.map((el) => (
                <div key={el.id} style={{ border: "1px solid #eee", padding: 8, borderRadius: 6, minWidth: 160 }}>
                  <div style={{ fontWeight: 700 }}>{el.type}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 12 }}>{String(el.id)}</div>
                  <div style={{ marginTop: 6, color: "#444", fontSize: 13 }}>{JSON.stringify(el.params || {})}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#666" }}>No hay elementos.</div>
          )}
        </div>
      </ReactFlowProvider>
    </div>
  );
}
