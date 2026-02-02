#!/bin/bash

# Start Development Environment for Home Food Marketplace

echo "Starting Home Food Marketplace Development Environment..."

# Start backend server
echo "Starting backend server..."
npm start &
BACKEND_PID=$!

# Start cook dashboard
echo "Starting cook dashboard..."
cd client/web
npm start &
WEB_PID=$!

# Start admin panel
echo "Starting admin panel..."
cd ../../admin
npm start &
ADMIN_PID=$!

cd ..

echo "All services started!"
echo "Backend PID: $BACKEND_PID"
echo "Web Dashboard PID: $WEB_PID"
echo "Admin Panel PID: $ADMIN_PID"
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
  echo "\nStopping all services..."
  kill $BACKEND_PID $WEB_PID $ADMIN_PID 2>/dev/null
  echo "All services stopped."
  exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Wait for all background processes
wait