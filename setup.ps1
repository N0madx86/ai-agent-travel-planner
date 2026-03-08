# AI Travel Planner - Quick Start

Write-Host "🚀 AI Travel Planner - Quick Start" -ForegroundColor Cyan
Write-Host ""

# Backend Setup
Write-Host "📦 Setting up Backend..." -ForegroundColor Yellow
Set-Location backend

if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Gray
    python -m venv venv
}

Write-Host "Activating virtual environment..." -ForegroundColor Gray
.\venv\Scripts\Activate.ps1

Write-Host "Installing Python dependencies..." -ForegroundColor Gray
pip install -q -r requirements.txt

Write-Host "Installing Playwright browsers..." -ForegroundColor Gray
playwright install chromium

Write-Host "✅ Backend setup complete!" -ForegroundColor Green
Write-Host ""

# Frontend Setup
Write-Host "📦 Setting up Frontend..." -ForegroundColor Yellow
Set-Location ..\frontend

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Gray
    npm install
}

Write-Host "✅ Frontend setup complete!" -ForegroundColor Green
Write-Host ""

# Instructions
Write-Host "🎉 Setup Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the application:" -ForegroundColor White
Write-Host ""
Write-Host "1. Backend (Terminal 1):" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   venv\Scripts\activate" -ForegroundColor Gray
Write-Host "   python -m uvicorn app.main:app --reload" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Frontend (Terminal 2):" -ForegroundColor Yellow
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Open http://localhost:5173 in your browser" -ForegroundColor Green
Write-Host ""
Write-Host "📚 API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
