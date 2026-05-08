from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Order(db.Model):
    __tablename__ = 'orders'
    id          = db.Column(db.Integer, primary_key=True)
    order_id    = db.Column(db.String(50), unique=True, nullable=False)
    delivery_address = db.Column(db.String(200), nullable=False)
    pickup_location  = db.Column(db.String(200), nullable=False)
    # lat/lng stored for distance calculations
    delivery_lat = db.Column(db.Float)
    delivery_lng = db.Column(db.Float)
    pickup_lat   = db.Column(db.Float)
    pickup_lng   = db.Column(db.Float)
    time_window_start = db.Column(db.String(10))  # "HH:MM"
    time_window_end   = db.Column(db.String(10))
    package_weight    = db.Column(db.Float)
    package_size      = db.Column(db.String(20))  # small/medium/large
    priority          = db.Column(db.Integer, default=2)  # 1=high,2=normal,3=low
    status            = db.Column(db.String(20), default='pending')

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class Driver(db.Model):
    __tablename__ = 'drivers'
    id              = db.Column(db.Integer, primary_key=True)
    driver_id       = db.Column(db.String(50), unique=True, nullable=False)
    driver_name     = db.Column(db.String(100), nullable=False)
    contact_number  = db.Column(db.String(20))
    vehicle_id      = db.Column(db.String(50))
    vehicle_capacity= db.Column(db.Float)   # max weight in kg
    start_lat       = db.Column(db.Float)
    start_lng       = db.Column(db.Float)
    start_location  = db.Column(db.String(200))
    shift_start     = db.Column(db.String(10))  # "HH:MM"
    shift_end       = db.Column(db.String(10))

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class Schedule(db.Model):
    __tablename__ = 'schedules'
    id               = db.Column(db.Integer, primary_key=True)
    schedule_id      = db.Column(db.String(50), nullable=False)
    driver_id        = db.Column(db.String(50), nullable=False)
    order_id         = db.Column(db.String(50), nullable=False)
    stop_sequence    = db.Column(db.Integer)
    estimated_arrival= db.Column(db.String(10))  # "HH:MM"
    generated_at     = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}