// src/components/charts/SmallLineChart.jsx
import React from "react";

export default function SmallLineChart({ data = [], width = 600, height = 160, stroke = "var(--accent)" }) {
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

  const pathD = data
    .map((d, i) => {
      const x = xScale(d.time);
      const y = yScale(d.cumulative);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const ticks = 4;
  const xTicks = new Array(ticks + 1).fill(0).map((_, i) => minX + (i / ticks) * (maxX - minX));
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
