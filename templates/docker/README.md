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
