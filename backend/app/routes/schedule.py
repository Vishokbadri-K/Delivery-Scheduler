from flask import Blueprint, jsonify
from ..models import db, Order, Driver, Schedule
from ..services.scheduler import generate_schedule

schedule_bp = Blueprint('schedule', __name__)

@schedule_bp.route('/generate', methods=['POST'])
def generate():
    orders  = [o.to_dict() for o in Order.query.filter_by(status='pending').all()]
    drivers = [d.to_dict() for d in Driver.query.all()]

    if not orders:
        return jsonify({'error': 'No pending orders'}), 400
    if not drivers:
        return jsonify({'error': 'No drivers available'}), 400

    results = generate_schedule(drivers, orders)

    for r in results:
        db.session.add(Schedule(**r))

    for r in results:
        if r['driver_id'] != 'UNASSIGNED':
            o = Order.query.filter_by(order_id=r['order_id']).first()
            if o:
                o.status = 'scheduled'

    db.session.commit()
    return jsonify(results), 200

@schedule_bp.route('/', methods=['GET'])
def get_schedule():
    schedules = Schedule.query.order_by(Schedule.generated_at.desc()).all()

    # Build lookup maps for enrichment
    order_map  = {o.order_id: o  for o in Order.query.all()}
    driver_map = {d.driver_id: d for d in Driver.query.all()}

    enriched = []
    for s in schedules:
        row = s.to_dict()
        o = order_map.get(s.order_id)
        d = driver_map.get(s.driver_id)
        row['driver_name']       = d.driver_name       if d else '—'
        row['delivery_address']  = o.delivery_address  if o else '—'
        row['pickup_location']   = o.pickup_location   if o else '—'
        row['time_window_start'] = o.time_window_start if o else '—'
        row['time_window_end']   = o.time_window_end   if o else '—'
        row['package_weight']    = o.package_weight    if o else '—'
        row['package_size']      = o.package_size      if o else '—'
        row['priority']          = o.priority          if o else '—'
        enriched.append(row)

    return jsonify(enriched)

@schedule_bp.route('/clear', methods=['DELETE'])
def clear_schedule():
    Schedule.query.delete()
    Order.query.update({'status': 'pending'})
    db.session.commit()
    return jsonify({'message': 'Cleared'})