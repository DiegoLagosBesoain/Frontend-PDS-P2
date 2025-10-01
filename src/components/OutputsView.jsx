// src/components/OutputsView.jsx
import React from "react";

export default function OutputsView({ outputsList = [], goToTableWithElement }) {
  return (
    <div style={{ marginTop: 12 }}>
      <h4>Outputs</h4>
      {outputsList.length === 0 ? <div>No hay outputs</div> : outputsList.map(({ output, reached }) => (
        <div key={output.id} style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 700 }}>{output.params?.label || output.label || `${output.type} ${String(output.id).slice(0,8)}`} ({reached.length})</div>
          <div style={{ marginTop: 6 }}>
            {reached.slice(0, 30).map((name) => <button key={name} className="btn" onClick={() => goToTableWithElement(name)}>{name}</button>)}
            {reached.length > 30 && <span style={{ marginLeft: 8 }}>+{reached.length - 30} más</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
