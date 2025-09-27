#!/bin/bash

# Smart College Attendance System - Quick Start Script
# This script will build and start all services with Docker Compose

set -e

echo "🚀 Starting Smart College Attendance System..."
echo "================================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ Docker Compose not found. Please install Docker Compose."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your configuration before production use!"
fi

# Build and start all services
echo "🔨 Building Docker images..."
docker-compose build --parallel

echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."

# Wait for MongoDB to be ready
echo "🔄 Waiting for MongoDB to start..."
until docker-compose exec mongodb mongosh --host localhost:27017 --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
    printf '.'
    sleep 2
done
echo " ✅ MongoDB is ready!"
# Dependencies
# Wait for backend to be ready
echo "🔄 Waiting for Backend to start..."
until curl -f http://localhost:3001/health > /dev/null 2>&1; do
    printf '.'
    sleep 2
done
echo " ✅ Backend is ready!"

# Wait for frontend to be ready
echo "🔄 Waiting for Frontend to start..."
until curl -f http://localhost > /dev/null 2>&1; do
    printf '.'
    sleep 2
done
echo " ✅ Frontend is ready!"

echo ""
echo "🎉 Smart College Attendance System is now running!"
echo "================================================"
echo "📱 Frontend:       http://localhost"
echo "🔌 Backend API:    http://localhost:3001"
echo "📖 API Docs:       http://localhost:3001/api-docs"
echo "🔍 Health Check:   http://localhost:3001/health"
echo "🗄️  MongoDB:       mongodb://admin:attendance_admin_2025@localhost:27017/attendance_system"
echo ""
echo "👤 Default Admin Login:"
echo "   Email: admin@attendance.system"
echo "   Password: admin123"
echo "   ⚠️  Please change the default password after first login!"
echo ""
echo "📋 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop system:   docker-compose down"
echo "   Restart:       docker-compose restart"
echo "   Update:        docker-compose pull && docker-compose up -d"
echo ""
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build output (keep dist/ as it's needed for production)
# dist/

# Logs
*.log
logs/

# Coverage directory
coverage/

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# Docker files
.dockerignore

# Git
.git/
.gitignore

# Testing
.coverage
.cache
src/**/*.test.ts
src/**/*.test.tsx
src/**/*.spec.ts
src/**/*.spec.tsx

# Development files
src/**/*.stories.ts
src/**/*.stories.tsx
