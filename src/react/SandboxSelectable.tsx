'use client'

import { useCallback, useEffect, useState } from 'react'
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from 'react'
import { useSandbox } from './SandboxProvider.js'

export interface SandboxSelectableProps {
  screenId: string
  componentId: string
  label: string
  children: ReactNode
}

/** Animasyonlu highlight'ın görünür kaldığı süre (ms) — `prefers-reduced-motion` yoksa. */
const HIGHLIGHT_PULSE_DURATION_MS = 1600

/**
 * Sarmaladığı öğeye web'de `data-sb-screen`/`data-sb-component` basar ve
 * feedback modunda tıklamayı `component-selected` mesajına çevirir.
 * **Not:** feedback modu açıkken sarmalanan öğenin kendi `onClick`'i
 * yutulur (event `stopPropagation`+`preventDefault` edilir) — sarmalanan
 * bileşen aynı anda kendi tıklama davranışını korumaz. Yakalama CAPTURE
 * aşamasında yapılır (`onClickCapture`/`onKeyDownCapture`): BUG-13 (UI E2E,
 * 2026-09-08) — iç etkileşimli çocuklar (RN-web `Pressable` sipariş kartları,
 * butonlar) bubble aşamasında tıklamayı yutuyor, kullanıcı kartın üstüne
 * tıklayınca seçim olmuyordu; capture ile wrapper çocuklardan ÖNCE davranır.
 *
 * CP'den gelen `sandbox:highlight`, feedback modundan BAĞIMSIZ olarak
 * görsel vurgu gösterir (ör. AirNova `?focus=` derin bağlantısı feedback
 * modu kapalıyken de çalışır) — feedback modu yalnızca tıklanabilirliği/
 * klavye erişilebilirliğini belirler. Vurgu kısa süreli söner
 * (`prefers-reduced-motion` tercih edilirse animasyonsuz, statik kalır).
 *
 * React Native ağacında `document` global'i olmadığı için otomatik olarak
 * no-op'a düşer (`react-native` bağımlılığı yok, `typeof document` ile ayrım
 * yapılır) — çocuklar aynen render edilir.
 */
export function SandboxSelectable(props: SandboxSelectableProps): ReactElement {
  if (typeof document === 'undefined') {
    return <>{props.children}</>
  }
  return <WebSandboxSelectable {...props} />
}

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (): void => setPrefers(mql.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return prefers
}

/**
 * BUG-16 (UI E2E 4c, 2026-09-08): capture aşaması DIŞ → İÇ aktığı için iç içe
 * selectable'larda (AirNova "Arama kartı" ⊃ "Akıllı havaalanı önerisi") dış
 * wrapper'ın handler'ı önce çalışıp propagation'ı kesiyor, iç bileşen hiç
 * seçilemiyordu. Kural: olayın hedefi daha İÇTEKİ bir selectable'a aitse bu
 * wrapper hiçbir şey yapmadan geçer — en içteki wrapper'ın kendi capture
 * handler'ı seçer (ve orada propagation kesilir).
 */
function isOwnTarget(wrapper: HTMLElement, target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true
  const nearest = target.closest('[data-sb-component]')
  return nearest === null || nearest === wrapper
}

function WebSandboxSelectable({ screenId, componentId, label, children }: SandboxSelectableProps): ReactElement {
  const { feedbackMode, highlightedComponentId, sendComponentSelected } = useSandbox()
  const isHighlighted = highlightedComponentId === componentId
  const prefersReducedMotion = usePrefersReducedMotion()
  const [pulseActive, setPulseActive] = useState(false)

  useEffect(() => {
    if (!isHighlighted) {
      setPulseActive(false)
      return
    }
    setPulseActive(true)
    if (prefersReducedMotion) return // Statik kalır — otomatik sönmez, animasyon yok.
    const timer = setTimeout(() => setPulseActive(false), HIGHLIGHT_PULSE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [isHighlighted, prefersReducedMotion])

  const select = useCallback(
    (rect: { x: number; y: number; w: number; h: number }) => {
      sendComponentSelected({ screenId, componentId, label, rect })
    },
    [screenId, componentId, label, sendComponentSelected]
  )

  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!feedbackMode) return
      if (!isOwnTarget(event.currentTarget, event.target)) return
      event.preventDefault()
      event.stopPropagation()
      const rect = event.currentTarget.getBoundingClientRect()
      select({ x: rect.x, y: rect.y, w: rect.width, h: rect.height })
    },
    [feedbackMode, select]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!feedbackMode) return
      if (event.key !== 'Enter' && event.key !== ' ') return
      if (!isOwnTarget(event.currentTarget, event.target)) return
      event.preventDefault()
      event.stopPropagation()
      const rect = event.currentTarget.getBoundingClientRect()
      select({ x: rect.x, y: rect.y, w: rect.width, h: rect.height })
    },
    [feedbackMode, select]
  )

  return (
    <div
      data-sb-screen={screenId}
      data-sb-component={componentId}
      data-sb-feedback-active={feedbackMode ? 'true' : undefined}
      data-sb-highlighted={isHighlighted ? 'true' : undefined}
      role={feedbackMode ? 'button' : undefined}
      tabIndex={feedbackMode ? 0 : undefined}
      aria-label={feedbackMode ? label : undefined}
      onClickCapture={feedbackMode ? handleClick : undefined}
      onKeyDownCapture={feedbackMode ? handleKeyDown : undefined}
      style={{
        cursor: feedbackMode ? 'pointer' : undefined,
        boxShadow: pulseActive ? '0 0 0 2px #6d5efc' : '0 0 0 2px rgba(109, 94, 252, 0)',
        transition: prefersReducedMotion ? undefined : 'box-shadow 400ms ease-out'
      }}
    >
      {children}
    </div>
  )
}
