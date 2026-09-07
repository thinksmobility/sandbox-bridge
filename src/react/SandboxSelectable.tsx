import { useCallback } from 'react'
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from 'react'
import { useSandbox } from './SandboxProvider.js'

export interface SandboxSelectableProps {
  screenId: string
  componentId: string
  label: string
  children: ReactNode
}

/**
 * Sarmaladığı öğeye web'de `data-sb-screen`/`data-sb-component` basar ve
 * feedback modunda tıklamayı `component-selected` mesajına çevirir.
 * **Not:** feedback modu açıkken sarmalanan öğenin kendi `onClick`'i
 * yutulur (event `stopPropagation`+`preventDefault` edilir) — sarmalanan
 * bileşen aynı anda kendi tıklama davranışını korumaz.
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

function WebSandboxSelectable({ screenId, componentId, label, children }: SandboxSelectableProps): ReactElement {
  const { feedbackMode, highlightedComponentId, sendComponentSelected } = useSandbox()
  const isHighlighted = highlightedComponentId === componentId

  const select = useCallback(
    (rect: { x: number; y: number; w: number; h: number }) => {
      sendComponentSelected({ screenId, componentId, label, rect })
    },
    [screenId, componentId, label, sendComponentSelected]
  )

  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!feedbackMode) return
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
      onClick={feedbackMode ? handleClick : undefined}
      onKeyDown={feedbackMode ? handleKeyDown : undefined}
      style={
        feedbackMode
          ? { cursor: 'pointer', outline: isHighlighted ? '2px solid #6d5efc' : undefined }
          : undefined
      }
    >
      {children}
    </div>
  )
}
