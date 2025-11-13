# Script para configurar Supabase en Windows PowerShell
# Uso: .\configure-supabase.ps1

Write-Host "🚀 Configurador de Supabase para Phorencial CRM" -ForegroundColor Magenta
Write-Host "=" * 50 -ForegroundColor Magenta

# Función para leer input con valor por defecto
function Read-HostWithDefault {
    param(
        [string]$Prompt,
        [string]$Default = ""
    )
    
    if ($Default) {
        $input = Read-Host "$Prompt [$Default]"
        if ([string]::IsNullOrWhiteSpace($input)) {
            return $Default
        }
        return $input
    } else {
        return Read-Host $Prompt
    }
}

Write-Host "📋 Necesitamos configurar las credenciales de Supabase" -ForegroundColor Blue
Write-Host ""
Write-Host "1. Ve a https://supabase.com/dashboard" -ForegroundColor Cyan
Write-Host "2. Selecciona tu proyecto o crea uno nuevo" -ForegroundColor Cyan
Write-Host "3. Ve a Settings > API para obtener las claves" -ForegroundColor Cyan
Write-Host "4. Ve a Settings > Database para la contraseña" -ForegroundColor Cyan
Write-Host ""

# Recopilar información
$projectId = Read-Host "🔑 Project ID (ej: hffupqoqbjhehedtemvl)"
$dbPassword = Read-Host "🔒 Database Password" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))
$anonKey = Read-Host "🔓 Anon Key (eyJ...)"
$serviceKey = Read-Host "🔐 Service Role Key (eyJ...)"

# Validar inputs
if ([string]::IsNullOrWhiteSpace($projectId) -or 
    [string]::IsNullOrWhiteSpace($dbPasswordPlain) -or 
    [string]::IsNullOrWhiteSpace($anonKey) -or 
    [string]::IsNullOrWhiteSpace($serviceKey)) {
    Write-Host "❌ Todos los campos son obligatorios" -ForegroundColor Red
    exit 1
}

# Construir URLs
$supabaseUrl = "https://$projectId.supabase.co"
$databaseUrl = "postgresql://postgres.$projectId`:$dbPasswordPlain@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
$directUrl = "postgresql://postgres.$projectId`:$dbPasswordPlain@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

Write-Host ""
Write-Host "📝 Configurando .env.local..." -ForegroundColor Blue

# Leer archivo actual
$envPath = ".env.local"
$envContent = @()

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
}

# Función para actualizar o agregar variable
function Set-EnvVar {
    param(
        [string]$Key,
        [string]$Value,
        [ref]$Content
    )
    
    $found = $false
    for ($i = 0; $i -lt $Content.Value.Count; $i++) {
        if ($Content.Value[$i] -match "^$Key=") {
            $Content.Value[$i] = "$Key=`"$Value`""
            $found = $true
            break
        }
    }
    
    if (-not $found) {
        $Content.Value += "$Key=`"$Value`""
    }
}

# Actualizar variables
Set-EnvVar "DATABASE_URL" $databaseUrl ([ref]$envContent)
Set-EnvVar "DIRECT_URL" $directUrl ([ref]$envContent)
Set-EnvVar "NEXT_PUBLIC_SUPABASE_URL" $supabaseUrl ([ref]$envContent)
Set-EnvVar "NEXT_PUBLIC_SUPABASE_ANON_KEY" $anonKey ([ref]$envContent)
Set-EnvVar "SUPABASE_SERVICE_ROLE_KEY" $serviceKey ([ref]$envContent)

# Guardar archivo
$envContent | Out-File -FilePath $envPath -Encoding UTF8

Write-Host "✅ Variables de entorno configuradas" -ForegroundColor Green

Write-Host ""
Write-Host "🔄 Ejecutando configuración de Prisma..." -ForegroundColor Blue

# Regenerar Prisma Client
Write-Host "📦 Generando Prisma Client..." -ForegroundColor Cyan
& npx prisma generate

# Crear tablas
Write-Host "🏗️  Creando tablas en Supabase..." -ForegroundColor Cyan
& npx prisma db push --force-reset

# Ejecutar seed
Write-Host "🌱 Ejecutando seed..." -ForegroundColor Cyan
& npx prisma db seed

Write-Host ""
Write-Host "🎉 ¡Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Blue
Write-Host "   1. Ejecuta: npm run dev" -ForegroundColor Cyan
Write-Host "   2. Ve a http://localhost:3001" -ForegroundColor Cyan
Write-Host "   3. Inicia sesión con admin@phorencial.com / admin123" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔒 Nota: Configura Row Level Security en Supabase Dashboard" -ForegroundColor Yellow
Write-Host "   Ve a SQL Editor y ejecuta las políticas de setup-supabase.md" -ForegroundColor Yellow
