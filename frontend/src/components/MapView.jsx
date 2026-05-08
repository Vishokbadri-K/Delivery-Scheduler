import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import API from "../api";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const driverIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const COLORS = ["#00e5a0", "#0066ff", "#ff4d6d", "#f59e0b", "#a855f7"];

export default function MapView() {
  const [orders,  setOrders]  = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [schedule, setSchedule] = useState([]);

  const refresh = () => {
    API.get("/orders/").then(r => setOrders(r.data));
    API.get("/fleet/").then(r => setDrivers(r.data));
    API.get("/schedule/").then(r => setSchedule(r.data));
  };

  useEffect(() => {
    refresh();
    window.addEventListener("counts-updated", refresh);
    return () => window.removeEventListener("counts-updated", refresh);
  }, []);

  const buildRoutes = () => {
    const routes = {};
    const orderMap = {};
    orders.forEach(o => { orderMap[o.order_id] = [o.delivery_lat, o.delivery_lng]; });
    schedule
      .filter(s => s.driver_id !== "UNASSIGNED" && s.stop_sequence)
      .sort((a, b) => a.stop_sequence - b.stop_sequence)
      .forEach(s => {
        if (!routes[s.driver_id]) routes[s.driver_id] = [];
        if (orderMap[s.order_id]) routes[s.driver_id].push(orderMap[s.order_id]);
      });
    return routes;
  };

  const routes = buildRoutes();
  const center = orders.length > 0
    ? [orders[0].delivery_lat, orders[0].delivery_lng]
    : [11.6643, 78.1460];

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <MapContainer center={center} zoom={11} style={{ height: "520px", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {drivers.map(d => (
          <Marker key={d.driver_id} position={[d.start_lat, d.start_lng]} icon={driverIcon}>
            <Popup><b>{d.driver_name}</b><br />{d.start_location}</Popup>
          </Marker>
        ))}
        {orders.map(o => (
          <Marker key={o.order_id} position={[o.delivery_lat, o.delivery_lng]}>
            <Popup><b>{o.order_id}</b><br />{o.delivery_address}<br />Status: {o.status}</Popup>
          </Marker>
        ))}
        {Object.entries(routes).map(([driverId, points], i) => (
          <Polyline key={driverId} positions={points}
            color={COLORS[i % COLORS.length]} weight={3} dashArray="6" />
        ))}
      </MapContainer>
    </div>
  );
}