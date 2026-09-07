import os
import uuid
from datetime import date

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

import schemas
from auth import (
    create_token,
    get_current_user,
    hash_password,
    require_roles,
    verify_password,
)
from database import SessionLocal, get_db
from models import (
    AuthToken,
    PartsRequest,
    RepairItem,
    RepairOrder,
    StatusOption,
    Technician,
    User,
    Vehicle,
    VehicleModel,
)

app = FastAPI(title="BYD Garage Management System")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

ALLOWED_PHOTO_KINDS = {"car", "vin"}


# --- Authentication ---


@app.post("/login", response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Username หรือ Password ไม่ถูกต้อง")
    if not user.active:
        raise HTTPException(status_code=403, detail="บัญชีนี้ถูกปิดใช้งาน")

    token_value = create_token()
    db.add(AuthToken(token=token_value, user=user))
    db.commit()
    return {"token": token_value, "user": user}


@app.get("/me", response_model=schemas.UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# --- Admin เท่านั้น: จัดการผู้ใช้งาน ---


@app.get("/users", response_model=list[schemas.UserRead])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_roles())):
    return db.query(User).all()


@app.post("/users", response_model=schemas.UserRead)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles()),
):
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username นี้มีอยู่แล้ว")
    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.patch("/users/{user_id}", response_model=schemas.UserRead)
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles()),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    data = payload.model_dump(exclude_unset=True)
    new_password = data.pop("password", None)
    if new_password:
        user.password_hash = hash_password(new_password)
    for field, value in data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@app.delete("/users/{user_id}")
def delete_user(
    user_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles())
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "admin":
        admin_count = db.query(User).filter(User.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=400, detail="ต้องมีบัญชี admin เหลืออย่างน้อย 1 คนเสมอ"
            )

    db.delete(user)
    db.commit()
    return {"ok": True}


# --- อ่านได้ทุก role: รุ่นรถ / Admin เท่านั้น: เพิ่ม-แก้ ---


@app.get("/vehicle-models", response_model=list[schemas.VehicleModelRead])
def list_vehicle_models(
    db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    return db.query(VehicleModel).all()


@app.post("/vehicle-models", response_model=schemas.VehicleModelRead)
def create_vehicle_model(
    payload: schemas.VehicleModelCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles()),
):
    model = VehicleModel(name=payload.name, active=True)
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


@app.patch("/vehicle-models/{model_id}", response_model=schemas.VehicleModelRead)
def update_vehicle_model(
    model_id: int,
    payload: schemas.VehicleModelUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles()),
):
    model = db.query(VehicleModel).filter(VehicleModel.id == model_id).first()
    if model is None:
        raise HTTPException(status_code=404, detail="Vehicle model not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(model, field, value)
    db.commit()
    db.refresh(model)
    return model


# --- อ่านข้อมูล: ใครก็ได้ที่ login แล้ว ---


@app.get("/vehicles", response_model=list[schemas.VehicleRead])
def list_vehicles(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Vehicle).all()


@app.get("/vehicles/{vehicle_id}", response_model=schemas.VehicleRead)
def get_vehicle(
    vehicle_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@app.get("/technicians", response_model=list[schemas.TechnicianRead])
def list_technicians(
    db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    return db.query(Technician).all()


@app.get("/status-options", response_model=list[schemas.StatusOptionRead])
def list_status_options(
    db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    return (
        db.query(StatusOption)
        .order_by(StatusOption.category, StatusOption.sort_order)
        .all()
    )


# --- ช่างเท่านั้น: อัปเดตสถานะงาน ---


@app.patch("/repair-items/{item_id}/status", response_model=schemas.RepairItemRead)
def update_job_status(
    item_id: int,
    payload: schemas.JobStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("technician")),
):
    item = db.query(RepairItem).filter(RepairItem.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Repair item not found")
    item.job_status = payload.job_status
    db.commit()
    db.refresh(item)
    return item


# --- ฝ่ายอะไหล่เท่านั้น: อัปเดตสถานะอะไหล่ ---


@app.patch(
    "/repair-items/{item_id}/parts-status", response_model=schemas.RepairItemRead
)
def update_parts_status(
    item_id: int,
    payload: schemas.PartsStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("parts")),
):
    item = db.query(RepairItem).filter(RepairItem.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Repair item not found")

    if item.parts_request is None:
        item.parts_request = PartsRequest(order_status=payload.order_status)
    else:
        item.parts_request.order_status = payload.order_status

    if payload.order_status == "ordered":
        item.parts_request.ordered_date = date.today()

    db.commit()
    db.refresh(item)
    return item


# --- Admin เท่านั้น: ตัวเลือกสถานะ ---


@app.post("/status-options", response_model=schemas.StatusOptionRead)
def create_status_option(
    payload: schemas.StatusOptionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles()),
):
    option = StatusOption(**payload.model_dump())
    db.add(option)
    db.commit()
    db.refresh(option)
    return option


@app.patch("/status-options/{option_id}", response_model=schemas.StatusOptionRead)
def update_status_option(
    option_id: int,
    payload: schemas.StatusOptionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles()),
):
    option = db.query(StatusOption).filter(StatusOption.id == option_id).first()
    if option is None:
        raise HTTPException(status_code=404, detail="Status option not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(option, field, value)
    db.commit()
    db.refresh(option)
    return option


# --- Admin เท่านั้น: จัดการช่าง ---


@app.post("/technicians", response_model=schemas.TechnicianRead)
def create_technician(
    payload: schemas.TechnicianCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles()),
):
    technician = Technician(name=payload.name, active=True)
    db.add(technician)
    db.commit()
    db.refresh(technician)
    return technician


@app.patch("/technicians/{technician_id}", response_model=schemas.TechnicianRead)
def update_technician(
    technician_id: int,
    payload: schemas.TechnicianUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles()),
):
    technician = db.query(Technician).filter(Technician.id == technician_id).first()
    if technician is None:
        raise HTTPException(status_code=404, detail="Technician not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(technician, field, value)
    db.commit()
    db.refresh(technician)
    return technician


@app.delete("/technicians/{technician_id}")
def delete_technician(
    technician_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles())
):
    technician = db.query(Technician).filter(Technician.id == technician_id).first()
    if technician is None:
        raise HTTPException(status_code=404, detail="Technician not found")

    used_count = db.query(RepairItem).filter(RepairItem.technician_id == technician_id).count()
    if used_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"ช่างคนนี้มีประวัติงานผูกอยู่ {used_count} รายการ ลบไม่ได้ กรุณาปิดใช้งานแทน",
        )

    db.delete(technician)
    db.commit()
    return {"ok": True}


