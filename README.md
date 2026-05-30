# Delivery Scheduler

A **Smart Traffic-Based Delivery Scheduling System** that accepts delivery orders and fleet data, estimates travel times using Haversine-based distance calculation, and generates optimized delivery schedules using a greedy nearest-neighbor algorithm with priority and capacity constraints.

---

## How It Works

1. Dispatcher inputs delivery orders and fleet data via manual form or bulk CSV/XLSX upload
2. Addresses are geocoded automatically via Nominatim — no API key required
3. On clicking **Generate Schedule**, the backend:
   - Fetches all pending orders and available drivers
   - Estimates travel time between stops using Haversine distance
   - Runs a greedy nearest-neighbor algorithm with priority-first selection and capacity constraints
   - Persists and returns the optimized schedule
4. Schedule is displayed with full coordinator view — driver, stops, time windows, ETAs
5. Delivery routes are visualized on an interactive Leaflet map

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + Custom Dark CSS |
| Backend | Flask + SQLAlchemy |
| Database | PostgreSQL |
| Geocoding | Nominatim (OpenStreetMap) |
| Travel Time | Haversine via geopy |
| Map | Leaflet.js |
| Hosting | Render (backend + DB) + Netlify (frontend) |

---

## Project Structure

```
Delivery_Manager/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   └── models.py
│   ├── Procfile
│   ├── requirements.txt
│   └── run.py
└── frontend/
    ├── src/
    │   ├── components/   
    │   ├── App.jsx
    │   ├── api.js
    │   └── dashboard.css
    ├── index.html
    └── vite.config.js
```

---

## Local Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (or SQLite for local dev)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate 
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```
DATABASE_URL=your_postgresql_url
SECRET_KEY=your_secret_key
```

Run:

```bash
python run.py
```

Backend runs at `http://localhost:5000`

### Frontend

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:

```
VITE_API_URL=http://localhost:5000
```

Run:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## Features

- Order Management — Add orders via form or bulk CSV/XLSX upload with auto-geocoding
- Fleet Management — Add drivers and vehicles with shift times and capacity
- Smart Scheduling — Priority-first greedy algorithm with capacity and time window constraints
- Map View — Leaflet map with driver start positions, delivery stops, and color-coded routes per driver
- Dynamic Counters — Live stat cards update instantly on every action without page reload
- Clear and Reset — Reset schedule and revert all orders to pending in one click

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/orders/` | List all orders |
| POST | `/api/orders/` | Add single order |
| POST | `/api/orders/bulk` | Bulk import orders |
| DELETE | `/api/orders/<order_id>` | Delete by order ID |
| DELETE | `/api/orders/clear` | Clear all orders |
| GET | `/api/fleet/` | List all drivers |
| POST | `/api/fleet/` | Add single driver |
| POST | `/api/fleet/bulk` | Bulk import drivers |
| DELETE | `/api/fleet/<driver_id>` | Delete by driver ID |
| DELETE | `/api/fleet/clear` | Clear all drivers |
| POST | `/api/schedule/generate` | Generate schedule |
| GET | `/api/schedule/` | Get enriched schedule |
| DELETE | `/api/schedule/clear` | Clear schedule, reset orders |

---

## Bulk Import Format

### Orders — CSV/XLSX columns

`order_id, delivery_address, pickup_location, time_window_start, time_window_end, package_weight, package_size, priority`

### Fleet — CSV/XLSX columns

`driver_id, driver_name, contact_number, vehicle_id, vehicle_capacity, start_location, shift_start, shift_end`

---

## License

Open source for educational purposes.
