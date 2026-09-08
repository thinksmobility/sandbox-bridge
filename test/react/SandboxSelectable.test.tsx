// @vitest-environment jsdom
import { act } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SandboxProvider } from '../../src/react/SandboxProvider.js'
import { SandboxSelectable } from '../../src/react/SandboxSelectable.js'

function dispatchInit(fakeParent: { postMessage: ReturnType<typeof vi.fn> }, feedbackMode: boolean): void {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://hello.tmobstudio.ai',
        source: fakeParent as unknown as Window,
        data: {
          v: 1,
          demoId: 'voltgo',
          sessionId: '',
          msgId: 'm-init',
          ts: 1,
          type: 'sandbox:init',
          payload: {
            session: { id: 'sess-1', expiresAt: '2026-09-08T00:00:00.000Z' },
            feedbackMode,
            allowedOrigin: 'https://hello.tmobstudio.ai'
          }
        }
      })
    )
  })
}

describe('SandboxSelectable (web)', () => {
  let postMessageSpy: ReturnType<typeof vi.fn>
  let fakeParent: { postMessage: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    postMessageSpy = vi.fn()
    fakeParent = { postMessage: postMessageSpy }
    vi.stubGlobal('parent', fakeParent)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('feedback modu kapalıyken tıklama data-sb-* attribute basar ama component-selected göndermez', () => {
    const { getByText } = render(
      <SandboxProvider demoId="voltgo" allowedOrigins={['https://hello.tmobstudio.ai']} manifestDigest="d" screens={1}>
        <SandboxSelectable screenId="scr-1" componentId="cmp-1" label="Fiyat kartı">
          <button type="button">tıkla</button>
        </SandboxSelectable>
      </SandboxProvider>
    )
    dispatchInit(fakeParent, false)
    postMessageSpy.mockClear()

    const button = getByText('tıkla')
    expect(button.parentElement?.getAttribute('data-sb-screen')).toBe('scr-1')
    expect(button.parentElement?.getAttribute('data-sb-component')).toBe('cmp-1')

    fireEvent.click(button)
    expect(postMessageSpy).not.toHaveBeenCalled()
  })

  it('feedback modu açıkken tıklama rect bilgisiyle component-selected gönderir', () => {
    const { getByText } = render(
      <SandboxProvider demoId="voltgo" allowedOrigins={['https://hello.tmobstudio.ai']} manifestDigest="d" screens={1}>
        <SandboxSelectable screenId="scr-1" componentId="cmp-1" label="Fiyat kartı">
          <button type="button">tıkla</button>
        </SandboxSelectable>
      </SandboxProvider>
    )
    dispatchInit(fakeParent, true)
    postMessageSpy.mockClear()

    fireEvent.click(getByText('tıkla'))

    expect(postMessageSpy).toHaveBeenCalledTimes(1)
    const [envelope] = postMessageSpy.mock.calls[0] as [
      { type: string; payload: { screenId: string; componentId: string; label: string; rect: unknown } }
    ]
    expect(envelope.type).toBe('sandbox:component-selected')
    expect(envelope.payload).toMatchObject({ screenId: 'scr-1', componentId: 'cmp-1', label: 'Fiyat kartı' })
    expect(envelope.payload.rect).toEqual({
      x: expect.any(Number),
      y: expect.any(Number),
      w: expect.any(Number),
      h: expect.any(Number)
    })
  })

  it('feedback modu açıkken klavyeyle erişilebilir (role=button, Enter/Space seçer)', () => {
    const { getByText } = render(
      <SandboxProvider demoId="voltgo" allowedOrigins={['https://hello.tmobstudio.ai']} manifestDigest="d" screens={1}>
        <SandboxSelectable screenId="scr-1" componentId="cmp-1" label="Fiyat kartı">
          <span>tıkla</span>
        </SandboxSelectable>
      </SandboxProvider>
    )
    dispatchInit(fakeParent, true)
    postMessageSpy.mockClear()

    const wrapper = getByText('tıkla').parentElement as HTMLElement
    expect(wrapper.getAttribute('role')).toBe('button')
    expect(wrapper.getAttribute('tabindex')).toBe('0')

    fireEvent.keyDown(wrapper, { key: 'Enter' })
    expect(postMessageSpy).toHaveBeenCalledTimes(1)

    postMessageSpy.mockClear()
    fireEvent.keyDown(wrapper, { key: ' ' })
    expect(postMessageSpy).toHaveBeenCalledTimes(1)

    postMessageSpy.mockClear()
    fireEvent.keyDown(wrapper, { key: 'Tab' })
    expect(postMessageSpy).not.toHaveBeenCalled()
  })

  it("sandbox:highlight ile eşleşen bileşende data-sb-highlighted='true' basar", () => {
    const { getByText } = render(
      <SandboxProvider demoId="voltgo" allowedOrigins={['https://hello.tmobstudio.ai']} manifestDigest="d" screens={1}>
        <SandboxSelectable screenId="scr-1" componentId="cmp-1" label="Fiyat kartı">
          <button type="button">tıkla</button>
        </SandboxSelectable>
      </SandboxProvider>
    )
    dispatchInit(fakeParent, true)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://hello.tmobstudio.ai',
          source: fakeParent as unknown as Window,
          data: {
            v: 1,
            demoId: 'voltgo',
            sessionId: 'sess-1',
            msgId: 'm-hl',
            ts: 2,
            type: 'sandbox:highlight',
            payload: { componentId: 'cmp-1' }
          }
        })
      )
    })

    const wrapper = getByText('tıkla').parentElement
    expect(wrapper?.getAttribute('data-sb-highlighted')).toBe('true')
  })
})

