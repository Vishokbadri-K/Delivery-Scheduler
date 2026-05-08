import { useState, useEffect } from "react";
import API from "../api";

const PRIORITY = { 1: ["High", "badge-high"], 2: ["Normal", "badge-normal"], 3: ["Low", "badge-low"] };

export default function ScheduleTable() {
  const [schedule, setSchedule] = useState([]);
  const [msg, setMsg]           = useState(null);
  const [loading, setLoading]   = useState(false);

  const fetchSchedule = () => API.get("/schedule/").then(r => setSchedule(r.data));
  useEffect(() => { fetchSchedule(); }, []);

  const handleGenerate = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await API.post("/schedule/generate");
      setMsg({ type: "success", text: `Schedule generated — ${r.data.length} stops assigned.` });
      fetchSchedule();
    } catch (e) {
      setMsg({ type: "error", text: e.response?.data?.error || "Failed to generate schedule." });
    } finally {
      setLoading(false);
      window.dispatchEvent(new Event("counts-updated"));
    }
  };

  const handleClear = async () => {
    await API.delete("/schedule/clear");
    setMsg({ type: "success", text: "Schedule cleared. Orders reset to pending." });
    setSchedule([]);
    window.dispatchEvent(new Event("counts-updated"));
  };

  const grouped = schedule.reduce((acc, s) => {
    acc[s.schedule_id] = acc[s.schedule_id] || [];
    acc[s.schedule_id].push(s);
    return acc;
  }, {});

  return (
    <>
      <div className="card">
        <div className="card-title">Controls</div>
        {msg && <div className={`alert alert-${msg.type === "error" ? "error" : "success"}`}>{msg.text}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-generate" onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "⚡ Generate Schedule"}
          </button>
          <button className="btn btn-secondary" onClick={handleClear}>🗑 Clear & Reset</button>
        </div>
      </div>

      {Object.keys(grouped).length === 0
        ? <div className="card"><div className="empty">No schedule yet. Add orders & drivers, then generate.</div></div>
        : Object.entries(grouped).map(([sid, stops]) => {
          const assigned   = stops.filter(s => s.driver_id !== "UNASSIGNED");
          const unassigned = stops.filter(s => s.driver_id === "UNASSIGNED");
          return (
            <div className="card" key={sid}>
              <div className="card-title">
                Schedule · {sid}
                <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 12, fontWeight: 400 }}>
                  {assigned.length} assigned · {unassigned.length} unassigned
                </span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>Driver</th><th>Order ID</th><th>Pickup</th>
                    <th>Deliver To</th><th>Window</th><th>Pkg</th><th>Priority</th>
                    <th>Est. Arrival</th><th>Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {stops
                    .sort((a, b) => (a.stop_sequence || 999) - (b.stop_sequence || 999))
                    .map((s, i) => {
                      const [plabel, pbadge] = PRIORITY[s.priority] || ["—", ""];
                      const isUnassigned = s.driver_id === "UNASSIGNED";
                      return (
                        <tr key={i} style={isUnassigned ? { opacity: 0.5 } : {}}>
                          <td>{s.stop_sequence ?? "—"}</td>
                          <td>
                            <div style={{ fontFamily: "monospace", fontSize: 11 }}>{s.driver_id}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.driver_name}</div>
                          </td>
                          <td style={{ fontFamily: "monospace", fontSize: 12 }}>{s.order_id}</td>
                          <td style={{ fontSize: 12 }}>{s.pickup_location ?? "—"}</td>
                          <td style={{ fontSize: 12 }}>{s.delivery_address ?? "—"}</td>
                          <td style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
                            {s.time_window_start} – {s.time_window_end}
                          </td>
                          <td style={{ fontSize: 11 }}>{s.package_size} / {s.package_weight}kg</td>
                          <td>{pbadge ? <span className={`badge ${pbadge}`}>{plabel}</span> : "—"}</td>
                          <td>
                            {isUnassigned
                              ? <span className="badge badge-unassigned">Unassigned</span>
                              : <strong>{s.estimated_arrival}</strong>}
                          </td>
                          <td style={{ color: "var(--muted)", fontSize: 11 }}>
                            {new Date(s.generated_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          );
        })
      }
    </>
  );
}