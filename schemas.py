from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models import JobType


class TechnicianRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    active: bool


class TechnicianCreate(BaseModel):
    name: str


class TechnicianUpdate(BaseModel):
    name: Optional[str] = None
    active: Optional[bool] = None


class PartsRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_status: str
    ordered_date: Optional[date] = None
    expected_arrival: Optional[date] = None


class RepairItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    description: str
    part_name: Optional[str] = None
    part_number: Optional[str] = None
    repair_time_estimate: Optional[str] = None
    job_status: str
    technician: Optional[TechnicianRead] = None
    parts_request: Optional[PartsRequestRead] = None


class RepairOrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_type: JobType
    status: str
    open_date: date
    appointment_date: Optional[date] = None
    diagnosis_result: Optional[str] = None
    data_complete: bool
    job_card_number: Optional[str] = None
    mileage: Optional[int] = None
    car_photo_path: Optional[str] = None
    vin_photo_path: Optional[str] = None
    items: list[RepairItemRead] = []


class VehicleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vin: str
    license_plate: str
    model: str
    customer_name: str
    phone: Optional[str] = None
    repair_orders: list[RepairOrderRead] = []


class JobStatusUpdate(BaseModel):
    job_status: str


class PartsStatusUpdate(BaseModel):
    order_status: str


class StatusOptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: str
    key: str
    label: str
    color: str
    sort_order: int


class StatusOptionCreate(BaseModel):
    category: str
    key: str
    label: str
    color: str = "muted"
    sort_order: int = 0


class StatusOptionUpdate(BaseModel):
    label: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None


class RepairOrderUpdate(BaseModel):
    job_type: Optional[JobType] = None
    diagnosis_result: Optional[str] = None
    job_card_number: Optional[str] = None
    mileage: Optional[int] = None


class CloseOrderRequest(BaseModel):
    job_card_number: Optional[str] = None


class UserCreate(BaseModel):
    username: str
    password: str
    role: str


class UserUpdate(BaseModel):
    role: Optional[str] = None
    active: Optional[bool] = None
    password: Optional[str] = None


class VehicleModelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    active: bool


class VehicleModelCreate(BaseModel):
    name: str


class VehicleModelUpdate(BaseModel):
    name: Optional[str] = None
    active: Optional[bool] = None


class VehicleCreate(BaseModel):
    vin: str
    license_plate: str
    model: str
    customer_name: str
    phone: Optional[str] = None


class RepairItemCreate(BaseModel):
    description: str
    part_name: Optional[str] = None
    part_number: Optional[str] = None
    repair_time_estimate: Optional[str] = None
    technician_id: Optional[int] = None


class RepairOrderCreate(BaseModel):
    job_type: JobType
    appointment_date: Optional[date] = None
    diagnosis_result: Optional[str] = None
    mileage: Optional[int] = None
    items: list[RepairItemCreate] = []


class IntakeCreate(BaseModel):
    vehicle: VehicleCreate
    order: RepairOrderCreate


class LoginRequest(BaseModel):
    username: str
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: str
    active: bool


class LoginResponse(BaseModel):
    token: str
    user: UserRead
