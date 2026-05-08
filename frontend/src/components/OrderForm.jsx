import { useState, useEffect } from "react";
import API from "../api";

const EMPTY = {
  order_id: "", delivery_address: "", pickup_location: "",
  delivery_lat: "", delivery_lng: "", pickup_lat: "", pickup_lng: "",
  time_window_start: "", time_window_end: "",
  package_weight: "", package_size: "small", priority: 2,
};

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  if (!data.length) throw new Error(`Could not find coordinates for: "${address}"`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export default function OrderForm() {
  const [form, setForm]       = useState(EMPTY);
  const [orders, setOrders]   = useState([]);
  const [msg, setMsg]         = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchOrders = () => API.get("/orders/").then(r => setOrders(r.data));
  useEffect(() => {
    fetchOrders();
    window.addEventListener("orders-updated", fetchOrders);
    return () => window.removeEventListener("orders-updated", fetchOrders);
  }, []);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    const required = ["order_id","delivery_address","pickup_location",
      "time_window_start","time_window_end","package_weight"];
    const empty = required.filter(k => !String(form[k]).trim());
    if (empty.length) { setMsg({ type: "error", text: `Fill in: ${empty.join(", ")}` }); return; }

    setLoading(true);
    setMsg({ type: "success", text: "Resolving addresses..." });
    try {
      const [delivery, pickup] = await Promise.all([
        geocode(form.delivery_address),
        geocode(form.pickup_location),
      ]);
      await API.post("/orders/", {
        ...form,
        delivery_lat: delivery.lat, delivery_lng: delivery.lng,
        pickup_lat: pickup.lat,     pickup_lng: pickup.lng,
        package_weight: parseFloat(form.package_weight),
        priority: parseInt(form.priority),
      });
      setMsg({ type: "success", text: "Order added successfully." });
      setForm(EMPTY);
      fetchOrders();
      window.dispatchEvent(new Event("counts-updated"));
    } catch (e) {
      setMsg({ type: "error", text: e.message || e.response?.data?.error || "Failed." });
    }
    setLoading(false);
  };

  const handleDelete = async (order) => {
    const url = order.order_id?.trim() ? `/orders/${order.order_id}` : `/orders/id/${order.id}`;
    await API.delete(url);
    fetchOrders();
    window.dispatchEvent(new Event("counts-updated"));
  };

  const handleClearAll = async () => {
    await API.delete("/orders/clear");
    fetchOrders();
    window.dispatchEvent(new Event("counts-updated"));
  };

  const priorityBadge = p =>
    p === 1 ? <span className="badge badge-high">High</span>
    : p === 2 ? <span className="badge badge-normal">Normal</span>
    : <span className="badge badge-low">Low</span>;

  return (
    <>
      <div className="card">
        <div className="card-title">New Order</div>
        {msg && <div className={`alert alert-${msg.type === "error" ? "error" : "success"}`}>{msg.text}</div>}
        <div className="form-grid">
          <div className="field"><label>Order ID</label>
            <input name="order_id" value={form.order_id} onChange={handleChange} placeholder="e.g. ORD-001" /></div>
          <div className="field"><label>Delivery Address</label>
            <input name="delivery_address" value={form.delivery_address} onChange={handleChange} placeholder="e.g. Anna Nagar, Chennai" /></div>
          <div className="field"><label>Pickup Location</label>
            <input name="pickup_location" value={form.pickup_location} onChange={handleChange} placeholder="e.g. Ambattur Industrial Estate" /></div>
          <div className="field"><label>Window Start (HH:MM)</label>
            <input name="time_window_start" value={form.time_window_start} onChange={handleChange} placeholder="09:00" /></div>
          <div className="field"><label>Window End (HH:MM)</label>
            <input name="time_window_end" value={form.time_window_end} onChange={handleChange} placeholder="13:00" /></div>
          <div className="field"><label>Weight (kg)</label>
            <input name="package_weight" value={form.package_weight} onChange={handleChange} placeholder="e.g. 2.5" /></div>
          <div className="field"><label>Package Size</label>
            <select name="package_size" value={form.package_size} onChange={handleChange}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select></div>
          <div className="field"><label>Priority</label>
            <select name="priority" value={form.priority} onChange={handleChange}>
              <option value={1}>High</option>
              <option value={2}>Normal</option>
              <option value={3}>Low</option>
            </select></div>
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "Resolving address..." : "Add Order"}
        </button>
      </div>

      <div className="card">
        <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>All Orders — {orders.length} total</span>
          {orders.length > 0 &&
            <button className="btn btn-secondary" onClick={handleClearAll}>🗑 Clear All</button>}
        </div>
        {orders.length === 0
          ? <div className="empty">No orders yet. Add one above.</div>
          : (
          <table className="data-table">
            <thead>
              <tr><th>Order ID</th><th>Delivery Address</th><th>Priority</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{o.order_id || "—"}</td>
                  <td>{o.delivery_address || "—"}</td>
                  <td>{priorityBadge(o.priority)}</td>
                  <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                  <td><button className="btn btn-danger" onClick={() => handleDelete(o)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export function CSVUpload({ onDone }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setStatus({ type: "success", text: "Parsing file & geocoding addresses..." });
    const { read, utils } = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = utils.sheet_to_json(ws, { defval: "" });
    try {
      const geocoded = await Promise.all(rows.map(async row => {
        const [delivery, pickup] = await Promise.all([
          geocode(row.delivery_address),
          geocode(row.pickup_location),
        ]);
        return {
          ...row,
          delivery_lat: delivery.lat, delivery_lng: delivery.lng,
          pickup_lat: pickup.lat,     pickup_lng: pickup.lng,
          package_weight: parseFloat(row.package_weight),
          priority: parseInt(row.priority),
        };
      }));
      const res = await API.post("/orders/bulk", geocoded);
      setStatus({ type: "success", text: `✅ ${res.data.added.length} orders imported.` });
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
        <code>order_id, delivery_address, pickup_location, time_window_start, time_window_end, package_weight, package_size, priority</code>
      </p>
      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} disabled={loading}
        style={{ fontSize: 13, color: "var(--text)" }} />
    </div>
  );
}