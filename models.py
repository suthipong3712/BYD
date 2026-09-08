"""
SQLAlchemy models for the garage management system.

Vehicle -> RepairOrder -> RepairItem -> PartsRequest
                                     -> Technician

StatusOption: ค่าสถานะ (job_status / parts order_status) ที่แอดมิน
แก้ไขได้จากหน้าเว็บ แทนที่จะต้องแก้ไฟล์นี้ทุกครั้ง
"""
from __future__ import annotations

from datetime import date
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import Date, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class JobType(str, PyEnum):
    WARRANTY = "warranty"
    CUSTOMER_PAY = "customer_pay"





class StatusOption(Base):
    """เช่น category='parts_status' key='not_ordered' label='ยังไม่สั่ง' color='red'"""
    __tablename__ = "status_options"

    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[str] = mapped_column(String(30), index=True)  # "job_status" | "parts_status"
    key: Mapped[str] = mapped_column(String(50))
    label: Mapped[str] = mapped_column(String(100))
    color: Mapped[str] = mapped_column(String(20), default="muted")  # green/amber/red/muted
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True)
    vin: Mapped[str] = mapped_column(String(17), unique=True, index=True)
    license_plate: Mapped[str] = mapped_column(String(20), index=True)
    model: Mapped[str] = mapped_column(String(50))
    customer_name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    repair_orders: Mapped[list["RepairOrder"]] = relationship(back_populates="vehicle")


class Technician(Base):
    __tablename__ = "technicians"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    active: Mapped[Optional[bool]] = mapped_column(default=True, nullable=True)

    repair_items: Mapped[list["RepairItem"]] = relationship(back_populates="technician")


class VehicleModel(Base):
    __tablename__ = "vehicle_models"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    active: Mapped[bool] = mapped_column(default=True)
    sort_order: Mapped[int] = mapped_column(default=0)
    
    
class RepairOrder(Base):
    __tablename__ = "repair_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"))
    job_type: Mapped[JobType] = mapped_column(Enum(JobType))
    # ค่าที่ใช้ได้: "open" | "closed" | "cancelled"
    status: Mapped[str] = mapped_column(String(20), default="open")
    open_date: Mapped[date] = mapped_column(Date)
    appointment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    diagnosis_result: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    data_complete: Mapped[bool] = mapped_column(default=False)
    job_card_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    mileage: Mapped[Optional[int]] = mapped_column(nullable=True)
    car_photo_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vin_photo_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vehicle: Mapped["Vehicle"] = relationship(back_populates="repair_orders")
    items: Mapped[list["RepairItem"]] = relationship(
        back_populates="repair_order", cascade="all, delete-orphan"
    )


class RepairItem(Base):
    __tablename__ = "repair_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    repair_order_id: Mapped[int] = mapped_column(ForeignKey("repair_orders.id"))
    description: Mapped[str] = mapped_column(String(200))
    part_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    part_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    repair_time_estimate: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    technician_id: Mapped[Optional[int]] = mapped_column(ForeignKey("technicians.id"), nullable=True)

    # เดิมเป็น Enum(JobStatus) ตอนนี้เปลี่ยนเป็น string ธรรมดา
    # ค่าที่ใส่ได้มาจากตาราง StatusOption (category="job_status")
    job_status: Mapped[str] = mapped_column(String(50), default="not_started")

    repair_order: Mapped["RepairOrder"] = relationship(back_populates="items")
    technician: Mapped[Optional["Technician"]] = relationship(back_populates="repair_items")
    parts_request: Mapped[Optional["PartsRequest"]] = relationship(
        back_populates="repair_item", uselist=False, cascade="all, delete-orphan"
    )



class PartsRequest(Base):
    __tablename__ = "parts_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    repair_item_id: Mapped[int] = mapped_column(ForeignKey("repair_items.id"), unique=True)

    # เดิมเป็น Enum(PartOrderStatus) ตอนนี้เปลี่ยนเป็น string ธรรมดา
    # ค่าที่ใส่ได้มาจากตาราง StatusOption (category="parts_status")
    order_status: Mapped[str] = mapped_column(String(50), default="not_ordered")

    ordered_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expected_arrival: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    repair_item: Mapped["RepairItem"] = relationship(back_populates="parts_request")
    


class User(Base):
    """role: 'admin' | 'parts' | 'technician'"""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20))
    active: Mapped[bool] = mapped_column(default=True)

    tokens: Mapped[list["AuthToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    user: Mapped["User"] = relationship(back_populates="tokens")