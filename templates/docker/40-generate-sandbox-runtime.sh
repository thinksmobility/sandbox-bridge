#!/bin/sh
# nginx:alpine resmi imajı `/docker-entrypoint.d/*.sh` altındaki çalıştırılabilir
# script'leri nginx başlamadan ÖNCE otomatik koşar (resmi entrypoint mekanizması).
# Bu script `SANDBOX_ALLOWED_ORIGINS` (+ opsiyonel `SANDBOX_DEMO_ID`) env'lerinden
# `/sandbox-runtime.js`'i KONTEYNER BAŞLARKEN üretir — statik export'ta build-time
# env'lerin (`NEXT_PUBLIC_*`/`EXPO_PUBLIC_*`) bundle'a gömülüp donması sorununu
# çözer (gerçek olay: imaj `http://localhost:3000` ile üretime çıktı, köprü ölü
# kaldı). Demo, index.html'e enjeksiyon GEREKTİRMEDEN kendi
# `<script src="/sandbox-runtime.js">` etiketini ekler (bkz. ana repo README'si).
#
# Feedback project ids (UAT-19): one deployment is framed by both the
# production and the staging portal, each with its own project id. Optional
# `SANDBOX_FEEDBACK_PROJECT_IDS` (space or comma separated) becomes
# `feedbackProjectIds` and REPLACES the app's built-in ids, so list every
# portal's project. Unset, empty or only separators writes `null`: the app
# keeps its built-in ids. This script never stops the container over this
# value: carriage returns are stripped, and a list with any token other than
# letters, digits, - and _ is ignored with a warning (`null`, built-in ids),
# so the demo keeps running and production keeps its feedback tool.
# `SANDBOX_RUNTIME_FILE` only redirects the output for tests.
set -eu
# No pathname expansion anywhere: env values are split into words below.
set -f

OUT_FILE="${SANDBOX_RUNTIME_FILE:-/usr/share/nginx/html/sandbox-runtime.js}"
ORIGINS="${SANDBOX_ALLOWED_ORIGINS:-}"
DEMO_ID="${SANDBOX_DEMO_ID:-}"
FEEDBACK_PROJECT_IDS="$(printf '%s' "${SANDBOX_FEEDBACK_PROJECT_IDS:-}" | tr -d '\r')"

# `null` tells the app to use its built-in ids.
FEEDBACK_IDS_JSON='null'
feedback_ids=''
feedback_ids_valid=1
for id in $(printf '%s' "$FEEDBACK_PROJECT_IDS" | tr ',' ' '); do
  if printf '%s' "$id" | LC_ALL=C grep -Eq '^[A-Za-z0-9_-]+$'; then
    feedback_ids="$feedback_ids${feedback_ids:+,}\"$id\""
  else
    feedback_ids_valid=0
  fi
done
if [ "$feedback_ids_valid" -eq 0 ]; then
  echo "sandbox-runtime.js: WARNING: SANDBOX_FEEDBACK_PROJECT_IDS ignored (only letters, digits, - and _ separated by spaces or commas); the app keeps its built-in feedback project ids" >&2
elif [ -n "$feedback_ids" ]; then
  FEEDBACK_IDS_JSON="[$feedback_ids]"
fi

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
    printf '  demoId: "%s",\n' "$(json_escape "$DEMO_ID")"
  else
    printf '  demoId: null,\n'
  fi
  printf '  feedbackProjectIds: %s\n' "$FEEDBACK_IDS_JSON"
  printf '};\n'
} > "$OUT_FILE"

echo "sandbox-runtime.js oluşturuldu (origins: ${ORIGINS:-<yok>})"
