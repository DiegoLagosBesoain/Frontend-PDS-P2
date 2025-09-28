import React, { useState, useEffect, useCallback } from "react";
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
import { useParams,useNavigate } from "react-router-dom";
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
  const navigate=useNavigate()
  const { projectId, pid} = useParams();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [elements,setElements]=useState([]);
  const [showSimModal, setShowSimModal] = useState(false);
  const [simDuration, setSimDuration] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  const fetchData = useCallback(async () => {
    const comps = await fetch(`${API_URL}/processes/${pid}/components`).then((r) =>
      r.json()
    );
    const conns = await fetch(`${API_URL}/processes/${pid}/connections`).then((r) =>
      r.json()
    );
    
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
)
;})
  //cargar nodos y edges desde backend. SINCRONIZA UI CON BACKEND
  useEffect(() => {
  const fetchData = async () => {
    const comps = await fetch(`${API_URL}/processes/${pid}/components`).then((r) => r.json());
    const conns = await fetch(`${API_URL}/processes/${pid}/connections`).then((r) => r.json());
    const elemts= await fetch(`${API_URL}/processes/${projectId}/elements`).then((r) =>
      r.json()
    );
    setElements(elemts)
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
      console.log("nodos cargados:",comps)
      console.log("elementos recibidos:",elemts)
  };

  fetchData();
  console.log("nueva carga")
  
  
}, [pid]);

  //reacciones a cambios en nodos y edges
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );


  const onNodeDoubleClick = useCallback((event, node) => {
    setEditingNode(node);//cuando se haga doble click sobre un nodo, ese nodo va a ser el EditingNode
  }, []);
  //crear nodo desde toolbar
  const createNode = async (type) => { //Al presionar un botón en la UI, se crea un nodo nuevo en el backend y luego se agrega al estado local para mostrarlo inmediatamente.
    const res = await fetch(`${API_URL}/processes/${pid}/components`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        label: "No name",
        pos_x: 250,
        pos_y: 150,
        params: {label: "No name"},
      }),
    });//crea el nodo en el backend

    const node = await res.json();
    setNodes((nds) => [
      ...nds,
      {
        id: node.id,
        type: node.type.toLowerCase(), 
        data: { label: node.label},
        position: { x: node.pos_x, y: node.pos_y },
      },
    ]);//agrega el nodo en la lista de nodos del front
    console.log(nodes)
  };

  //crear conexión
