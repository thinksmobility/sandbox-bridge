// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStateSync } from '../../src/react/useStateSync.js'

describe('useStateSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('varsayılan 500ms debounce sonrası sendStateSync tam olarak bir kez çağrılır', () => {
    const sendStateSync = vi.fn()
    renderHook(() => useStateSync({ step: 1 }, sendStateSync))

    expect(sendStateSync).not.toHaveBeenCalled()
    vi.advanceTimersByTime(499)
    expect(sendStateSync).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(sendStateSync).toHaveBeenCalledTimes(1)
    expect(sendStateSync).toHaveBeenCalledWith({ snapshot: { step: 1 } })
  })

  it('debounce penceresi içinde snapshot değişirse önceki zamanlayıcı iptal edilir', () => {
    const sendStateSync = vi.fn()
    const { rerender } = renderHook(({ snapshot }) => useStateSync(snapshot, sendStateSync), {
      initialProps: { snapshot: { step: 1 } as Record<string, unknown> }
    })

    vi.advanceTimersByTime(300)
    rerender({ snapshot: { step: 2 } })
    vi.advanceTimersByTime(300)
    expect(sendStateSync).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    expect(sendStateSync).toHaveBeenCalledTimes(1)
    expect(sendStateSync).toHaveBeenCalledWith({ snapshot: { step: 2 } })
  })

  it('özel debounceMs parametresi kullanılabilir', () => {
    const sendStateSync = vi.fn()
    renderHook(() => useStateSync({ a: 1 }, sendStateSync, { debounceMs: 100 }))

    vi.advanceTimersByTime(99)
    expect(sendStateSync).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(sendStateSync).toHaveBeenCalledTimes(1)
  })

  it('unmount olduğunda bekleyen zamanlayıcı iptal edilir', () => {
    const sendStateSync = vi.fn()
    const { unmount } = renderHook(() => useStateSync({ step: 1 }, sendStateSync))

    unmount()
    vi.advanceTimersByTime(1000)
    expect(sendStateSync).not.toHaveBeenCalled()
  })
})
