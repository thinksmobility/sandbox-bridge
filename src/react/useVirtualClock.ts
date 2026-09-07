'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

export interface UseVirtualClockOptions {
  /** Seed'de sabit başlangıç zamanı (epoch ms). */
  t0: number
  /** Simülasyon hızı çarpanı (varsayılan 1 = gerçek zaman). */
  speed?: number
  /** Snapshot'tan geri yüklenen offset (ms) — reset'te sıfırlanır. */
  initialOffsetMs?: number
  /** Test edilebilirlik için enjekte edilebilir gerçek-zaman kaynağı. */
  getRealTimeMs?: () => number
}

export interface UseVirtualClockValue {
  /** `t0 + offsetMs + (gerçek geçen süre × speed)` döner. */
  now: () => number
  offsetMs: number
  speed: number
  /** Offset'i ve başlangıç noktasını sıfırlar — seed'e birebir dönüş. */
  reset: () => void
  /** Offset'i manuel ilerletir (ör. deterministik olay motoru). */
  advance: (ms: number) => void
}

export function useVirtualClock({
  t0,
  speed = 1,
  initialOffsetMs = 0,
  getRealTimeMs = () => Date.now()
}: UseVirtualClockOptions): UseVirtualClockValue {
  const [offsetMs, setOffsetMs] = useState(initialOffsetMs)
  const startRef = useRef<number>(getRealTimeMs())
  const baseOffsetRef = useRef<number>(initialOffsetMs)

  const now = useCallback(() => {
    const elapsedRealMs = getRealTimeMs() - startRef.current
    return t0 + baseOffsetRef.current + elapsedRealMs * speed
  }, [t0, speed, getRealTimeMs])

  const reset = useCallback(() => {
    startRef.current = getRealTimeMs()
    baseOffsetRef.current = 0
    setOffsetMs(0)
  }, [getRealTimeMs])

  const advance = useCallback((ms: number) => {
    baseOffsetRef.current += ms
    setOffsetMs((prev) => prev + ms)
  }, [])

  return useMemo(() => ({ now, offsetMs, speed, reset, advance }), [now, offsetMs, speed, reset, advance])
}
