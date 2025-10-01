// src/components/TableView.jsx
import React from "react";

/**
 * Props:
 *  - components
 *  - filteredRows
 *  - maxTime
 *  - searchElementName, setSearchElementName
 *  - paramKeys
 *  - filterParamKey, setFilterParamKey
 *  - filterParamValue, setFilterParamValue
 *  - paramValuesForKey  <-- lista de valores posibles (string[])
 */
export default function TableView({
  components,
  filteredRows,
  maxTime,
  timeUnit = "s", // nuevo
  searchElementName,
  setSearchElementName,
  paramKeys,
  filterParamKey,
  setFilterParamKey,
  filterParamValue,
  setFilterParamValue,
}) {
  return (
    <>
      <div style={{ marginTop: 12, marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          placeholder="Buscar elemento"
          value={searchElementName}
          onChange={(e) => setSearchElementName(e.target.value)}
        />
        <select
          value={filterParamKey}
          onChange={(e) => {
            setFilterParamKey(e.target.value);
            // cuando cambio la clave reseteo el valor seleccionado
            setFilterParamValue("");
          }}
        >
          <option value="">-- filtro por param --</option>
          {paramKeys.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        {filterParamKey && (
          <select value={filterParamValue} onChange={(e) => setFilterParamValue(e.target.value)}>
            <option value="">-- cualquier valor --</option>
            {paramValuesForKey && paramValuesForKey.length > 0
              ? paramValuesForKey.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))
              : null}
          </select>
        )}

        <div style={{ marginLeft: "auto" }}>
          <button
            className="btn"
            onClick={() => {
              setSearchElementName("");
              setFilterParamKey("");
              setFilterParamValue("");
            }}
          >
            Reset filtros
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto", marginTop: 8 }}>
        <table className="sim-table">
          <thead>
            <tr>
              <th>Elemento</th>
              <th>Parámetros</th>
              {components.map((col) => (
                <th key={col.id}>
                  {col.params?.label || col.label || `${col.type} ${String(col.id).slice(0, 8)}`}
                </th>
              ))}
              <th>Tiempo total ({timeUnit})</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(([elemName, rowObj]) => {
              const params = rowObj.params || {};
              const paramsText = Object.entries(params)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ");
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
                  <td>
                    <strong>{elemName}</strong>
                  </td>
                  <td>{paramsText || "-"}</td>
                  {times.map((t, i) => (
                    <td key={components[i].id} title={t == null ? "" : String(t)}>
                      {t == null ? "-" : `${Number(t).toFixed(2)} ${timeUnit}`}
                      {t != null && maxTime > 0 && (
                        <div className="time-bar">
                          <div className="time-bar-fill" style={{ width: `${(Number(t) / (maxTime || 1)) * 100}%` }} />
                        </div>
                      )}
                    </td>
                  ))}
                  <td>{totalTime === "-" ? "-" : `${Number(totalTime).toFixed(2)} ${timeUnit}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
