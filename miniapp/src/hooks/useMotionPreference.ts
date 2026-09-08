import { useEffect, useState } from 'react'
import {
  getMotionPreference,
  subscribeMotionPreference,
  type MotionPreference,
} from '../services/motionPreference'

export function useMotionPreference(): MotionPreference {
  const [preference, setPreference] = useState<MotionPreference>(() => getMotionPreference())

  useEffect(() => subscribeMotionPreference(() => setPreference(getMotionPreference())), [])

  return preference
}
