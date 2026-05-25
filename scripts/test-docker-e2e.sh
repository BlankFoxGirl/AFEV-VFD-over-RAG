#!/bin/bash
# E2E test: bootstrap with docker-compose, verify app serves, teardown cleanly
set -euo pipefail

COMPOSE_FILE="${1:-docker-compose.yaml}"
APP_URL="http://localhost:3000"
MAX_WAIT=120
WAIT_INTERVAL=3

cleanup() {
  echo "Tearing down environment..."
  docker compose -f "$COMPOSE_FILE" down -v
  echo "PASS: Environment torn down, volumes removed"
}
trap cleanup EXIT

echo "Bootstrapping environment from $COMPOSE_FILE..."
docker compose -f "$COMPOSE_FILE" up -d --build

echo "Waiting for app to serve on $APP_URL (max ${MAX_WAIT}s)..."
elapsed=0
until curl -sf "$APP_URL" > /dev/null; do
  if [ "$elapsed" -ge "$MAX_WAIT" ]; then
    echo "FAIL: App did not become available within ${MAX_WAIT}s"
    docker compose -f "$COMPOSE_FILE" logs
    exit 1
  fi
  sleep "$WAIT_INTERVAL"
  elapsed=$((elapsed + WAIT_INTERVAL))
done

echo "PASS: App is serving on $APP_URL"
echo "PASS: E2E bootstrap test successful"
