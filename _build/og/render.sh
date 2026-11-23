#!/bin/sh
# Renders og-image.html to assets/og-image.jpg (1200x630, kept small for WhatsApp).
cd "$(dirname "$0")" || exit 1
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --screenshot=/tmp/og-image.png "file://$PWD/og-image.html" >/dev/null 2>&1
sips -s format jpeg -s formatOptions 86 /tmp/og-image.png --out ../../assets/og-image.jpg >/dev/null
ls -l ../../assets/og-image.jpg
