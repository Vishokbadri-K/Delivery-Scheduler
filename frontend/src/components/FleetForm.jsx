import { useState, useEffect } from "react";
import API from "../api";

const EMPTY = {
  driver_id: "", driver_name: "", contact_number: "",
  vehicle_id: "", vehicle_capacity: "",
  start_location: "", start_lat: "", start_lng: "",
  shift_start: "", shift_end: "",
};

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  if (!data.length) throw new Error(`Could not find coordinates for: "${address}"`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export default function FleetForm() {
  const [form, setForm]       = useState(EMPTY);
  const [fleet, setFleet]     = useState([]);
  const [msg, setMsg]         = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchFleet = () => API.get("/fleet/").then(r => setFleet(r.data));
  useEffect(() => {
    fetchFleet();
    window.addEventListener("fleet-updated", fetchFleet);
    return () => window.removeEventListener("fleet-updated", fetchFleet);
  }, []);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    const required = ["driver_id","driver_name","contact_number",
      "vehicle_id","vehicle_capacity","start_location","shift_start","shift_end"];
    const empty = required.filter(k => !String(form[k]).trim());
    if (empty.length) { setMsg({ type: "error", text: `Fill in: ${empty.join(", ")}` }); return; }

    setLoading(true);
    setMsg({ type: "success", text: "Resolving start location..." });
    try {
      const coords = await geocode(form.start_location);
      await API.post("/fleet/", {
        ...form,
        start_lat: coords.lat, start_lng: coords.lng,
        vehicle_capacity: parseFloat(form.vehicle_capacity),
      });
      setMsg({ type: "success", text: "Driver added successfully." });
      setForm(EMPTY);
      fetchFleet();
      window.dispatchEvent(new Event("counts-updated"));
    } catch (e) {
      setMsg({ type: "error", text: e.message || e.response?.data?.error || "Failed." });
    }
    setLoading(false);
  };

  const handleDelete = async (driver) => {
    const url = driver.driver_id?.trim() ? `/fleet/${driver.driver_id}` : `/fleet/id/${driver.id}`;
    await API.delete(url);
    fetchFleet();
    window.dispatchEvent(new Event("counts-updated"));
  };

  const handleClearAll = async () => {
    await API.delete("/fleet/clear");
    fetchFleet();
    window.dispatchEvent(new Event("counts-updated"));
  };

  return (
    <>
      <div className="card">
        <div className="card-title">New Driver</div>
        {msg && <div className={`alert alert-${msg.type === "error" ? "error" : "success"}`}>{msg.text}</div>}
        <div className="form-grid">
          <div className="field"><label>Driver ID</label>
            <input name="driver_id" value={form.driver_id} onChange={handleChange} placeholder="e.g. DRV-001" /></div>
          <div className="field"><label>Driver Name</label>
            <input name="driver_name" value={form.driver_name} onChange={handleChange} placeholder="e.g. Ravi Kumar" /></div>
          <div className="field"><label>Contact Number</label>
            <input name="contact_number" value={form.contact_number} onChange={handleChange} placeholder="e.g. 9876543210" /></div>
          <div className="field"><label>Vehicle ID</label>
            <input name="vehicle_id" value={form.vehicle_id} onChange={handleChange} placeholder="e.g. TN-33-AB-1234" /></div>
          <div className="field"><label>Capacity (kg)</label>
            <input name="vehicle_capacity" value={form.vehicle_capacity} onChange={handleChange} placeholder="e.g. 100" /></div>
          <div className="field"><label>Start Location</label>
            <input name="start_location" value={form.start_location} onChange={handleChange} placeholder="e.g. Shevapet, Salem" /></div>
          <div className="field"><label>Shift Start (HH:MM)</label>
            <input name="shift_start" value={form.shift_start} onChange={handleChange} placeholder="08:00" /></div>
          <div className="field"><label>Shift End (HH:MM)</label>
            <input name="shift_end" value={form.shift_end} onChange={handleChange} placeholder="18:00" /></div>
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "Resolving location..." : "Add Driver"}
        </button>
      </div>

      <div className="card">
        <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>All Drivers — {fleet.length} total</span>
          {fleet.length > 0 &&
            <button className="btn btn-secondary" onClick={handleClearAll}>🗑 Clear All</button>}
        </div>
        {fleet.length === 0
          ? <div className="empty">No drivers yet. Add one above.</div>
          : (
          <table className="data-table">
            <thead>
              <tr><th>Driver ID</th><th>Name</th><th>Contact</th><th>Vehicle</th><th>Capacity</th><th>Action</th></tr>
            </thead>
            <tbody>
              {fleet.map(d => (
                <tr key={d.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{d.driver_id || "—"}</td>
                  <td>{d.driver_name || "—"}</td>
                  <td>{d.contact_number || "—"}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{d.vehicle_id || "—"}</td>
                  <td>{d.vehicle_capacity} kg</td>
                  <td><button className="btn btn-danger" onClick={() => handleDelete(d)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export function FleetCSVUpload({ onDone }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setStatus({ type: "success", text: "Parsing file & geocoding start locations..." });
    const { read, utils } = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = utils.sheet_to_json(ws, { defval: "" });
    try {
      const geocoded = await Promise.all(rows.map(async row => {
        const coords = await geocode(row.start_location);
        return {
          ...row,
          start_lat: coords.lat, start_lng: coords.lng,
          vehicle_capacity: parseFloat(row.vehicle_capacity),
        };
      }));
      const res = await API.post("/fleet/bulk", geocoded);
      setStatus({ type: "success", text: `✅ ${res.data.added.length} drivers imported.` });
      if (onDone) onDone();
      window.dispatchEvent(new Event("counts-updated"));
    } catch (err) {
      setStatus({ type: "error", text: err.message || "Import failed." });
    }
    setLoading(false);
  };

  return (
    <div className="card">
      <div className="card-title">Bulk Import via CSV</div>
      {status && <div className={`alert alert-${status.type === "error" ? "error" : "success"}`}>{status.text}</div>}
      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
        Supports <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong> — columns:{" "}
        <code>driver_id, driver_name, contact_number, vehicle_id, vehicle_capacity, start_location, shift_start, shift_end</code>
      </p>
      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} disabled={loading}
        style={{ fontSize: 13, color: "var(--text)" }} />
    </div>
  );
}