describe('SandboxSelectable (native no-op)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('document tanımsızken (RN ağacı) wrapper eklemeden çocukları aynen döner', () => {
    vi.stubGlobal('document', undefined)

    const element = SandboxSelectable({
      screenId: 'scr-1',
      componentId: 'cmp-1',
      label: 'Fiyat kartı',
      children: 'hello-native'
    })

    expect((element.props as { children: unknown }).children).toBe('hello-native')
  })
})

describe('SandboxSelectable — feedback modundan bağımsız highlight (v0.3.2)', () => {
  let postMessageSpy: ReturnType<typeof vi.fn>
  let fakeParent: { postMessage: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    postMessageSpy = vi.fn()
    fakeParent = { postMessage: postMessageSpy }
    vi.stubGlobal('parent', fakeParent)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  function dispatchHighlight(componentId: string): void {
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://hello.tmobstudio.ai',
          source: fakeParent as unknown as Window,
          data: {
            v: 1,
            demoId: 'voltgo',
            sessionId: 'sess-1',
            msgId: 'm-hl',
            ts: 2,
            type: 'sandbox:highlight',
            payload: { componentId }
          }
        })
      )
    })
  }

  function renderSelectable(): HTMLElement {
    const { getByText } = render(
      <SandboxProvider demoId="voltgo" allowedOrigins={['https://hello.tmobstudio.ai']} manifestDigest="d" screens={1}>
        <SandboxSelectable screenId="scr-1" componentId="cmp-1" label="Fiyat kartı">
          <button type="button">tıkla</button>
        </SandboxSelectable>
      </SandboxProvider>
    )
    return getByText('tıkla').parentElement as HTMLElement
  }

  it('feedback modu KAPALIYKEN de görsel vurgu verir; süre dolunca söner ama data-sb-highlighted kalır', () => {
    vi.useFakeTimers()
    const wrapper = renderSelectable()
    dispatchInit(fakeParent, false)
    dispatchHighlight('cmp-1')

    expect(wrapper.getAttribute('data-sb-highlighted')).toBe('true')
    expect(wrapper.getAttribute('role')).toBeNull() // tıklanabilirlik feedback moduna bağlı kalır
    expect(wrapper.style.boxShadow).toMatch(/#6d5efc|rgb\(109, 94, 252\)/)
    expect(wrapper.style.transition).toContain('box-shadow')

    act(() => {
      vi.advanceTimersByTime(1600)
    })
    expect(wrapper.style.boxShadow).toMatch(/rgba\(109, 94, 252, 0\)/)
    expect(wrapper.getAttribute('data-sb-highlighted')).toBe('true')
  })

  it('başka bileşen vurgulanınca bu bileşenin vurgusu düşer', () => {
    const wrapper = renderSelectable()
    dispatchInit(fakeParent, false)
    dispatchHighlight('cmp-1')
    expect(wrapper.getAttribute('data-sb-highlighted')).toBe('true')
    dispatchHighlight('cmp-2')
    expect(wrapper.getAttribute('data-sb-highlighted')).toBeNull()
    expect(wrapper.style.boxShadow).toMatch(/rgba\(109, 94, 252, 0\)/)
  })

  it('prefers-reduced-motion: vurgu animasyonsuz ve statik kalır (otomatik sönmez)', () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    )
    const wrapper = renderSelectable()
    dispatchInit(fakeParent, false)
    dispatchHighlight('cmp-1')

    expect(wrapper.style.transition).toBe('')
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(wrapper.style.boxShadow).toMatch(/#6d5efc|rgb\(109, 94, 252\)/)
  })
})
