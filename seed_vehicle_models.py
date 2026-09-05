from database import SessionLocal
from models import VehicleModel

db = SessionLocal()

names = ["SEAL", "ATTO 3", "Dolphin", "Sealion 6", "Sealion 7"]
for name in names:
    existing = db.query(VehicleModel).filter(VehicleModel.name == name).first()
    if existing:
        print(f"มีรุ่น {name} อยู่แล้ว")
        continue
    db.add(VehicleModel(name=name, active=True))
    print(f"เพิ่มรุ่น {name} แล้ว")

db.commit()
db.close()