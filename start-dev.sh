#!/bin/bash

# Start Development Environment for Home Food Marketplace

echo "Starting Home Food Marketplace Development Environment..."

# Start backend server
echo "Starting backend server..."
cd server
npm start &

# Start mobile app
echo "Starting mobile app..."
cd ../client/mobile
npm start &

# Start cook dashboard
echo "Starting cook dashboard..."
cd ../../client/web
npm start &

# Start admin panel
echo "Starting admin panel..."
cd ../../admin
npm start &

echo "All services started!"
echo "Press Ctrl+C to stop all services"

# Wait for all background processes
wait