from __future__ import annotations






def build_mjcf_from_arm(arm: dict) -> str:

    segments = arm.get("segments", [])
    body_xml = []
    parent = "base"

    base = """
    <mujoco model="mirai_arm">
      <option timestep="0.01" gravity="0 0 -9.81"/>
      <worldbody>
        <body name="base" pos="0 0 0">
          <geom type="box" size="0.04 0.04 0.02" rgba="0.2 0.2 0.2 1"/>
    """

    for i, seg in enumerate(segments):
        length = float(seg.get("length", 0.2))
        joint_type = seg.get("joint", "revolute")
        if joint_type != "revolute":
            continue

        body_xml.append(f"""
          <body name="link_{i}" pos="0 0 {length}">
            <joint name="joint_{i}" type="hinge" axis="0 1 0" limited="true" range="-180 180"/>
            <geom type="capsule" fromto="0 0 0 0 0 {length}" size="0.02" rgba="0.6 0.6 0.65 1"/>
        """)

    tail = """
          </body>
        </body>
      </worldbody>
    </mujoco>
    """

    open_count = sum(1 for s in segments if s.get("joint", "revolute") == "revolute")
    close_tags = "</body>" * open_count
    return base + "".join(body_xml) + close_tags + tail