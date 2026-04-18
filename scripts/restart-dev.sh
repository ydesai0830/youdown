#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3000}"

echo "Cleaning Next.js dev state for YouDown on port ${PORT}..."

if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -ti "tcp:${PORT}" || true)"
  if [[ -n "${PIDS}" ]]; then
    echo "Stopping processes on port ${PORT}: ${PIDS}"
    kill ${PIDS} || true
    sleep 1
  fi
fi

rm -rf "${ROOT_DIR}/.next"

echo "Starting Next.js on http://localhost:${PORT}"
cd "${ROOT_DIR}"
exec npm run dev -- --port "${PORT}"
