# server/export/bom_generator.py
"""
BOM generator: produces CSV + structured JSON from arm configuration.
Pricing sourced from AliExpress/Amazon as of May 2026.
"""

from __future__ import annotations

import csv
import io
import json
from pathlib import Path
from typing import Any

from ..models.export_schemas import ArmConfigExport






_CATALOG_PATH = Path(__file__).resolve().parents[1] / "data" / "bomCatalog.json"
with _CATALOG_PATH.open("r", encoding="utf-8") as handle:
    _CATALOG = json.load(handle)


def _catalog_component(key: str) -> dict[str, Any]:
    return dict(_CATALOG["components"][key])


def _catalog_gripper_parts(gripper_type: str) -> list[dict[str, Any]]:
    return [dict(part) for part in _CATALOG["gripperParts"][gripper_type]]


_SERVO_BY_TIER: dict[str, dict[str, Any]] = {
    "mg995": {
        "name": "MG995 Servo (9.4kg·cm)",
        "unit": 7.0,
        "source": "aliexpress",
    },
    "mg996r": _catalog_component("servo_revolute"),
    "ds3218": {
        "name": "DS3218 High Torque Servo (20kg·cm)",
        "unit": 13.5,
        "source": "amazon",
    },
    "industrial": {
        "name": "Industrial Servo Module (150kg·cm class)",
        "unit": 68.0,
        "source": "amazon",
    },
}







def generate_bom(arm: ArmConfigExport) -> dict[str, Any]:
    """Return BOM as structured dict (also used to build CSV)."""
    items: list[dict] = []

    revolute_count = sum(1 for s in arm.segments if s.joint == "revolute")
    servo_tier = arm.servo_tier or "mg996r"

    # ── Servos 
    if revolute_count > 0:
        servo = _SERVO_BY_TIER.get(servo_tier, _SERVO_BY_TIER["mg996r"])
        items.append({
            "component": servo["name"],
            "qty":       revolute_count,
            "unit_usd":  servo["unit"],
            "total_usd": round(servo["unit"] * revolute_count, 2),
            "source":    servo["source"],
            "note":      f"One per revolute joint ({revolute_count} joints)",
        })

    # ── Gripper servo / actuator
    gripper_parts = _catalog_gripper_parts(arm.gripper.type)
    for part in gripper_parts:
        qty = part.get("qty", 1)
        items.append({
            "component": part["name"],
            "qty":       qty,
            "unit_usd":  part["unit"],
            "total_usd": round(part["unit"] * qty, 2),
            "source":    part["source"],
            "note":      f"Gripper: {arm.gripper.type}",
        })

    # 3D-printed structural parts (one per segment)
    for seg in arm.segments:
        if seg.joint == "fixed":
            base = _CATALOG["structure"]["fixed_base"]
            items.append({
                "component": f"{base['name']} ({seg.length*100:.0f}cm)",
                "qty":       1,
                "unit_usd":  base["unit"],
                "total_usd": round(base["unit"], 2),
                "source":    base["source"],
                "note":      f"{seg.name} — fixed base",
            })
        elif seg.joint == "revolute":
            link = _CATALOG["structure"]["revolute_link"]
            items.append({
                "component": f"{link['name']} ({seg.length*100:.0f}cm)",
                "qty":       1,
                "unit_usd":  link["unit"],
                "total_usd": round(link["unit"], 2),
                "source":    link["source"],
                "note":      f"{seg.name}",
            })

    # ── Electronics ─────────────────────────────────────────────────────────
    for component, qty in [
        (_catalog_component("pca9685"), 1),
        (_catalog_component("arduino_nano"), 1),
        (_catalog_component("power_5v"), 1),
        (_catalog_component("bearings"), 1),
        (_catalog_component("screws"), 1),
        (_catalog_component("jumper_wires"), 1),
        (_catalog_component("usb_cable"), 1),
    ]:
        items.append({
            "component": component["name"],
            "qty":       qty,
            "unit_usd":  component["unit"],
            "total_usd": round(component["unit"] * qty, 2),
            "source":    component["source"],
            "note":      "",
        })

    total = round(sum(i["total_usd"] for i in items), 2)

    return {
        "arm_name": arm.name,
        "items":    items,
        "total_usd": total,
        "note": _CATALOG["note"],
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
