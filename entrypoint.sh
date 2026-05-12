#!/bin/sh
set -e

SHUTDOWN_TIMEOUT=30

shutdown() {
    echo "[entrypoint] Received SIGTERM, shutting down gracefully..."
    kill -TERM 1 2>/dev/null || true
}

trap shutdown SIGTERM SIGINT

if [ -f "dist/main.js" ]; then
    echo "[entrypoint] Starting $SERVICE"
    exec tini -- node dist/main.js "$@"
elif [ -f "main.js" ]; then
    echo "[entrypoint] Starting $SERVICE (legacy)"
    exec tini -- node main.js "$@"
else
    echo "[entrypoint] Error: Cannot find main.js"
    ls -la dist/ 2>/dev/null || true
    exit 1
fi