const onConnect = useCallback(
  async (params) => {
    console.log("Intento de conexión:", params);
    console.log(edges)
    //estructura de params: {source: '8ddb5839-537f-4875-ae77-7829a9bc3880', sourceHandle: 'out-0', target: 'de971e0b-df88-4713-bbbd-0f9f4b1616cc', targetHandle: 'in-0'}
    


    // ⚡ Evitar duplicados en el mismo handle
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

    // ⚡ Evitar conectar un nodo a sí mismo
    if (params.source === params.target) {
      alert("No se puede conectar un nodo a sí mismo");
      return;
    }

    // ⚡ Evitar que ya exista una conexión entre los mismos nodos
    const nodesConnected = edges.some(
      (e) =>
        (e.source === params.source && e.target === params.target) ||
        (e.source === params.target && e.target === params.source) // opcional si es bidireccional
    );
    if (nodesConnected) {
      alert("Ya existe una conexión entre estos nodos");
      return;
    }

    // ⚡ Obtener nodos
    const sourceNode = nodes.find((n) => n.id === params.source);
    const targetNode = nodes.find((n) => n.id === params.target);

    if (!sourceNode || !targetNode) {
      alert("Uno de los nodos no existe");
      return;
    }

    // 🔹 Validar con reglas externas
    const { valid, message } = validateConnection(sourceNode, targetNode, params);
    if (!valid) {
      alert(message);
      return;
    }

    // ✅ Si pasa todas las reglas, crear la conexión en backend
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
    console.log("edge recibido",edge)
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
  // Actualizamos localmente
  setNodes((nds) =>
    nds.map((n) =>
      n.id === id
        ? { ...n, data: { ...n.data, ...updatedParams } }
        : n
    )
  );

  // Enviamos al backend dentro de params
  await fetch(`${API_URL}/components/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params: updatedParams }),
  });
  fetchData()
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

    // Detectar edges eliminados y borrarlos en backend
    const removedEdges = eds.filter((e) => !newEdges.includes(e));
    removedEdges.forEach(async (edge) => {
      await fetch(`${API_URL}/connections/${edge.id}`, { method: "DELETE" })
    });

    return newEdges;
  });
}, [nodes]);
useEffect(() => {
  
  setEdges((eds) =>
    eds.map((e) => {
      const sourceNode = nodes.find((n) => n.id === e.source);
      if (!sourceNode) return e;

      // reasignar si el handle original ya no existe
      if (e.sourceHandle) {
        const maxSalidas = sourceNode.data.salidas || 1;
        const salidaIndex = parseInt(e.sourceHandle.replace("out-", ""), 10);

        if (salidaIndex >= maxSalidas) {
          return { ...e, sourceHandle: "out-0" }; // moverlo a la primera salida válida
        }
      }
      return e;
    })
  );
}, [nodes, setEdges]);
  //eliminar nodos en backend
  const onNodesDelete = useCallback((deleted) => {
    deleted.forEach(async (node) => {
      await fetch(`${API_URL}/components/${node.id}`, { method: "DELETE" });
    });
  }, []);

  //eliminar edges en backend
  const onEdgesDelete = useCallback((deleted) => {
    deleted.forEach(async (edge) => {
      await fetch(`${API_URL}/connections/${edge.id}`, { method: "DELETE" });
    });
  }, []);

  //actualizar posición de nodos en backend
  const onNodeDragStop = useCallback(async (evt, node) => {
    await fetch(`${API_URL}/components/${node.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pos_x: node.position.x, pos_y: node.position.y }),
    });
  }, []);

  const saveNodeChanges = async (node) => {
    try {
      // 1️⃣ Guardar cambios del nodo en el backend
      const res = await fetch(`${API_URL}/components/${node.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: node.data.label,
          params: node.data,
        }),
      }); //guarda los cambios hechos en el formulario de edicion en el backend

      const updated = await res.json();

      // 2️⃣ Actualizar nodo en el estado local
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id ? { ...n, data: updated.params } : n
        )
      );

      // 3️⃣ Eliminar todas las conexiones relacionadas al nodo
      setEdges((eds) => {
        const newEdges = eds.filter(
          (e) => e.source !== node.id && e.target !== node.id
        );

        const removedEdges = eds.filter(
          (e) => e.source === node.id || e.target === node.id
        );

        removedEdges.forEach(async (edge) => {
          try {
            await fetch(`${API_URL}/connections/${edge.id}`, { method: "DELETE" });
            console.log(`Conexión eliminada en backend: ${edge.id}`);
          } catch (err) {
            console.error(`Error eliminando conexión ${edge.id}:`, err);
          }
        });

        return newEdges;
      });

      // 4️⃣ Cerrar modal / editar nodo
      setEditingNode(null);

      // 5️⃣ Refrescar datos si es necesario
      fetchData();

      console.log("Nodo actualizado y conexiones eliminadas");
    } catch (err) {
      console.error("Error guardando cambios del nodo:", err);
      alert("No se pudieron guardar los cambios del nodo");
    }
  };
  const handleRunSimulation = async () => {
      const processDef = buildProcessDef();
      console.log("ProcessDef a enviar:", processDef);

      // 1) Validar localmente
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
        setIsRunning(true); // 🔒 bloquear botón

        // 2) Enviar al backend
        const res = await fetch(`${API_URL}/simulation/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ processDef, duration: simDuration,processId:pid }),
        });

        const result = await res.json();

        if (res.ok && result.success) {
          console.log("Resultado de la simulación:", result);
          alert("Simulación completada, revisa la consola");
          setShowSimModal(false);
          console.log(res)
          navigate(`/projects/${projectId}/processes/${pid}/simulations/${result.simId}`)
        } else {
          alert("Error al ejecutar la simulación: " + (result.error || "desconocido"));
        }
      } catch (err) {
        console.error("❌ Error en la simulación:", err);
        alert("Error en la simulación, revisa consola.");
      } finally {
        setIsRunning(false); // 🔓 habilitar botón de nuevo
      }
};


  const renderForm = () => {
    if (!editingNode) return null;

    const type = editingNode.type.toLowerCase(); // para estar seguro de minúsculas

    switch (type) {
      case "generator":
        return <GeneratorForm node={editingNode} setEditingNode={setEditingNode} elements={elements} />;
      case "transporter":
        return <TransporterForm node={editingNode} setEditingNode={setEditingNode} elements={elements} />;
      case "transformer":
        return <TransformerForm node={editingNode} setEditingNode={setEditingNode} elements={elements} />;
      case "queue":
        return <QueueForm node={editingNode} setEditingNode={setEditingNode} elements={elements}  />;
      case "output":
        return <OutputForm node={editingNode} setEditingNode={setEditingNode} elements={elements}  />;
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

  ////////////////////////////////////////////// PARA LA SIMULACION /////////////////////////////////////////////////////////

  // 🔹 Convierte el estado local en el JSON que entiende tu backend
  const buildProcessDef = () => {
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        params: n.data, // aquí van todos los parámetros configurados en formularios
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

  const exportFullAsPng = async () => {
  if (!nodes || nodes.length === 0) {
    alert("No hay nodos para exportar");
    return;
  }

  const dims = computeBoundingBox(nodes);
  setExportDims(dims);

  // esperar montaje del clon y fonts
  await new Promise((r) => setTimeout(r, 700));
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (e) { /* ignore */ }
  }

  const node = exportRef.current;
  console.log("DEBUG export: nodeRef", node, "dims", dims);

  if (!node) {
    alert("Error: contenedor de export no encontrado (exportRef.current es null).");
    setExportDims(null);
    return;
  }

  // sanity check dimensiones del DOM clonado
  const w = node.offsetWidth || node.clientWidth || dims.width;
  const h = node.offsetHeight || node.clientHeight || dims.height;
  console.log("DEBUG export: node size", w, h);

  if (!w || !h) {
    alert("Error: el contenedor de export tiene ancho/alto 0. Revisa el DOM.");
    setExportDims(null);
    return;
  }

  // escala adaptativa para no generar archivos gigantes
  const maxDim = Math.max(dims.width, dims.height);
  let scale = 2;
  if (maxDim > 3000) scale = 1.2;
  else if (maxDim > 2000) scale = 1.5;
  else if (maxDim > 1500) scale = 1.8;

  try {
    // usamos toBlob directamente (más robusto que usar dataURL + fetch)
    const blob = await new Promise((resolve, reject) => {
      domtoimage.toBlob(node, {
        width: Math.round(dims.width * scale),
        height: Math.round(dims.height * scale),
        style: {
          transformOrigin: "top left",
          width: `${dims.width}px`,
          height: `${dims.height}px`,
          background: "#ffffff",
        },
        cacheBust: true,
        quality: 1,
      }).then(resolve).catch(reject);
    });

    if (!blob || blob.size === 0) {
      console.error("DEBUG export: blob vacío o nulo", blob);
      alert("Se generó un blob vacío. Revisa la consola para más detalles.");
      setExportDims(null);
      return;
    }

    console.log("DEBUG export: blob generado, size:", blob.size);
    downloadBlob(blob, `process_${pid || projectId}_full.png`);
  } catch (err) {
    console.error("Error exportando PNG:", err);
    alert("Error exportando la imagen. Revisa la consola para detalles.");
  } finally {
    setExportDims(null);
  }
};

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
    <button
      onClick={() => createNode("generator")}
      style={{
        background: "#444",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        padding: "8px 14px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "500",
      }}
      onMouseOver={(e) => (e.target.style.background = "#666")}
      onMouseOut={(e) => (e.target.style.background = "#444")}
    >
      ⚡ Generador
    </button>
    <button
      onClick={() => createNode("queue")}
      style={{
        background: "#444",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        padding: "8px 14px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "500",
      }}
      onMouseOver={(e) => (e.target.style.background = "#666")}
      onMouseOut={(e) => (e.target.style.background = "#444")}
    >
      📦 Fila
    </button>
    <button
      onClick={() => createNode("transporter")}
      style={{
        background: "#444",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        padding: "8px 14px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "500",
      }}
      onMouseOver={(e) => (e.target.style.background = "#666")}
      onMouseOut={(e) => (e.target.style.background = "#444")}
    >
      🚚 Transportador
    </button>
    <button
      onClick={() => createNode("transformer")}
      style={{
        background: "#444",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        padding: "8px 14px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "500",
      }}
      onMouseOver={(e) => (e.target.style.background = "#666")}
      onMouseOut={(e) => (e.target.style.background = "#444")}
    >
      🔄 Transformador
    </button>
    <button
      onClick={() => createNode("output")}
      style={{
        background: "#444",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        padding: "8px 14px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "500",
      }}
      onMouseOver={(e) => (e.target.style.background = "#666")}
      onMouseOut={(e) => (e.target.style.background = "#444")}
    >
      🎯 Salida
    </button>
    <button
      onClick={() => createNode("selector")}
      style={{
        background: "#444",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        padding: "8px 14px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "500",
      }}
      onMouseOver={(e) => (e.target.style.background = "#666")}
      onMouseOut={(e) => (e.target.style.background = "#444")}
    >
      🎛 Selector
    </button>
    <button
      onClick={() => setShowCreateModal(true)}
      style={{
        background: "#28a745",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        padding: "8px 14px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "600",
      }}
      onMouseOver={(e) => (e.target.style.background = "#218838")}
      onMouseOut={(e) => (e.target.style.background = "#28a745")}
    >
      ➕ Crear Elemento
    </button>






  <button
    onClick={() => setShowSimModal(true)}
    style={{
      background: "#007bff",
      color: "#fff",
      border: "none",
      borderRadius: "6px",
      padding: "8px 14px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "600",
    }}
    onMouseOver={(e) => (e.target.style.background = "#0056b3")}
    onMouseOut={(e) => (e.target.style.background = "#007bff")}
  >
    ▶️ Ejecutar Simulación
  </button>

    
  </div>
      {showCreateModal && (
  <CreateElementModal
    project_id={projectId}
    onClose={() => setShowCreateModal(false)}
    onSave={async (elementData) => {
      // Enviar al backend para crear el elemento
      const elemts= await fetch(`${API_URL}/processes/${projectId}/elements`).then((r) =>
      r.json()
      );
      setElements(elemts)
      setShowCreateModal(false);
    }}
  />
)}

      <div style={{ flex: 1, height: "70%", width: "90%", position: "relative" }}>
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
      <label>
        Tiempo de simulación:
        <input
          type="number"
          value={simDuration}
          onChange={(e) => setSimDuration(Number(e.target.value))}
          style={{
            width: "100%",
            padding: "6px",
            marginTop: "6px",
            marginBottom: "12px",
          }}
        />
      </label>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button
          disabled={isRunning}
          onClick={handleRunSimulation
        }
        >
          {isRunning ? "Ejecutando..." : "Ejecutar simulación"}
        </button>
        <button onClick={() => setShowSimModal(false)}>Cancelar</button>
      </div>
    </div>
  )}



  {/* 👇 Modal fuera de ReactFlow */}
  {editingNode && (
    <div
      style={{
        color:"#000",
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