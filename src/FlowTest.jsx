import React, { useEffect, useState,useCallback } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge,Controls } from '@xyflow/react';
import axios from 'axios';
import '@xyflow/react/dist/style.css';

export default function FlowWithBackend() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const onNodesChange = useCallback(
    (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  // Cargar datos desde el backend
  useEffect(() => {
  const pid = "p1"; // proceso a cargar

  // Traer componentes
  const fetchComponents = axios.get(`http://localhost:4000/api/processes/${pid}/components`);
  // Traer conexiones
  const fetchConnections = axios.get(`http://localhost:4000/api/processes/${pid}/connections`);

  Promise.all([fetchComponents, fetchConnections])
    .then(([componentsRes, connectionsRes]) => {
      // Mapear componentes a nodos de React Flow
      const validNodes = componentsRes.data.map(c => ({
        id: c.id,
        type: c.type || 'default',
        data: { label: c.label },
        position: { x: c.pos_x || 0, y: c.pos_y || 0 },
      }));

      // Mapear conexiones a edges de React Flow
      const validEdges = connectionsRes.data.map(e => ({
        id: e.id,
        source: e.from_component_id,
        target: e.to_component_id,
        type: 'default',
      }));

      setNodes(validNodes);
      setEdges(validEdges);
    })
    .catch(err => console.error(err));
}, []);

  // Guardar cambios en el backend
  console.log("nodos",nodes)
  console.log("edges",edges)
  return (
    <div style={{ width: '100%',width:"1200px", height: '500px', border: '1px solid black' }}>
  {nodes.length > 0 && edges.length > 0 ? (
    <ReactFlow nodes={nodes}edges={edges} onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView>
      <Controls />
    </ReactFlow>
  ) : (
    <p>Cargando grafo...</p>
  )}
</div>
  );
}