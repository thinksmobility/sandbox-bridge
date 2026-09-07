import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// React 18: window.dispatchEvent gibi RTL dışı state güncellemelerini act() ile
// sarmalarken bu bayrak olmadan "not configured to support act" uyarısı basılır.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  cleanup()
})
