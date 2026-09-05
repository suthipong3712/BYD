from datetime import date

from database import SessionLocal, init_db
from models import (
    JobType,
    OrderStatus,
    PartsRequest,
    RepairItem,
    RepairOrder,
    StatusOption,
    Technician,
    Vehicle,
)

init_db()
db = SessionLocal()

# ตัวเลือกสถานะเริ่มต้น (แอดมินแก้ไข/เพิ่มทีหลังผ่านหน้าเว็บได้)
default_options = [
    ("job_status", "not_started", "รอเริ่มงาน", "red", 1),
    ("job_status", "in_progress", "กำลังทำ", "amber", 2),
    ("job_status", "done", "เสร็จแล้ว", "green", 3),
    ("parts_status", "not_ordered", "ยังไม่สั่ง", "red", 1),
    ("parts_status", "ordered", "รออะไหล่", "amber", 2),
    ("parts_status", "arrived", "อะไหล่มาแล้ว", "green", 3),
    ("parts_status", "no_part_needed", "ไม่ต้องสั่งอะไหล่", "muted", 4),
]
for category, key, label, color, sort_order in default_options:
    db.add(StatusOption(category=category, key=key, label=label, color=color, sort_order=sort_order))

tech = Technician(name="ช่างเอ")
db.add(tech)
db.flush()

vehicle = Vehicle(
    vin="LGXCH6D4P2195710",
    license_plate="กก 1234 กท",
    model="ATTO 3",
    customer_name="ทดสอบ ระบบ",
    phone="0812345678",
)

order = RepairOrder(
    vehicle=vehicle,
    job_type=JobType.WARRANTY,
    status=OrderStatus.OPEN,
    open_date=date.today(),
    diagnosis_result="แบตเตอรี่ HV แจ้งเตือนผิดปกติ",
    data_complete=True,
)

item1 = RepairItem(
    repair_order=order,
    description="เปลี่ยนแบตเตอรี่ HV",
    part_name="แบตเตอรี่ HV",
    part_number="13418067-00",
    repair_time_estimate="2 ชม.",
    technician=tech,
    job_status="not_started",
)
item1.parts_request = PartsRequest(order_status="ordered")

item2 = RepairItem(
    repair_order=order,
    description="ตรวจสอบระบบไฟหน้า",
    technician=tech,
    job_status="done",
)
item2.parts_request = PartsRequest(order_status="no_part_needed")

db.add(vehicle)
db.commit()
print("Seed data inserted, vehicle id =", vehicle.id)
db.close()