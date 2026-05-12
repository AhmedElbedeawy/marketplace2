#!/usr/bin/env bash
# Run the app on Android with API keys injected from local.properties.
# Usage: bash run_android.sh [extra flutter flags]

PROPS="android/local.properties"
if [ ! -f "$PROPS" ]; then
  echo "ERROR: $PROPS not found"; exit 1
fi

ANDROID_KEY=$(grep '^GOOGLE_MAPS_ANDROID_KEY=' "$PROPS" | cut -d'=' -f2-)

if [ -z "$ANDROID_KEY" ]; then
  echo "WARNING: GOOGLE_MAPS_ANDROID_KEY not set in $PROPS"
fi

flutter run \
  --dart-define=GOOGLE_MAPS_ANDROID_KEY="$ANDROID_KEY" \
  "$@"
