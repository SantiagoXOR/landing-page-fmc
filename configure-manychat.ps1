# Script para configurar Manychat en el CRM
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Configuración de Manychat para Phorencial CRM" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$envPath = ".env.local"

# Generar webhook secret
$webhookSecret = "manychat-webhook-secret-temporal-2024-formosa-moto-credito"

Write-Host "📝 Variables de Manychat a configurar:" -ForegroundColor Yellow
Write-Host ""
Write-Host "MANYCHAT_API_KEY=3724482:1bf0d7525e7c87d854d087f44afae137" -ForegroundColor Green
Write-Host "MANYCHAT_BASE_URL=https://api.manychat.com" -ForegroundColor Green
Write-Host "MANYCHAT_WEBHOOK_SECRET=$webhookSecret" -ForegroundColor Green
Write-Host "WHATSAPP_PHONE_NUMBER=5493704069592" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Instrucciones:" -ForegroundColor Yellow
Write-Host "1. Abre el archivo .env.local en tu editor" -ForegroundColor White
Write-Host "2. Agrega las líneas mostradas arriba" -ForegroundColor White
Write-Host "3. Guarda el archivo" -ForegroundColor White
Write-Host "4. Ejecuta: npm run db:push" -ForegroundColor White
Write-Host "5. Ejecuta: npm run manychat:test" -ForegroundColor White
Write-Host ""

# Verificar si existe .env.local
if (Test-Path $envPath) {
    Write-Host "✅ Archivo .env.local encontrado" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE: Agrega las variables de Manychat al archivo existente" -ForegroundColor Yellow
} else {
    Write-Host "❌ Archivo .env.local NO encontrado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Creando archivo .env.local base..." -ForegroundColor Yellow
    
    $envContent = @"
# Database - Supabase PostgreSQL
DATABASE_URL="postgresql://postgres.[PROJECT_ID]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJECT_ID]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# NextAuth
NEXTAUTH_SECRET="desarrollo-local-secret-key-muy-segura-2024"
NEXTAUTH_URL="http://localhost:3000"
JWT_SECRET="jwt-secret-para-desarrollo-local-2024"
ALLOWED_WEBHOOK_TOKEN="super-seguro"
APP_ENV="development"

# Manychat Configuration
MANYCHAT_API_KEY=3724482:1bf0d7525e7c87d854d087f44afae137
MANYCHAT_BASE_URL=https://api.manychat.com
MANYCHAT_WEBHOOK_SECRET=$webhookSecret

# WhatsApp
WHATSAPP_PHONE_NUMBER=5493704069592
"@
    
    Set-Content -Path $envPath -Value $envContent
    Write-Host "✅ Archivo .env.local creado con configuración base" -ForegroundColor Green
    Write-Host "⚠️  Recuerda actualizar las credenciales de Supabase" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Próximos pasos:" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ejecutar migración: npm run db:push" -ForegroundColor White
Write-Host "2. Probar integración: npm run manychat:test" -ForegroundColor White
Write-Host "3. Iniciar servidor: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Documentacion completa en: MANYCHAT-QUICKSTART.md" -ForegroundColor Cyan
Write-Host ""

