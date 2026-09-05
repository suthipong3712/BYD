from database import SessionLocal
from models import User
from auth import hash_password

db = SessionLocal()

test_users = [
    ("parts1", "parts1234", "parts"),
    ("tech1", "tech1234", "technician"),
]

for username, password, role in test_users:
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        print(f"มีบัญชี {username} อยู่แล้ว")
        continue
    db.add(User(username=username, password_hash=hash_password(password), role=role, active=True))
    print(f"สร้างบัญชี {username} แล้ว (role={role})")

db.commit()
db.close()