from flask import Flask
from flask_cors import CORS
from .config import Config
from .models import db
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*")
    CORS(app, origins=allowed_origins)

    from .routes.orders import orders_bp
    from .routes.fleet import fleet_bp
    from .routes.schedule import schedule_bp

    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(fleet_bp, url_prefix='/api/fleet')
    app.register_blueprint(schedule_bp, url_prefix='/api/schedule')

    with app.app_context():
        db.create_all()

    return app