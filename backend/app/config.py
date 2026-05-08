import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    _db_url = os.getenv('DATABASE_URL', 'sqlite:///dev.db')
    # Render gives postgres:// — SQLAlchemy needs postgresql://
    if _db_url.startswith('postgres://'):
        _db_url = _db_url.replace('postgres://', 'postgresql://', 1)

    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret')