import type { SceneObject, TargetZone, SceneGraph } from '../types/task'

export const DEFAULT_SCENE_OBJECTS: SceneObject[] = [
  {
    id: 'table',
    name: 'Work Table',
    type: 'surface',
    position: [0, 0, 0],
    dimensions: [10.8, 0.02, 10.6],
    color: '#ede8e0',
  },
  {
    id: 'box-a',
    name: 'Box A',
    type: 'box',
    position: [0.45, 0.045, 0.20],
    dimensions: [0.08, 0.08, 0.08],
    color: '#6b8fa8',
  },
  {
    id: 'box-b',
    name: 'Box B',
    type: 'box',
    position: [-0.40, 0.035, 0.30],
    dimensions: [0.10, 0.06, 0.10],
    color: '#a8726b',
  },
  {
    id: 'cylinder-a',
    name: 'Cylinder A',
    type: 'cylinder',
    position: [0.50, 0.066, -0.20],
    dimensions: [0.04, 0.12, 0.04],
    color: '#7a8a6b',
  },
  {
    id: 'shelf',
    name: 'Shelf',
    type: 'surface',
    position: [0.7, 0.20, 0],
    dimensions: [0.4, 0.08, 0.2],
    color: '#d4c5b0',
  },
  {
    id: 'drawer',
    name: 'Drawer Zone',
    type: 'zone',
    position: [-0.4, 0.15, 0],
    dimensions: [0.25, 0.2, 0.3],
    color: '#b0b8c8',
  },
  { id: 'box-c',      name: 'Box C',      type: 'box',      position: [ 0.55, 0.045,  0.35], dimensions: [0.08, 0.08, 0.08], color: '#8b7355' },
  { id: 'box-d',      name: 'Box D',      type: 'box',      position: [-0.45, 0.035,  0.45], dimensions: [0.10, 0.06, 0.10], color: '#4a7a4a' },
  { id: 'box-e',      name: 'Box E',      type: 'box',      position: [ 0.60, 0.045, -0.40], dimensions: [0.08, 0.08, 0.08], color: '#7a4a4a' },
  { id: 'box-f',      name: 'Box F',      type: 'box',      position: [-0.55, 0.045, -0.35], dimensions: [0.10, 0.06, 0.10], color: '#4a4a7a' },
  { id: 'cylinder-b', name: 'Cylinder B', type: 'cylinder', position: [ 0.35, 0.066,  0.65], dimensions: [0.04, 0.12, 0.04], color: '#7a6b4a' },
  { id: 'cylinder-c', name: 'Cylinder C', type: 'cylinder', position: [-0.65, 0.066,  0.30], dimensions: [0.04, 0.12, 0.04], color: '#4a6b7a' },
  { id: 'box-g',      name: 'Box G',      type: 'box',      position: [ 0.30, 0.035, -0.75], dimensions: [0.10, 0.06, 0.10], color: '#6b4a6b' },
  { id: 'box-h',      name: 'Box H',      type: 'box',      position: [-0.30, 0.045, -0.60], dimensions: [0.08, 0.08, 0.08], color: '#6b8b7a' },
  { id: 'cylinder-d', name: 'Cylinder D', type: 'cylinder', position: [ 0.70, 0.066, -0.35], dimensions: [0.04, 0.12, 0.04], color: '#8b6b4a' },
  { id: 'box-i',      name: 'Box I',      type: 'box',      position: [-0.70, 0.035, -0.40], dimensions: [0.10, 0.06, 0.10], color: '#4a8b6b' },
]

export const DEFAULT_TARGET_ZONES: TargetZone[] = [
  { id: 'zone-shelf',        name: 'Shelf Drop Zone',  position: [0.7, 0.34, 0],  radius: 0.08 },
  { id: 'zone-drawer',       name: 'Drawer Zone',      position: [-0.4, 0.25, 0], radius: 0.1  },
  { id: 'zone-table-center', name: 'Table Center',     position: [0, 0.05, 0],    radius: 0.15 },
]

export const DEFAULT_SCENE_GRAPH: SceneGraph = {
  objects: DEFAULT_SCENE_OBJECTS,
  targetZones: DEFAULT_TARGET_ZONES,
}

export function getAllTargets(): Array<{ id: string; name: string; position: [number, number, number] }> {
  return [
    ...DEFAULT_SCENE_OBJECTS.map((o) => ({ id: o.id, name: o.name, position: o.position })),
    ...DEFAULT_TARGET_ZONES.map((z) => ({ id: z.id, name: z.name, position: z.position })),
  ]
}

export function getTargetById(id: string) {
  return (
    DEFAULT_SCENE_OBJECTS.find((o) => o.id === id) ??
    DEFAULT_TARGET_ZONES.find((z) => z.id === id) ??
    null
  )
}