/**
 * armNLDesigner.ts
 *
 * Interprets natural language arm requirements and returns a structured
 * arm configuration. Two-layer approach:
 *
 *   Layer 1: Regex rule parser — fast, offline, handles 90% of real prompts.
 *   Layer 2: Gemini fallback  — for complex/ambiguous queries.
 */






import type { ArmSegment, GripperConfig } from '../types/arm'
import { GoogleGenerativeAI } from '@google/generative-ai'

//Extraction helpers 






function extractReachMeters(input: string): number | null {
  const m = input.match(/(\d+(?:\.\d+)?)\s*m(?:eters?|etres?)?\b/i)
  if (m) return parseFloat(m[1])
  const cm = input.match(/(\d+(?:\.\d+)?)\s*cm\b/i)
  if (cm) return parseFloat(cm[1]) / 100
  const mm = input.match(/(\d+(?:\.\d+)?)\s*mm\b/i)
  if (mm) return parseFloat(mm[1]) / 1000
  // Handle inch formats e.g. "24 inch" or "24""
  const inch = input.match(/(\d+(?:\.\d+)?)\s*(?:in(?:ch(?:es)?)?|")\b/i)
  if (inch) return parseFloat(inch[1]) * 0.0254
  return null
}

function extractPayloadGrams(input: string): number | null {
  const kg = input.match(/(\d+(?:\.\d+)?)\s*kg\b/i)
  if (kg) return parseFloat(kg[1]) * 1000
  const g = input.match(/(\d+(?:\.\d+)?)\s*g(?:rams?)?\b/i)
  if (g) return parseFloat(g[1])
  const lb = input.match(/(\d+(?:\.\d+)?)\s*lb(?:s|f)?\b/i)
  if (lb) return parseFloat(lb[1]) * 453.6
  const oz = input.match(/(\d+(?:\.\d+)?)\s*oz\b/i)
  if (oz) return parseFloat(oz[1]) * 28.35
  return null
}

function extractJointCount(input: string): number | null {
  const m = input.match(/(\d+)\s*[-\s]?(?:joint|axis|dof|degree)/i)
  if (m) {
    const n = parseInt(m[1], 10)
    return n >= 2 && n <= 6 ? n : null
  }
  if (/\btwo[- ]joint|2[- ]joint/i.test(input)) return 2
  if (/\bthree[- ]joint|3[- ]joint/i.test(input)) return 3
  if (/\bfour[- ]joint|4[- ]joint/i.test(input)) return 4
  return null
}

function extractGripperType(input: string): GripperConfig['type'] | null {
  if (/suction|vacuum|cup/i.test(input))  return 'suction_cup'
  if (/magnet/i.test(input))              return 'magnetic'
  if (/jaw|gripper|claw|clamp/i.test(input)) return 'parallel_jaw'
  return null
}

// ── Arm builder from extracted params ─────────────────────────────────────────

export type NLDesignParams = {
  reachMeters:   number
  payloadGrams:  number
  jointCount:    number
  gripperType:   GripperConfig['type']
}

export type NLDesignResult = {
  segments:    ArmSegment[]
  gripper:     GripperConfig
  params:      NLDesignParams
  confidence:  'high' | 'medium' | 'low'
  summary:     string
}






function buildSegments(reachM: number, joints: number): ArmSegment[] {

  const ratios =
    joints === 2 ? [0.55, 0.45] :
    joints === 3 ? [0.42, 0.35, 0.23] :
    joints === 4 ? [0.35, 0.28, 0.22, 0.15] :
                   Array.from({ length: joints }, () => 1 / joints)

  const segments: ArmSegment[] = [
    {
      id:            'seg-base',
      name:          'Base',
      length:        Math.max(0.10, Math.min(0.25, reachM * 0.18)),
      mass:          1.8,
      joint:         'fixed',
      jointLimitMin: 0,
      jointLimitMax: 0,
      material:      'aluminum',
      color:         '#c7b8aa',
    },
  ]

  ratios.forEach((ratio, i) => {
    segments.push({
      id:            `seg-${i + 1}`,
      name:          `Segment ${i + 1}`,
      length:        Math.max(0.08, Math.min(0.80, parseFloat((reachM * ratio).toFixed(3)))),
      mass:          Math.max(0.3, Math.min(2.5, 0.9 - i * 0.15)),
      joint:         'revolute',
      jointLimitMin: i === 0 ? -90 : -120,
      jointLimitMax: i === 0 ?  90 :  120,
      material:      'aluminum',
      color:         ['#d6dbe1', '#cbd3dc', '#bec8d4', '#b2bdcc'][i] ?? '#d6dbe1',
    })
  })

  return segments
}

function buildGripper(
  type: GripperConfig['type'],
  payloadGrams: number,
): GripperConfig {
  const safetyFactor = 2.2
  const requiredForce = (payloadGrams / 1000) * 9.81 * safetyFactor
  const spanM = payloadGrams > 500 ? 0.12 : payloadGrams > 200 ? 0.09 : 0.06

  const nameMap: Record<GripperConfig['type'], string> = {
    parallel_jaw: 'Parallel Jaw',
    suction_cup:  'Suction Cup',
    magnetic:     'Magnetic',
  }

  return {
    id:    'gripper-1',
    type,
    name:  `${nameMap[type]} (NL)`,
    width: Math.max(0.04, Math.min(0.20, spanM)),
    force: Math.max(20, Math.min(140, Math.ceil(requiredForce + 10))),
  }
}





// Layer 1: Rule-based (runs first, zero latency)

export function parseArmNLRules(input: string): NLDesignResult | null {
  const reach   = extractReachMeters(input)
  const payload = extractPayloadGrams(input)

  if (!reach && !payload) return null  // nothing actionable — escalate to Gemini

  const resolvedReach   = Math.max(0.20, Math.min(1.60, reach ?? 0.60))
  const requestedPayload = Math.max(10, payload ?? 200)
  const profilePayload   = Math.max(10, Math.min(2000, requestedPayload))
  const jointCount      = extractJointCount(input)    ?? (resolvedReach > 0.9 ? 3 : 2)
  const gripperType     = extractGripperType(input)   ??
    (profilePayload > 800 ? 'parallel_jaw' : 'parallel_jaw')

  const segments = buildSegments(resolvedReach, jointCount)
  const gripper  = buildGripper(gripperType, profilePayload)

  const confidence: NLDesignResult['confidence'] = (reach && payload) ? 'high'
    : (reach || payload) ? 'medium'
    : 'low'

  const summary = [
    `reach ${resolvedReach.toFixed(2)}m`,
    `${jointCount} joints`,
    `${requestedPayload < 1000
      ? `${requestedPayload.toFixed(0)}g payload`
      : `${(requestedPayload / 1000).toFixed(2)}kg payload`}`,
    gripperType.replace('_', ' '),
  ].join(' · ')

  return {
    segments,
    gripper,
    params: {
      reachMeters:  resolvedReach,
      payloadGrams: requestedPayload,
      jointCount,
      gripperType,
    },
    confidence,
    summary,
  }
}

// ── Layer 2: Gemini fallback (runs only when rule parser finds nothing) ────────

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined

const GEMINI_ARM_SYSTEM = `\
You are an expert robot arm configuration assistant.
The user will describe a robot arm in plain English.
Return ONLY a JSON object with these exact fields (no markdown, no explanation):

{
  "reachMeters":  <number, 0.2–1.6>,
  "payloadGrams": <number, 10–500000>,
  "jointCount":   <number, 2–4>,
  "gripperType":  <"parallel_jaw" | "suction_cup" | "magnetic">
}

Rules:
- reachMeters: total arm reach from base to end-effector in metres.
- payloadGrams: maximum payload in grams (1kg = 1000).
- jointCount: number of revolute joints (2 is standard, 3 for long reach or complex tasks).
- gripperType: parallel_jaw for most tasks, suction_cup for flat surfaces, magnetic for metal.
- Only return valid JSON. No extra keys. No prose.`

export async function parseArmNLGemini(input: string): Promise<NLDesignResult | null> {
  if (!API_KEY) return null

  try {
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const resp  = await model.generateContent([GEMINI_ARM_SYSTEM, `User request: "${input}"`])
    const text  = resp.response.text()

    const start = text.indexOf('{')
    const end   = text.lastIndexOf('}')
    if (start === -1 || end === -1) return null

    const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<NLDesignParams>

    const reachM   = Number(parsed.reachMeters  ?? 0.6)
    const payloadG = Number(parsed.payloadGrams ?? 200)
    const requestedPayload = Math.max(10, payloadG)
    const profilePayload = Math.max(10, Math.min(2000, requestedPayload))
    const joints   = Math.max(2, Math.min(4, Number(parsed.jointCount ?? 2)))
    const gType    = (['parallel_jaw', 'suction_cup', 'magnetic'] as const)
                       .includes(parsed.gripperType as any)
                       ? (parsed.gripperType as GripperConfig['type'])
                       : 'parallel_jaw'

    const segments = buildSegments(reachM, joints)
    const gripper  = buildGripper(gType, profilePayload)

    const summary = [
      `reach ${reachM.toFixed(2)}m`,
      `${joints} joints`,
      `${requestedPayload < 1000 ? `${requestedPayload.toFixed(0)}g` : `${(requestedPayload / 1000).toFixed(2)}kg`} payload`,
      gType.replace('_', ' '),
    ].join(' · ')

    return {
      segments, gripper,
      params:     { reachMeters: reachM, payloadGrams: requestedPayload, jointCount: joints, gripperType: gType },
      confidence: 'high',
      summary,
    }
  } catch {
    return null
  }
}

//  Public entry point

export async function designArmFromNL(input: string): Promise<NLDesignResult | null> {
  //Try rules first — instant
  const ruleResult = parseArmNLRules(input.trim())
  if (ruleResult && ruleResult.confidence !== 'low') return ruleResult

  //Try Gemini if key is available
  const geminiResult = await parseArmNLGemini(input.trim())
  if (geminiResult) return geminiResult

  //Fallback: return low-confidence rule result if any
  return ruleResult
}
