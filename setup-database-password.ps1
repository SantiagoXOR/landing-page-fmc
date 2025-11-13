# Script para configurar la contraseña de la base de datos de Supabase
# Uso: .\setup-database-password.ps1

Write-Host "🔐 Configurador de Contraseña de Base de Datos Supabase" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host ""
Write-Host "📋 Para obtener la contraseña de la base de datos:" -ForegroundColor Blue
Write-Host "1. Ve a https://supabase.com/dashboard/project/aozysydpwvkkdvhfsvsu" -ForegroundColor Cyan
Write-Host "2. Ve a Settings > Database" -ForegroundColor Cyan
Write-Host "3. Busca 'Connection string' o 'Database Password'" -ForegroundColor Cyan
Write-Host "4. Copia la contraseña" -ForegroundColor Cyan
Write-Host ""

# Solicitar contraseña de forma segura
$dbPassword = Read-Host "🔒 Ingresa la contraseña de la base de datos" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

if ([string]::IsNullOrWhiteSpace($dbPasswordPlain)) {
    Write-Host "❌ La contraseña no puede estar vacía" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📝 Actualizando .env.local..." -ForegroundColor Blue

# Leer archivo .env.local
$envPath = ".env.local"
if (-not (Test-Path $envPath)) {
    Write-Host "❌ No se encontró .env.local" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content $envPath

# Actualizar URLs de base de datos
for ($i = 0; $i -lt $envContent.Count; $i++) {
    if ($envContent[$i] -match '^DATABASE_URL=') {
        $envContent[$i] = "DATABASE_URL=`"postgresql://postgres.aozysydpwvkkdvhfsvsu:$dbPasswordPlain@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`""
        Write-Host "✅ DATABASE_URL actualizada" -ForegroundColor Green
    }
    elseif ($envContent[$i] -match '^DIRECT_URL=') {
        $envContent[$i] = "DIRECT_URL=`"postgresql://postgres.aozysydpwvkkdvhfsvsu:$dbPasswordPlain@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`""
        Write-Host "✅ DIRECT_URL actualizada" -ForegroundColor Green
    }
}

# Guardar archivo
$envContent | Out-File -FilePath $envPath -Encoding UTF8

Write-Host ""
Write-Host "🧪 Probando conexión..." -ForegroundColor Blue

# Probar conexión con Node.js
if (Test-Path "test-supabase.js") {
    & node test-supabase.js
} else {
    Write-Host "⚠️  test-supabase.js no encontrado, probando con Prisma..." -ForegroundColor Yellow
    
    try {
        Write-Host "📦 Generando Prisma Client..." -ForegroundColor Cyan
        & npx prisma generate
        
        Write-Host "🔌 Probando conexión..." -ForegroundColor Cyan
        & npx prisma db push --accept-data-loss
        
        Write-Host "✅ ¡Conexión exitosa!" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Error de conexión: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "💡 Verifica que la contraseña sea correcta" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "🌱 Ejecutando seed..." -ForegroundColor Blue
try {
    & npm run db:seed
    Write-Host "✅ Datos de ejemplo cargados" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Error ejecutando seed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "💡 Puedes ejecutar manualmente: npm run db:seed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 ¡Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Blue
Write-Host "   1. Ejecuta: npm run dev" -ForegroundColor Cyan
Write-Host "   2. Ve a http://localhost:3001" -ForegroundColor Cyan
Write-Host "   3. Inicia sesión con admin@phorencial.com / admin123" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔒 Recuerda configurar Row Level Security en Supabase:" -ForegroundColor Yellow
Write-Host "   Ve a SQL Editor y ejecuta las políticas de SUPABASE-SETUP.md" -ForegroundColor Yellow
