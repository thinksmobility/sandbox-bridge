// @vitest-environment jsdom
import { act } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SandboxProvider, useSandbox } from '../../src/react/SandboxProvider.js'

function Consumer(): React.JSX.Element {
  const { ready, session, feedbackMode, persona, resetCount } = useSandbox()
  return (
    <div>
      <span data-testid="ready">{String(ready)}</span>
      <span data-testid="session-id">{session?.id ?? ''}</span>
      <span data-testid="feedback-mode">{String(feedbackMode)}</span>
      <span data-testid="persona">{persona ?? ''}</span>
      <span data-testid="reset-count">{resetCount}</span>
    </div>
  )
}

describe('SandboxProvider', () => {
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

  it("mount olduğunda izinli her origin'e sandbox:ready gönderir, '*' hariç tutulur", () => {
    render(
      <SandboxProvider
        demoId="voltgo"
        allowedOrigins={['*', 'https://hello.tmobstudio.ai', 'http://localhost:3000']}
        manifestDigest="digest-1"
        screens={7}
      >
        <Consumer />
      </SandboxProvider>
    )

    expect(postMessageSpy).toHaveBeenCalledTimes(2)
    const [envelope, targetOrigin] = postMessageSpy.mock.calls[0] as [{ type: string; demoId: string; payload: unknown }, string]
    expect(envelope.type).toBe('sandbox:ready')
    expect(envelope.demoId).toBe('voltgo')
    expect(envelope.payload).toEqual({ manifestDigest: 'digest-1', screens: 7, protocol: 1 })

    const targets = postMessageSpy.mock.calls.map((call) => call[1])
    expect(targets).not.toContain('*')
    expect(targets).toEqual(['https://hello.tmobstudio.ai', 'http://localhost:3000'])
  })

  it("izinli origin'den gelen sandbox:init handshake'i tamamlar", () => {
    render(
      <SandboxProvider demoId="voltgo" allowedOrigins={['https://hello.tmobstudio.ai']} manifestDigest="d" screens={1}>
        <Consumer />
      </SandboxProvider>
    )

    expect(screen.getByTestId('ready').textContent).toBe('false')

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
              persona: 'deniz',
              feedbackMode: true,
              allowedOrigin: 'https://hello.tmobstudio.ai'
            }
          }
        })
      )
    })

    expect(screen.getByTestId('ready').textContent).toBe('true')
    expect(screen.getByTestId('session-id').textContent).toBe('sess-1')
    expect(screen.getByTestId('feedback-mode').textContent).toBe('true')
    expect(screen.getByTestId('persona').textContent).toBe('deniz')
  })

  it("izinsiz origin'den gelen mesajı yok sayar", () => {
    render(
      <SandboxProvider demoId="voltgo" allowedOrigins={['https://hello.tmobstudio.ai']} manifestDigest="d" screens={1}>
        <Consumer />
      </SandboxProvider>
    )

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://evil.example',
          source: fakeParent as unknown as Window,
          data: {
            v: 1,
            demoId: 'voltgo',
            sessionId: '',
            msgId: 'm-init',
            ts: 1,
            type: 'sandbox:init',
            payload: {
              session: { id: 'sess-x', expiresAt: '2026-09-08T00:00:00.000Z' },
              feedbackMode: true,
              allowedOrigin: 'https://evil.example'
            }
          }
        })
      )
    })

    expect(screen.getByTestId('ready').textContent).toBe('false')
  })

  it("payload.allowedOrigin gerçek event.origin ile uyuşmazsa handshake'i reddeder (izinli origin'den gelse bile)", () => {
    render(
      <SandboxProvider demoId="voltgo" allowedOrigins={['https://hello.tmobstudio.ai']} manifestDigest="d" screens={1}>
        <Consumer />
      </SandboxProvider>
    )

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
              session: { id: 'sess-spoof', expiresAt: '2026-09-08T00:00:00.000Z' },
              feedbackMode: true,
              // Payload gerçek olmayan bir origin bildiriyor — event.origin'e
              // (izinli origin) rağmen reddedilmeli.
              allowedOrigin: 'https://attacker.example'
            }
          }
        })
      )
    })

    expect(screen.getByTestId('ready').textContent).toBe('false')

    postMessageSpy.mockClear()
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://hello.tmobstudio.ai',
          source: fakeParent as unknown as Window,
          data: {
            v: 1,
            demoId: 'voltgo',
            sessionId: '',
            msgId: 'm-init-2',
            ts: 2,
            type: 'sandbox:init',
            payload: {
              session: { id: 'sess-real', expiresAt: '2026-09-08T00:00:00.000Z' },
              feedbackMode: true,
              allowedOrigin: 'https://hello.tmobstudio.ai'
            }
          }
        })
      )
    })
    expect(screen.getByTestId('ready').textContent).toBe('true')
    expect(screen.getByTestId('session-id').textContent).toBe('sess-real')
  })

  it('şema dışı mesajı sessizce yok sayar', () => {
    render(
      <SandboxProvider demoId="voltgo" allowedOrigins={['https://hello.tmobstudio.ai']} manifestDigest="d" screens={1}>
        <Consumer />
      </SandboxProvider>
    )

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://hello.tmobstudio.ai',
          source: fakeParent as unknown as Window,
          data: { garbage: true }
        })
      )
    })

    expect(screen.getByTestId('ready').textContent).toBe('false')
  })

  it("init sonrası feedback-mode/highlight/persona/scenario mesajlarının hepsini işler", () => {
    render(
      <SandboxProvider demoId="voltgo" allowedOrigins={['https://hello.tmobstudio.ai']} manifestDigest="d" screens={1}>
        <Consumer />
      </SandboxProvider>
    )

    function send(type: string, payload: Record<string, unknown>): void {
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: 'https://hello.tmobstudio.ai',
            source: fakeParent as unknown as Window,
            data: { v: 1, demoId: 'voltgo', sessionId: 'sess-1', msgId: 'm', ts: 1, type, payload }
          })
        )
      })
    }

    send('sandbox:init', {
      session: { id: 'sess-1', expiresAt: '2026-09-08T00:00:00.000Z' },
      feedbackMode: false,
      allowedOrigin: 'https://hello.tmobstudio.ai'
    })
    expect(screen.getByTestId('feedback-mode').textContent).toBe('false')

    send('sandbox:feedback-mode', { on: true })
    expect(screen.getByTestId('feedback-mode').textContent).toBe('true')

    send('sandbox:persona', { id: 'mert' })
    expect(screen.getByTestId('persona').textContent).toBe('mert')

    send('sandbox:scenario', { id: 'gecikme' })
    send('sandbox:highlight', { componentId: 'cmp-1' })
    send('sandbox:reset', {})
  })

  it('onInit, sandbox:init alındığında payload ile çağrılır', () => {
    const onInit = vi.fn()
    render(
      <SandboxProvider
        demoId="voltgo"
        allowedOrigins={['https://hello.tmobstudio.ai']}
        manifestDigest="d"
        screens={1}
        onInit={onInit}
      >
        <Consumer />
      </SandboxProvider>
    )

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
              feedbackMode: false,
              allowedOrigin: 'https://hello.tmobstudio.ai'
            }
          }
        })
      )
    })

    expect(onInit).toHaveBeenCalledTimes(1)
    expect(onInit.mock.calls[0]?.[0]).toMatchObject({ session: { id: 'sess-1' } })
  })

  it('onReset, sandbox:reset alındığında (iç snapshot temizlendikten sonra) çağrılır; resetCount artar', () => {
    const onReset = vi.fn()
    render(
      <SandboxProvider
        demoId="voltgo"
        allowedOrigins={['https://hello.tmobstudio.ai']}
        manifestDigest="d"
        screens={1}
        onReset={onReset}
      >
        <Consumer />
      </SandboxProvider>
    )

    expect(screen.getByTestId('reset-count').textContent).toBe('0')

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://hello.tmobstudio.ai',
          source: fakeParent as unknown as Window,
          data: { v: 1, demoId: 'voltgo', sessionId: 'sess-1', msgId: 'm-r1', ts: 1, type: 'sandbox:reset', payload: {} }
        })
      )
    })
    expect(onReset).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('reset-count').textContent).toBe('1')

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://hello.tmobstudio.ai',
          source: fakeParent as unknown as Window,
          data: { v: 1, demoId: 'voltgo', sessionId: 'sess-1', msgId: 'm-r2', ts: 2, type: 'sandbox:reset', payload: {} }
        })
      )
    })
    expect(onReset).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('reset-count').textContent).toBe('2')
  })

  it('onInit/onReset verilmeden reset gelirse hata fırlatmaz (opsiyonel callback)', () => {
    render(
      <SandboxProvider demoId="voltgo" allowedOrigins={['https://hello.tmobstudio.ai']} manifestDigest="d" screens={1}>
        <Consumer />
      </SandboxProvider>
    )
    expect(() => {
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: 'https://hello.tmobstudio.ai',
            source: fakeParent as unknown as Window,
            data: { v: 1, demoId: 'voltgo', sessionId: 'sess-1', msgId: 'm-r', ts: 1, type: 'sandbox:reset', payload: {} }
          })
        )
      })
    }).not.toThrow()
    expect(screen.getByTestId('reset-count').textContent).toBe('1')
  })

  it('useSandbox, SandboxProvider dışında kullanılırsa fırlatır', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow('useSandbox, SandboxProvider dışında kullanılamaz.')
    errorSpy.mockRestore()
  })
})
