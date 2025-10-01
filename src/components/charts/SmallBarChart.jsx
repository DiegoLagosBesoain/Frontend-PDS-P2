// src/components/charts/SmallBarChart.jsx
import React from "react";

export default function SmallBarChart({ data = [], width = 600, height = 200, barColor = "var(--accent)", leftMargin }) {
  if (!data || data.length === 0) return <div style={{ padding: 8 }}>Sin datos</div>;

  const estimatedLeft = leftMargin ?? Math.min(160, Math.max(60, Math.max(...data.map((d) => String(d.label || "").length)) * 7));
  const margin = { top: 8, right: 12, bottom: 8, left: estimatedLeft };
  const w = width;
  const innerW = Math.max(60, w - margin.left - margin.right);

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
