# Docker/nginx şablonu

Demo repoları (`sandbox-voltgo`, `sandbox-airnova`, `sandbox-rentigo`) statik
build üretir ve nginx ile servis edilir. Kullanım:

1. `Dockerfile.static`'i demo repo köküne `Dockerfile` olarak kopyalayın.
2. `nginx.conf`'u aynı repoya `templates/docker/nginx.conf` olarak kopyalayın
   (Dockerfile bu yoldan `COPY` eder) ya da yolu Dockerfile içinde güncelleyin.
3. Build çıktı dizininizi belirtin: Expo demoları (VoltGo/Rentigo) için `dist`,
   AirNova (Next.js `output: 'export'`) için `out`.

```bash
docker build --build-arg BUILD_OUTPUT_DIR=dist -t sandbox-voltgo .
docker run -p 8080:80 -e SANDBOX_ALLOWED_ORIGINS="https://hello.tmobstudio.ai" sandbox-voltgo
```

Build aşamasında `npx sandbox-gate` build çıktısını tarar; **FAIL ederse
image üretilmez** — Coolify'a hiçbir şey deploy edilmez. Runtime imajına
`gate-report.json` da kopyalanır (denetim izi için).

`SANDBOX_ALLOWED_ORIGINS` konteyner başlatılırken `nginx.conf`'un
`frame-ancestors` CSP başlığına `envsubst` ile yazılır — boşlukla ayrılmış
CP origin listesi (ör. `"https://hello.tmobstudio.ai https://factory.tmobstudio.ai"`).
**Fail-closed varsayılan:** env geçilmezse `Dockerfile.static`'teki
`ENV SANDBOX_ALLOWED_ORIGINS="'none'"` devreye girer ve `frame-ancestors 'none'`
render edilir (hiçbir origin iframe'e alamaz) — `envsubst` bash `${VAR:-default}`
sözdizimini desteklemediği için bu varsayılan nginx.conf'ta değil, Dockerfile'da
tanımlıdır.

## Çalışma zamanı origin config'i (`window.__SANDBOX_RUNTIME__`)

**Sorun:** statik export'ta (`expo export -p web` / `next build` +
`output:'export'`) `EXPO_PUBLIC_*`/`NEXT_PUBLIC_*` env'leri **derleme
anında** JS bundle'ına gömülür. Aynı imaj farklı ortamlarda (staging/prod)
farklı bir CP origin'iyle çalıştırılamaz — imaj hep build sırasındaki
değeri (ör. `http://localhost:3000`) taşır ve köprü üretimde ölü kalır.

**Çözüm:** `40-generate-sandbox-runtime.sh` konteyner **başlarken**
(build'de değil) aynı `SANDBOX_ALLOWED_ORIGINS`(+`SANDBOX_DEMO_ID`)
env'lerinden `/sandbox-runtime.js`'i üretir:

```bash
docker run -p 8080:80 -e SANDBOX_ALLOWED_ORIGINS="https://hello.tmobstudio.ai" sandbox-voltgo
# → /sandbox-runtime.js: window.__SANDBOX_RUNTIME__ = { allowedOrigins: ["https://hello.tmobstudio.ai"], demoId: null }
```

Demo bu script'i kendi index/HTML'inde bir `<script>` etiketiyle React
mount'undan ÖNCE yükler (Dockerfile/nginx bunu index.html'e enjekte etmez):

**Next.js** (`app/layout.tsx`):
```tsx
import Script from 'next/script'
// <head> içinde, en üstte:
<Script src="/sandbox-runtime.js" strategy="beforeInteractive" />
```

**Expo web** (`app/+html.tsx`, `<head>` içinde):
```tsx
<script src="/sandbox-runtime.js" />
```

Uygulama kodunda (`app/_layout.tsx`) `@tmob/sandbox-bridge/react`'ten
`resolveAllowedOrigins`'i kullanın:

```tsx
import { SandboxProvider, resolveAllowedOrigins } from '@tmob/sandbox-bridge/react'

<SandboxProvider
  allowedOrigins={() =>
    resolveAllowedOrigins({
      runtime: typeof window !== 'undefined' ? (window as any).__SANDBOX_RUNTIME__ : undefined,
      buildTime: process.env.EXPO_PUBLIC_SANDBOX_ALLOWED_ORIGINS
    })
  }
  /* ... */
/>
```

Runtime değeri (varsa ve geçerliyse) build-time değerine ÖNCELİKLİDİR;
ikisi de yoksa/geçersizse fail-closed boş dizi döner (`'*'` asla).
