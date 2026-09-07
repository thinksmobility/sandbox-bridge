import { Stack } from 'expo-router'
import { SandboxProvider } from '@tmob/sandbox-bridge/react'
import '../global.css'

const DEMO_ID = process.env.EXPO_PUBLIC_SANDBOX_DEMO_ID ?? 'sandbox-expo-kit-ornek'
const ALLOWED_ORIGINS = (process.env.EXPO_PUBLIC_SANDBOX_ALLOWED_ORIGINS ?? 'http://localhost:3000').split(',')
const MANIFEST_DIGEST = process.env.EXPO_PUBLIC_SANDBOX_MANIFEST_DIGEST ?? 'dev'
const SCREEN_COUNT = 2

export default function RootLayout(): React.JSX.Element {
  return (
    <SandboxProvider demoId={DEMO_ID} allowedOrigins={ALLOWED_ORIGINS} manifestDigest={MANIFEST_DIGEST} screens={SCREEN_COUNT}>
      <Stack screenOptions={{ headerShown: false }} />
    </SandboxProvider>
  )
}
