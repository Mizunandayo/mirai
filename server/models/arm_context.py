"""
Arm context builder and Gemini prompt assembler.

Key design principle: Gemini receives explicit, pre-computed collision-free
waypoints — not just scene descriptions. It is told exactly what Y coordinate
to transit at and what the safe approach/grip heights are for each object.
This eliminates the guesswork that causes arm links to collide with surfaces.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from .schemas import ArmContextDTO, ArmSegmentConfig, GripperConfig


# ── Scene geometry parser ─────────────────────────────────────────────────────

@dataclass
class SceneObjectInfo:
    id: str
    name: str
    type: str
    center: Tuple[float, float, float]
    size: Tuple[float, float, float]
    top_y: float
    approach_y: float
    grip_y: float


@dataclass
class ZoneInfo:
    id: str
    name: str
    center: Tuple[float, float, float]
    place_y: float


@dataclass
class ParsedScene:
    transit_height: float = 0.42
    objects: List[SceneObjectInfo] = field(default_factory=list)
    zones: List[ZoneInfo] = field(default_factory=list)

    def all_names_and_ids(self) -> List[str]:
        items = [(o.name, o.id) for o in self.objects] + [(z.name, z.id) for z in self.zones]
        return [token for pair in items for token in pair]

    def find_object_by_hint(self, hint: str) -> Optional[SceneObjectInfo]:
        h = hint.lower()
        for obj in self.objects:
            if obj.id.lower() == h or obj.name.lower() == h:
                return obj
        for obj in self.objects:
            if obj.id.lower() in h or obj.name.lower() in h:
                return obj
        return None

    def find_destination_by_hint(self, hint: str, exclude_id: str = '') -> Optional[Any]:
        h = hint.lower()
        # Zones first
        for z in self.zones:
            if z.id.lower() in h or z.name.lower() in h:
                return z
        # Surface objects
        for obj in self.objects:
            if obj.id == exclude_id:
                continue
            if obj.type == 'surface' and (obj.id.lower() in h or obj.name.lower() in h):
                return obj
        # Default: first zone
        return self.zones[0] if self.zones else None


_TRANSIT_RE = re.compile(r'SAFE_TRANSIT_HEIGHT=([\d.]+)')
_OBJECT_RE = re.compile(
    r'(.+?)\s+\((.+?)\)\s+type=(\w+)'
    r'\s+center=\(([\d., -]+)\)'
    r'\s+size=\(([\d., -]+)\)'
    r'\s+topY=([\d.]+)'
    r'\s+approachY=([\d.]+)'
    r'\s+gripY=([\d.]+)'
)
_ZONE_RE = re.compile(
    r'(.+?)\s+\((.+?)\)\s+zone'
    r'\s+center=\(([\d., -]+)\)'
    r'.*?placeY=([\d.]+)'
)


def _parse_floats(s: str) -> List[float]:
    return [float(v.strip()) for v in s.split(',')]


def parse_scene_context(scene_lines: List[str]) -> ParsedScene:
    scene = ParsedScene()
    for line in scene_lines:
        m = _TRANSIT_RE.match(line)
        if m:
            scene.transit_height = float(m.group(1))
            continue

        m = _OBJECT_RE.match(line)
        if m:
            cx, cy, cz = _parse_floats(m.group(4))
            sx, sy, sz = _parse_floats(m.group(5))
            scene.objects.append(SceneObjectInfo(
                id=m.group(2).strip(),
                name=m.group(1).strip(),
                type=m.group(3),
                center=(cx, cy, cz),
                size=(sx, sy, sz),
                top_y=float(m.group(6)),
                approach_y=float(m.group(7)),
                grip_y=float(m.group(8)),
            ))
            continue

        m = _ZONE_RE.match(line)
        if m:
            cx, cy, cz = _parse_floats(m.group(3))
            scene.zones.append(ZoneInfo(
                id=m.group(2).strip(),
                name=m.group(1).strip(),
                center=(cx, cy, cz),
                place_y=float(m.group(4)),
            ))
    return scene


# ── Safe waypoint computation (mirrors scenePlanner.ts) ──────────────────────

def _fmt(v: float) -> str:
    return f'{v:.3f}'


def _compute_safe_pickup_waypoints(
    obj: SceneObjectInfo,
    transit_h: float,
) -> Dict[str, Any]:
    return {
        'approach_hover': (obj.center[0], transit_h, obj.center[2]),
        'grip_point':     (obj.center[0], obj.grip_y, obj.center[2]),
        'lift_point':     (obj.center[0], transit_h, obj.center[2]),
    }


def _compute_safe_place_waypoints(
    dest: Any,   # SceneObjectInfo | ZoneInfo
    transit_h: float,
) -> Dict[str, Any]:
    if isinstance(dest, SceneObjectInfo):
        place_y = dest.top_y + 0.04
    else:  # ZoneInfo
        place_y = dest.place_y

    cx, _, cz = dest.center
    return {
        'dest_hover':     (cx, transit_h, cz),
        'deposit_point':  (cx, place_y,   cz),
        'retreat_point':  (cx, transit_h, cz),
    }


def _fmt_pt(pt: Tuple[float, float, float]) -> str:
    return f'({_fmt(pt[0])}, {_fmt(pt[1])}, {_fmt(pt[2])})'


# ── Arm context builder ───────────────────────────────────────────────────────

class ArmContextBuilder:
    """Builds Gemini-ready arm context from frontend arm config."""

    @staticmethod
    def _read(seg: Any, key: str, fallback: Any) -> Any:
        if isinstance(seg, dict):
            return seg.get(key, fallback)
        return getattr(seg, key, fallback)

    @staticmethod
    def build_from_frontend_state(arm_segments: List[Any], gripper_type: str) -> ArmContextDTO:
        segments: List[ArmSegmentConfig] = []
        for i, seg in enumerate(arm_segments):
            jl = ArmContextBuilder._read(seg, 'jointLimits', None)
            if jl is None:
                jl = ArmContextBuilder._read(seg, 'joint_limits', {'min': -180, 'max': 180})
            segments.append(ArmSegmentConfig(
                name=ArmContextBuilder._read(seg, 'name', f'Segment{i}'),
                length=float(ArmContextBuilder._read(seg, 'length', 0.3)),
                mass=float(ArmContextBuilder._read(seg, 'mass', 1.0)),
                joint_limits=jl,
            ))

        gripper_map: Dict[str, Dict[str, Any]] = {
            'parallel': {'type': 'parallel', 'force_range': {'min': 0, 'max': 100}},
            'suction':  {'type': 'suction',  'force_range': {'min': 0, 'max': 80}},
            'magnetic': {'type': 'magnetic', 'force_range': {'min': 0, 'max': 120}},
        }
        gripper = GripperConfig(**gripper_map.get(gripper_type, gripper_map['parallel']))

        total = sum(s.length for s in segments)
        return ArmContextDTO(
            segments=segments,
            gripper=gripper,
            max_reach=total * 1.1,
            payload_limit=2.0,
            joint_count=len(segments),
        )


# ── Gemini prompt assembler ───────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an expert tabletop robot arm motion planner.
Convert the user's natural-language request into a safe, executable TaskSpec JSON.

═══════════════════════════════════════════════════════════
COLLISION-FREE MOTION RULES  (MANDATORY — never violate)
═══════════════════════════════════════════════════════════

1. TRANSIT RULE
   • ALL lateral movement between positions MUST use Y >= SAFE_TRANSIT_HEIGHT.
   • Never travel horizontally at object height or table height.
   • The only allowed descent is straight down (X and Z unchanged).

2. PICK SEQUENCE (mandatory order):
   a) Move to (obj.x, SAFE_TRANSIT_HEIGHT, obj.z)   ← hover directly above
   b) Move to (obj.x, obj.gripY,           obj.z)   ← descend straight down
   c) grip close
   d) Move to (obj.x, SAFE_TRANSIT_HEIGHT, obj.z)   ← lift straight up

3. PLACE SEQUENCE (mandatory order):
   e) Move to (dest.x, SAFE_TRANSIT_HEIGHT, dest.z) ← transit laterally at height
   f) Move to (dest.x, dest.placeY,         dest.z) ← descend straight down
   g) grip open
   h) Move to (dest.x, SAFE_TRANSIT_HEIGHT, dest.z) ← retreat straight up

4. USE PROVIDED WAYPOINTS
   • The prompt includes pre-computed safe waypoints (see SAFE WAYPOINTS section).
   • Use those EXACT x/y/z values for move steps unless the user specifies otherwise.
   • Do NOT invent different Y values — they will cause arm links to collide.

5. OUTPUT FORMAT
   • Respond with valid JSON only. No markdown, no code fences, no explanation.
   • Every move step must have targetName, x, y, z, speed (0.1–1.0), approach.
   • Every grip step must have action ("open" or "close") and force (0–100).
   • confidenceScore range: 0.0–1.0.

Output schema:
{
  "taskName": "string",
  "taskDescription": "string",
  "steps": [
    {"stepId": 1, "type": "move", "targetName": "object-id", "x": 0.0, "y": 0.0, "z": 0.0, "speed": 0.4, "approach": "above"},
    {"stepId": 2, "type": "grip", "action": "close", "force": 60}
  ],
  "confidenceScore": 0.85,
  "warnings": []
}
"""


