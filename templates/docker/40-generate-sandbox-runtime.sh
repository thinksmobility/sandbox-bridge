#!/bin/sh
# nginx:alpine resmi imajı `/docker-entrypoint.d/*.sh` altındaki çalıştırılabilir
# script'leri nginx başlamadan ÖNCE otomatik koşar (resmi entrypoint mekanizması).
# Bu script `SANDBOX_ALLOWED_ORIGINS` (+ opsiyonel `SANDBOX_DEMO_ID`) env'lerinden
# `/sandbox-runtime.js`'i KONTEYNER BAŞLARKEN üretir — statik export'ta build-time
# env'lerin (`NEXT_PUBLIC_*`/`EXPO_PUBLIC_*`) bundle'a gömülüp donması sorununu
# çözer (gerçek olay: imaj `http://localhost:3000` ile üretime çıktı, köprü ölü
# kaldı). Demo, index.html'e enjeksiyon GEREKTİRMEDEN kendi
# `<script src="/sandbox-runtime.js">` etiketini ekler (bkz. ana repo README'si).
set -eu

OUT_FILE="/usr/share/nginx/html/sandbox-runtime.js"
ORIGINS="${SANDBOX_ALLOWED_ORIGINS:-}"
DEMO_ID="${SANDBOX_DEMO_ID:-}"

# Basit JSON string escape (backslash + çift tırnak) — origin'ler ve demo id
# normalde bu karakterleri içermez, yine de güvenli tarafta kalınır.
json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

build_origins_json() {
  first=1
  printf '['
  for origin in $ORIGINS; do
    # `frame-ancestors` CSP token'ları (`'none'`, `'self'` vb.) URL origin
    # DEĞİLDİR — aynı env değişkeni CSP başlığı için de kullanıldığından
    # (bkz. nginx.conf) burada yalnızca gerçek http(s) origin'leri alınır.
    case "$origin" in
      http://*|https://*) ;;
      *) continue ;;
    esac
    if [ "$first" -eq 1 ]; then
      first=0
    else
      printf ','
    fi
    printf '"%s"' "$(json_escape "$origin")"
  done
  printf ']'
}

{
  printf '// Konteyner başlarken otomatik üretilir — elle düzenlemeyin.\n'
  printf 'window.__SANDBOX_RUNTIME__ = {\n'
  printf '  allowedOrigins: %s,\n' "$(build_origins_json)"
  if [ -n "$DEMO_ID" ]; then
    printf '  demoId: "%s"\n' "$(json_escape "$DEMO_ID")"
  else
    printf '  demoId: null\n'
  fi
  printf '};\n'
} > "$OUT_FILE"

echo "sandbox-runtime.js oluşturuldu (origins: ${ORIGINS:-<yok>})"
