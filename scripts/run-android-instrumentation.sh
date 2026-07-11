#!/usr/bin/env bash

set -euo pipefail

metro_log="${RUNNER_TEMP:-/tmp}/image-marker-metro.log"
npm --prefix example start -- --port 8081 >"$metro_log" 2>&1 &
metro_pid=$!

cleanup() {
  kill "$metro_pid" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 60); do
  if curl --silent --fail http://127.0.0.1:8081/status | grep --quiet 'packager-status:running'; then
    break
  fi
  if ! kill -0 "$metro_pid" 2>/dev/null; then
    cat "$metro_log"
    exit 1
  fi
  sleep 1
done

if ! curl --silent --fail http://127.0.0.1:8081/status | grep --quiet 'packager-status:running'; then
  cat "$metro_log"
  exit 1
fi

adb reverse tcp:8081 tcp:8081
if ! (cd example/android && ./gradlew connectedCheck --stacktrace); then
  cat "$metro_log"
  exit 1
fi
