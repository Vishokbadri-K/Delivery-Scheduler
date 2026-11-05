from datetime import datetime, timedelta
from ..services.traffic import get_travel_time
import math
import uuid

def time_to_dt(t_str: str) -> datetime:
    h, m = map(int, t_str.split(':'))
    return datetime.today().replace(hour=h, minute=m, second=0, microsecond=0)

def dt_to_str(dt: datetime) -> str:
    return dt.strftime('%H:%M')

def generate_schedule(drivers: list, orders: list) -> list:
    pending = sorted(orders, key=lambda o: (o['priority'], o['time_window_start']))
    schedule_id = str(uuid.uuid4())[:8]
    results = []

    max_stops = math.ceil(len(pending) / len(drivers))

    for driver in drivers:
        current_pos = (driver['start_lat'], driver['start_lng'])
        current_time = time_to_dt(driver['shift_start'])
        remaining_capacity = driver['vehicle_capacity']
        stop_seq = 1

        while True:
            # Cap stops per driver for fair distribution
            if stop_seq > max_stops:
                break

            best = None
            best_travel = float('inf')

            for order in pending:
                # Skip if coords missing
                if not all([order.get('pickup_lat'), order.get('pickup_lng'),
                            order.get('delivery_lat'), order.get('delivery_lng')]):
                    continue

                # Capacity check
                if order['package_weight'] > remaining_capacity:
                    continue

                pickup_pos   = (order['pickup_lat'],   order['pickup_lng'])
                delivery_pos = (order['delivery_lat'], order['delivery_lng'])

                travel_to_pickup   = get_travel_time(current_pos, pickup_pos)
                travel_to_delivery = get_travel_time(pickup_pos, delivery_pos)
                total_travel       = travel_to_pickup + travel_to_delivery

                arrival    = current_time + timedelta(minutes=total_travel)
                window_end = time_to_dt(order['time_window_end'])

                if arrival > window_end:
                    continue

                # Priority-first selection, travel time as tiebreaker
                current_best_priority = best[0]['priority'] if best else float('inf')
                if order['priority'] < current_best_priority or \
                   (order['priority'] == current_best_priority and total_travel < best_travel):
                    best_travel = total_travel
                    best = (order, arrival, total_travel)

            if not best:
                break

            order, arrival, _ = best
            pending.remove(order)

            results.append({
                'schedule_id':      schedule_id,
                'driver_id':        driver['driver_id'],
                'order_id':         order['order_id'],
                'stop_sequence':    stop_seq,
                'estimated_arrival': dt_to_str(arrival),
            })

            current_pos        = (order['delivery_lat'], order['delivery_lng'])
            current_time       = arrival
            remaining_capacity -= order['package_weight']
            stop_seq           += 1

    # Remaining unassigned
    for order in pending:
        results.append({
            'schedule_id':      schedule_id,
            'driver_id':        'UNASSIGNED',
            'order_id':         order['order_id'],
            'stop_sequence':    None,
            'estimated_arrival': None,
        })

    return results