class GeminiPromptAssembler:
    """Builds expert-level collision-aware prompts with pre-computed safe waypoints."""

    @staticmethod
    def build_planning_prompt(
        user_input: str,
        arm_context: ArmContextDTO,
        scene_objects: List[str],
    ) -> Tuple[str, str]:
        scene = parse_scene_context(scene_objects)
        transit_h = scene.transit_height

        # Identify pickup object and destination from user input
        pick_obj = GeminiPromptAssembler._identify_pickup(user_input, scene)
        dest = GeminiPromptAssembler._identify_destination(user_input, scene, pick_obj)

        # Build safe waypoints section
        waypoints_text = GeminiPromptAssembler._build_waypoints_text(
            pick_obj, dest, transit_h
        )

        # Build scene listing
        scene_text = GeminiPromptAssembler._build_scene_text(scene)

        # Build arm summary
        arm_text = GeminiPromptAssembler._build_arm_text(arm_context)

        user_prompt = (
            f'User request:\n{user_input}\n\n'
            f'{arm_text}\n\n'
            f'SAFE_TRANSIT_HEIGHT = {transit_h:.3f}m  '
            f'(all lateral moves MUST use this Y or higher)\n\n'
            f'SCENE OBJECTS (with safe heights):\n{scene_text}\n\n'
            f'{waypoints_text}\n\n'
            'Generate a complete TaskSpec JSON using the safe waypoints above. '
            'Follow the COLLISION-FREE MOTION RULES exactly.'
        )

        return _SYSTEM_PROMPT, user_prompt

    # ── helpers ────────────────────────────────────────────────────────────────

    @staticmethod
    def _identify_pickup(user_input: str, scene: ParsedScene) -> Optional[SceneObjectInfo]:
        text = user_input.lower()
        pickable = [o for o in scene.objects if o.type in ('box', 'cylinder', 'sphere')]

        # Exact id/name match
        for obj in pickable:
            if obj.id.lower() in text or obj.name.lower() in text:
                return obj

        # Shorthand: "cylinder a", "box b"
        m = re.search(r'(box|cylinder|sphere)\s*-?\s*([a-z])', text)
        if m:
            kind, suffix = m.group(1), m.group(2)
            for obj in pickable:
                if f'{kind}-{suffix}' in obj.id.lower():
                    return obj

        return pickable[0] if pickable else None

    @staticmethod
    def _identify_destination(
        user_input: str,
        scene: ParsedScene,
        pick_obj: Optional[SceneObjectInfo],
    ) -> Optional[Any]:
        text = user_input.lower()
        exclude_id = pick_obj.id if pick_obj else ''

        # Zone keywords (priority order)
        zone_keywords = [
            ('shelf',  'zone-shelf'),
            ('drawer', 'zone-drawer'),
            ('center', 'zone-table-center'),
            ('table',  'zone-table-center'),
        ]
        for keyword, zone_id in zone_keywords:
            if keyword in text:
                for z in scene.zones:
                    if z.id == zone_id:
                        return z

        # Fuzzy zone match
        for z in scene.zones:
            if z.id.lower() in text or z.name.lower() in text:
                return z

        # Surface objects
        for obj in scene.objects:
            if obj.id == exclude_id or obj.type != 'surface':
                continue
            if obj.id.lower() in text or obj.name.lower() in text:
                return obj

        # Default: first zone → first non-table surface
        if scene.zones:
            return scene.zones[0]
        surfaces = [o for o in scene.objects if o.type == 'surface' and o.id != 'table']
        return surfaces[0] if surfaces else None

    @staticmethod
    def _build_waypoints_text(
        pick_obj: Optional[SceneObjectInfo],
        dest: Optional[Any],
        transit_h: float,
    ) -> str:
        if not pick_obj or not dest:
            return (
                'SAFE WAYPOINTS:\n'
                f'  Transit height: Y={transit_h:.3f} — use for all lateral travel.\n'
                '  No specific object identified; apply transit-height rule to all moves.'
            )

        pw = _compute_safe_pickup_waypoints(pick_obj, transit_h)
        dw = _compute_safe_place_waypoints(dest, transit_h)

        dest_label = f'{dest.name} ({dest.id})'
        pick_label = f'{pick_obj.name} ({pick_obj.id})'

        return (
            f'SAFE WAYPOINTS  (use EXACTLY these x/y/z values)\n'
            f'  Pickup target : {pick_label}\n'
            f'  Destination   : {dest_label}\n'
            f'\n'
            f'  Step 1 — Hover above pickup  : move to {_fmt_pt(pw["approach_hover"])} speed=0.5\n'
            f'  Step 2 — Descend to grip     : move to {_fmt_pt(pw["grip_point"])}    speed=0.25\n'
            f'  Step 3 — Close gripper       : grip action=close force=65\n'
            f'  Step 4 — Lift to transit     : move to {_fmt_pt(pw["lift_point"])}    speed=0.35\n'
            f'  Step 5 — Transit to dest     : move to {_fmt_pt(dw["dest_hover"])}    speed=0.5\n'
            f'  Step 6 — Lower to deposit    : move to {_fmt_pt(dw["deposit_point"])} speed=0.22\n'
            f'  Step 7 — Open gripper        : grip action=open  force=0\n'
            f'  Step 8 — Retreat             : move to {_fmt_pt(dw["retreat_point"])} speed=0.4\n'
        )

    @staticmethod
    def _build_scene_text(scene: ParsedScene) -> str:
        lines = []
        for obj in scene.objects:
            cx, cy, cz = obj.center
            lines.append(
                f'  {obj.name} ({obj.id}) type={obj.type}'
                f' pos=({cx:.3f},{cy:.3f},{cz:.3f})'
                f' topY={obj.top_y:.3f} approachY={obj.approach_y:.3f} gripY={obj.grip_y:.3f}'
            )
        for z in scene.zones:
            cx, cy, cz = z.center
            lines.append(
                f'  {z.name} ({z.id}) zone'
                f' pos=({cx:.3f},{cy:.3f},{cz:.3f}) placeY={z.place_y:.3f}'
            )
        return '\n'.join(lines) if lines else '  (no scene objects)'

    @staticmethod
    def _build_arm_text(arm: ArmContextDTO) -> str:
        segs = ', '.join(f'{s.name}={s.length:.2f}m' for s in arm.segments)
        return (
            f'ARM: {segs} | max_reach={arm.max_reach:.2f}m'
            f' | gripper={arm.gripper.type} | payload_limit={arm.payload_limit:.1f}kg'
        )
