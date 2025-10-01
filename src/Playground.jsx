// src/components/Playground.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import GeneratorNode from "./nodes/GeneratorNode";
import QueueNode from "./nodes/QueueNode";
import TransporterNode from "./nodes/TransporterNode";
import TransformerNode from "./nodes/TransformerNode";
import OutputNode from "./nodes/OutputNode";
import TransporterForm from "./forms/TransporterForm";
import GeneratorForm from "./forms/GeneratorForm";
import CreateElementModal from "./forms/CreateElementModal";
import TransformerForm from "./forms/TransformerForm";
import OutputForm from "./forms/OutputForm";
import QueueForm from "./forms/QueueForm";
import { validateConnection } from "./connectionRules";
import SelectorNode from "./nodes/SelectorNode";
import SelectorForm from "./forms/SelectorForm";
import { useParams, useNavigate } from "react-router-dom";
import { validateProcessDef } from "./simulation_rules";

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

// nueva importación para screenshot
import html2canvas from "html2canvas";

const API_URL = import.meta.env.VITE_API_URL || "";

const nodeTypes = {
  generator: GeneratorNode,
  queue: QueueNode,
  transporter: TransporterNode,
  transformer: TransformerNode,
  output: OutputNode,
  selector: SelectorNode,
};

export default function Playground() {
  const navigate = useNavigate();
  const { projectId, pid } = useParams();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [elements, setElements] = useState([]);
  const [showSimModal, setShowSimModal] = useState(false);
  const [simDuration, setSimDuration] = useState(20);
  const [simTimeUnit, setSimTimeUnit] = useState("s"); // Nuevo estado para la unidad
  const [isRunning, setIsRunning] = useState(false);
  const [maxGenerated, setMaxGenerated] = useState(null);
  const [maxOutputs, setMaxOutputs] = useState(null);

  // ref al contenedor visible que envuelve ReactFlow (para screenshot)
  const flowWrapperRef = useRef(null);

  const fetchData = useCallback(async () => {
    const comps = await fetch(`${API_URL}/processes/${pid}/components`).then((r) =>
      r.json()
    );
    const conns = await fetch(`${API_URL}/processes/${pid}/connections`).then((r) =>
      r.json()
    );

    const elemts = await fetch(`${API_URL}/processes/${projectId}/elements`).then((r) =>
      r.json()
    );
    setElements(elemts);

    setNodes(
      comps.map((c) => ({
        id: c.id,
        type: c.type.toLowerCase(),
        position: { x: c.pos_x, y: c.pos_y },
        data: c.params,
      }))
    );

    setEdges(
      conns.map((c) => ({
        id: String(c.id),
        source: String(c.from_component_id),
        target: String(c.to_component_id),
        sourceHandle: c.sourceHandle ?? c.sourcehandle ?? null,
        targetHandle: c.targetHandle ?? c.targethandle ?? null,
        type: "smoothstep",
        markerEnd: { type: "arrow", width: 20, height: 20, color: "#000" },
      }))
    );
  }, [pid, projectId]);

  // cargar nodos y edges desde backend. SINCRONIZA UI CON BACKEND
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  // reacciones a cambios en nodos y edges
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeDoubleClick = useCallback((event, node) => {
    setEditingNode(node); //cuando se haga doble click sobre un nodo, ese nodo va a ser el EditingNode
  }, []);

  // crear nodo desde toolbar
  const createNode = async (type) => {
    const res = await fetch(`${API_URL}/processes/${pid}/components`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        label: "No name",
        pos_x: 250,
        pos_y: 150,
        params: { label: "No name" },
      }),
    });

    const node = await res.json();
    setNodes((nds) => [
      ...nds,
      {
        id: node.id,
        type: node.type.toLowerCase(),
        data: { label: node.label },
        position: { x: node.pos_x, y: node.pos_y },
      },
    ]);
  };

  // crear conexión
  const onConnect = useCallback(
    async (params) => {
      // estructura de params: {source, sourceHandle, target, targetHandle}
      // evitar duplicados y reglas
      const sourceExists = edges.some(
        (e) => e.source === params.source && e.sourceHandle === params.sourceHandle
      );
      if (sourceExists) {
        alert("Este puerto de salida ya está conectado");
        return;
      }

      const targetExists = edges.some(
        (e) => e.target === params.target && e.targetHandle === params.targetHandle
      );
      if (targetExists) {
        alert("Este puerto de entrada ya está conectado");
        return;
      }

      if (params.source === params.target) {
        alert("No se puede conectar un nodo a sí mismo");
        return;
      }

      const nodesConnected = edges.some(
        (e) =>
          (e.source === params.source && e.target === params.target) ||
          (e.source === params.target && e.target === params.source)
      );
      if (nodesConnected) {
        alert("Ya existe una conexión entre estos nodos");
        return;
      }

      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      if (!sourceNode || !targetNode) {
        alert("Uno de los nodos no existe");
        return;
      }

      const { valid, message } = validateConnection(sourceNode, targetNode, params);
      if (!valid) {
        alert(message);
        return;
      }

      const res = await fetch(`${API_URL}/processes/${pid}/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_component_id: params.source,
          to_component_id: params.target,
          sourceHandle: params.sourceHandle,
          targetHandle: params.targetHandle,
        }),
      });

      const edge = await res.json();
      setEdges((eds) =>
        addEdge(
          {
            id: edge.id,
            source: edge.from_component_id,
            target: edge.to_component_id,
            sourceHandle: edge.sourcehandle,
            targetHandle: edge.targethandle,
            type: "smoothstep",
            markerEnd: { type: "arrow", width: 20, height: 20, color: "#000" },
          },
          eds
        )
      );
    },
    [edges, nodes, pid]
  );

  const updateNode = async (id, updatedParams) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, ...updatedParams } }
          : n
      )
    );

    await fetch(`${API_URL}/components/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ params: updatedParams }),
    });
    fetchData();
  };

  useEffect(() => {
    setEdges((eds) => {
      const newEdges = eds.filter((e) => {
        const node = nodes.find((n) => n.id === e.target || n.id === e.source);
        if (!node) return false;

        if (e.source === node.id && e.sourceHandle) {
          const maxSalidas = node.data.salidas || 1;
          const salidaIndex = parseInt(e.sourceHandle.replace("out-", ""), 10);
          if (salidaIndex >= maxSalidas) return false;
        }

        if (e.target === node.id && e.targetHandle) {
          const maxEntradas = node.data.entradas || 1;
          const entradaIndex = parseInt(e.targetHandle.replace("in-", ""), 10);
          if (entradaIndex >= maxEntradas) return false;
        }

        return true;
      });

      const removedEdges = eds.filter((e) => !newEdges.includes(e));
      removedEdges.forEach(async (edge) => {
        await fetch(`${API_URL}/connections/${edge.id}`, { method: "DELETE" });
      });

      return newEdges;
    });
  }, [nodes]);

  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => {
        const sourceNode = nodes.find((n) => n.id === e.source);
        if (!sourceNode) return e;

        if (e.sourceHandle) {
          const maxSalidas = sourceNode.data.salidas || 1;
          const salidaIndex = parseInt(e.sourceHandle.replace("out-", ""), 10);

          if (salidaIndex >= maxSalidas) {
            return { ...e, sourceHandle: "out-0" };
          }
        }
        return e;
      })
    );
  }, [nodes, setEdges]);

  // eliminar nodos en backend
  const onNodesDelete = useCallback((deleted) => {
    deleted.forEach(async (node) => {
      await fetch(`${API_URL}/components/${node.id}`, { method: "DELETE" });
    });
  }, []);

  // eliminar edges en backend
  const onEdgesDelete = useCallback((deleted) => {
    deleted.forEach(async (edge) => {
      await fetch(`${API_URL}/connections/${edge.id}`, { method: "DELETE" });
    });
  }, []);

  // actualizar posición de nodos en backend
  const onNodeDragStop = useCallback(async (evt, node) => {
    await fetch(`${API_URL}/components/${node.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pos_x: node.position.x, pos_y: node.position.y }),
    });
  }, []);

  const saveNodeChanges = async (node) => {
    try {
      const res = await fetch(`${API_URL}/components/${node.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: node.data.label,
          params: node.data,
        }),
      });

      const updated = await res.json();

      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id ? { ...n, data: updated.params } : n
        )
      );

      setEdges((eds) => {
        const newEdges = eds.filter(
          (e) => e.source !== node.id && e.target !== node.id
        );
        return newEdges;
      });

      const removedEdges = edges.filter(
          (e) => e.source === node.id || e.target === node.id
        );
      removedEdges.forEach(async (edge) => {
          try {
            await fetch(`${API_URL}/connections/${edge.id}`, { method: "DELETE" });
          } catch (err) {
            console.error(`Error eliminando conexión ${edge.id}:`, err);
          }
        }
      );
      setEditingNode(null);
      fetchData();
    } catch (err) {
      console.error("Error guardando cambios del nodo:", err);
      alert("No se pudieron guardar los cambios del nodo");
    }
  };

  const handleRunSimulation = async () => {
    const processDef = buildProcessDef();
    const { valid, errors } = validateProcessDef(processDef);
    if (!valid) {
      alert(
        "La simulación no se puede ejecutar. Errores:\n" +
        errors.map((e) => e.message || e).join("\n")
      );
      console.error("Errores de validación:", errors);
      return;
    }

    try {
      setIsRunning(true);
      const res = await fetch(`${API_URL}/simulation/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          processDef, 
          duration: simDuration,
          timeUnit: simTimeUnit, // Enviar la unidad al backend
          processId: pid,
          limits: {
            maxGenerated: maxGenerated || null,
            maxOutputs: maxOutputs || null
          }
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        alert("Simulación completada, revisa la consola");
        console.log("Resultados de la simulacion: ", result)
        setShowSimModal(false);
        navigate(`/projects/${projectId}/processes/${pid}/simulations/${result.simId}`);
      } else {
        alert("Error al ejecutar la simulación: " + (result.error || "desconocido"));
      }
    } catch (err) {
      console.error("❌ Error en la simulación:", err);
      alert("Error en la simulación, revisa consola.");
    } finally {
      setIsRunning(false);
    }
  };

  const renderForm = () => {
    if (!editingNode) return null;

    const type = editingNode.type.toLowerCase();

    switch (type) {
      case "generator":
        return <GeneratorForm node={editingNode} setEditingNode={setEditingNode} elements={elements} />;
      case "transporter":
        return <TransporterForm node={editingNode} setEditingNode={setEditingNode} elements={elements} />;
      case "transformer":
        return <TransformerForm node={editingNode} setEditingNode={setEditingNode} elements={elements} />;
      case "queue":
        return <QueueForm node={editingNode} setEditingNode={setEditingNode} elements={elements} />;
      case "output":
        return <OutputForm node={editingNode} setEditingNode={setEditingNode} elements={elements} />;
      case "selector":
        return <SelectorForm node={editingNode} setEditingNode={setEditingNode} elements={elements} />;
      default:
        return (
          <>
            <label>
              Label:
              <input
                type="text"
                value={editingNode.data.label || ""}
                onChange={(e) =>
                  setEditingNode({
                    ...editingNode,
                    data: { ...editingNode.data, label: e.target.value },
                  })
                }
              />
            </label>
          </>
        );
    }
  };

  // Convierte estado local a JSON para backend
  const buildProcessDef = () => {
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        position:n.position,
        type: n.type,
        params: n.data,
      })),
      edges: edges.map((e) => ({
        from: e.source,
        to: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
      elements: elements.map((el) => ({
        id: el.id,
        type: el.type,
        params: el.params,
      })),
    };
  };

  // ------------- NUEVO: Screenshot visible (usa html2canvas) -------------
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "screenshot.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleScreenshot = async () => {
    const node = flowWrapperRef.current;
    if (!node) {
      alert("Contenedor de ReactFlow no encontrado");
      return;
    }

    // Función mejorada para clonar incluyendo SVG y markers
    const cloneAndInlineStyles = (origEl) => {
      const clone = origEl.cloneNode(true);

      // Copiar todos los elementos <style> del documento al clone
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach(style => {
        const clonedStyle = style.cloneNode(true);
        clone.appendChild(clonedStyle);
      });

      const origAll = Array.from(origEl.querySelectorAll("*"));
      const cloneAll = Array.from(clone.querySelectorAll("*"));

      // incluir el elemento raíz también
      origAll.unshift(origEl);
      cloneAll.unshift(clone);

      for (let i = 0; i < origAll.length; i++) {
        const o = origAll[i];
        const c = cloneAll[i];
        if (!c || !o) continue;
        
        const cs = window.getComputedStyle(o);

        // Para elementos SVG, preservar atributos importantes
        if (o.tagName && (o.tagName.toLowerCase().includes('svg') || o.namespaceURI === 'http://www.w3.org/2000/svg')) {
          // Copiar todos los atributos SVG
          Array.from(o.attributes || []).forEach(attr => {
            try {
              c.setAttribute(attr.name, attr.value);
            } catch (e) {
              // Ignorar errores de atributos no válidos
            }
          });
        }

        // Aplicar estilos computados
        let cssText = "";
        for (let j = 0; j < cs.length; j++) {
          const prop = cs[j];
          const val = cs.getPropertyValue(prop);
          if (val && val !== 'none' && val !== '') {
            cssText += `${prop}:${val}!important;`;
          }
        }
        c.style.cssText = cssText;

        // Para elementos SVG específicos, forzar visibilidad
        if (o.tagName) {
          const tagName = o.tagName.toLowerCase();
          if (['path', 'line', 'circle', 'polygon', 'marker'].includes(tagName)) {
            c.style.stroke = cs.stroke || '#666666';
            c.style.strokeWidth = cs.strokeWidth || '2px';
            c.style.fill = cs.fill === 'none' ? 'none' : (cs.fill || '#666666');
            c.style.opacity = '1';
            c.style.visibility = 'visible';
          }
        }
      }

      // Buscar y corregir elementos <defs> y <marker> específicamente
      const defs = clone.querySelectorAll('defs');
      defs.forEach(def => {
        def.style.display = 'block';
        def.style.visibility = 'visible';
        
        const markers = def.querySelectorAll('marker');
        markers.forEach(marker => {
          marker.style.display = 'block';
          marker.style.visibility = 'visible';
          
          const paths = marker.querySelectorAll('path, polygon');
          paths.forEach(path => {
            path.style.fill = '#666666';
            path.style.stroke = 'none';
            path.style.opacity = '1';
            path.style.visibility = 'visible';
          });
        });
      });

      // Buscar elementos de React Flow edges específicamente
      const edges = clone.querySelectorAll('.react-flow__edge');
      edges.forEach(edge => {
        edge.style.opacity = '1';
        edge.style.visibility = 'visible';
        
        const paths = edge.querySelectorAll('path');
        paths.forEach(path => {
          path.style.stroke = '#666666';
          path.style.strokeWidth = '2px';
          path.style.fill = 'none';
          path.style.opacity = '1';
          path.style.visibility = 'visible';
        });
      });

      return clone;
    };

    // crear clone y colocarlo fuera de pantalla para que html2canvas lo pueda procesar
    const clone = cloneAndInlineStyles(node);
    
    // Asegurarnos que el clone tiene el mismo tamaño y fondo visible
    const origRect = node.getBoundingClientRect();
    clone.style.position = "fixed";
    clone.style.left = `${origRect.left}px`;
    clone.style.top = `${origRect.top}px`;
    clone.style.width = `${origRect.width}px`;
    clone.style.height = `${origRect.height}px`;
    clone.style.zIndex = 999999;
    clone.style.pointerEvents = "none";
    clone.style.background = window.getComputedStyle(node).background || "#ffffff";

    document.body.appendChild(clone);

    try {
      const scale = Math.min(2, window.devicePixelRatio || 1);
      const canvas = await html2canvas(clone, {
        useCORS: true,
        scale,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true,
        foreignObjectRendering: true,
        // Configuraciones específicas para SVG
        onclone: (clonedDoc) => {
          // Asegurar que todos los SVG sean visibles en el documento clonado
          const svgs = clonedDoc.querySelectorAll('svg');
          svgs.forEach(svg => {
            svg.style.overflow = 'visible';
            svg.style.display = 'block';
          });
          
          const edges = clonedDoc.querySelectorAll('.react-flow__edge path');
          edges.forEach(path => {
            path.style.stroke = '#666666';
            path.style.strokeWidth = '2px';
            path.style.fill = 'none';
          });
        }
      });
      
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      if (!blob) {
        alert("No se pudo generar la imagen");
        return;
      }
      downloadBlob(blob, `playground_screenshot_${Date.now()}.png`);
    } catch (err) {
      console.error("Error generando screenshot:", err);
      alert("Error al generar screenshot (ver consola).");
    } finally {
      // limpiar clone
      document.body.removeChild(clone);
    }
  };
  // -----------------------------------------------------------------------

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div
        style={{
          width: "100%",
          background: "#2c2c2c",
          padding: "12px 20px",
          borderBottom: "2px solid #444",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ color: "#f5f5f5", margin: 0, marginRight: "20px" }}>
          ⚙️ Componentes
        </h3>

        {/* botones existentes */}
        <button onClick={() => createNode("generator")} style={toolbarBtnStyle}>⚡ Generador</button>
        <button onClick={() => createNode("queue")} style={toolbarBtnStyle}>📦 Fila</button>
        <button onClick={() => createNode("transporter")} style={toolbarBtnStyle}>🚚 Transportador</button>
        <button onClick={() => createNode("transformer")} style={toolbarBtnStyle}>🔄 Transformador</button>
        <button onClick={() => createNode("output")} style={toolbarBtnStyle}>🎯 Salida</button>
        <button onClick={() => createNode("selector")} style={toolbarBtnStyle}>🎛 Selector</button>

        <button onClick={() => setShowCreateModal(true)} style={createBtnStyle}>➕ Crear Elemento</button>

        {/* NUEVO: botón de screenshot */}
        <button
          onClick={handleScreenshot}
          style={{
            background: "#6c757d",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "8px 14px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          📸 Screenshot
        </button>

        <button onClick={() => setShowSimModal(true)} style={runBtnStyle}>▶️ Ejecutar Simulación</button>
      </div>

      {showCreateModal && (
        <CreateElementModal
          project_id={projectId}
          onClose={() => setShowCreateModal(false)}
          onSave={async (elementData) => {
            const elemts = await fetch(`${API_URL}/processes/${projectId}/elements`).then((r) =>
              r.json()
            );
            setElements(elemts);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* contenedor visible que vamos a capturar */}
      <div
        ref={flowWrapperRef} /* <--- ref agregado (único cambio estructural mínimo) */
        style={{ flex: 1, height: "70%", width: "90%", position: "relative", margin: "8px auto" }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onNodeDragStop={onNodeDragStop}
          onNodeDoubleClick={onNodeDoubleClick}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>

        {showSimModal && (
          <div
            style={{
              color: "#000",
              position: "absolute",
              top: "20%",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#fff",
              padding: "20px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              zIndex: 2000,
              width: "300px",
            }}
          >
            <h3>Configurar Simulación</h3>
            
            <label style={{ display: "block", marginBottom: "10px" }}>
              Tiempo de simulación:
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <input
                  type="number"
                  value={simDuration}
                  onChange={(e) => setSimDuration(Number(e.target.value))}
                  style={{ flex: "2" }}
                />
                <select
                  value={simTimeUnit}
                  onChange={(e) => setSimTimeUnit(e.target.value)}
                  style={{ flex: "1" }}
                >
                  <option value="ms">ms</option>
                  <option value="s">s</option>
                  <option value="h">h</option>
                  <option value="dias">días</option>
                </select>
              </div>
            </label>

            <label style={{ display: "block", marginBottom: "10px" }}>
              Máx. elementos generados:
              <input
                type="number"
                value={maxGenerated ?? ""}
                onChange={(e) => setMaxGenerated(Number(e.target.value))}
                placeholder="opcional"
                style={{ width: "100%", marginTop: "4px" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "15px" }}>
              Máx. elementos en salidas:
              <input
                type="number"
                value={maxOutputs ?? ""}
                onChange={(e) => setMaxOutputs(Number(e.target.value))}
                placeholder="opcional"
                style={{ width: "100%", marginTop: "4px" }}
              />
            </label>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button disabled={isRunning} onClick={handleRunSimulation}>
                {isRunning ? "Ejecutando..." : "Ejecutar simulación"}
              </button>
              <button onClick={() => setShowSimModal(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {editingNode && (
          <div
            style={{
              color: "#000",
              position: "absolute",
              top: "10%",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#fff",
              padding: "20px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              zIndex: 1000,
              maxHeight: "80vh",
              overflowY: "auto",
              width: "400px",
            }}
          >
            <h3>Editar nodo {editingNode.id}</h3>
            {renderForm()}
            <button onClick={() => saveNodeChanges(editingNode)}>Guardar</button>
            <button onClick={() => setEditingNode(null)}>Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// estilos reusables (evitan repetir en JSX)
const toolbarBtnStyle = {
  background: "#444",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  padding: "8px 14px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
};

const createBtnStyle = {
  background: "#28a745",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  padding: "8px 14px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "600",
};

const runBtnStyle = {
  background: "#007bff",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  padding: "8px 14px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "600",
};
