from database import SessionLocal
from models import User
from auth import hash_password

db = SessionLocal()

existing = db.query(User).filter(User.username == "admin").first()
if existing:
    print("มีบัญชี admin อยู่แล้ว, id =", existing.id)
else:
    admin = User(
        username="admin",
        password_hash=hash_password("admin1234"),
        role="admin",
        active=True,
    )
    db.add(admin)
    db.commit()
    print("สร้างบัญชี admin แล้ว: username=admin password=admin1234 (ไปเปลี่ยนทีหลังได้)")

db.close()