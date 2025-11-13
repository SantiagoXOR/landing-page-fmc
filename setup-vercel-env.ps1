# Script para configurar variables de entorno en Vercel
Write-Host "Configurando variables de entorno en Vercel..." -ForegroundColor Green

# Variables de entorno para producción
$env_vars = @{
    "NEXT_PUBLIC_SUPABASE_ANON_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTQ5ODQsImV4cCI6MjA3MTM5MDk4NH0.TP4IcldIz855e-JETeychVPG60blKrxJ2oHkGSrVeaI"
    "SUPABASE_SERVICE_ROLE_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTQ5ODQsImV4cCI6MjA3MTM5MDk4NH0.TP4IcldIz855e-JETeychVPG60blKrxJ2oHkGSrVeaI"
    "NEXTAUTH_SECRET" = "produccion-secret-key-muy-segura-2024-phorencial-crm"
    "NEXTAUTH_URL" = "https://phorencial-bot-8ztgzbllz-xorarg.vercel.app"
    "JWT_SECRET" = "jwt-secret-para-produccion-2024-phorencial"
    "ALLOWED_WEBHOOK_TOKEN" = "super-seguro-webhook-token-produccion"
    "APP_ENV" = "production"
}

Write-Host "Variables a configurar:" -ForegroundColor Yellow
foreach ($key in $env_vars.Keys) {
    Write-Host "- $key" -ForegroundColor Cyan
}

Write-Host "`nPor favor, ejecuta manualmente estos comandos:" -ForegroundColor Yellow
foreach ($key in $env_vars.Keys) {
    $value = $env_vars[$key]
    Write-Host "vercel env add $key" -ForegroundColor Green
    Write-Host "Valor: $value" -ForegroundColor Gray
    Write-Host "Seleccionar: Production, Preview, Development (presiona 'a' y Enter)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "Después de configurar todas las variables, ejecuta:" -ForegroundColor Yellow
Write-Host "vercel --prod" -ForegroundColor Green
