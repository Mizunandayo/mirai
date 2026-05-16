# server/export/urdf_generator.py
"""Generates a ROS2-compatible URDF file from arm configuration."""




from __future__ import annotations
import xml.etree.ElementTree as ET
from xml.dom import minidom
from ..models.export_schemas import ArmConfigExport





def _indent(xml_str: str) -> str:
    """Pretty-print XML."""
    return minidom.parseString(xml_str).toprettyxml(indent="  ")





def generate_urdf(arm: ArmConfigExport) -> str:
    robot = ET.Element("robot", name=arm.name.replace(" ", "_").lower())

    prev_link_name = "world"

    # World / ground link
    world_link = ET.SubElement(robot, "link", name="world")

    for i, seg in enumerate(arm.segments):
        link_name  = f"link_{i}"
        joint_name = f"joint_{i}"
        length     = seg.length

        # Link
        link = ET.SubElement(robot, "link", name=link_name)
        visual = ET.SubElement(link, "visual")
        geom   = ET.SubElement(visual, "geometry")
        ET.SubElement(geom, "cylinder",
                      radius=f"{max(0.02, length * 0.08):.4f}",
                      length=f"{length:.4f}")
        origin = ET.SubElement(visual, "origin",
                               xyz=f"0 0 {length/2:.4f}",
                               rpy="0 0 0")
        # Inertial
        inertial = ET.SubElement(link, "inertial")
        ET.SubElement(inertial, "mass", value=f"{seg.mass:.4f}")
        ET.SubElement(inertial, "inertia",
                      ixx="0.001", ixy="0", ixz="0",
                      iyy="0.001", iyz="0", izz="0.0005")

        # Joint
        jtype = {"revolute": "revolute", "prismatic": "prismatic", "fixed": "fixed"}[seg.joint]
        joint = ET.SubElement(robot, "joint", name=joint_name, type=jtype)
        ET.SubElement(joint, "parent", link=prev_link_name)
        ET.SubElement(joint, "child",  link=link_name)
        ET.SubElement(joint, "origin", xyz=f"0 0 {length:.4f}", rpy="0 0 0")

        if seg.joint in ("revolute", "prismatic"):
            ET.SubElement(joint, "axis", xyz="0 0 1")
            import math
            ET.SubElement(joint, "limit",
                          lower=f"{math.radians(seg.joint_limit_min):.4f}",
                          upper=f"{math.radians(seg.joint_limit_max):.4f}",
                          effort=f"{seg.mass * 9.81 * length:.2f}",
                          velocity="1.0")

        prev_link_name = link_name



    # Gripper link
    gripper_link = ET.SubElement(robot, "link", name="gripper_link")
    g_visual = ET.SubElement(gripper_link, "visual")
    g_geom   = ET.SubElement(g_visual, "geometry")
    ET.SubElement(g_geom, "box", size=f"{arm.gripper.width:.4f} {arm.gripper.width:.4f} 0.04")

    g_joint = ET.SubElement(robot, "joint", name="gripper_joint", type="fixed")
    ET.SubElement(g_joint, "parent", link=prev_link_name)
    ET.SubElement(g_joint, "child",  link="gripper_link")
    ET.SubElement(g_joint, "origin", xyz="0 0 0.02", rpy="0 0 0")

    raw = ET.tostring(robot, encoding="unicode", xml_declaration=False)
    return _indent(f'<?xml version="1.0"?>\n{raw}')
