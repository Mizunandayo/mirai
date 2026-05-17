import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { MuJoCoFrame, MuJoCoRunResult } from "../types/mujoco"



// Simulation viewport atoms
export const mujocoFramesAtom      = atom<MuJoCoFrame[]>([])
export const mujocoResultAtom      = atom<MuJoCoRunResult | null>(null)
export const mujocoRunningAtom     = atom(false)
export const mujocoErrorAtom       = atom<string | null>(null)
export const sideBySideModeAtom    = atom(false)





// TaskEditor AI Results physics validation tab
export type MuJoCoValidationPhase = 'idle' | 'running' | 'complete' | 'error'
export const mujocoValidationPhaseAtom  = atomWithStorage<MuJoCoValidationPhase>('mirai_mujoco_validation_phase_v1', 'idle')
export const mujocoValidationResultAtom = atomWithStorage<MuJoCoRunResult | null>('mirai_mujoco_validation_result_v1', null)
export const mujocoValidationErrorAtom  = atomWithStorage<string | null>('mirai_mujoco_validation_error_v1', null)


// CodePane atoms
export const codeLanguageAtom       = atom<'arduino' | 'python'>('arduino')
export const generatedCodeCacheAtom = atom<{ arduino: string; python: string } | null>(null)
export const codePaneLoadingAtom    = atom(false)