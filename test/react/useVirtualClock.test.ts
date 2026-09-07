// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useVirtualClock } from '../../src/react/useVirtualClock.js'

describe('useVirtualClock', () => {
  it('now() = t0 + offset + (elapsed × speed) şeklinde deterministik hesaplanır', () => {
    let currentTime = 1_000_000
    const getRealTimeMs = (): number => currentTime

    const { result } = renderHook(() => useVirtualClock({ t0: 500, speed: 2, getRealTimeMs }))
    expect(result.current.now()).toBe(500)

    currentTime += 100
    expect(result.current.now()).toBe(500 + 100 * 2)
  })

  it('advance offset\'i kalıcı şekilde ilerletir', () => {
    const currentTime = { value: 0 }
    const getRealTimeMs = (): number => currentTime.value

    const { result } = renderHook(() => useVirtualClock({ t0: 0, speed: 1, getRealTimeMs }))
    act(() => result.current.advance(5000))

    expect(result.current.offsetMs).toBe(5000)
    expect(result.current.now()).toBe(5000)
  })

  it('reset offset\'i ve başlangıç noktasını sıfırlar — seed\'e birebir dönüş', () => {
    const currentTime = { value: 0 }
    const getRealTimeMs = (): number => currentTime.value

    const { result } = renderHook(() => useVirtualClock({ t0: 1000, speed: 1, initialOffsetMs: 300, getRealTimeMs }))
    currentTime.value += 200
    expect(result.current.now()).toBe(1000 + 300 + 200)

    act(() => result.current.reset())
    expect(result.current.offsetMs).toBe(0)
    expect(result.current.now()).toBe(1000)
  })

  it('initialOffsetMs snapshot\'tan geri yüklenen offset olarak kullanılır', () => {
    const getRealTimeMs = (): number => 10
    const { result } = renderHook(() => useVirtualClock({ t0: 0, speed: 1, initialOffsetMs: 777, getRealTimeMs }))
    expect(result.current.now()).toBe(777)
  })

  it('iki ayrı hook örneği aynı offset ile aynı anı üretir (izole oturum determinizmi)', () => {
    const currentTime = { value: 500 }
    const getRealTimeMs = (): number => currentTime.value

    const a = renderHook(() => useVirtualClock({ t0: 100, speed: 1, initialOffsetMs: 50, getRealTimeMs }))
    const b = renderHook(() => useVirtualClock({ t0: 100, speed: 1, initialOffsetMs: 50, getRealTimeMs }))

    expect(a.result.current.now()).toBe(b.result.current.now())
  })
})
