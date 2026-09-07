'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createEnvelope, isFromAllowedOrigin, parseMessage } from '../protocol/index.js'
import type { SandboxPayloadMap, SandboxSessionInfo } from '../protocol/index.js'

export interface SandboxProviderProps {
  /** Manifest'teki `demo.id` ile aynı olmalı (ör. "voltgo"). */
  demoId: string
  /**
   * CP'nin izinli origin'leri — `postMessage` hedefi asla `'*'` olmaz. Düz
   * dizi (geriye uyumlu) ya da bir fonksiyon (`() => resolveAllowedOrigins(...)`)
   * kabul eder — statik export'larda build-time env'e ek olarak
   * `window.__SANDBOX_RUNTIME__` konteyner-zamanı değerini de kullanmak için.
   */
  allowedOrigins: readonly string[] | (() => readonly string[])
  manifestDigest: string
  screens: number
  children: ReactNode
  /** `sandbox:init` alınıp handshake başarıyla tamamlandığında çağrılır. */
  onInit?: (payload: SandboxPayloadMap['sandbox:init']) => void
  /**
   * `sandbox:reset` alındığında, iç snapshot temizlendikten SONRA çağrılır —
   * demo kendi store'unu (ör. booking/kasko form state'i) sıfırlamak için
   * kullanır. `resetCount`'u da bkz. (`key={resetCount}` remount deseni).
   */
  onReset?: () => void
}

export interface SandboxContextValue {
  ready: boolean
  session: SandboxSessionInfo | null
  persona: string | null
  scenario: string | null
  feedbackMode: boolean
  snapshot: Record<string, unknown> | null
  highlightedComponentId: string | null
  /** Her `sandbox:reset`'te +1 artar — demo `key={resetCount}` remount deseninde kullanabilir. */
  resetCount: number
  sendNavigate: (payload: SandboxPayloadMap['sandbox:navigate']) => void
  sendComponentSelected: (payload: SandboxPayloadMap['sandbox:component-selected']) => void
  sendEvent: (payload: SandboxPayloadMap['sandbox:event']) => void
  sendStateSync: (payload: SandboxPayloadMap['sandbox:state-sync']) => void
  sendError: (payload: SandboxPayloadMap['sandbox:error']) => void
}

const SandboxContext = createContext<SandboxContextValue | null>(null)

export function useSandbox(): SandboxContextValue {
  const ctx = useContext(SandboxContext)
  if (!ctx) {
    throw new Error('useSandbox, SandboxProvider dışında kullanılamaz.')
  }
  return ctx
}

function isEmbeddedInIframe(): boolean {
  return typeof window !== 'undefined' && !!window.parent && window.parent !== window
}

