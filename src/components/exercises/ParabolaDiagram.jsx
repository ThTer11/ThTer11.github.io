function createPath({ a, b, c, xMin, xMax, yMin, yMax, width, height }) {
  const points = [];
  const samples = 120;

  for (let index = 0; index <= samples; index += 1) {
    const x = xMin + ((xMax - xMin) * index) / samples;
    const y = a * x * x + b * x + c;
    const screenX = ((x - xMin) / (xMax - xMin)) * width;
    const screenY = height - ((y - yMin) / (yMax - yMin)) * height;
    points.push(`${index === 0 ? "M" : "L"}${screenX.toFixed(2)},${screenY.toFixed(2)}`);
  }

  return points.join(" ");
}

export default function ParabolaDiagram({ diagram }) {
  const width = 520;
  const height = 280;
  const xMin = diagram.xMin ?? -5;
  const xMax = diagram.xMax ?? 5;
  const yMin = diagram.yMin ?? -5;
  const yMax = diagram.yMax ?? 8;
  const data = { ...diagram, xMin, xMax, yMin, yMax, width, height };
  const axisX = ((0 - xMin) / (xMax - xMin)) * width;
  const axisY = height - ((0 - yMin) / (yMax - yMin)) * height;
  const verticals = Array.from({ length: Math.floor(xMax - xMin) + 1 }, (_, index) => xMin + index);
  const horizontals = Array.from({ length: Math.floor(yMax - yMin) + 1 }, (_, index) => yMin + index);

  return (
    <div className="exercise-graph-frame">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={diagram.alt ?? "Représentation graphique d'une parabole"}>
        <rect width={width} height={height} className="exercise-graph-background" />
        {verticals.map((x) => {
          const screenX = ((x - xMin) / (xMax - xMin)) * width;
          return <line key={`x-${x}`} x1={screenX} x2={screenX} y1="0" y2={height} className="exercise-graph-grid" />;
        })}
        {horizontals.map((y) => {
          const screenY = height - ((y - yMin) / (yMax - yMin)) * height;
          return <line key={`y-${y}`} x1="0" x2={width} y1={screenY} y2={screenY} className="exercise-graph-grid" />;
        })}
        <line x1={axisX} x2={axisX} y1="0" y2={height} className="exercise-graph-axis" />
        <line x1="0" x2={width} y1={axisY} y2={axisY} className="exercise-graph-axis" />
        <path d={createPath(data)} className="exercise-graph-curve" />
      </svg>
    </div>
  );
}
