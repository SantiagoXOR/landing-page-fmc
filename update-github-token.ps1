# Script para actualizar el token de GitHub y hacer push
# Ejecutar con: .\update-github-token.ps1 "tu_nuevo_token_aqui"

param(
    [Parameter(Mandatory=$true)]
    [string]$NewToken
)

Write-Host "🔧 Actualizando configuración de GitHub..." -ForegroundColor Cyan

# Limpiar credenciales existentes
Write-Host "🧹 Limpiando credenciales anteriores..." -ForegroundColor Yellow
git config --global --unset credential.helper 2>$null
cmdkey /delete:LegacyGeneric:target=git:https://github.com 2>$null

# Configurar nuevo remote con el token
Write-Host "🔗 Configurando nuevo remote..." -ForegroundColor Yellow
$remoteUrl = "https://SantiagoXOR:$NewToken@github.com/SantiagoXOR/phorencial-bot-crm.git"
git remote set-url origin $remoteUrl

# Configurar credential helper
Write-Host "🔐 Configurando credential helper..." -ForegroundColor Yellow
git config --global credential.helper store

# Verificar configuración
Write-Host "✅ Verificando configuración..." -ForegroundColor Green
git remote -v

# Intentar push
Write-Host "🚀 Intentando push..." -ForegroundColor Cyan
$pushResult = git push origin main 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 ¡Push exitoso!" -ForegroundColor Green
    Write-Host "✅ El código se subió correctamente a GitHub" -ForegroundColor Green
} else {
    Write-Host "❌ Error en el push:" -ForegroundColor Red
    Write-Host $pushResult -ForegroundColor Red
    Write-Host "🔍 Verificando permisos del token..." -ForegroundColor Yellow
    
    # Verificar token con API
    $headers = @{
        "Authorization" = "token $NewToken"
        "User-Agent" = "PowerShell"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers
        Write-Host "✅ Token válido para usuario: $($response.login)" -ForegroundColor Green
        
        $repoResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/SantiagoXOR/phorencial-bot-crm" -Headers $headers
        Write-Host "✅ Acceso al repositorio: $($repoResponse.full_name)" -ForegroundColor Green
        Write-Host "🔐 Permisos: push=$($repoResponse.permissions.push), admin=$($repoResponse.permissions.admin)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error verificando token: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "📋 Configuración completada." -ForegroundColor Cyan
