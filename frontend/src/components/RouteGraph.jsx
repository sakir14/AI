const nodes = {
  "Sumber air (simulasi)": { x: 70, y: 250, kind: "source", label: "Sumber air" },
  "Cabang A (simulasi)": { x: 300, y: 130, kind: "branch", label: "Cabang A" },
  "Cabang B (simulasi)": { x: 300, y: 250, kind: "branch", label: "Cabang B" },
  "Cabang C (simulasi)": { x: 300, y: 370, kind: "branch", label: "Cabang C" },
  Mundu: { x: 450, y: 70, kind: "village" },
  Kaplonganlor: { x: 560, y: 130, kind: "village" },
  Tanjungpura: { x: 670, y: 70, kind: "village" },
  Tanjungsari: { x: 450, y: 190, kind: "village" },
  Pringgacala: { x: 560, y: 250, kind: "village" },
  Benda: { x: 670, y: 190, kind: "village" },
  Sendang: { x: 560, y: 310, kind: "village" },
  "Karangampel Kidul": { x: 450, y: 430, kind: "village" },
  Karangampel: { x: 560, y: 370, kind: "village" },
  "Dukuh Jeruk": { x: 670, y: 430, kind: "village" },
  "Dukuh Tengah": { x: 780, y: 370, kind: "village" },
};

const edges = [
  ["Sumber air (simulasi)", "Cabang A (simulasi)"],
  ["Sumber air (simulasi)", "Cabang B (simulasi)"],
  ["Sumber air (simulasi)", "Cabang C (simulasi)"],
  ["Cabang A (simulasi)", "Cabang B (simulasi)"],
  ["Cabang B (simulasi)", "Cabang C (simulasi)"],
  ["Cabang A (simulasi)", "Mundu"],
  ["Cabang A (simulasi)", "Kaplonganlor"],
  ["Cabang A (simulasi)", "Tanjungpura"],
  ["Cabang B (simulasi)", "Tanjungsari"],
  ["Cabang B (simulasi)", "Pringgacala"],
  ["Cabang B (simulasi)", "Benda"],
  ["Cabang B (simulasi)", "Sendang"],
  ["Cabang C (simulasi)", "Karangampel Kidul"],
  ["Cabang C (simulasi)", "Karangampel"],
  ["Cabang C (simulasi)", "Dukuh Jeruk"],
  ["Cabang C (simulasi)", "Dukuh Tengah"],
];

function RouteGraph({ route, targetVillage }) {
  const path = route?.path || [];
  const activeEdges = new Set(
    path.slice(1).map((node, index) => `${path[index]}|${node}`),
  );
  const activeNodes = new Set(path);

  return (
    <section className="route-graph-card" aria-label="Visualisasi graf rute A*">
      <div className="route-graph-heading">
        <div>
          <h2>Visualisasi rute A*</h2>
          <p>
            {targetVillage
              ? `Lintasan dari sumber air menuju ${targetVillage}.`
              : "Jaringan simulasi sumber air, cabang, dan desa."}
          </p>
        </div>
        {route?.cost_units != null && (
          <span className="route-cost">Biaya lintasan: {route.cost_units} unit</span>
        )}
      </div>
      <div className="route-graph-scroll">
        <svg
          className="route-graph-svg"
          viewBox="0 0 960 500"
          role="img"
          aria-label={`Graf simulasi A*${path.length ? ` dengan rute ${path.join(" ke ")}` : ""}`}
        >
          <defs>
            <marker
              id="route-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#15935b" />
            </marker>
          </defs>
          {edges.map(([from, to]) => {
            const start = nodes[from];
            const end = nodes[to];
            const selected = activeEdges.has(`${from}|${to}`) || activeEdges.has(`${to}|${from}`);
            return (
              <g key={`${from}-${to}`}>
                <line
                  className="route-graph-edge"
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                />
                {selected && (
                  <line
                    className="route-graph-edge-active"
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    markerEnd="url(#route-arrow)"
                  />
                )}
              </g>
            );
          })}
          {Object.entries(nodes).map(([name, node]) => {
            const active = activeNodes.has(name);
            const target = name === targetVillage;
            return (
              <g
                className={`route-graph-node route-graph-node-${node.kind}${active ? " is-active" : ""}${target ? " is-target" : ""}`}
                key={name}
              >
                <circle cx={node.x} cy={node.y} r={node.kind === "source" ? 12 : 9} />
                <text
                  x={node.kind === "source" || node.kind === "branch" ? node.x : node.x + 14}
                  y={node.kind === "source" ? node.y + 29 : node.kind === "branch" ? node.y - 13 : node.y + 4}
                  textAnchor={node.kind === "source" || node.kind === "branch" ? "middle" : "start"}
                >
                  {node.label || name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="route-graph-legend">
        <span><i className="legend-dot legend-source" />Sumber air</span>
        <span><i className="legend-dot legend-branch" />Cabang saluran</span>
        <span><i className="legend-dot legend-village" />Desa</span>
        <span><i className="legend-line" />Lintasan A* terpilih</span>
      </div>
      {path.length > 0 && <p className="route-graph-path">Rute: {path.join(" → ")}</p>}
      <small className="route-graph-note">
        Graf dan posisi simpul bersifat abstrak untuk demonstrasi algoritma, bukan peta atau jaringan irigasi terverifikasi.
      </small>
    </section>
  );
}

export default RouteGraph;