export function SandboxProvider({
  demoId,
  allowedOrigins,
  manifestDigest,
  screens,
  children,
  onInit,
  onReset
}: SandboxProviderProps): React.JSX.Element {
  const resolvedAllowedOrigins = useMemo(
    () => (typeof allowedOrigins === 'function' ? allowedOrigins() : allowedOrigins),
    [allowedOrigins]
  )

  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<SandboxSessionInfo | null>(null)
  const [persona, setPersona] = useState<string | null>(null)
  const [scenario, setScenario] = useState<string | null>(null)
  const [feedbackMode, setFeedbackMode] = useState(false)
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null)
  const [highlightedComponentId, setHighlightedComponentId] = useState<string | null>(null)
  const [resetCount, setResetCount] = useState(0)

  const targetOriginRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string>('')
  // Callback'ler ref üzerinden tutulur: her render'da güncellenir ama
  // `handleMessage` useEffect'i yeniden bağlanmaz (listener sabit kalır).
  const onInitRef = useRef(onInit)
  onInitRef.current = onInit
  const onResetRef = useRef(onReset)
  onResetRef.current = onReset

  const post = useCallback(
    <T extends keyof SandboxPayloadMap>(type: T, payload: SandboxPayloadMap[T]) => {
      if (!isEmbeddedInIframe()) return
      const targetOrigin = targetOriginRef.current
      if (!targetOrigin) return
      const envelope = createEnvelope({ type, demoId, sessionId: sessionIdRef.current, payload })
      window.parent.postMessage(envelope, targetOrigin)
    },
    [demoId]
  )

  useEffect(() => {
    function handleMessage(event: MessageEvent): void {
      if (!isFromAllowedOrigin(event, resolvedAllowedOrigins)) return
      // Koşulsuz kontrol: iframe DIŞINDayken (üst pencere, `mode=sandbox`
      // yok) provider hiçbir mesaj işlemez — aksi halde izinli origin'deki
      // bir opener/pencere sahte `sandbox:init`/`sandbox:reset` gönderebilir.
      // İframe İÇİNDEyken kabul edilen tek kaynak `window.parent`'tır.
      if (!isEmbeddedInIframe()) return
      if (event.source !== window.parent) return

      const result = parseMessage(event.data)
      if (!result.ok) return
      const { message } = result

      switch (message.type) {
        case 'sandbox:init': {
          // Hedef origin CP'nin kendi bildirdiği `payload.allowedOrigin`
          // DEĞİL, tarayıcının doğruladığı `event.origin`dir — bir CP payload
          // içinde yanlış/kötü niyetli origin bildirse bile sonraki
          // postMessage'lar asla o origin'e gitmez. `payload.allowedOrigin`
          // yalnızca tutarlılık kontrolü için kullanılır: uymuyorsa handshake
          // reddedilir (sessizce yok sayılır, `ready` set edilmez).
          if (message.payload.allowedOrigin !== event.origin) {
            break
          }
          targetOriginRef.current = event.origin
          sessionIdRef.current = message.payload.session.id
          setSession(message.payload.session)
          setPersona(message.payload.persona ?? null)
          setScenario(message.payload.scenario ?? null)
          setFeedbackMode(message.payload.feedbackMode)
          setSnapshot(message.payload.snapshot ?? null)
          setReady(true)
          onInitRef.current?.(message.payload)
          break
        }
        case 'sandbox:feedback-mode':
          setFeedbackMode(message.payload.on)
          break
        case 'sandbox:highlight':
          setHighlightedComponentId(message.payload.componentId)
          break
        case 'sandbox:persona':
          setPersona(message.payload.id)
          break
        case 'sandbox:scenario':
          setScenario(message.payload.id)
          break
        case 'sandbox:reset':
          setSnapshot(null)
          setResetCount((count) => count + 1)
          onResetRef.current?.()
          break
        default:
          break
      }
    }

    if (typeof window === 'undefined') return
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [resolvedAllowedOrigins])

  useEffect(() => {
    if (!isEmbeddedInIframe()) return
    // El sıkışma: `sandbox:init` gelene kadar tek hedef origin bilinmediği için
    // `ready` her izinli origin'e (joker hariç) yollanır; init sonrası tüm
    // sonraki mesajlar CP'nin bildirdiği tek origin'e sabitlenir.
    const envelope = createEnvelope({
      type: 'sandbox:ready',
      demoId,
      sessionId: '',
      payload: { manifestDigest, screens, protocol: 1 }
    })
    for (const origin of resolvedAllowedOrigins) {
      if (origin === '*') continue
      window.parent.postMessage(envelope, origin)
    }
    // `resolvedAllowedOrigins` mount anındaki değeriyle kullanılır (fonksiyon
    // formu genelde ilk render'da sabit bir sonuç üretir); yeniden bağlanma
    // istenmiyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<SandboxContextValue>(
    () => ({
      ready,
      session,
      persona,
      scenario,
      feedbackMode,
      snapshot,
      highlightedComponentId,
      resetCount,
      sendNavigate: (payload) => post('sandbox:navigate', payload),
      sendComponentSelected: (payload) => post('sandbox:component-selected', payload),
      sendEvent: (payload) => post('sandbox:event', payload),
      sendStateSync: (payload) => post('sandbox:state-sync', payload),
      sendError: (payload) => post('sandbox:error', payload)
    }),
    [ready, session, persona, scenario, feedbackMode, snapshot, highlightedComponentId, resetCount, post]
  )

  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>
}
