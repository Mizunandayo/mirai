# server/export/bom_generator.py
"""
BOM generator: produces CSV + structured JSON from arm configuration.
Pricing sourced from AliExpress/Amazon as of May 2026.
"""

from __future__ import annotations

import csv
import io
from typing import Any

from ..models.export_schemas import ArmConfigExport






# ── Component price catalogue 
_SERVO_MG996R     = {"name": "MG996R Metal Servo",         "unit": 8.50,  "src": "aliexpress"}
_SERVO_SG90       = {"name": "SG90 Micro Servo (gripper)",  "unit": 2.50,  "src": "aliexpress"}
_PCA9685          = {"name": "PCA9685 16-ch PWM Board",     "unit": 6.80,  "src": "aliexpress"}
_ARDUINO_NANO     = {"name": "Arduino Nano (ATmega328P)",   "unit": 4.50,  "src": "aliexpress"}
_POWER_5V         = {"name": "5V 5A DC Power Supply",       "unit": 9.00,  "src": "amazon"}
_BEARINGS         = {"name": "F608ZZ Flange Bearing (×10)", "unit": 6.00,  "src": "aliexpress"}
_SCREWS           = {"name": "M3 Hex Screw Set (200 pcs)",  "unit": 4.50,  "src": "aliexpress"}
_JUMPER_WIRES     = {"name": "Jumper Wire Set (120 pcs)",   "unit": 3.00,  "src": "aliexpress"}
_USB_CABLE        = {"name": "USB-A to USB-B Cable",         "unit": 2.00,  "src": "amazon"}

_GRIPPER_PARTS = {
    "parallel_jaw": [
        {"name": "3D-Print: Parallel Jaw Body (2×)",   "unit": 0.80, "qty": 2, "src": "printed"},
        {"name": "3D-Print: Jaw Carrier (2×)",         "unit": 0.60, "qty": 2, "src": "printed"},
    ],
    "suction_cup": [
        {"name": "Mini Vacuum Pump 5V",                "unit": 5.50, "qty": 1, "src": "aliexpress"},
        {"name": "Silicone Suction Cup 30mm",          "unit": 1.20, "qty": 1, "src": "aliexpress"},
    ],
    "magnetic": [
        {"name": "12V Electromagnet 5kg Holding Force","unit": 6.00, "qty": 1, "src": "aliexpress"},
        {"name": "5V Relay Module",                    "unit": 1.50, "qty": 1, "src": "aliexpress"},
    ],
}







def generate_bom(arm: ArmConfigExport) -> dict[str, Any]:
    """Return BOM as structured dict (also used to build CSV)."""
    items: list[dict] = []

    revolute_count = sum(1 for s in arm.segments if s.joint == "revolute")

    # ── Servos 
    if revolute_count > 0:
        items.append({
            "component": _SERVO_MG996R["name"],
            "qty":       revolute_count,
            "unit_usd":  _SERVO_MG996R["unit"],
            "total_usd": round(_SERVO_MG996R["unit"] * revolute_count, 2),
            "source":    _SERVO_MG996R["src"],
            "note":      f"One per revolute joint ({revolute_count} joints)",
        })

    # ── Gripper servo / actuator
    gripper_parts = _GRIPPER_PARTS.get(arm.gripper.type, [])
    for part in gripper_parts:
        qty = part.get("qty", 1)
        items.append({
            "component": part["name"],
            "qty":       qty,
            "unit_usd":  part["unit"],
            "total_usd": round(part["unit"] * qty, 2),
            "source":    part["src"],
            "note":      f"Gripper: {arm.gripper.type}",
        })

    # 3D-printed structural parts (one per segment)
    for seg in arm.segments:
        if seg.joint == "fixed":
            items.append({
                "component": f"3D-Print: Base Housing ({seg.length*100:.0f}cm)",
                "qty":       1,
                "unit_usd":  0.60,
                "total_usd": 0.60,
                "source":    "printed",
                "note":      f"{seg.name} — fixed base",
            })
        elif seg.joint == "revolute":
            items.append({
                "component": f"3D-Print: Link Body ({seg.length*100:.0f}cm)",
                "qty":       1,
                "unit_usd":  1.00,
                "total_usd": 1.00,
                "source":    "printed",
                "note":      f"{seg.name}",
            })

    # ── Electronics ─────────────────────────────────────────────────────────
    for component, qty in [
        (_PCA9685,      1),
        (_ARDUINO_NANO, 1),
        (_POWER_5V,     1),
        (_BEARINGS,     1),
        (_SCREWS,       1),
        (_JUMPER_WIRES, 1),
        (_USB_CABLE,    1),
    ]:
        items.append({
            "component": component["name"],
            "qty":       qty,
            "unit_usd":  component["unit"],
            "total_usd": round(component["unit"] * qty, 2),
            "source":    component["src"],
            "note":      "",
        })

    total = round(sum(i["total_usd"] for i in items), 2)

    return {
        "arm_name": arm.name,
        "items":    items,
        "total_usd": total,
        "note": "Prices are estimates (AliExpress/Amazon, May 2026). Print cost ≈ $0.08/g PLA.",
    }







def bom_to_csv(bom: dict) -> str:
    """Convert BOM dict to CSV string."""
    buf = io.StringIO()
    writer = csv.DictWriter(
        buf,
        fieldnames=["component", "qty", "unit_usd", "total_usd", "source", "note"],
    )
    writer.writeheader()
    for item in bom["items"]:
        writer.writerow(item)
    writer.writerow({
        "component": "TOTAL",
        "qty": "",
        "unit_usd": "",
        "total_usd": bom["total_usd"],
        "source": "",
        "note": bom["note"],
    })
    return buf.getvalue()
