import type { EloDataPoint } from '../eloHistory';

interface EloChartProps {
  data: EloDataPoint[];
}

const PADDING = { top: 20, right: 16, bottom: 32, left: 44 };
const HEIGHT = 200;

export function EloChart({ data }: EloChartProps) {
  if (data.length < 2) {
    return (
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl px-4 py-8 text-center">
        <p className="text-slate-500 text-sm">Not enough matches to chart</p>
      </div>
    );
  }

  const elos = data.map(d => d.elo);
  const minElo = Math.min(...elos);
  const maxElo = Math.max(...elos);
  const eloPadding = Math.max(20, Math.ceil((maxElo - minElo) * 0.15));
  const yMin = Math.floor((minElo - eloPadding) / 10) * 10;
  const yMax = Math.ceil((maxElo + eloPadding) / 10) * 10;

  const chartWidth = 100; // percentage-based, will use viewBox
  const viewBoxWidth = 400;
  const plotW = viewBoxWidth - PADDING.left - PADDING.right;
  const plotH = HEIGHT - PADDING.top - PADDING.bottom;

  function xPos(i: number) {
    return PADDING.left + (i / (data.length - 1)) * plotW;
  }

  function yPos(elo: number) {
    return PADDING.top + plotH - ((elo - yMin) / (yMax - yMin)) * plotH;
  }

  // Build path
  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(d.elo).toFixed(1)}`)
    .join(' ');

  // Gradient fill path
  const fillD = `${pathD} L${xPos(data.length - 1).toFixed(1)},${(PADDING.top + plotH).toFixed(1)} L${xPos(0).toFixed(1)},${(PADDING.top + plotH).toFixed(1)} Z`;

  // Y-axis gridlines
  const yRange = yMax - yMin;
  const yStep = yRange <= 60 ? 10 : yRange <= 150 ? 25 : 50;
  const gridlines: number[] = [];
  for (let v = yMin; v <= yMax; v += yStep) {
    gridlines.push(v);
  }

  // X-axis labels (first, middle, last)
  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const xLabels = [
    { i: 0, label: formatDate(data[0].timestamp) },
    { i: data.length - 1, label: formatDate(data[data.length - 1].timestamp) },
  ];
  if (data.length > 4) {
    const mid = Math.floor(data.length / 2);
    xLabels.splice(1, 0, { i: mid, label: formatDate(data[mid].timestamp) });
  }

  return (
    <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-4">
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${HEIGHT}`}
        width={`${chartWidth}%`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="eloFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {gridlines.map(v => (
          <g key={v}>
            <line
              x1={PADDING.left}
              x2={PADDING.left + plotW}
              y1={yPos(v)}
              y2={yPos(v)}
              stroke="#2e3350"
              strokeWidth="0.5"
            />
            <text
              x={PADDING.left - 6}
              y={yPos(v)}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#64748b"
              fontSize="10"
            >
              {v}
            </text>
          </g>
        ))}

        {/* X labels */}
        {xLabels.map(({ i, label }) => (
          <text
            key={i}
            x={xPos(i)}
            y={PADDING.top + plotH + 18}
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
          >
            {label}
          </text>
        ))}

        {/* Fill area */}
        <path d={fillD} fill="url(#eloFill)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round" />

        {/* Dots at first and last */}
        <circle cx={xPos(0)} cy={yPos(data[0].elo)} r="3" fill="#818cf8" />
        <circle cx={xPos(data.length - 1)} cy={yPos(data[data.length - 1].elo)} r="3" fill="#818cf8" />
      </svg>
    </div>
  );
}
