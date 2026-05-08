from flask import Blueprint, request, jsonify
from ..models import db, Driver

fleet_bp = Blueprint('fleet', __name__)

@fleet_bp.route('/', methods=['GET'])
def get_drivers():
    return jsonify([d.to_dict() for d in Driver.query.all()])

@fleet_bp.route('/', methods=['POST'])
def add_driver():
    data = request.json
    if Driver.query.filter_by(driver_id=data['driver_id']).first():
        return jsonify({'error': 'driver_id already exists'}), 400
    driver = Driver(**data)
    db.session.add(driver)
    db.session.commit()
    return jsonify(driver.to_dict()), 201

@fleet_bp.route('/<driver_id>', methods=['DELETE'])
def delete_driver(driver_id):
    d = Driver.query.filter_by(driver_id=driver_id).first_or_404()
    db.session.delete(d)
    db.session.commit()
    return jsonify({'deleted': driver_id})

@fleet_bp.route('/id/<int:id>', methods=['DELETE'])
def delete_driver_by_id(id):
    d = Driver.query.get_or_404(id)
    db.session.delete(d)
    db.session.commit()
    return jsonify({'deleted': id})

@fleet_bp.route('/bulk', methods=['POST'])
def bulk_add_drivers():
    rows = request.json
    if not isinstance(rows, list) or not rows:
        return jsonify({'error': 'Expected a non-empty list'}), 400

    added, skipped = [], []
    for row in rows:
        if not row.get('driver_id'):
            skipped.append({'row': row, 'reason': 'missing driver_id'})
            continue
        if Driver.query.filter_by(driver_id=row['driver_id']).first():
            skipped.append({'driver_id': row['driver_id'], 'reason': 'duplicate'})
            continue
        driver = Driver(**row)
        db.session.add(driver)
        added.append(row['driver_id'])

    db.session.commit()
    return jsonify({'added': added, 'skipped': skipped}), 201

@fleet_bp.route('/clear', methods=['DELETE'])
def clear_fleet():
    Driver.query.delete()
    db.session.commit()
    return jsonify({'message': 'Cleared'})