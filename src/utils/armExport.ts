import type { ArmSegment, GripperConfig, ArmConfig } from '../types/arm'

export function exportArmConfig(
    name: string,
    segments: ArmSegment[],
    gripper: GripperConfig,
): void {
  const config: ArmConfig = {
    version: '1.0',
    name: name.trim() || 'Mirai Arm',
    createdAt: new Date().toISOString(),
    segments,
    gripper,
  }

  const json = JSON.stringify(config, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${config.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.mirai.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after browser has had time to initiate download
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}






function isValidSegment(s: unknown): s is ArmSegment {
  if (typeof s !== 'object' || s === null) return false
  const seg = s as Record<string, unknown>
  return (
    typeof seg['id'] === 'string' &&
    typeof seg['name'] === 'string' &&
    typeof seg['length'] === 'number' &&
    typeof seg['mass'] === 'number' &&
    typeof seg['joint'] === 'string' &&
    ['revolute', 'prismatic', 'fixed'].includes(seg['joint'] as string)
  )
}





function isValidGripper(g: unknown): g is GripperConfig {
    if (typeof g !== 'object' || g === null) return false
    const gripper = g as Record<string, unknown>
    return (
        typeof gripper['id'] === 'string' &&
        typeof gripper['type'] === 'string' &&
        ['parallel_jaw', 'suction_cup', 'magnetic'].includes(gripper['type'] as string) &&
        typeof gripper['width'] === 'number' &&
        typeof gripper['force'] === 'number'
    )
}







/* Returns null on any parse/validation failure - never throws */
export function parseArmConfig(json: string): ArmConfig | null {
  try {
    const raw: unknown = JSON.parse(json)

    if (typeof raw !== 'object' || raw === null) return null

    const data = raw as Record<string, unknown>

    if (data['version'] !== '1.0') return null
    if (!Array.isArray(data['segments'])) return null
    if (!data['segments'].every(isValidSegment)) return null
    if (!isValidGripper(data['gripper'])) return null

    return {
      version: '1.0',
      name: typeof data['name'] === 'string' ? data['name'] : 'Imported Arm',
      createdAt: typeof data['createdAt'] === 'string' ? data['createdAt'] : new Date().toISOString(),
      segments: data['segments'] as ArmSegment[],
      gripper: data['gripper'] as GripperConfig,
    }
  } catch {
    return null
  }
}







export function loadArmConfigFromFile(): Promise<ArmConfig | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) { resolve(null); return }

      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result
        resolve(typeof text === 'string' ? parseArmConfig(text) : null)
      }
      reader.onerror = () => resolve(null)
      reader.readAsText(file)
    }
    input.click()
  })
}