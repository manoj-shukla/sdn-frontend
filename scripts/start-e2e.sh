#!/usr/bin/env bash
# Start backend + frontend for E2E tests
# Kills stale processes on ports 3000 and 8083 first

set -e

BACKEND_DIR="$(cd "$(dirname "$0")/../../backend" && pwd)"
FRONTEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Starting E2E Services ==="

# Kill any stale processes on our ports
echo "Killing stale processes on ports 3000 and 8083..."
lsof -ti :8083 | xargs kill -9 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
sleep 2

# Start backend
echo "Starting backend on port 8083..."
cd "$BACKEND_DIR"
PORT=8083 node index.js > /tmp/e2e-backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8083/ --max-time 2 > /dev/null 2>&1; then
    echo "Backend is ready!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Backend failed to start within 30s"
    cat /tmp/e2e-backend.log
    exit 1
  fi
  sleep 1
done

# Start frontend
echo "Starting frontend on port 3000..."
cd "$FRONTEND_DIR"
npm run dev > /tmp/e2e-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to be ready
echo "Waiting for frontend to be ready..."
for i in $(seq 1 60); do
  if curl -s http://localhost:3000/ --max-time 2 > /dev/null 2>&1; then
    echo "Frontend is ready!"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "ERROR: Frontend failed to start within 60s"
    cat /tmp/e2e-frontend.log
    exit 1
  fi
  sleep 1
done

echo "=== Both services are running. Starting E2E tests... ==="

# Run playwright tests
cd "$FRONTEND_DIR"
npx playwright test "$@"
EXIT_CODE=$?

# Cleanup
echo "=== Cleaning up ==="
kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true

exit $EXIT_CODE
