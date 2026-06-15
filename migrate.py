import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sqlalchemy import text
from app.database import engine

def migrate():
    print("Starting migration...")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE members ADD COLUMN alias VARCHAR(100) DEFAULT '' NOT NULL;"))
            conn.commit()
            print("Successfully added alias column.")
        except Exception as e:
            print(f"Error (maybe column already exists): {e}")

if __name__ == "__main__":
    migrate()
