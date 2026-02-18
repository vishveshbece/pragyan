import { useState, useRef, useEffect } from "react";

const DIRECTIONS = [
  { key: "f", label: "Forward", icon: "↑", code: 0, color: "#00f5a0" },
  { key: "b", label: "Backward", icon: "↓", code: 1, color: "#f5a000" },
  { key: "r", label: "Right", icon: "→", code: 2, color: "#00c3f5" },
  { key: "l", label: "Left", icon: "←", code: 3, color: "#f500c3" },
];

const PRESETS = [
  { name: "Square", steps: [{ dir: "f", dist: 100 }, { dir: "r", dist: 100 }, { dir: "b", dist: 100 }, { dir: "l", dist: 100 }] },
  { name: "Zigzag", steps: [{ dir: "f", dist: 50 }, { dir: "r", dist: 30 }, { dir: "f", dist: 50 }, { dir: "l", dist: 30 }] },
  { name: "U-Turn", steps: [{ dir: "f", dist: 80 }, { dir: "r", dist: 40 }, { dir: "b", dist: 80 }] },
];

function SketchCanvas({ steps }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    if (steps.length === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "13px 'Courier New'";
      ctx.textAlign = "center";
      ctx.fillText("Add steps to preview route", W / 2, H / 2);
      return;
    }

    // Compute bounding box
    let x = 0, y = 0;
    const points = [{ x, y }];
    const deltas = steps.map(s => {
      const d = Number(s.dist) || 0;
      if (s.dir === "f") return { dx: 0, dy: -d };
      if (s.dir === "b") return { dx: 0, dy: d };
      if (s.dir === "r") return { dx: d, dy: 0 };
      if (s.dir === "l") return { dx: -d, dy: 0 };
      return { dx: 0, dy: 0 };
    });

    deltas.forEach(({ dx, dy }) => {
      x += dx; y += dy;
      points.push({ x, y });
    });

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const pad = 40;
    const scaleX = (W - pad * 2) / rangeX;
    const scaleY = (H - pad * 2) / rangeY;
    const scale = Math.min(scaleX, scaleY, 3);

    const toCanvas = (px, py) => ({
      cx: pad + (px - minX) * scale + (W - pad * 2 - rangeX * scale) / 2,
      cy: pad + (py - minY) * scale + (H - pad * 2 - rangeY * scale) / 2,
    });

    // Draw path with gradient per segment
    points.forEach((pt, i) => {
      if (i === 0) return;
      const from = toCanvas(points[i - 1].x, points[i - 1].y);
      const to = toCanvas(pt.x, pt.y);
      const dir = steps[i - 1]?.dir;
      const color = DIRECTIONS.find(d => d.key === dir)?.color || "#fff";

      // Glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(from.cx, from.cy);
      ctx.lineTo(to.cx, to.cy);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Arrow
      const angle = Math.atan2(to.cy - from.cy, to.cx - from.cx);
      const mx = (from.cx + to.cx) / 2;
      const my = (from.cy + to.cy) / 2;
      const al = 8;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(mx + al * Math.cos(angle), my + al * Math.sin(angle));
      ctx.lineTo(mx + al * Math.cos(angle + 2.4), my + al * Math.sin(angle + 2.4));
      ctx.lineTo(mx + al * Math.cos(angle - 2.4), my + al * Math.sin(angle - 2.4));
      ctx.closePath();
      ctx.fill();

      // Distance label
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "10px 'Courier New'";
      ctx.textAlign = "center";
      ctx.fillText(`${steps[i - 1]?.dist || 0}cm`, mx + 8, my - 6);
    });

    // Start dot
    const start = toCanvas(points[0].x, points[0].y);
    ctx.shadowColor = "#00f5a0";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#00f5a0";
    ctx.beginPath();
    ctx.arc(start.cx, start.cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = "bold 8px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText("S", start.cx, start.cy + 3);
    ctx.shadowBlur = 0;

    // End dot
    const end = toCanvas(points[points.length - 1].x, points[points.length - 1].y);
    ctx.shadowColor = "#f5a000";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#f5a000";
    ctx.beginPath();
    ctx.arc(end.cx, end.cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = "bold 8px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText("E", end.cx, end.cy + 3);
    ctx.shadowBlur = 0;
  }, [steps]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={260}
      style={{ width: "100%", height: "260px", borderRadius: "12px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}
    />
  );
}

export default function AVRoutePlanner() {
  const [steps, setSteps] = useState([]);
  const [selectedDir, setSelectedDir] = useState();
  const [distance, setDistance] = useState("");
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const [endpoint, setEndpoint] = useState("https://pragyan-backend.onrender.com/save-data");
  const [showEndpoint, setShowEndpoint] = useState(false);
  const distRef = useRef(null);

  const addStep = () => {
    const d = parseFloat(distance);
    if (!d || d <= 0) { distRef.current?.focus(); return; }
    setSteps(prev => [...prev, { dir: selectedDir, dist: d, id: Date.now() }]);
    setDistance("");
    distRef.current?.focus();
  };

  const removeStep = (id) => setSteps(prev => prev.filter(s => s.id !== id));

  const moveStep = (idx, dir) => {
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === steps.length - 1)) return;
    const arr = [...steps];
    [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
    setSteps(arr);
  };

  const loadPreset = (preset) => {
    setSteps(preset.steps.map((s, i) => ({ ...s, id: Date.now() + i })));
  };

  const buildPayload = () => {
    const arr = [];
    steps.forEach(s => {
      arr.push(s.dir);         // even index: direction char
      arr.push(Number(s.dist)); // odd index: distance
    });
    return arr;
  };

  const handleSend = async () => {
    if (steps.length === 0) return;
    setSending(true);
    setStatus(null);
    const payload = buildPayload();
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route: payload }),
      });
      setStatus({ ok: res.ok, msg: res.ok ? `✓ Sent! ${steps.length} steps dispatched.` : `✗ Server error ${res.status}` });
    } catch {
      setStatus({ ok: false, msg: "✗ Network error — check endpoint." });
    }
    setSending(false);
  };

  const payload = buildPayload();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0c0f",
      fontFamily: "'Courier New', monospace",
      color: "#e8e8e8",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "24px 16px",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#00f5a0", marginBottom: "6px" }}>AUTONOMOUS VEHICLE</div>
        <h1 style={{ fontSize: "26px", fontWeight: "bold", margin: 0, letterSpacing: "2px" }}>ROUTE PLANNER</h1>
        <div style={{ width: "60px", height: "2px", background: "linear-gradient(90deg, #00f5a0, #00c3f5)", margin: "10px auto 0" }} />
      </div>

      <div style={{ width: "100%", maxWidth: "780px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Preset bar */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "10px", color: "#666", alignSelf: "center", letterSpacing: "2px" }}>PRESETS:</span>
          {PRESETS.map(p => (
            <button key={p.name} onClick={() => loadPreset(p)} style={{
              padding: "5px 14px", fontSize: "11px", letterSpacing: "1px",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
              color: "#ccc", borderRadius: "6px", cursor: "pointer",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.target.style.borderColor = "#00f5a0"; e.target.style.color = "#00f5a0"; }}
              onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.color = "#ccc"; }}
            >{p.name}</button>
          ))}
        </div>

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

          {/* Left: Input panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Direction selector */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#888", marginBottom: "12px" }}>DIRECTION</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {DIRECTIONS.map(d => (
                  <button key={d.key} onClick={() => setSelectedDir(d.key)} style={{
                    padding: "12px 8px",
                    background: selectedDir === d.key ? `${d.color}18` : "rgba(255,255,255,0.03)",
                    border: selectedDir === d.key ? `1.5px solid ${d.color}` : "1.5px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    color: selectedDir === d.key ? d.color : "#888",
                    cursor: "pointer",
                    fontSize: "18px",
                    transition: "all 0.18s",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                  }}>
                    <span>{d.icon}</span>
                    <span style={{ fontSize: "9px", letterSpacing: "1px" }}>{d.label.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Distance input */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#888", marginBottom: "12px" }}>DISTANCE (cm)</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  ref={distRef}
                  type="number"
                  min="1"
                  placeholder="e.g. 100"
                  value={distance}
                  onChange={e => setDistance(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addStep()}
                  style={{
                    flex: 1, padding: "10px 14px",
                    background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px", color: "#fff", fontSize: "16px",
                    fontFamily: "'Courier New', monospace", outline: "none",
                  }}
                />
                <button onClick={addStep} style={{
                  padding: "10px 20px",
                  background: "linear-gradient(135deg, #00f5a0, #00c3f5)",
                  border: "none", borderRadius: "8px", color: "#000",
                  fontWeight: "bold", fontSize: "16px", cursor: "pointer",
                  letterSpacing: "1px", transition: "opacity 0.2s",
                }}>+</button>
              </div>
              {/* Quick distance chips */}
              <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
                {[10, 30, 50, 100, 200].map(v => (
                  <button key={v} onClick={() => setDistance(String(v))} style={{
                    padding: "4px 10px", fontSize: "11px",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "4px", color: "#aaa", cursor: "pointer",
                  }}>{v}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Sketch canvas */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#888", marginBottom: "12px", display: "flex", justifyContent: "space-between" }}>
              <span>ROUTE PREVIEW</span>
              <span style={{ color: "#444" }}>● {DIRECTIONS.find(d => d.key === selectedDir)?.label.toUpperCase()}</span>
            </div>
            <SketchCanvas steps={steps} />
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", fontSize: "10px", color: "#555" }}>
              <span style={{ color: "#00f5a0" }}>● START</span>
              <span style={{ color: "#f5a000" }}>● END</span>
              <span style={{ marginLeft: "auto" }}>{steps.length} STEPS</span>
            </div>
          </div>
        </div>

        {/* Step list */}
        {steps.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#888", marginBottom: "12px", display: "flex", justifyContent: "space-between" }}>
              <span>STEP SEQUENCE</span>
              <button onClick={() => setSteps([])} style={{ background: "none", border: "none", color: "#f55", cursor: "pointer", fontSize: "11px", letterSpacing: "1px" }}>CLEAR ALL</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
              {steps.map((s, i) => {
                const dir = DIRECTIONS.find(d => d.key === s.dir);
                return (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "8px 12px",
                    background: "rgba(0,0,0,0.3)", borderRadius: "8px",
                    border: `1px solid ${dir.color}22`,
                    animation: "fadeIn 0.2s ease",
                  }}>
                    <span style={{ fontSize: "10px", color: "#444", width: "20px" }}>#{i + 1}</span>
                    <span style={{ fontSize: "18px" }}>{dir.icon}</span>
                    <span style={{ flex: 1, fontSize: "12px", color: dir.color, letterSpacing: "1px" }}>
                      {dir.label.toUpperCase()}
                    </span>
                    <span style={{ fontSize: "14px", color: "#ccc", fontWeight: "bold" }}>{s.dist} cm</span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={() => moveStep(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "12px", padding: "2px 4px" }}>↑</button>
                      <button onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "12px", padding: "2px 4px" }}>↓</button>
                      <button onClick={() => removeStep(s.id)} style={{ background: "none", border: "none", color: "#f55", cursor: "pointer", fontSize: "14px", padding: "2px 4px" }}>×</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payload preview */}
        {steps.length > 0 && (
          <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "16px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#888", marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
              <span>PAYLOAD PREVIEW</span>
              <span style={{ color: "#555" }}>even=direction, odd=distance</span>
            </div>
            <div style={{ fontSize: "12px", color: "#00c3f5", wordBreak: "break-all", lineHeight: "1.8" }}>
              [&nbsp;
              {payload.map((v, i) => (
                <span key={i} style={{ color: i % 2 === 0 ? "#00f5a0" : "#f5a000" }}>
                  {typeof v === "string" ? `"${v}"` : v}
                  {i < payload.length - 1 ? ", " : ""}
                </span>
              ))}
              &nbsp;]
            </div>
          </div>
        )}

        {/* Endpoint + Send */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px" }}>
          <button onClick={() => setShowEndpoint(!showEndpoint)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "10px", letterSpacing: "3px", marginBottom: showEndpoint ? "10px" : 0, display: "block" }}>
            {showEndpoint ? "▾" : "▸"} ENDPOINT CONFIG
          </button>
          {showEndpoint && (
            <input
              type="text"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
              style={{
                width: "100%", padding: "10px 14px", marginBottom: "12px",
                background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px", color: "#aaa", fontSize: "12px",
                fontFamily: "'Courier New', monospace", outline: "none", boxSizing: "border-box",
              }}
            />
          )}
          <button
            onClick={handleSend}
            disabled={steps.length === 0 || sending}
            style={{
              width: "100%", padding: "16px",
              background: steps.length === 0 ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #00f5a0, #00c3f5)",
              border: "none", borderRadius: "10px",
              color: steps.length === 0 ? "#444" : "#000",
              fontWeight: "bold", fontSize: "14px", letterSpacing: "3px",
              cursor: steps.length === 0 ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              fontFamily: "'Courier New', monospace",
            }}
          >
            {sending ? "TRANSMITTING..." : `DISPATCH ROUTE  →  ${steps.length} STEPS`}
          </button>

          {status && (
            <div style={{
              marginTop: "10px", padding: "10px 14px",
              background: status.ok ? "rgba(0,245,160,0.08)" : "rgba(245,80,80,0.08)",
              border: `1px solid ${status.ok ? "#00f5a0" : "#f55"}44`,
              borderRadius: "8px", fontSize: "12px",
              color: status.ok ? "#00f5a0" : "#f55",
              letterSpacing: "1px",
            }}>
              {status.msg}
            </div>
          )}
        </div>

      </div>

      <style>{`
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
        input:focus { border-color: rgba(0,245,160,0.4) !important; box-shadow: 0 0 0 2px rgba(0,245,160,0.1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
    </div>
  );
}