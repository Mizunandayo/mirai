import { atom } from "jotai"
import type { MuJoCoFrame, MuJoCoRunResult } from "../types/mujoco"


export const mujocoFramesAtom = atom<MuJoCoFrame[]>([])
export const mujocoResultAtom = atom<MuJoCoRunResult | null>(null)
export const mujocoRunningAtom = atom(false)
export const mujocoErrorAtom = atom<string | null>(null)
export const sideBySideModeAtom = atom(true)