# --- Admin + SA: รับรถเข้าซ่อม ---


@app.post("/intake", response_model=schemas.VehicleRead)
def create_intake(
    payload: schemas.IntakeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("sa")),
):
    vehicle = db.query(Vehicle).filter(Vehicle.vin == payload.vehicle.vin).first()

    if vehicle is None:
        vehicle = Vehicle(**payload.vehicle.model_dump())
        db.add(vehicle)
        db.flush()
    else:
        for field, value in payload.vehicle.model_dump().items():
            if field != "vin":
                setattr(vehicle, field, value)

    order = RepairOrder(
        vehicle=vehicle,
        job_type=payload.order.job_type,
        status="open",
        open_date=date.today(),
        diagnosis_result=payload.order.diagnosis_result,
        mileage=payload.order.mileage,
        data_complete=False,
    )
    for item_data in payload.order.items:
        RepairItem(repair_order=order, **item_data.model_dump())

    db.add(order)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@app.post("/vehicles/{vehicle_id}/repair-orders", response_model=schemas.VehicleRead)
def create_repair_order(
    vehicle_id: int,
    payload: schemas.RepairOrderCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("sa")),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    order = RepairOrder(
        vehicle=vehicle,
        job_type=payload.job_type,
        status="open",
        open_date=date.today(),
        diagnosis_result=payload.diagnosis_result,
        mileage=payload.mileage,
        data_complete=False,
    )
    for item_data in payload.items:
        RepairItem(repair_order=order, **item_data.model_dump())

    db.add(order)
    db.commit()
    db.refresh(vehicle)
    return vehicle


# --- Admin + SA: ปิดงาน / ยกเลิกงาน / แก้ไขงาน / อัปโหลดรูป ---


@app.post("/repair-orders/{order_id}/close", response_model=schemas.VehicleRead)
def close_repair_order(
    order_id: int,
    payload: schemas.CloseOrderRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("sa")),
):
    order = db.query(RepairOrder).filter(RepairOrder.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Repair order not found")

    job_card_number = payload.job_card_number or order.job_card_number
    if not job_card_number:
        raise HTTPException(status_code=400, detail="ต้องใส่เลขใบสั่งซ่อมก่อนปิดงาน")

    order.job_card_number = job_card_number
    order.status = "closed"
    db.commit()

    vehicle = order.vehicle
    db.refresh(vehicle)
    return vehicle


@app.post("/repair-orders/{order_id}/cancel", response_model=schemas.VehicleRead)
def cancel_repair_order(
    order_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("sa"))
):
    order = db.query(RepairOrder).filter(RepairOrder.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Repair order not found")

    order.status = "cancelled"
    db.commit()

    vehicle = order.vehicle
    db.refresh(vehicle)
    return vehicle


@app.patch("/repair-orders/{order_id}", response_model=schemas.VehicleRead)
def update_repair_order(
    order_id: int,
    payload: schemas.RepairOrderUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("sa")),
):
    order = db.query(RepairOrder).filter(RepairOrder.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Repair order not found")
    if order.status != "open":
        raise HTTPException(status_code=400, detail="แก้ไขได้เฉพาะงานที่ยังเปิดอยู่")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(order, field, value)

    db.commit()
    vehicle = order.vehicle
    db.refresh(vehicle)
    return vehicle


@app.post("/repair-orders/{order_id}/photo/{kind}", response_model=schemas.VehicleRead)
async def upload_order_photo(
    order_id: int,
    kind: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("sa")),
):
    if kind not in ALLOWED_PHOTO_KINDS:
        raise HTTPException(
            status_code=400, detail="ประเภทรูปไม่ถูกต้อง (ใช้ได้แค่ car หรือ vin)"
        )

    order = db.query(RepairOrder).filter(RepairOrder.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Repair order not found")

    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"order{order_id}_{kind}_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join("uploads", filename)
    with open(filepath, "wb") as out_file:
        out_file.write(await file.read())

    photo_url = f"/uploads/{filename}"
    if kind == "car":
        order.car_photo_path = photo_url
    else:
        order.vin_photo_path = photo_url

    db.commit()
    vehicle = order.vehicle
    db.refresh(vehicle)
    return vehicle


# --- เสิร์ฟหน้าเว็บ React ที่ build แล้ว (ต้องอยู่ล่างสุดของไฟล์เสมอ) ---
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")
