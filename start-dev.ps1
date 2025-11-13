# Phorencial CRM Development Server
Write-Host "Starting Phorencial CRM Development Server..." -ForegroundColor Green

# Set environment variables
$env:DATABASE_URL = "file:./dev.db"
$env:NEXTAUTH_SECRET = "desarrollo-local-secret-key-muy-segura-2024"
$env:NEXTAUTH_URL = "http://localhost:3001"
$env:JWT_SECRET = "jwt-secret-para-desarrollo-local-2024"
$env:ALLOWED_WEBHOOK_TOKEN = "super-seguro"
$env:APP_ENV = "development"

Write-Host "Environment variables set" -ForegroundColor Yellow
Write-Host "Starting Next.js development server..." -ForegroundColor Yellow

# Start the development server on port 3001
npx next dev -p 3001
