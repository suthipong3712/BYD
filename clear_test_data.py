from database import SessionLocal
from models import PartsRequest, RepairItem, RepairOrder, Technician, Vehicle

db = SessionLocal()

order_count = db.query(RepairOrder).count()
item_count = db.query(RepairItem).count()
vehicle_count = db.query(Vehicle).count()
tech_count = db.query(Technician).count()

print(f"กำลังจะลบ: ใบสั่งซ่อม {order_count} ใบ, รายการซ่อม {item_count} รายการ, รถ {vehicle_count} คัน, ช่าง {tech_count} คน")
confirm = input("พิมพ์ yes เพื่อยืนยันการลบ: ")

if confirm.strip().lower() != "yes":
    print("ยกเลิกการลบ")
else:
    # ลบตามลำดับจากลูกไปหาแม่: PartsRequest -> RepairItem -> RepairOrder -> Vehicle -> Technician
    db.query(PartsRequest).delete()
    db.query(RepairItem).delete()
    db.query(RepairOrder).delete()
    db.query(Vehicle).delete()
    db.query(Technician).delete()
    db.commit()
    print("ลบข้อมูลทดสอบเรียบร้อยแล้ว (user, รุ่นรถ, ตัวเลือกสถานะ ไม่ถูกแตะเลย)")

db.close()