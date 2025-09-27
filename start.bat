@echo off
REM Smart College Attendance System - Quick Start Script for Windows
REM This script will build and start all services with Docker Compose

echo 🚀 Starting Smart College Attendance System...
echo ================================================

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker first.
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose not found. Please install Docker Compose.
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env >nul
    echo ⚠️  Please update the .env file with your configuration before production use!
)

REM Build and start all services
echo 🔨 Building Docker images...
docker-compose build --parallel

echo 🚀 Starting services...
docker-compose up -d

echo ⏳ Waiting for services to be ready...

REM Wait for services to start
timeout /t 10 /nobreak >nul

echo.
echo 🎉 Smart College Attendance System is now running!
echo ================================================
echo 📱 Frontend:       http://localhost
echo 🔌 Backend API:    http://localhost:3001
echo 📖 API Docs:       http://localhost:3001/api-docs
echo 🔍 Health Check:   http://localhost:3001/health
echo 🗄️  MongoDB:       mongodb://admin:attendance_admin_2025@localhost:27017/attendance_system
echo.
echo 👤 Default Admin Login:
echo    Email: admin@attendance.system
echo    Password: admin123
echo    ⚠️  Please change the default password after first login!
echo.
echo 📋 Useful commands:
echo    View logs:     docker-compose logs -f
echo    Stop system:   docker-compose down
echo    Restart:       docker-compose restart
echo    Update:        docker-compose pull ^&^& docker-compose up -d
echo.
