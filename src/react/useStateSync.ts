'use client'

import { useEffect, useRef } from 'react'
import type { SandboxPayloadMap } from '../protocol/index.js'

export interface UseStateSyncOptions {
  /** Debounce süresi (ms), varsayılan 500. */
  debounceMs?: number
}

/**
 * Demo state'ini (bellekte tutulan) debounce'lu şekilde `sandbox:state-sync`
 * ile CP'ye gönderir. `sendStateSync` bağımlılık olarak verilir (bkz.
 * `useSandbox().sendStateSync`) — hook context'e bağımlı değildir, bu sayede
 * izole test edilebilir.
 *
 * ⚠️ **`snapshot`'a kişisel veri veya sır koymayın.** Bu obje `postMessage`
 * ile CP'ye gider ve CP tarafında (`sandbox_session.session_data_ref`)
 * saklanır — yalnızca demo'nun UI/akış durumunu (seçilen ekran, form adımı,
 * senaryo ilerlemesi vb.) taşımalıdır.
 */
export function useStateSync(
  snapshot: Record<string, unknown>,
  sendStateSync: (payload: SandboxPayloadMap['sandbox:state-sync']) => void,
  options: UseStateSyncOptions = {}
): void {
  const debounceMs = options.debounceMs ?? 500
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sendRef = useRef(sendStateSync)
  sendRef.current = sendStateSync

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      sendRef.current({ snapshot })
    }, debounceMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [snapshot, debounceMs])
}
