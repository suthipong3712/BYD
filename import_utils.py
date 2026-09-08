"""
ตัวช่วยแปลงข้อมูลจากไฟล์ Excel เดิม (2 ชีต: รอดำเนินการ / เสร็จสิ้น)
ให้เป็นรูปแบบที่ระบบเข้าใจ ก่อนจะให้แอดมินตรวจสอบในหน้าเว็บแล้วค่อยยืนยันนำเข้าจริง
"""

import re
from datetime import date

import pandas as pd

MILEAGE_RE = re.compile(r"([\d]{2,3}(?:,\d{3})+)\s*กม")


def _clean(value):
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    text = str(value).strip()
    if text == "" or text.lower() == "nan":
        return None
    return text


def _guess_job_type(text):
    if text and ("เคลม" in text or "warranty" in text.lower()):
        return "warranty"
    return "customer_pay"


def _guess_parts_status(text):
    if not text:
        return "not_ordered"
    if "มาถึง" in text or "มาแล้ว" in text:
        return "arrived"
    if "รอ" in text or "b/o" in text.lower():
        return "ordered"
    return "not_ordered"


def _guess_mileage(*texts):
    for text in texts:
        if not text:
            continue
        m = MILEAGE_RE.search(text)
        if m:
            return int(m.group(1).replace(",", ""))
    return None


def _parse_date(value):
    if value is not None and not (isinstance(value, float) and pd.isna(value)):
        try:
            parsed = pd.to_datetime(value, dayfirst=True, errors="coerce")
            if parsed is not None and not pd.isna(parsed):
                return parsed.date().isoformat()
        except Exception:
            pass
    return date.today().isoformat()


def _parse_pending_sheet(df, start_index):
    rows = []
    for i, r in df.iterrows():
        vin = _clean(r.get("VIN"))
        diagnosis = _clean(r.get("รายการอะไหล่ที่สั่ง / ปัญหาที่พบ")) or _clean(
            r.get("ผลการแจ้งเคลม")
        )
        notes = _clean(r.get("รายละเอียดและหมายเหตุ"))
        status_text = _clean(r.get("สถานะ"))

        rows.append(
            {
                "row_index": start_index + i,
                "source_sheet": "รอดำเนินการ",
                "vin": vin,
                "license_plate": _clean(r.get("เลขทะเบียนรถ")),
                "customer_name": _clean(r.get("ชื่อลูกค้า")),
                "phone": _clean(r.get("เบอร์โทรศัพท์")),
                "model": _clean(r.get("รุ่นรถ")),
                "job_type": _guess_job_type(_clean(r.get("ประเภทงาน"))),
                "diagnosis_result": diagnosis,
                "part_name": _clean(r.get("ชื่ออะไหล่ที่เปลี่ยน")),
                "part_number": _clean(r.get("เบอร์อะไหล่")),
                "repair_time_estimate": _clean(r.get("ใช้เวลา/ชม.")),
                "technician_name": _clean(r.get("ช่าง")),
                "order_status": "open",
                "parts_order_status": _guess_parts_status(status_text),
                "open_date": _parse_date(r.get("วันที่ลูกค้าแจ้ง")),
                "mileage": _guess_mileage(notes, diagnosis),
                "skip": vin is None,
                "skip_reason": None if vin else "ไม่มี VIN",
                "warnings": [],
            }
        )
    return rows


def _parse_completed_sheet(df, start_index):
    rows = []
    for i, r in df.iterrows():
        vin = _clean(r.get("VIN"))
        diagnosis = _clean(r.get("รายการอะไหล่ที่สั่ง"))
        notes = _clean(r.get("รายละเอียดและหมายเหตุ"))

        rows.append(
            {
                "row_index": start_index + i,
                "source_sheet": "เสร็จสิ้น",
                "vin": vin,
                "license_plate": _clean(r.get("เลขทะเบียนรถ")),
                "customer_name": _clean(r.get("ชื่อลูกค้า")),
                "phone": _clean(r.get("เบอร์โทรศัพท์")),
                "model": _clean(r.get("รุ่นรถ")),
                "job_type": _guess_job_type(_clean(r.get("ประเภทงาน"))),
                "diagnosis_result": diagnosis,
                "part_name": None,
                "part_number": _clean(r.get("เบอร์อะไหล่")),
                "repair_time_estimate": None,
                "technician_name": None,
                "order_status": "closed",
                "parts_order_status": "arrived",
                "open_date": _parse_date(r.get("วันที่ลูกค้าแจ้ง")),
                "mileage": _guess_mileage(notes, diagnosis),
                "skip": vin is None,
                "skip_reason": None if vin else "ไม่มี VIN",
                "warnings": [],
            }
        )
    return rows


def parse_workbook(file_bytes_io):
    sheets = pd.read_excel(file_bytes_io, sheet_name=None)
    rows = []
    index = 0
    for name, df in sheets.items():
        if "รอดำเนินการ" in name:
            parsed = _parse_pending_sheet(df, index)
        elif "เสร็จสิ้น" in name:
            parsed = _parse_completed_sheet(df, index)
        else:
            continue
        rows.extend(parsed)
        index += len(df)
    return rows
