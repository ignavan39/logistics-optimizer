#!/bin/sh
set -e

# Find main.js in various possible locations
if [ -f "dist/main.js" ]; then
    exec node dist/main.js "$@"
elif [ -f "main.js" ]; then
    exec node main.js "$@"
else
    echo "Error: Cannot find main.js"
    ls -la dist/ 2>/dev/null || true
    ls -la . 2>/dev/null || true
    exit 1
fi