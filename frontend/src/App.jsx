import { useState, useEffect } from "react";
import "./dashboard.css";
import OrderForm, { CSVUpload } from "./components/OrderForm";
import FleetForm, { FleetCSVUpload } from "./components/FleetForm";
import ScheduleTable from "./components/ScheduleTable";
import MapView from "./components/MapView";
import API from "./api";

const NAV = [
  { id: "schedule", icon: "⚡", label: "Schedule" },
  { id: "orders",   icon: "📦", label: "Orders" },
  { id: "fleet",    icon: "🚚", label: "Fleet" },
  { id: "map",      icon: "🗺",  label: "Map View" },
];

const PAGE_TITLES = {
  schedule: { title: "Schedule Generator",  sub: "Generate & view optimized delivery routes" },
  orders:   { title: "Order Management",    sub: "Add and manage delivery orders" },
  fleet:    { title: "Fleet Management",    sub: "Manage drivers and vehicles" },
  map:      { title: "Live Map View",       sub: "Visualize delivery routes on the map" },
};

export default function App() {
  const [tab, setTab]       = useState("schedule");
  const [counts, setCounts] = useState({ orders: 0, drivers: 0, scheduled: 0 });

  const refreshCounts = () => {
    Promise.all([API.get("/orders/"), API.get("/fleet/"), API.get("/schedule/")])
      .then(([o, d, s]) => setCounts({
        orders:    o.data.length,
        drivers:   d.data.length,
        scheduled: s.data.filter(x => x.driver_id !== "UNASSIGNED").length,
      }))
      .catch(() => {});
  };

  useEffect(() => {
    refreshCounts();
    window.addEventListener("orders-updated",  refreshCounts);
    window.addEventListener("fleet-updated",   refreshCounts);
    window.addEventListener("counts-updated",  refreshCounts);
    return () => {
      window.removeEventListener("orders-updated",  refreshCounts);
      window.removeEventListener("fleet-updated",   refreshCounts);
      window.removeEventListener("counts-updated",  refreshCounts);
    };
  }, []);

  const { title, sub } = PAGE_TITLES[tab];

  return (
    <div style={{ display: "flex" }}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">▸ DS</div>
          <div className="logo-sub">Delivery Scheduler</div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-label">Navigation</div>
          {NAV.map(n => (
            <button
              key={n.id}
              className={`nav-item ${tab === n.id ? "active" : ""}`}
              onClick={() => setTab(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          Smart Traffic-Based<br />Delivery System v1.0
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">{title}</div>
            <div className="topbar-sub">{sub}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="status-dot" />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>System Live</span>
          </div>
        </div>

        <div className="content">
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Total Orders</div>
              <div className="stat-value blue">{counts.orders}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Drivers</div>
              <div className="stat-value green">{counts.drivers}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Stops Scheduled</div>
              <div className="stat-value">{counts.scheduled}</div>
            </div>
          </div>

          {tab === "schedule" && <ScheduleTable />}
          {tab === "orders"   && <><CSVUpload onDone={() => window.dispatchEvent(new Event("orders-updated"))} /><OrderForm /></>}
          {tab === "fleet"    && <><FleetCSVUpload onDone={() => window.dispatchEvent(new Event("fleet-updated"))} /><FleetForm /></>}
          {tab === "map"      && <MapView />}
        </div>
      </div>
    </div>
  );
}