from flask import Blueprint, request, jsonify
from ..models import db, Order

orders_bp = Blueprint('orders', __name__)

@orders_bp.route('/', methods=['GET'])
def get_orders():
    orders = Order.query.all()
    return jsonify([o.to_dict() for o in orders])

@orders_bp.route('/', methods=['POST'])
def add_order():
    data = request.json
    # Check duplicate
    if Order.query.filter_by(order_id=data['order_id']).first():
        return jsonify({'error': 'order_id already exists'}), 400
    order = Order(**data)
    db.session.add(order)
    db.session.commit()
    return jsonify(order.to_dict()), 201

@orders_bp.route('/bulk', methods=['POST'])
def bulk_orders():
    """Accept list of orders for CSV upload flow."""
    data = request.json  # list of order dicts
    added = []
    for item in data:
        if not Order.query.filter_by(order_id=item['order_id']).first():
            o = Order(**item)
            db.session.add(o)
            added.append(item['order_id'])
    db.session.commit()
    return jsonify({'added': added}), 201

@orders_bp.route('/<order_id>', methods=['DELETE'])
def delete_order(order_id):
    # Try by order_id string first, then by numeric db id
    o = Order.query.filter_by(order_id=order_id).first()
    if not o and order_id.isdigit():
        o = Order.query.get(int(order_id))
    if not o:
        return jsonify({'error': 'Not found'}), 404
    db.session.delete(o)
    db.session.commit()
    return jsonify({'deleted': order_id})

@orders_bp.route('/id/<int:db_id>', methods=['DELETE'])
def delete_order_by_id(db_id):
    o = Order.query.get(db_id)
    if not o:
        return jsonify({'error': 'Not found'}), 404
    db.session.delete(o)
    db.session.commit()
    return jsonify({'deleted': db_id})

@orders_bp.route('/clear', methods=['DELETE'])
def clear_orders():
    Order.query.delete()
    db.session.commit()
    return jsonify({'message': 'Cleared'})