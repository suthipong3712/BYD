from database import SessionLocal
from models import RepairOrder, Technician, Vehicle

db = SessionLocal()

order_count = db.query(RepairOrder).count()
vehicle_count = db.query(Vehicle).count()
tech_count = db.query(Technician).count()

print(f"กำลังจะลบ: ใบสั่งซ่อม {order_count} ใบ, รถ {vehicle_count} คัน, ช่าง {tech_count} คน")
confirm = input("พิมพ์ yes เพื่อยืนยันการลบ: ")

if confirm.strip().lower() != "yes":
    print("ยกเลิกการลบ")
else:
    # ลบ RepairOrder ก่อน — cascade จะลบ RepairItem/PartsRequest ที่ผูกอยู่ให้เอง
    db.query(RepairOrder).delete()
    db.query(Vehicle).delete()
    db.query(Technician).delete()
    db.commit()
    print("ลบข้อมูลทดสอบเรียบร้อยแล้ว (user, รุ่นรถ, ตัวเลือกสถานะ ไม่ถูกแตะเลย)")

db.close()